-- Triggers que actualizan ligamx_posiciones y ucl_posiciones al finalizar partidos en quiniela_partidos.
-- Incrementales (UPSERT): suman el resultado sobre lo ya cargado, no recalculan desde cero.
-- Si un partido ya finalizado cambia (marcador/equipos/estado), primero se resta su aporte anterior
-- y luego se suma el nuevo, por lo que re-guardar el mismo marcador no duplica nada.
-- El trigger de Champions re-rankea pos de toda la temporada tras cada cambio.

create unique index if not exists ligamx_posiciones_temporada_equipo_key
  on public.ligamx_posiciones (temporada, equipo);
create unique index if not exists ucl_posiciones_temporada_equipo_key
  on public.ucl_posiciones (temporada, equipo);

-- La quiniela nombra distinto a algunos equipos que en ucl_posiciones
create or replace function public.ucl_norm_equipo(n text) returns text
language sql immutable as $$
  select case n
    when 'AS Roma'          then 'Roma'
    when 'LASK Linz'        then 'LASK'
    when 'Leipzig'          then 'RB Leipzig'
    when 'PSG'              then 'Paris Saint-Germain'
    when 'Sabah FK'         then 'Sabah Baku'
    when 'VfB Stuttgart'    then 'Stuttgart'
    when 'Viking Stavanger' then 'Viking'
    else n end
$$;

-- ── Liga MX ──────────────────────────────────────────────────────────────
create or replace function public._lmx_aplicar(
  p_temporada text, p_equipo text, p_gf int, p_gc int, p_s int
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_g int := (p_gf > p_gc)::int * p_s;
  v_e int := (p_gf = p_gc)::int * p_s;
  v_p int := (p_gf < p_gc)::int * p_s;
begin
  if p_s > 0 then
    insert into public.ligamx_posiciones (temporada, equipo, pj, g, e, p, gf, gc, dg, pts, updated_at)
    values (p_temporada, p_equipo, p_s, v_g, v_e, v_p, p_gf * p_s, p_gc * p_s,
            (p_gf - p_gc) * p_s, v_g * 3 + v_e, now())
    on conflict (temporada, equipo) do update set
      pj  = coalesce(ligamx_posiciones.pj, 0)  + excluded.pj,
      g   = coalesce(ligamx_posiciones.g, 0)   + excluded.g,
      e   = coalesce(ligamx_posiciones.e, 0)   + excluded.e,
      p   = coalesce(ligamx_posiciones.p, 0)   + excluded.p,
      gf  = coalesce(ligamx_posiciones.gf, 0)  + excluded.gf,
      gc  = coalesce(ligamx_posiciones.gc, 0)  + excluded.gc,
      dg  = coalesce(ligamx_posiciones.dg, 0)  + excluded.dg,
      pts = coalesce(ligamx_posiciones.pts, 0) + excluded.pts,
      updated_at = now();
  else
    update public.ligamx_posiciones set
      pj  = coalesce(pj, 0)  + p_s,
      g   = coalesce(g, 0)   + v_g,
      e   = coalesce(e, 0)   + v_e,
      p   = coalesce(p, 0)   + v_p,
      gf  = coalesce(gf, 0)  + p_gf * p_s,
      gc  = coalesce(gc, 0)  + p_gc * p_s,
      dg  = coalesce(dg, 0)  + (p_gf - p_gc) * p_s,
      pts = coalesce(pts, 0) + v_g * 3 + v_e,
      updated_at = now()
    where temporada = p_temporada and equipo = p_equipo;
  end if;
end $$;

create or replace function public.trg_posiciones_ligamx() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  grupos text[] := array['LMX','LMX9','LMX10','LMX11'];
begin
  if (OLD.estado, OLD.grupo, OLD.temporada, OLD.equipo_local, OLD.equipo_visitante, OLD.goles_local, OLD.goles_visitante)
     is not distinct from
     (NEW.estado, NEW.grupo, NEW.temporada, NEW.equipo_local, NEW.equipo_visitante, NEW.goles_local, NEW.goles_visitante)
  then
    return null;
  end if;

  if OLD.estado = 'finalizado' and OLD.grupo = any(grupos)
     and OLD.goles_local is not null and OLD.goles_visitante is not null then
    perform public._lmx_aplicar(OLD.temporada, OLD.equipo_local,     OLD.goles_local,     OLD.goles_visitante, -1);
    perform public._lmx_aplicar(OLD.temporada, OLD.equipo_visitante, OLD.goles_visitante, OLD.goles_local,     -1);
  end if;

  if NEW.estado = 'finalizado' and NEW.grupo = any(grupos)
     and NEW.goles_local is not null and NEW.goles_visitante is not null then
    perform public._lmx_aplicar(NEW.temporada, NEW.equipo_local,     NEW.goles_local,     NEW.goles_visitante, 1);
    perform public._lmx_aplicar(NEW.temporada, NEW.equipo_visitante, NEW.goles_visitante, NEW.goles_local,     1);
  end if;

  return null;
end $$;

drop trigger if exists trg_posiciones_ligamx on public.quiniela_partidos;
create trigger trg_posiciones_ligamx
  after update of estado, grupo, temporada, equipo_local, equipo_visitante, goles_local, goles_visitante
  on public.quiniela_partidos
  for each row
  when ((OLD.estado = 'finalizado' or NEW.estado = 'finalizado')
        and (OLD.grupo in ('LMX','LMX9','LMX10','LMX11') or NEW.grupo in ('LMX','LMX9','LMX10','LMX11')))
  execute function public.trg_posiciones_ligamx();

-- ── Champions ────────────────────────────────────────────────────────────
create or replace function public._ucl_aplicar(
  p_temporada text, p_equipo text, p_gf int, p_gc int, p_s int
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_eq text := public.ucl_norm_equipo(p_equipo);
  v_g int := (p_gf > p_gc)::int * p_s;
  v_e int := (p_gf = p_gc)::int * p_s;
  v_p int := (p_gf < p_gc)::int * p_s;
begin
  if p_s > 0 then
    insert into public.ucl_posiciones (temporada, equipo, pj, g, e, p, gf, gc, dg, pts, updated_at)
    values (p_temporada, v_eq, p_s, v_g, v_e, v_p, p_gf * p_s, p_gc * p_s,
            (p_gf - p_gc) * p_s, v_g * 3 + v_e, now())
    on conflict (temporada, equipo) do update set
      pj  = coalesce(ucl_posiciones.pj, 0)  + excluded.pj,
      g   = coalesce(ucl_posiciones.g, 0)   + excluded.g,
      e   = coalesce(ucl_posiciones.e, 0)   + excluded.e,
      p   = coalesce(ucl_posiciones.p, 0)   + excluded.p,
      gf  = coalesce(ucl_posiciones.gf, 0)  + excluded.gf,
      gc  = coalesce(ucl_posiciones.gc, 0)  + excluded.gc,
      dg  = coalesce(ucl_posiciones.dg, 0)  + excluded.dg,
      pts = coalesce(ucl_posiciones.pts, 0) + excluded.pts,
      updated_at = now();
  else
    update public.ucl_posiciones set
      pj  = coalesce(pj, 0)  + p_s,
      g   = coalesce(g, 0)   + v_g,
      e   = coalesce(e, 0)   + v_e,
      p   = coalesce(p, 0)   + v_p,
      gf  = coalesce(gf, 0)  + p_gf * p_s,
      gc  = coalesce(gc, 0)  + p_gc * p_s,
      dg  = coalesce(dg, 0)  + (p_gf - p_gc) * p_s,
      pts = coalesce(pts, 0) + v_g * 3 + v_e,
      updated_at = now()
    where temporada = p_temporada and equipo = v_eq;
  end if;
end $$;

-- Re-ranking: pts DESC, dg DESC, gf DESC. Los empates exactos conservan su pos actual (luego equipo)
-- para que el orden no cambie arbitrariamente entre ejecuciones.
create or replace function public._ucl_reranking(p_temporada text) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.ucl_posiciones
  set pos = ranking.pos
  from (
    select id,
           row_number() over (
             order by pts desc, dg desc, gf desc, pos asc nulls last, equipo
           )::int as pos
    from public.ucl_posiciones
    where temporada = p_temporada
  ) as ranking
  where ucl_posiciones.id = ranking.id
    and ucl_posiciones.temporada = p_temporada
    and ucl_posiciones.pos is distinct from ranking.pos;
end $$;

create or replace function public.trg_posiciones_ucl() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  grupos text[] := array['UCL','UCL2','UCL3'];
begin
  if (OLD.estado, OLD.grupo, OLD.temporada, OLD.equipo_local, OLD.equipo_visitante, OLD.goles_local, OLD.goles_visitante)
     is not distinct from
     (NEW.estado, NEW.grupo, NEW.temporada, NEW.equipo_local, NEW.equipo_visitante, NEW.goles_local, NEW.goles_visitante)
  then
    return null;
  end if;

  if OLD.estado = 'finalizado' and OLD.grupo = any(grupos)
     and OLD.goles_local is not null and OLD.goles_visitante is not null then
    perform public._ucl_aplicar(OLD.temporada, OLD.equipo_local,     OLD.goles_local,     OLD.goles_visitante, -1);
    perform public._ucl_aplicar(OLD.temporada, OLD.equipo_visitante, OLD.goles_visitante, OLD.goles_local,     -1);
    perform public._ucl_reranking(OLD.temporada);
  end if;

  if NEW.estado = 'finalizado' and NEW.grupo = any(grupos)
     and NEW.goles_local is not null and NEW.goles_visitante is not null then
    perform public._ucl_aplicar(NEW.temporada, NEW.equipo_local,     NEW.goles_local,     NEW.goles_visitante, 1);
    perform public._ucl_aplicar(NEW.temporada, NEW.equipo_visitante, NEW.goles_visitante, NEW.goles_local,     1);
    perform public._ucl_reranking(NEW.temporada);
  end if;

  return null;
end $$;

drop trigger if exists trg_posiciones_ucl on public.quiniela_partidos;
create trigger trg_posiciones_ucl
  after update of estado, grupo, temporada, equipo_local, equipo_visitante, goles_local, goles_visitante
  on public.quiniela_partidos
  for each row
  when ((OLD.estado = 'finalizado' or NEW.estado = 'finalizado')
        and (OLD.grupo in ('UCL','UCL2','UCL3') or NEW.grupo in ('UCL','UCL2','UCL3')))
  execute function public.trg_posiciones_ucl();
