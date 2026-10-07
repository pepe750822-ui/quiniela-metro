-- Tabla de posiciones de Champions League (fase de liga, 36 equipos)
create table if not exists public.ucl_posiciones (
  id          uuid primary key default gen_random_uuid(),
  temporada   text not null,
  pos         integer,
  equipo      text not null,
  pj          integer default 0,
  g           integer default 0,
  e           integer default 0,
  p           integer default 0,
  gf          integer default 0,
  gc          integer default 0,
  dg          integer default 0,
  pts         integer default 0,
  updated_at  timestamptz default now()
);

alter table public.ucl_posiciones enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policy
    where polrelid = 'public.ucl_posiciones'::regclass
      and polname = 'todos pueden ver ucl posiciones'
  ) then
    create policy "todos pueden ver ucl posiciones"
      on public.ucl_posiciones for select using (true);
  end if;
end $$;
