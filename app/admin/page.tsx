'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Partido, Jugador, Pozo, Participacion } from '@/types';
import { emailCorto, mostrarNombre, getNombreJornada, getMontoJornada, BANDERAS_EQUIPOS } from '@/lib/utils';
import { toast } from 'sonner';
import { Bandera } from '@/components/Bandera';

interface ParticipacionConNombre extends Participacion {
  jugadorNombre: string;
  jugadorEmail: string;
  jugadorApodo: string | null;
  jugadorReferencia: string | null;
  quinielaNombre: string | null;
}

const mostrarNombreParticipante = (p: ParticipacionConNombre) => {
  const base = p.jugadorApodo || p.jugadorNombre.split(' ')[0] || 'Sin nombre';
  return p.quinielaNombre ? `${base} — 🎫 ${p.quinielaNombre}` : base;
};

const formatPagadoAt = (ts?: string | null) => {
  if (!ts) return null;
  const d = new Date(ts);
  return d.toLocaleString('es-MX', { timeZone: 'America/Mexico_City', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
};

const timeAgo = (date: string) => {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'hace un momento';
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `hace ${days}d`;
};

const inicialesJugador = (j: { nombre: string; apodo?: string | null }) =>
  (j.apodo || j.nombre || 'J').substring(0, 2).toUpperCase();

export default function AdminPage() {
  const router = useRouter();
  const [partidos, setPartidos]   = useState<Partido[]>([]);
  const [loading, setLoading]     = useState(true);
  const [isAdmin, setIsAdmin]     = useState(false);
  const [adminId, setAdminId]     = useState<string | null>(null);
  const [resultados, setResultados] = useState<Record<string, { local: number; visitante: number }>>({});
  const [guardando, setGuardando]   = useState<string | null>(null);
  const [extras, setExtras] = useState<Record<string, {
    clasificado: string;
    como_termino: 'reglamentario' | 'tiempo_extra' | 'penales';
  }>>({});

  // Apodos
  const [jugadores, setJugadores] = useState<Jugador[]>([]);

  // Pozos
  const [pozos, setPozos]                   = useState<Pozo[]>([]);
  const [participaciones, setParticipaciones] = useState<ParticipacionConNombre[]>([]);
  const [confirmando, setConfirmando]       = useState<string | null>(null);
  const [declarando, setDeclarando]         = useState<number | null>(null);
  const [declarandoUltimo, setDeclarandoUltimo] = useState<number | null>(null);
  const [declarandoCampeon, setDeclarandoCampeon] = useState(false);
  const [equipoCampeonManual, setEquipoCampeonManual] = useState('');
  const [bonoCampeonLoading, setBonoCampeonLoading] = useState(false);
  const [bonoCampeonResult, setBonoCampeonResult] = useState<string | null>(null);
  const [confirmandoBono, setConfirmandoBono] = useState(false);
  const [campeonJ6Equipo, setCampeonJ6Equipo] = useState('');
  const [campeonJ6Loading, setCampeonJ6Loading] = useState(false);
  const [campeonJ6Result, setCampeonJ6Result] = useState<string | null>(null);
  const [confirmandoCampeonJ6, setConfirmandoCampeonJ6] = useState(false);

  // Registrar pago manual
  const [pagoJugadorId, setPagoJugadorId] = useState('');
  const [pagoJornada, setPagoJornada]     = useState<number>(1);
  const [registrando, setRegistrando]     = useState(false);

  // Edición de apodos y referencias
  const [editandoApodo, setEditandoApodo] = useState<string | null>(null);
  const [editandoReferencia, setEditandoReferencia] = useState<string | null>(null);
  const [referenciaTemp, setReferenciaTemp] = useState('');

  // Actualización automática de resultados
  const [actualizando, setActualizando] = useState(false);
  const [apodoTemp, setApodoTemp]         = useState('');

  // CSV respaldo
  const [jornadaCSV, setJornadaCSV]   = useState<number>(1);
  const [descargando, setDescargando] = useState(false);

  // Notas del admin (localStorage)
  const NOTAS_KEY = 'admin_notas';
  const [notas, setNotas] = useState<{ texto: string; fecha: string }[]>([]);
  const [nuevaNota, setNuevaNota] = useState('');

  // Magic Link
  const [emailMagic, setEmailMagic] = useState('');
  const [magicLink, setMagicLink] = useState('');
  const [generandoLink, setGenerandoLink] = useState(false);

  // Acordeones
  const [seccionesAbiertas, setSeccionesAbiertas] = useState({
    faseFinalJ6: true,
    pago: false,
    pozos: false,
    apodos: false,
    usuarios: false,
    resultados: false,
    notas: false,
    campeon: false,
    bonoCampeon: false,
    campeonJ6: false,
    magicLink: false,
    grupos: false,
  });
  const toggleSeccion = (seccion: keyof typeof seccionesAbiertas) => {
    setSeccionesAbiertas(prev => ({ ...prev, [seccion]: !prev[seccion] }));
  };

  // POZOS — jornada abierta
  const [jornadaAbierta, setJornadaAbierta] = useState<number>(1);

  // Grupos Mundial
  const [grupos, setGrupos] = useState<any[]>([]);
  const [grupoTabAdmin, setGrupoTabAdmin] = useState('A');
  const [editGrupo, setEditGrupo] = useState<Record<string, any>>({});
  const [guardandoEquipo, setGuardandoEquipo] = useState<string | null>(null);
  const [recalculando, setRecalculando] = useState(false);

  const cargarGrupos = async () => {
    const { data } = await supabase
      .from('quiniela_grupos')
      .select('*')
      .order('pts', { ascending: false })
      .order('dg', { ascending: false });
    setGrupos(data || []);
  };

  const recalcularGrupos = async () => {
    setRecalculando(true);
    const { data: partidos } = await supabase
      .from('quiniela_partidos')
      .select('*')
      .eq('estado', 'finalizado')
      .in('grupo', ['A','B','C','D','E','F','G','H','I','J','K','L']);

    if (!partidos || partidos.length === 0) {
      toast.error('No hay partidos finalizados en grupos');
      setRecalculando(false);
      return;
    }

    const stats: Record<string, { pj:number; g:number; e:number; p:number; gf:number; gc:number }> = {};

    partidos.forEach(partido => {
      const local = partido.equipo_local;
      const visitante = partido.equipo_visitante;
      const gl = partido.goles_local ?? 0;
      const gv = partido.goles_visitante ?? 0;

      if (!stats[local])     stats[local]     = { pj:0, g:0, e:0, p:0, gf:0, gc:0 };
      if (!stats[visitante]) stats[visitante] = { pj:0, g:0, e:0, p:0, gf:0, gc:0 };

      stats[local].pj++;  stats[local].gf  += gl;  stats[local].gc  += gv;
      if (gl > gv)      stats[local].g++;
      else if (gl === gv) stats[local].e++;
      else              stats[local].p++;

      stats[visitante].pj++;  stats[visitante].gf += gv;  stats[visitante].gc += gl;
      if (gv > gl)      stats[visitante].g++;
      else if (gv === gl) stats[visitante].e++;
      else              stats[visitante].p++;
    });

    await Promise.all(
      Object.entries(stats).map(([equipo, s]) =>
        supabase
          .from('quiniela_grupos')
          .update({ pj: s.pj, g: s.g, e: s.e, p: s.p, gf: s.gf, gc: s.gc, updated_at: new Date().toISOString() })
          .eq('equipo', equipo)
      )
    );

    toast.success(`✅ Grupos actualizados (${partidos.length} partidos)`);
    setRecalculando(false);
    await cargarGrupos();
  };

  const guardarEquipoGrupo = async (equipo: any) => {
    const vals = editGrupo[equipo.id] ?? {};
    setGuardandoEquipo(equipo.id);
    const { error } = await supabase
      .from('quiniela_grupos')
      .update({
        pj: Number(vals.pj ?? equipo.pj),
        g: Number(vals.g ?? equipo.g),
        e: Number(vals.e ?? equipo.e),
        p: Number(vals.p ?? equipo.p),
        gf: Number(vals.gf ?? equipo.gf),
        gc: Number(vals.gc ?? equipo.gc),
        updated_at: new Date().toISOString(),
      })
      .eq('id', equipo.id);
    setGuardandoEquipo(null);
    if (error) toast.error('Error: ' + error.message);
    else { toast.success('✅ Guardado'); await cargarGrupos(); }
  };

  const generarMagicLink = async () => {
    if (!emailMagic.trim()) return;
    setGenerandoLink(true);
    try {
      const res = await fetch('/api/admin/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailMagic.trim(),
          secret: 'quiniela-metro-cleanup-2026'
        })
      });
      const data = await res.json();
      if (data.link) {
        setMagicLink(data.link);
        toast.success('✅ Link generado');
      } else {
        toast.error('Error: ' + data.error);
      }
    } catch (e) {
      toast.error('Error al generar link');
    }
    setGenerandoLink(false);
  };

  // ── Notas localStorage ───────────────────────────────

  useEffect(() => {
    const guardadas = localStorage.getItem(NOTAS_KEY);
    if (guardadas) setNotas(JSON.parse(guardadas));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const agregarNota = () => {
    if (!nuevaNota.trim()) return;
    const nuevas = [{
      texto: nuevaNota.trim(),
      fecha: new Date().toLocaleString('es-MX', {
        timeZone: 'America/Mexico_City',
        day: '2-digit', month: '2-digit',
        hour: '2-digit', minute: '2-digit',
      }),
    }, ...notas];
    setNotas(nuevas);
    localStorage.setItem(NOTAS_KEY, JSON.stringify(nuevas));
    setNuevaNota('');
    toast.success('✅ Nota guardada');
  };

  const eliminarNota = (index: number) => {
    const nuevas = notas.filter((_, i) => i !== index);
    setNotas(nuevas);
    localStorage.setItem(NOTAS_KEY, JSON.stringify(nuevas));
  };

  // ── Loaders ──────────────────────────────────────────

  const cargarPartidos = async () => {
    const { data: ps } = await supabase
      .from('quiniela_partidos')
      .select('*')
      .not('equipo_local', 'eq', 'A definir')
      .order('fecha_hora');
    setPartidos((ps as Partido[]) ?? []);
  };

  const cargarJugadores = async () => {
    const { data } = await supabase
      .from('quiniela_jugadores')
      .select('*')
      .order('created_at', { ascending: true });
    setJugadores((data as Jugador[]) ?? []);
  };

  const cargarPozos = async () => {
    // Query 1: pozos y participaciones (sin join para evitar fallos silenciosos de RLS)
    const [{ data: pz }, { data: pt, error: ptError }] = await Promise.all([
      supabase.from('quiniela_pozo').select('*').order('jornada'),
      supabase.from('quiniela_participaciones').select('id, user_id, jornada, pagado, monto, publicado, created_at, pagado_at, quiniela_extra_id').order('created_at'),
    ]);

    if (ptError) console.error('Error cargando participaciones:', ptError);
    setPozos((pz as Pozo[]) ?? []);

    const lista = (pt ?? []) as Participacion[];
    if (!lista.length) { setParticipaciones([]); return; }

    // Query 2: nombres por user_id (query separada, más robusta que join)
    const userIds = [...new Set(lista.map(p => p.user_id))];
    const { data: jugs, error: jugsError } = await supabase
      .from('quiniela_jugadores')
      .select('id, nombre, email, apodo, referencia_admin')
      .in('id', userIds);

    if (jugsError) console.error('Error cargando jugadores para pozos:', jugsError);

    const jugMap: Record<string, { nombre: string; email: string; apodo: string | null; referencia_admin: string | null }> = {};
    (jugs ?? []).forEach((j: { id: string; nombre: string; email: string; apodo: string | null; referencia_admin: string | null }) => {
      jugMap[j.id] = { nombre: j.nombre, email: j.email, apodo: j.apodo, referencia_admin: j.referencia_admin };
    });

    // Query 3: nombres de quinielas extra
    const quinielaIds = [...new Set(lista.map(p => p.quiniela_extra_id).filter(Boolean))] as string[];
    const quinielaMap: Record<string, string> = {};
    if (quinielaIds.length) {
      const { data: quinielasData } = await supabase
        .from('quiniela_extra')
        .select('id, nombre')
        .in('id', quinielaIds);
      (quinielasData ?? []).forEach((q: { id: string; nombre: string }) => {
        quinielaMap[q.id] = q.nombre;
      });
    }

    const enriquecidas: ParticipacionConNombre[] = lista.map(p => ({
      ...p,
      jugadorNombre:     jugMap[p.user_id]?.nombre          ?? p.user_id.slice(0, 8),
      jugadorEmail:      jugMap[p.user_id]?.email           ?? '',
      jugadorApodo:      jugMap[p.user_id]?.apodo           ?? null,
      jugadorReferencia: jugMap[p.user_id]?.referencia_admin ?? null,
      quinielaNombre:    p.quiniela_extra_id ? (quinielaMap[p.quiniela_extra_id] ?? null) : null,
    }));
    setParticipaciones(enriquecidas);
  };

  useEffect(() => {
    const verificar = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      setAdminId(user.id);
      const { data: jugador } = await supabase
        .from('quiniela_jugadores')
        .select('rol')
        .eq('id', user.id)
        .maybeSingle();

      if (jugador?.rol !== 'admin') {
        router.push('/');
        return;
      }

      setIsAdmin(true);

      await Promise.all([cargarPartidos(), cargarJugadores()]);

      await cargarPozos();
      setLoading(false);
    };

    verificar();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Realtime: recargar jugadores cuando cambia la tabla
  useEffect(() => {
    if (!isAdmin) return;
    const channel = supabase
      .channel('jugadores-cambios')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quiniela_jugadores' },
        () => { cargarJugadores(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  useEffect(() => {
    if (partidos.length > 0 && seccionesAbiertas.resultados) {
      const primerPendiente = partidos.find(p => p.estado === 'pendiente');
      if (primerPendiente) {
        setTimeout(() => {
          const el = document.getElementById(`partido-${primerPendiente.id}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 500);
      }
    }
  }, [partidos, seccionesAbiertas.resultados]);

  // ── Handlers resultados ───────────────────────────────

  const handleGuardar = async (partidoId: string) => {
    const resultado = resultados[partidoId];
    if (resultado === undefined) {
      toast.error('Ingresa los marcadores primero');
      return;
    }
    const partidoObj = partidos.find(p => p.id === partidoId);
    const ext = extras[partidoId];
    const esElim = (partidoObj?.jornada ?? 0) >= 5;

    if (esElim && (!ext?.clasificado || !ext?.como_termino)) {
      toast.error('Debes seleccionar quién clasificó y cómo terminó');
      return;
    }

    setGuardando(partidoId);
    const updatePayload: Record<string, unknown> = {
      goles_local: resultado.local,
      goles_visitante: resultado.visitante,
      estado: 'finalizado',
    };
    if (esElim) {
      updatePayload.clasificado  = ext?.clasificado  || null;
      updatePayload.como_termino = ext?.como_termino || 'reglamentario';
    }
    console.log('Guardando resultado:', partidoId, updatePayload);
    const { error } = await supabase
      .from('quiniela_partidos')
      .update(updatePayload)
      .eq('id', partidoId);
    console.log('Resultado de UPDATE:', error);
    setGuardando(null);
    if (error) {
      toast.error('Error: ' + error.message);
    } else {
      toast.success('✅ Resultado guardado');
      setResultados(prev => { const n = { ...prev }; delete n[partidoId]; return n; });
      await cargarPartidos();

      if (partidoObj?.grupo === 'FIN') {
        try {
          const ganador = resultado.local > resultado.visitante
            ? partidoObj.equipo_local
            : partidoObj.equipo_visitante;
          await declararCampeonLogic(ganador);
        } catch (e: unknown) {
          toast.error('Error al declarar campeón: ' + (e as Error).message);
        }
      }
    }
  };

  const handleLimpiar = async (partidoId: string) => {
    if (!confirm('¿Limpiar el resultado de este partido?')) return;
    const { error } = await supabase
      .from('quiniela_partidos')
      .update({ goles_local: null, goles_visitante: null, estado: 'pendiente', clasificado: null, como_termino: null })
      .eq('id', partidoId);
    if (error) {
      toast.error('Error: ' + error.message);
    } else {
      setExtras(prev => { const n = { ...prev }; delete n[partidoId]; return n; });
      toast.success('🔄 Resultado limpiado');
      await cargarPartidos();
    }
  };

  // ── Handlers pozos ───────────────────────────────────

  const handleConfirmarPago = async (p: ParticipacionConNombre) => {
    setConfirmando(p.id);

    // Marcar como pagado
    const { error: e1 } = await supabase
      .from('quiniela_participaciones')
      .update({ pagado: true, pagado_at: new Date().toISOString() })
      .eq('id', p.id);

    if (e1) { toast.error('Error al confirmar pago'); setConfirmando(null); return; }

    // Incrementar pozo
    const pozo = pozos.find(pz => pz.jornada === p.jornada);
    const monto = getMontoJornada(p.jornada);
    const { error: e2 } = await supabase
      .from('quiniela_pozo')
      .update({
        total_mxn:     (pozo?.total_mxn ?? 0) + monto,
        participantes: (pozo?.participantes ?? 0) + 1,
      })
      .eq('jornada', p.jornada);

    setConfirmando(null);
    if (e2) {
      toast.error('Participación confirmada pero error al actualizar pozo');
    } else {
      toast.success(`✅ Pago de ${mostrarNombreParticipante(p)} confirmado (+$${monto} al pozo ${getNombreJornada(p.jornada)})`);
      cargarPozos();
    }
  };

  const handleEliminarParticipacion = async (p: ParticipacionConNombre) => {
    if (!confirm(`¿Eliminar participación de ${mostrarNombreParticipante(p)} en ${getNombreJornada(p.jornada)}?`)) return;

    const { data: partidos } = await supabase
      .from('quiniela_partidos')
      .select('id')
      .eq('jornada', p.jornada);

    const partidoIds = partidos?.map(pt => pt.id) ?? [];
    if (partidoIds.length) {
      const baseDeleteQuery = supabase
        .from('quiniela_predicciones')
        .delete()
        .eq('user_id', p.user_id)
        .in('partido_id', partidoIds);
      await (p.quiniela_extra_id
        ? baseDeleteQuery.eq('quiniela_extra_id', p.quiniela_extra_id)
        : baseDeleteQuery.is('quiniela_extra_id', null));
    }

    await supabase
      .from('quiniela_participaciones')
      .delete()
      .eq('id', p.id);

    if (p.pagado) {
      const pozo = pozos.find(pz => pz.jornada === p.jornada);
      const monto = getMontoJornada(p.jornada);
      if (pozo) {
        await supabase
          .from('quiniela_pozo')
          .update({
            total_mxn:     Math.max(0, (pozo.total_mxn ?? 0) - monto),
            participantes: Math.max(0, (pozo.participantes ?? 0) - 1),
          })
          .eq('jornada', p.jornada);
      }
    }

    toast.success(`🗑️ Participación de ${mostrarNombreParticipante(p)} eliminada`);
    cargarPozos();
  };

  const handleDeclararGanador = async (jornada: number) => {
    setDeclarando(jornada);

    // Get all paid+published participants (including quiniela_extra_id)
    const { data: parts } = await supabase
      .from('quiniela_participaciones')
      .select('user_id, quiniela_extra_id')
      .eq('jornada', jornada)
      .eq('pagado', true)
      .eq('publicado', true);

    if (!parts || parts.length === 0) {
      toast.error('No hay participantes pagados para esta jornada');
      setDeclarando(null);
      return;
    }

    const userIds = [...new Set(parts.map(p => p.user_id))];

    // Get finalizado partido IDs for this jornada
    const { data: partidosFin } = await supabase
      .from('quiniela_partidos')
      .select('id')
      .eq('jornada', jornada)
      .eq('estado', 'finalizado');
    const partidoIds = (partidosFin ?? []).map(p => p.id);

    if (partidoIds.length === 0) {
      toast.error('No hay partidos finalizados en esta jornada');
      setDeclarando(null);
      return;
    }

    // Get puntos_ganados grouped by user_id + quiniela_extra_id
    const { data: predicciones } = await supabase
      .from('quiniela_predicciones')
      .select('user_id, quiniela_extra_id, puntos_ganados')
      .in('user_id', userIds)
      .in('partido_id', partidoIds);

    // Sum points per user_id + quiniela_extra_id combo
    const puntajes: Record<string, number> = {};
    (predicciones ?? []).forEach((p: { user_id: string; quiniela_extra_id: string | null; puntos_ganados: number | null }) => {
      const key = `${p.user_id}:${p.quiniela_extra_id ?? 'null'}`;
      puntajes[key] = (puntajes[key] || 0) + (p.puntos_ganados || 0);
    });

    // Build ranking: each participation entry is separate
    const ranking = parts.map(p => {
      const key = `${p.user_id}:${p.quiniela_extra_id ?? 'null'}`;
      return { user_id: p.user_id, quiniela_extra_id: p.quiniela_extra_id, puntos: puntajes[key] || 0 };
    }).sort((a, b) => b.puntos - a.puntos);

    if (ranking.length === 0) {
      toast.error('No hay datos de puntuación para esta jornada');
      setDeclarando(null);
      return;
    }

    const ganador = ranking[0];

    // Get winner name
    const { data: jugGanador } = await supabase
      .from('quiniela_jugadores')
      .select('nombre, apodo')
      .eq('id', ganador.user_id)
      .maybeSingle();

    const ganadorNombre = mostrarNombre({ nombre: jugGanador?.nombre ?? 'Desconocido', apodo: jugGanador?.apodo ?? null });

    const { error: e2 } = await supabase
      .from('quiniela_pozo')
      .update({ ganador_id: ganador.user_id, ganador_nombre: ganadorNombre, estado: 'cerrado' })
      .eq('jornada', jornada);

    setDeclarando(null);
    if (e2) {
      toast.error('Error al declarar ganador');
    } else {
      toast.success(`🏆 Ganador ${getNombreJornada(jornada)}: ${ganadorNombre}`);
      cargarPozos();
    }
  };

  const declararUltimo = async (jornada: number) => {
    setDeclarandoUltimo(jornada);

    // Get all paid+published participants (including quiniela_extra_id)
    const { data: parts } = await supabase
      .from('quiniela_participaciones')
      .select('user_id, quiniela_extra_id')
      .eq('jornada', jornada)
      .eq('pagado', true)
      .eq('publicado', true);

    if (!parts || parts.length === 0) {
      toast.error('No hay participantes pagados para esta jornada');
      setDeclarandoUltimo(null);
      return;
    }

    const userIds = [...new Set(parts.map(p => p.user_id))];

    // Get finalizado partido IDs for this jornada
    const { data: partidosFin } = await supabase
      .from('quiniela_partidos')
      .select('id')
      .eq('jornada', jornada)
      .eq('estado', 'finalizado');
    const partidoIds = (partidosFin ?? []).map(p => p.id);

    if (partidoIds.length === 0) {
      toast.error('No hay partidos finalizados en esta jornada');
      setDeclarandoUltimo(null);
      return;
    }

    // Get puntos_ganados grouped by user_id + quiniela_extra_id
    const { data: predicciones } = await supabase
      .from('quiniela_predicciones')
      .select('user_id, quiniela_extra_id, puntos_ganados')
      .in('user_id', userIds)
      .in('partido_id', partidoIds);

    // Sum points per user_id + quiniela_extra_id combo
    const puntajes: Record<string, number> = {};
    (predicciones ?? []).forEach((p: { user_id: string; quiniela_extra_id: string | null; puntos_ganados: number | null }) => {
      const key = `${p.user_id}:${p.quiniela_extra_id ?? 'null'}`;
      puntajes[key] = (puntajes[key] || 0) + (p.puntos_ganados || 0);
    });

    // Build ranking: each participation entry is separate
    const ranking = parts.map(p => {
      const key = `${p.user_id}:${p.quiniela_extra_id ?? 'null'}`;
      return { user_id: p.user_id, quiniela_extra_id: p.quiniela_extra_id, puntos: puntajes[key] || 0 };
    }).sort((a, b) => a.puntos - b.puntos);

    if (ranking.length === 0) {
      toast.error('No hay datos de puntuación para esta jornada');
      setDeclarandoUltimo(null);
      return;
    }

    const ultimo = ranking[0];

    const { error } = await supabase
      .from('quiniela_jugadores')
      .update({ badge_ultimo: `J${jornada}` })
      .eq('id', ultimo.user_id);

    setDeclarandoUltimo(null);
    if (error) {
      toast.error('Error al asignar badge');
    } else {
      toast.success(`🤡 Último lugar J${jornada} declarado`);
      cargarJugadores();
    }
  };

  const declararCampeonLogic = async (ganador: string) => {
    // Reset all previous badges first (handles corrections)
    await supabase
      .from('quiniela_jugadores')
      .update({ badge_campeon: null })
      .not('badge_campeon', 'is', null);

    const { data: acertaron } = await supabase
      .from('quiniela_campeon_picks')
      .select('user_id')
      .eq('equipo', ganador);

    const userIds = (acertaron ?? []).map((p: { user_id: string }) => p.user_id);

    if (userIds.length > 0) {
      const { error } = await supabase
        .from('quiniela_jugadores')
        .update({ badge_campeon: ganador })
        .in('id', userIds);
      if (error) throw error;
    }

    toast.success(`🏆 Campeón declarado — ${userIds.length} usuario${userIds.length !== 1 ? 's' : ''} acertaron`);
  };

  const declararCampeonManual = async () => {
    if (!equipoCampeonManual) return;
    setDeclarandoCampeon(true);
    try {
      await declararCampeonLogic(equipoCampeonManual);
      cargarJugadores();
    } catch (e: unknown) {
      toast.error('Error: ' + (e as Error).message);
    }
    setDeclarandoCampeon(false);
  };

  const aplicarBonoCampeon = async () => {
    setConfirmandoBono(false);
    setBonoCampeonLoading(true);
    setBonoCampeonResult(null);
    try {
      const res = await fetch('/api/admin/bono-campeon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: process.env.NEXT_PUBLIC_CLEANUP_SECRET || 'quiniela-metro-cleanup-2026' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setBonoCampeonResult('✅ Bono de campeón aplicado correctamente');
      toast.success('🏆 +5 pts a quienes acertaron el campeón');
    } catch (e: unknown) {
      const msg = (e as Error).message;
      setBonoCampeonResult(`❌ Error: ${msg}`);
      toast.error(msg);
    }
    setBonoCampeonLoading(false);
  };

  const declararCampeonJ6 = async () => {
    if (!campeonJ6Equipo) return;
    setConfirmandoCampeonJ6(false);
    setCampeonJ6Loading(true);
    setCampeonJ6Result(null);
    try {
      await supabase
        .from('quiniela_pozo')
        .update({ campeon_j6: campeonJ6Equipo })
        .eq('jornada', 6);

      const { data: picks, error: pickErr } = await supabase
        .from('quiniela_prediccion_campeon')
        .select('user_id, quiniela_extra_id')
        .eq('jornada', 6)
        .eq('equipo', campeonJ6Equipo);
      if (pickErr) throw pickErr;

      await supabase.from('quiniela_bono_campeon').delete().eq('jornada', 6);

      if (picks && picks.length > 0) {
        const { error: insErr } = await supabase
          .from('quiniela_bono_campeon')
          .insert(
            (picks as { user_id: string; quiniela_extra_id: string | null }[]).map(p => ({
              user_id: p.user_id,
              quiniela_extra_id: p.quiniela_extra_id ?? null,
              jornada: 6,
              equipo: campeonJ6Equipo,
              puntos: 5,
            }))
          );
        if (insErr) throw insErr;
      }

      const n = picks?.length ?? 0;
      setCampeonJ6Result(`✅ Campeón J6 declarado — ${n} usuario${n !== 1 ? 's' : ''} recibe${n !== 1 ? 'n' : ''} +5 pts`);
      toast.success(`🏆 +5 pts para ${n} usuario${n !== 1 ? 's' : ''} que acertaron en J6`);
    } catch (e: unknown) {
      const msg = (e as Error).message;
      setCampeonJ6Result(`❌ Error: ${msg}`);
      toast.error(msg);
    }
    setCampeonJ6Loading(false);
  };

  const registrarPago = async () => {
    if (!pagoJugadorId || !pagoJornada) return;
    setRegistrando(true);

    const jugador = jugadores.find(j => j.id === pagoJugadorId);

    const { data: partExistente } = await supabase
      .from('quiniela_participaciones')
      .select('id, pagado')
      .eq('user_id', pagoJugadorId)
      .eq('jornada', pagoJornada)
      .maybeSingle();

    if (partExistente) {
      if (partExistente.pagado) {
        toast.error(`${mostrarNombre(jugador ?? { nombre: 'Jugador', apodo: null })} ya tiene pago confirmado en ${getNombreJornada(pagoJornada)}`);
        setRegistrando(false);
        return;
      }
      const { error } = await supabase
        .from('quiniela_participaciones')
        .update({ pagado: true, pagado_at: new Date().toISOString() })
        .eq('id', partExistente.id);
      if (error) { toast.error('Error al actualizar participación'); setRegistrando(false); return; }
    } else {
      const monto = getMontoJornada(pagoJornada);
      const { error } = await supabase
        .from('quiniela_participaciones')
        .insert({ user_id: pagoJugadorId, jornada: pagoJornada, pagado: true, monto, pagado_at: new Date().toISOString() });
      if (error) { toast.error('Error al crear participación'); setRegistrando(false); return; }
    }

    const pozo = pozos.find(pz => pz.jornada === pagoJornada);
    const montoPozo = getMontoJornada(pagoJornada);
    await supabase
      .from('quiniela_pozo')
      .update({
        total_mxn:     (pozo?.total_mxn ?? 0) + montoPozo,
        participantes: (pozo?.participantes ?? 0) + 1,
      })
      .eq('jornada', pagoJornada);

    const nombre = jugador ? mostrarNombre(jugador) : 'Jugador';
    toast.success(`✅ Pago de ${nombre} registrado en ${getNombreJornada(pagoJornada)}`);
    setPagoJugadorId('');
    setRegistrando(false);
    cargarPozos();
  };

  const descargarCSV = async () => {
    setDescargando(true);
    try {
      const ahora = new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });

      const { data: parts } = await supabase
        .from('quiniela_partidos')
        .select('id, jornada, equipo_local, equipo_visitante, goles_local, goles_visitante, estado, grupo, fecha_hora')
        .eq('jornada', jornadaCSV)
        .not('equipo_local', 'eq', 'A definir')
        .order('fecha_hora');
      const partsList = parts || [];

      const { data: partics } = await supabase
        .from('quiniela_participaciones')
        .select('id, user_id, pagado, publicado, quiniela_extra_id')
        .eq('jornada', jornadaCSV)
        .eq('pagado', true);

      const quinielaIds = [...new Set((partics || []).map((p: any) => p.quiniela_extra_id).filter(Boolean))] as string[];
      const quinielasMap: Record<string, string> = {};
      if (quinielaIds.length) {
        const { data: qd } = await supabase.from('quiniela_extra').select('id, nombre').in('id', quinielaIds);
        (qd || []).forEach((q: any) => { quinielasMap[q.id] = q.nombre; });
      }
      const particsList = (partics || []).map((p: any) => ({
        ...p,
        quiniela: p.quiniela_extra_id ? { nombre: quinielasMap[p.quiniela_extra_id] ?? null } : null,
      }));

      const userIds = [...new Set((partics || []).map((p: any) => p.user_id))];
      const { data: jugs } = await supabase.from('quiniela_jugadores').select('id, nombre, apodo, email').in('id', userIds);
      const jugsList = jugs || [];

      const csvPartidoIds = partsList.map((p: any) => p.id);
      const selectPredsCsv = 'user_id, partido_id, goles_local_pred, goles_visitante_pred, puntos_ganados, quiniela_extra_id';
      const [{ data: preds1 }, { data: preds2 }] = await Promise.all([
        supabase.from('quiniela_predicciones').select(selectPredsCsv).in('partido_id', csvPartidoIds).range(0, 999),
        supabase.from('quiniela_predicciones').select(selectPredsCsv).in('partido_id', csvPartidoIds).range(1000, 1999),
      ]);
      const predsList = [...(preds1 || []), ...(preds2 || [])];

      const metadataRow = [`"Quiniela Metro Mundial 2026"`, `"Jornada ${jornadaCSV}"`, `"Generado: ${ahora}"`, `"RESPALDO COMPLETO"`].join(',');
      const headers = [
        '"ID Participación"', '"User ID"', '"Jugador"', '"Apodo"', '"Quiniela"', '"Pagado"', '"Publicado"',
        ...partsList.map((p: any) => `"${p.equipo_local.substring(0,3).toUpperCase()}vs${p.equipo_visitante.substring(0,3).toUpperCase()}"`),
        '"TOTAL PTS"', '"EXACTOS"', '"Email"',
      ].join(',');

      const filas = particsList.map((part: any) => {
        const jugador = jugsList.find((j: any) => j.id === part.user_id) as any;
        const celdas = partsList.map((partido: any) => {
          const pred = predsList.find((p: any) =>
            p.user_id === part.user_id && p.partido_id === partido.id &&
            (p.quiniela_extra_id === part.quiniela_extra_id || (!p.quiniela_extra_id && !part.quiniela_extra_id))
          );
          if (!pred) return '""';
          return partido.estado === 'finalizado'
            ? `"${pred.puntos_ganados}pts (${pred.goles_local_pred}/${pred.goles_visitante_pred})"`
            : `"${pred.goles_local_pred}/${pred.goles_visitante_pred}"`;
        });
        const predsFinalizadas = predsList.filter((p: any) =>
          p.user_id === part.user_id &&
          (p.quiniela_extra_id === part.quiniela_extra_id || (!p.quiniela_extra_id && !part.quiniela_extra_id)) &&
          partsList.find((partido: any) => partido.id === p.partido_id && partido.estado === 'finalizado')
        );
        const total = predsFinalizadas.reduce((s: number, p: any) => s + (p.puntos_ganados || 0), 0);
        const exactos = predsFinalizadas.filter((p: any) => p.puntos_ganados === 3).length;
        return [`"${part.id}"`, `"${part.user_id}"`, `"${jugador?.nombre || ''}"`, `"${jugador?.apodo || ''}"`,
          `"${part.quiniela?.nombre || 'Principal'}"`, `"${part.pagado ? 'SI' : 'NO'}"`, `"${part.publicado ? 'SI' : 'NO'}"`,
          ...celdas, `"${total}"`, `"${exactos}"`, `"${jugador?.email || ''}"`].join(',');
      });

      const headerPartidos = ['"ID Partido"','"Jornada"','"Grupo"','"Equipo Local"','"Equipo Visitante"','"Goles Local"','"Goles Visitante"','"Estado"','"Fecha CDMX"'].join(',');
      const filasPartidos = partsList.map((p: any) => [
        `"${p.id}"`, `"${p.jornada}"`, `"${p.grupo}"`, `"${p.equipo_local}"`, `"${p.equipo_visitante}"`,
        `"${p.goles_local ?? ''}"`, `"${p.goles_visitante ?? ''}"`, `"${p.estado}"`,
        `"${new Date(p.fecha_hora).toLocaleString('es-MX', { timeZone: 'America/Mexico_City', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}"`,
      ].join(','));

      const csvContent = [metadataRow, '', '"=== PREDICCIONES Y PUNTOS ==="', headers, ...filas, '', '"=== PARTIDOS Y RESULTADOS ==="', headerPartidos, ...filasPartidos, '', `"Descargado el ${ahora}"`].join('\n');
      const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `quiniela-metro-jornada${jornadaCSV}-respaldo-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('✅ CSV descargado con respaldo completo');
    } catch {
      toast.error('Error al generar CSV');
    }
    setDescargando(false);
  };

  const guardarReferencia = async (userId: string) => {
    const { error } = await supabase
      .from('quiniela_jugadores')
      .update({ referencia_admin: referenciaTemp.trim() || null })
      .eq('id', userId);
    if (!error) {
      toast.success('Referencia guardada ✓');
      setEditandoReferencia(null);
      cargarJugadores();
    }
  };

  const actualizarResultados = async () => {
    setActualizando(true);
    try {
      const res = await fetch(
        `/api/cron/update-matches?secret=${process.env.NEXT_PUBLIC_CRON_SECRET || 'quiniela-metro-cleanup-2026'}`
      );
      const data = await res.json();
      if (data.actualizados > 0) {
        toast.success(`✅ ${data.actualizados} partidos actualizados`);
      } else {
        toast.info(`ℹ️ ${data.message || 'Sin cambios'}`);
      }
      cargarPozos();
    } catch {
      toast.error('Error al actualizar');
    }
    setActualizando(false);
  };

  // ── Guards ───────────────────────────────────────────

  const jornadasConPozo = new Set(pozos.map(p => p.jornada));
  const pozosCompletos = [...pozos];
  for (let j = 1; j <= 5; j++) {
    if (!jornadasConPozo.has(j)) {
      pozosCompletos.push({
        id: `synthetic-${j}`,
        jornada: j,
        total_mxn: 0,
        participantes: 0,
        ganador_id: null,
        ganador_nombre: null,
        estado: 'abierto',
        created_at: new Date().toISOString(),
      });
    }
  }

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="h-8 w-8 border-2 border-t-transparent rounded-full animate-spin"
        style={{ borderColor: 'var(--accent-gold)', borderTopColor: 'transparent' }} />
    </div>
  );

  if (!isAdmin) return (
    <main className="max-w-lg mx-auto px-4 pt-20 text-center space-y-2">
      <p className="text-4xl">🔒</p>
      <p style={{ color: 'var(--text-secondary)' }}>Solo administradores pueden acceder aquí.</p>
    </main>
  );

  // ── Render ───────────────────────────────────────────

  return (
    <main className="max-w-lg mx-auto px-4 pb-24 space-y-8"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1.5rem)' }}>

      {/* ── BARRA SUPERIOR ── */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {/* CSV respaldo */}
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(j => (
              <button key={j} onClick={() => setJornadaCSV(j)}
                className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all"
                style={{
                  background: jornadaCSV === j ? '#1e3a5f' : 'var(--bg-card)',
                  color: jornadaCSV === j ? '#60a5fa' : '#64748b',
                  border: `1px solid ${jornadaCSV === j ? '#3b82f6' : 'var(--border)'}`,
                }}>
                {getNombreJornada(j)}
              </button>
            ))}
          </div>
          <button
            onClick={descargarCSV}
            disabled={descargando}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs transition-all active:scale-95 disabled:opacity-50"
            style={{ background: 'var(--bg-card)', border: '1px solid #3b82f6', color: '#60a5fa', fontFamily: 'var(--font-rajdhani)' }}>
            {descargando ? '⏳' : '⬇️'} Respaldo CSV
          </button>
        </div>
        {/* Actualizar resultados */}
        <button
          onClick={actualizarResultados}
          disabled={actualizando}
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-50"
          style={{ background: '#ea580c', color: '#fff', fontFamily: 'var(--font-rajdhani)' }}>
          {actualizando ? '⏳ Actualizando...' : '🔄 Actualizar resultados'}
        </button>
      </div>

      {/* ── FASE FINAL J6 — CUARTOS DE FINAL ── */}
      <section className="space-y-1">
        <button
          onClick={() => toggleSeccion('faseFinalJ6')}
          className="w-full flex items-center justify-between px-4 py-4 rounded-xl hover:border-orange-500/50 transition-all"
          style={{ background: 'linear-gradient(135deg, rgba(234,88,12,0.18), rgba(251,191,36,0.08))', border: '2px solid rgba(234,88,12,0.5)' }}>
          <span style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.2rem', color: 'var(--accent-gold)' }}>
            🏆 FASE FINAL J6 — Cuartos de Final
          </span>
          <span style={{ color: '#64748b' }}>{seccionesAbiertas.faseFinalJ6 ? '▲' : '▼'}</span>
        </button>
        {seccionesAbiertas.faseFinalJ6 && (
          <div className="space-y-4">

            {/* Pozo J6 */}
            {(() => {
              const pozoJ6 = pozos.find(p => p.jornada === 6);
              return pozoJ6 ? (
                <div className="rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--accent-gold)', fontFamily: 'var(--font-rajdhani)' }}>💰 Pozo J6</p>
                  <div className="flex items-center justify-between">
                    <span style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.8rem', color: '#ea580c' }}>${pozoJ6.total_mxn} MXN</span>
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>👥 {pozoJ6.participantes} participantes</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full mt-1 inline-block font-bold uppercase"
                    style={{ background: 'rgba(234,88,12,0.15)', color: '#ea580c' }}>
                    {pozoJ6.estado}
                  </span>
                </div>
              ) : null;
            })()}

            {/* Participantes J6 */}
            {(() => {
              const partsJ6 = participaciones.filter(p => p.jornada === 6);
              const pagados = partsJ6.filter(p => p.pagado);
              const pendientes = partsJ6.filter(p => !p.pagado);
              if (partsJ6.length === 0) return null;
              return (
                <div className="rounded-2xl p-4 space-y-2" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--accent-gold)', fontFamily: 'var(--font-rajdhani)' }}>
                    👥 Participantes J6 — <span style={{ color: '#10b981' }}>{pagados.length} pagados</span> · <span style={{ color: '#ea580c' }}>{pendientes.length} pendientes</span>
                  </p>
                  {pagados.map(p => (
                    <div key={p.id} className="flex items-center justify-between text-xs py-0.5">
                      <span style={{ color: 'var(--text-primary)' }}>{mostrarNombreParticipante(p)}</span>
                      <span style={{ color: '#10b981' }}>✅</span>
                    </div>
                  ))}
                  {pendientes.map(p => (
                    <div key={p.id} className="flex items-center justify-between text-xs py-0.5">
                      <span style={{ color: 'var(--text-secondary)' }}>{mostrarNombreParticipante(p)}</span>
                      <span style={{ color: '#ea580c' }}>⏳</span>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Partidos J6 con resultado */}
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-widest px-1" style={{ color: 'var(--accent-gold)', fontFamily: 'var(--font-rajdhani)' }}>
                ⚽ Partidos de Cuartos (J6)
              </p>
              {partidos.filter(p => p.jornada === 6).length === 0 ? (
                <p className="text-sm text-center py-4 rounded-xl" style={{ color: '#64748b', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  Sin partidos J6 cargados aún
                </p>
              ) : (
                partidos.filter(p => p.jornada === 6).map(partido => {
                  const res = resultados[partido.id];
                  return (
                    <div key={partido.id} className="rounded-2xl p-4 space-y-3"
                      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                      <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
                        <span>{new Date(partido.fecha_hora).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/Mexico_City' })}</span>
                        <span className="px-2 py-0.5 rounded-full font-bold uppercase text-[10px]"
                          style={{
                            background: partido.estado === 'finalizado' ? 'rgba(100,116,139,0.15)' : 'rgba(234,88,12,0.15)',
                            color:      partido.estado === 'finalizado' ? '#64748b' : 'var(--accent-gold)',
                          }}>
                          {partido.estado}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-center" style={{ color: 'var(--text-primary)' }}>
                        {partido.equipo_local} vs {partido.equipo_visitante}
                      </p>
                      {partido.estado !== 'finalizado' && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-center gap-3">
                            <input type="number" min="0" max="20" placeholder="0"
                              value={res?.local ?? ''}
                              onChange={e => setResultados(prev => ({ ...prev, [partido.id]: { local: parseInt(e.target.value) || 0, visitante: prev[partido.id]?.visitante ?? 0 } }))}
                              className="w-14 h-12 text-center text-xl font-bold rounded-xl outline-none"
                              style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontFamily: 'var(--font-bebas)' }} />
                            <span className="text-xl font-bold" style={{ color: 'var(--accent-gold)', fontFamily: 'var(--font-bebas)' }}>–</span>
                            <input type="number" min="0" max="20" placeholder="0"
                              value={res?.visitante ?? ''}
                              onChange={e => setResultados(prev => ({ ...prev, [partido.id]: { local: prev[partido.id]?.local ?? 0, visitante: parseInt(e.target.value) || 0 } }))}
                              className="w-14 h-12 text-center text-xl font-bold rounded-xl outline-none"
                              style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontFamily: 'var(--font-bebas)' }} />
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <div className="flex-1">
                              <label className="block text-xs mb-1" style={{ color: '#64748b' }}>¿Quién clasificó?</label>
                              <select
                                value={extras[partido.id]?.clasificado ?? ''}
                                onChange={e => setExtras(prev => ({ ...prev, [partido.id]: { ...prev[partido.id], clasificado: e.target.value, como_termino: prev[partido.id]?.como_termino ?? 'reglamentario' } }))}
                                className="w-full rounded-lg px-2 py-1.5 text-sm outline-none"
                                style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                                <option value="">— seleccionar —</option>
                                <option value={partido.equipo_local}>{partido.equipo_local}</option>
                                <option value={partido.equipo_visitante}>{partido.equipo_visitante}</option>
                              </select>
                            </div>
                            <div className="flex-1">
                              <label className="block text-xs mb-1" style={{ color: '#64748b' }}>¿Cómo terminó?</label>
                              <select
                                value={extras[partido.id]?.como_termino ?? ''}
                                onChange={e => setExtras(prev => ({ ...prev, [partido.id]: { ...prev[partido.id], clasificado: prev[partido.id]?.clasificado ?? '', como_termino: e.target.value as 'reglamentario' | 'tiempo_extra' | 'penales' } }))}
                                className="w-full rounded-lg px-2 py-1.5 text-sm outline-none"
                                style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                                <option value="">— seleccionar —</option>
                                <option value="reglamentario">⏱️ Tiempo reglamentario</option>
                                <option value="tiempo_extra">⏩ Tiempo extra</option>
                                <option value="penales">🥅 Penales</option>
                              </select>
                            </div>
                          </div>
                          <button onClick={() => handleGuardar(partido.id)}
                            disabled={guardando === partido.id}
                            className="w-full h-12 rounded-xl font-bold text-sm disabled:opacity-40 transition-all active:scale-95"
                            style={{ background: '#10b981', color: '#000' }}>
                            {guardando === partido.id ? '…' : 'Guardar ✓'}
                          </button>
                        </div>
                      )}
                      {partido.estado === 'finalizado' && (
                        <div className="text-center space-y-1">
                          <p className="font-bold text-lg" style={{ fontFamily: 'var(--font-bebas)', color: 'var(--accent-gold)' }}>
                            {partido.goles_local} – {partido.goles_visitante}
                          </p>
                          {(partido as Partido & { clasificado?: string; como_termino?: string }).clasificado && (
                            <p className="text-xs" style={{ color: '#94a3b8' }}>
                              ✅ {(partido as Partido & { clasificado?: string; como_termino?: string }).clasificado}
                              {(partido as Partido & { clasificado?: string; como_termino?: string }).como_termino === 'tiempo_extra' ? ' · ⏩' : (partido as Partido & { clasificado?: string; como_termino?: string }).como_termino === 'penales' ? ' · 🥅' : ''}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Declarar campeón J6 inline */}
            <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--bg-card)', border: '1px solid rgba(251,191,36,0.3)' }}>
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--accent-gold)', fontFamily: 'var(--font-rajdhani)' }}>
                🏆 Declarar Campeón J6 y dar +5 pts
              </p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Otorga +5 pts a quienes acertaron el pick de Cuartos. Acción idempotente.
              </p>
              <select
                value={campeonJ6Equipo}
                onChange={e => setCampeonJ6Equipo(e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border)', color: campeonJ6Equipo ? 'var(--text-primary)' : 'var(--text-secondary)', fontFamily: 'var(--font-rajdhani)' }}>
                <option value="">Seleccionar equipo campeón J6...</option>
                {[...new Set(
                  partidos.filter(p => p.jornada === 6)
                    .flatMap(p => [p.equipo_local, p.equipo_visitante])
                    .filter(e => e && e !== 'A definir')
                )].sort().map(eq => (
                  <option key={eq} value={eq}>{eq}</option>
                ))}
              </select>
              {campeonJ6Result && (
                <div className="rounded-xl p-3 text-xs font-semibold"
                  style={{
                    background: campeonJ6Result.startsWith('✅') ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                    border: `1px solid ${campeonJ6Result.startsWith('✅') ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                    color: campeonJ6Result.startsWith('✅') ? '#22c55e' : '#ef4444',
                  }}>
                  {campeonJ6Result}
                </div>
              )}
              <div className="flex gap-2">
                {confirmandoCampeonJ6 ? (
                  <>
                    <button onClick={declararCampeonJ6} disabled={campeonJ6Loading}
                      className="flex-1 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-40"
                      style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.4)', fontFamily: 'var(--font-rajdhani)' }}>
                      {campeonJ6Loading ? '⏳ Aplicando...' : '⚠️ Confirmar'}
                    </button>
                    <button onClick={() => setConfirmandoCampeonJ6(false)} disabled={campeonJ6Loading}
                      className="flex-1 py-3 rounded-xl font-bold text-sm transition-all active:scale-95"
                      style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)', fontFamily: 'var(--font-rajdhani)' }}>
                      Cancelar
                    </button>
                  </>
                ) : (
                  <button onClick={() => setConfirmandoCampeonJ6(true)}
                    disabled={!campeonJ6Equipo || campeonJ6Loading}
                    className="w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-40"
                    style={{ background: 'rgba(251,191,36,0.2)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.4)', fontFamily: 'var(--font-rajdhani)' }}>
                    {campeonJ6Loading ? '⏳ Aplicando...' : '🏆 Declarar Campeón J6 y dar +5 pts'}
                  </button>
                )}
              </div>
            </div>

          </div>
        )}
      </section>

      {/* ── REGISTRAR PAGO ── */}
      <section className="space-y-1">
        <button
          onClick={() => toggleSeccion('pago')}
          className="w-full flex items-center justify-between px-4 py-4 rounded-xl hover:border-orange-500/30 transition-all"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <span style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.1rem', color: 'var(--accent-gold)' }}>
            💰 REGISTRAR PAGO
          </span>
          <span style={{ color: '#64748b' }}>{seccionesAbiertas.pago ? '▲' : '▼'}</span>
        </button>
        {seccionesAbiertas.pago && (
          <div className="space-y-3 rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>

            {/* Selector jugador */}
            <div>
              <label className="text-xs uppercase tracking-widest font-semibold block mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Jugador
              </label>
              <select
                id="pago-jugador"
                value={pagoJugadorId}
                onChange={e => setPagoJugadorId(e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border)', color: pagoJugadorId ? 'var(--text-primary)' : 'var(--text-secondary)', fontFamily: 'var(--font-rajdhani)' }}
              >
                <option value="">Seleccionar jugador...</option>
                {jugadores.map(j => (
                  <option key={j.id} value={j.id}>
                    {mostrarNombre(j)} — {emailCorto(j.email)}{j.referencia_admin ? ` (📋 ${j.referencia_admin})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Selector jornada */}
            <div>
              <label className="text-xs uppercase tracking-widest font-semibold block mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Jornada
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4].map(j => (
                  <button
                    key={j}
                    onClick={() => setPagoJornada(j)}
                    className="flex-1 py-2 rounded-xl text-sm font-bold transition-all active:scale-95"
                    style={{
                      background: pagoJornada === j ? '#ea580c' : 'var(--bg-card-hover)',
                      color: pagoJornada === j ? '#fff' : 'var(--text-secondary)',
                      border: `1px solid ${pagoJornada === j ? '#ea580c' : 'var(--border)'}`,
                      fontFamily: 'var(--font-rajdhani)',
                    }}
                  >
                    {getNombreJornada(j)}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={registrarPago}
              disabled={!pagoJugadorId || registrando}
              className="w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-40"
              style={{ background: '#10b981', color: '#000', fontFamily: 'var(--font-rajdhani)' }}
            >
              {registrando ? '…' : `✅ Confirmar pago $${getMontoJornada(pagoJornada)} MXN`}
            </button>
          </div>
        )}
      </section>

      {/* ── MAGIC LINK ── */}
      <section className="space-y-1">
        <button
          onClick={() => toggleSeccion('magicLink')}
          className="w-full flex items-center justify-between px-4 py-4 rounded-xl hover:border-orange-500/30 transition-all"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <span style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.1rem', color: 'var(--accent-gold)' }}>
            🔗 MAGIC LINK
          </span>
          <span style={{ color: '#64748b' }}>{seccionesAbiertas.magicLink ? '▲' : '▼'}</span>
        </button>
        {seccionesAbiertas.magicLink && (
          <div className="space-y-3 rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <p className="text-slate-500 text-xs">
              Genera un link para que cualquier persona entre
              a la quiniela sin necesitar Google.
              Funciona con Gmail, Hotmail, Yahoo o cualquier correo.
              El link expira en 24 horas.
            </p>
            
            <input
              type="email"
              placeholder="correo@hotmail.com"
              value={emailMagic}
              onChange={e => setEmailMagic(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && generarMagicLink()}
              className="w-full bg-[#0a0a0a] border border-[#1e1e2e]
              rounded-lg px-3 py-2 text-white text-sm outline-none
              focus:border-orange-500"
            />
            
            <button
              onClick={generarMagicLink}
              disabled={generandoLink || !emailMagic.trim()}
              className="w-full bg-orange-600 text-white py-3
              rounded-xl font-rajdhani font-bold text-sm
              hover:bg-orange-500 disabled:opacity-40 transition-all">
              {generandoLink ? '⏳ Generando...' : '🔗 Generar Magic Link'}
            </button>

            {magicLink && (
              <div className="bg-[#0a0a0a] border border-green-500/30
              rounded-xl p-3">
                <p className="text-green-400 text-xs font-bold mb-2">
                  ✅ Link listo — mándalo por WhatsApp:
                </p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(magicLink);
                    toast.success('Link copiado ✅');
                  }}
                  className="w-full bg-green-600/20 border 
                  border-green-500/30 text-green-400 py-2 
                  rounded-lg text-sm font-bold mb-2">
                  📋 Copiar link
                </button>
                
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(
                    '¡Hola! Tu acceso a la Quiniela Metro Mundial 2026 está listo ⚽\n\n' +
                    'Da clic en este link para entrar directo:\n' +
                    magicLink + '\n\n' +
                    'El link expira en 24 horas.\n' +
                    '¡Mucho éxito! 🏆'
                  )}`}
                  target="_blank"
                  className="w-full flex items-center justify-center
                  bg-green-600 text-white py-2 rounded-lg 
                  text-sm font-bold">
                  💬 Mandar por WhatsApp
                </a>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── POZOS ── */}
      <section className="space-y-1">
        <button
          onClick={() => toggleSeccion('pozos')}
          className="w-full flex items-center justify-between px-4 py-4 rounded-xl hover:border-orange-500/30 transition-all"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <span style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.1rem', color: 'var(--accent-gold)' }}>
            🏆 POZOS — ${pozos.reduce((s, p) => s + (p.total_mxn ?? 0), 0)} MXN · {pozos.reduce((s, p) => s + (p.participantes ?? 0), 0)} participantes
          </span>
          <span style={{ color: '#64748b' }}>{seccionesAbiertas.pozos ? '▲' : '▼'}</span>
        </button>
        {seccionesAbiertas.pozos && (
        <div className="space-y-2">
          {pozosCompletos.map(pozo => {
            const pendientes = participaciones.filter(p => p.jornada === pozo.jornada && !p.pagado);
            const confirmadas = participaciones.filter(p => p.jornada === pozo.jornada && p.pagado);
            const isOpen = jornadaAbierta === pozo.jornada;
            return (
              <div key={pozo.id} className="rounded-xl overflow-hidden"
                style={{ border: '1px solid var(--border)' }}>

                {/* Header acordeón */}
                <button
                  onClick={() => setJornadaAbierta(isOpen ? 0 : pozo.jornada)}
                  className="w-full flex items-center justify-between p-4"
                  style={{ background: 'var(--bg-card-hover)' }}
                >
                  <div className="flex items-center gap-3 flex-wrap text-left">
                    <span style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.1rem', color: 'var(--accent-gold)' }}>
                      {getNombreJornada(pozo.jornada)}
                    </span>
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      👥 {pozo.participantes} · ${pozo.total_mxn} MXN
                    </span>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                      style={{
                        background: pozo.estado === 'abierto'
                          ? 'rgba(234,88,12,0.15)' : pozo.estado === 'cerrado'
                          ? 'rgba(100,116,139,0.15)' : 'rgba(16,185,129,0.15)',
                        color: pozo.estado === 'abierto'
                          ? 'var(--accent-gold)' : pozo.estado === 'cerrado'
                          ? '#64748b' : '#10b981',
                      }}>
                      {pozo.estado}
                    </span>
                  </div>
                  <span style={{ color: '#64748b', flexShrink: 0 }}>{isOpen ? '▲' : '▼'}</span>
                </button>

                {/* Contenido colapsable */}
                {isOpen && (
                  <div style={{ background: 'var(--bg-card)', borderTop: '1px solid var(--border)' }}>

                    {/* Acciones */}
                    {pozo.estado !== 'pagado' && (
                      <div className="px-4 py-3 flex gap-2 flex-wrap"
                        style={{ borderBottom: '1px solid var(--border)' }}>
                        <button
                          onClick={() => handleDeclararGanador(pozo.jornada)}
                          disabled={declarando === pozo.jornada}
                          className="text-xs px-3 py-1.5 rounded-lg font-bold disabled:opacity-50 transition-all active:scale-95"
                          style={{ background: 'rgba(234,88,12,0.2)', color: 'var(--accent-gold)', border: '1px solid rgba(234,88,12,0.3)' }}>
                          {declarando === pozo.jornada ? '…' : '🏆 Declarar ganador'}
                        </button>
                        <button
                          onClick={() => declararUltimo(pozo.jornada)}
                          disabled={declarandoUltimo === pozo.jornada}
                          className="text-xs px-3 py-1.5 rounded-lg font-bold disabled:opacity-50 transition-all active:scale-95"
                          style={{ background: 'rgba(202,138,4,0.2)', color: '#facc15', border: '1px solid rgba(202,138,4,0.3)' }}>
                          {declarandoUltimo === pozo.jornada ? '…' : '🤡 Último lugar'}
                        </button>
                      </div>
                    )}

                    {/* Ganador si existe */}
                    {pozo.ganador_nombre && (
                      <div className="px-4 py-2 text-sm"
                        style={{ background: 'rgba(16,185,129,0.08)', borderBottom: '1px solid rgba(16,185,129,0.2)' }}>
                        <span className="font-bold" style={{ color: '#10b981' }}>🥇 Ganador: {pozo.ganador_nombre}</span>
                        <span className="ml-2 text-xs" style={{ color: 'var(--text-secondary)' }}>· ${pozo.total_mxn} MXN</span>
                      </div>
                    )}

                    {/* Pagos pendientes */}
                    {pendientes.length > 0 && (
                      <div className="px-4 py-3 space-y-2">
                        <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: '#ea580c' }}>
                          ⏳ Pendientes de pago ({pendientes.length})
                        </p>
                        {pendientes.map(p => (
                          <div key={p.id}
                            className="flex items-center justify-between gap-2 rounded-xl px-3 py-2.5"
                            style={{ background: 'rgba(234,88,12,0.08)', border: '1px solid rgba(234,88,12,0.3)' }}>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                                  {mostrarNombreParticipante(p)}
                                </p>
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                                  style={{ background: 'rgba(234,88,12,0.2)', color: '#ea580c', border: '1px solid rgba(234,88,12,0.4)' }}>
                                  ⏳ Pendiente de pago
                                </span>
                              </div>
                              {p.jugadorReferencia && (
                                <p className="text-xs" style={{ color: '#60a5fa' }}>📋 {p.jugadorReferencia}</p>
                              )}
                              <p className="text-xs text-slate-500 truncate">{p.jugadorEmail ? emailCorto(p.jugadorEmail) : ''}</p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => handleConfirmarPago(p)}
                                disabled={confirmando === p.id}
                                className="text-xs px-3 py-2 rounded-xl font-bold disabled:opacity-50 transition-all active:scale-95 whitespace-nowrap"
                                style={{ background: '#10b981', color: '#000' }}>
                                {confirmando === p.id ? '…' : '✅ Confirmar pago'}
                              </button>
                              <button
                                onClick={() => handleEliminarParticipacion(p)}
                                className="text-xs px-2 py-2 rounded-xl font-bold transition-all active:scale-95"
                                style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>
                                🗑️
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Confirmados */}
                    {confirmadas.length > 0 && (
                      <div className="px-4 py-3 space-y-1"
                        style={{ borderTop: pendientes.length > 0 ? '1px solid var(--border)' : 'none' }}>
                        <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: '#10b981' }}>
                          ✅ Confirmados ({confirmadas.length})
                        </p>
                        {confirmadas.map(p => (
                          <div key={p.id} className="flex items-center justify-between">
                            <div>
                              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                {mostrarNombreParticipante(p)}
                              </p>
                              {p.jugadorReferencia && (
                                <p className="text-xs" style={{ color: '#60a5fa' }}>📋 {p.jugadorReferencia}</p>
                              )}
                              {p.jugadorEmail && (
                                <p className="text-xs text-slate-500">{emailCorto(p.jugadorEmail)}</p>
                              )}
                              {formatPagadoAt(p.pagado_at) && (
                                <p className="text-[10px]" style={{ color: '#475569' }}>
                                  📅 {formatPagadoAt(p.pagado_at)}
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => handleEliminarParticipacion(p)}
                              className="text-xs px-2 py-1 rounded-lg transition-all active:scale-95"
                              style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
                              🗑️
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {pendientes.length === 0 && confirmadas.length === 0 && (
                      <p className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                        Sin participaciones registradas.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        )}
      </section>

      {/* ── APODOS ── */}
      <section className="space-y-1">
        <button
          onClick={() => toggleSeccion('apodos')}
          className="w-full flex items-center justify-between px-4 py-4 rounded-xl hover:border-orange-500/30 transition-all"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <span style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.1rem', color: 'var(--accent-gold)' }}>
            👤 APODOS Y REFERENCIAS — {jugadores.length} jugadores
          </span>
          <span style={{ color: '#64748b' }}>{seccionesAbiertas.apodos ? '▲' : '▼'}</span>
        </button>
        {seccionesAbiertas.apodos && (
        <div className="space-y-3">
          {jugadores.map(jugador => (
            <div key={jugador.id}
              className="rounded-xl px-4 py-3"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-rajdhani)' }}>
                {jugador.nombre.split(' ')[0]}
              </p>
              <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{emailCorto(jugador.email)}</p>

              {/* Apodo público */}
              <div className="mb-2">
                <p className="text-xs mb-1" style={{ color: '#64748b' }}>Apodo público (visible para todos)</p>
                {editandoApodo === jugador.id ? (
                  <div className="flex gap-2">
                    <input
                      id={`apodo-${jugador.id}`}
                      name={`apodo-${jugador.id}`}
                      type="text"
                      value={apodoTemp}
                      onChange={e => setApodoTemp(e.target.value)}
                      onKeyDown={async e => {
                        if (e.key === 'Enter') e.currentTarget.closest('div')?.querySelector<HTMLButtonElement>('button')?.click();
                        if (e.key === 'Escape') setEditandoApodo(null);
                      }}
                      placeholder="Apodo..."
                      maxLength={20}
                      autoFocus
                      className="flex-1 rounded-lg px-3 py-1.5 text-sm text-white outline-none"
                      style={{ background: '#0a0a0a', border: '1px solid #ea580c' }}
                    />
                    <button
                      onClick={async () => {
                        const { error } = await supabase
                          .from('quiniela_jugadores')
                          .update({ apodo: apodoTemp.trim() || null })
                          .eq('id', jugador.id);
                        if (!error) {
                          toast.success('Apodo actualizado ✅');
                          setEditandoApodo(null);
                          cargarJugadores();
                        } else {
                          toast.error('Error al actualizar apodo');
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg text-sm font-bold transition-all active:scale-95"
                      style={{ background: '#ea580c', color: '#fff' }}>
                      ✓
                    </button>
                    <button
                      onClick={() => setEditandoApodo(null)}
                      className="px-2 text-sm transition-colors"
                      style={{ color: '#64748b' }}>
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {jugador.apodo ? (
                      <span className="text-sm" style={{ color: '#ea580c' }}>🏷️ {jugador.apodo}</span>
                    ) : (
                      <span className="text-sm" style={{ color: '#334155' }}>Sin apodo</span>
                    )}
                    <button
                      onClick={() => { setEditandoApodo(jugador.id); setApodoTemp(jugador.apodo ?? ''); }}
                      className="text-xs transition-colors"
                      style={{ color: '#475569' }}>
                      ✏️ Editar
                    </button>
                  </div>
                )}
              </div>

              {/* Referencia interna */}
              <div className="mt-2 pt-2" style={{ borderTop: '1px solid #1e1e2e' }}>
                <p className="text-xs mb-1" style={{ color: '#64748b' }}>🔒 Referencia interna (solo tú la ves)</p>
                {editandoReferencia === jugador.id ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={referenciaTemp}
                      onChange={e => setReferenciaTemp(e.target.value)}
                      placeholder="Ej: Compañero turno mañana, Primo de Amy..."
                      maxLength={50}
                      autoFocus
                      className="flex-1 rounded-lg px-3 py-1.5 text-sm text-white outline-none"
                      style={{ background: '#0a0a0a', border: '1px solid #ea580c' }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') guardarReferencia(jugador.id);
                        if (e.key === 'Escape') setEditandoReferencia(null);
                      }}
                    />
                    <button
                      onClick={() => guardarReferencia(jugador.id)}
                      className="px-3 py-1.5 rounded-lg text-sm font-bold transition-all active:scale-95"
                      style={{ background: '#ea580c', color: '#fff' }}>
                      ✓
                    </button>
                    <button
                      onClick={() => setEditandoReferencia(null)}
                      className="px-2 text-sm transition-colors"
                      style={{ color: '#64748b' }}>
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {jugador.referencia_admin ? (
                      <span className="text-sm" style={{ color: '#60a5fa' }}>📋 {jugador.referencia_admin}</span>
                    ) : (
                      <span className="text-sm" style={{ color: '#334155' }}>Sin referencia</span>
                    )}
                    <button
                      onClick={() => { setEditandoReferencia(jugador.id); setReferenciaTemp(jugador.referencia_admin ?? ''); }}
                      className="text-xs transition-colors"
                      style={{ color: '#475569' }}>
                      ✏️
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        )}
      </section>

      {/* ── USUARIOS ── */}
      <section className="space-y-1">
        <button
          onClick={() => toggleSeccion('usuarios')}
          className="w-full flex items-center justify-between px-4 py-4 rounded-xl hover:border-orange-500/30 transition-all"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <span style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.1rem', color: 'var(--accent-gold)' }}>
            👥 USUARIOS — {jugadores.length} registrados
          </span>
          <span style={{ color: '#64748b' }}>{seccionesAbiertas.usuarios ? '▲' : '▼'}</span>
        </button>
        {seccionesAbiertas.usuarios && (
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          {[...jugadores]
            .sort((a, b) => {
              if (!a.last_seen && !b.last_seen) return 0;
              if (!a.last_seen) return 1;
              if (!b.last_seen) return -1;
              return new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime();
            })
            .map((jugador, i) => (
              <div key={jugador.id}
                className="flex items-center justify-between px-4 py-3"
                style={{ borderTop: i > 0 ? '1px solid var(--border)' : undefined }}>
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ background: 'linear-gradient(135deg, #ea580c, #c2410c)' }}
                  >
                    {inicialesJugador(jugador)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold flex items-center gap-1"
                      style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-rajdhani)' }}>
                      {mostrarNombre(jugador)}
                      {jugador.rol === 'admin' && <span style={{ color: '#ea580c' }}>⚙️</span>}
                    </p>
                    <p className="text-xs truncate" style={{ color: '#64748b' }}>{jugador.email}</p>
                    {jugador.apodo && (
                      <p className="text-xs" style={{ color: '#ea580c' }}>🏷️ {jugador.apodo}</p>
                    )}
                    {jugador.referencia_admin && (
                      <p className="text-xs" style={{ color: '#60a5fa' }}>📋 {jugador.referencia_admin}</p>
                    )}
                    {(() => {
                      const userPartics = participaciones.filter(p => p.user_id === jugador.id);
                      return userPartics.length > 0 ? (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {userPartics.map((p, i) => (
                            <span key={i}
                              className={`text-xs px-2 py-0.5 rounded-full border ${p.pagado
                                ? 'bg-emerald-400/10 border-emerald-400/20 text-emerald-400'
                                : 'bg-orange-400/10 border-orange-400/20 text-orange-400'
                              }`}>
                              {p.pagado ? '✅' : '⏳'} {getNombreJornada(p.jornada)}
                              {p.quinielaNombre && ` · ${p.quinielaNombre}`}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs mt-1" style={{ color: '#475569' }}>Sin quinielas registradas</p>
                      );
                    })()}
                  </div>
                </div>
                <div className="shrink-0 ml-3 text-right">
                  {jugador.last_seen ? (
                    <>
                      <p className="text-xs" style={{ color: '#475569' }}>{timeAgo(jugador.last_seen)}</p>
                      {jugador.ultima_pagina && (
                        <p className="text-xs" style={{ color: '#64748b' }}>📍 {jugador.ultima_pagina}</p>
                      )}
                    </>
                  ) : (
                    <p className="text-xs" style={{ color: '#64748b' }}>Sin actividad reciente</p>
                  )}
                </div>
              </div>
            ))}
        </div>
        )}
      </section>

      {/* ── RESULTADOS ── */}
      <section className="space-y-1">
        <button
          onClick={() => toggleSeccion('resultados')}
          className="w-full flex items-center justify-between px-4 py-4 rounded-xl hover:border-orange-500/30 transition-all"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <span style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.1rem', color: 'var(--accent-gold)' }}>
            🛠️ RESULTADOS — {partidos.length} partidos
          </span>
          <span style={{ color: '#64748b' }}>{seccionesAbiertas.resultados ? '▲' : '▼'}</span>
        </button>
        {seccionesAbiertas.resultados && (
        <div className="space-y-3">
          {partidos.map(partido => {
            const res = resultados[partido.id];
            return (
              <div key={partido.id} id={`partido-${partido.id}`} className="rounded-2xl p-4 space-y-3"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <span>Grupo {partido.grupo} · J{partido.jornada}</span>
                  <span className="px-2 py-0.5 rounded-full font-bold uppercase text-[10px]"
                    style={{
                      background: partido.estado === 'finalizado' ? 'rgba(100,116,139,0.15)' : 'rgba(234,88,12,0.15)',
                      color:      partido.estado === 'finalizado' ? '#64748b' : 'var(--accent-gold)',
                    }}>
                    {partido.estado}
                  </span>
                </div>
                <p className="text-sm font-bold text-center flex items-center justify-center gap-1.5 flex-wrap" style={{ color: 'var(--text-primary)' }}>
                  <Bandera emoji={partido.bandera_local ?? ''} nombre={partido.equipo_local} size="sm" />
                  {partido.equipo_local} vs {partido.equipo_visitante}
                  <Bandera emoji={partido.bandera_visitante ?? ''} nombre={partido.equipo_visitante} size="sm" />
                </p>
                {partido.estado !== 'finalizado' && (
                  <div className="space-y-3 mt-1">
                    <div className="flex items-center justify-center gap-3">
                      <input id={`local-${partido.id}`} name={`local-${partido.id}`}
                        type="number" min="0" max="20" placeholder="0"
                        value={res?.local ?? ''}
                        onChange={e => setResultados(prev => ({
                          ...prev,
                          [partido.id]: { local: parseInt(e.target.value) || 0, visitante: prev[partido.id]?.visitante ?? 0 },
                        }))}
                        className="w-14 h-12 text-center text-xl font-bold rounded-xl outline-none"
                        style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontFamily: 'var(--font-bebas)' }} />
                      <span className="text-xl font-bold" style={{ color: 'var(--accent-gold)', fontFamily: 'var(--font-bebas)' }}>–</span>
                      <input id={`visitante-${partido.id}`} name={`visitante-${partido.id}`}
                        type="number" min="0" max="20" placeholder="0"
                        value={res?.visitante ?? ''}
                        onChange={e => setResultados(prev => ({
                          ...prev,
                          [partido.id]: { local: prev[partido.id]?.local ?? 0, visitante: parseInt(e.target.value) || 0 },
                        }))}
                        className="w-14 h-12 text-center text-xl font-bold rounded-xl outline-none"
                        style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontFamily: 'var(--font-bebas)' }} />
                      {partido.jornada < 5 && (
                        <button onClick={() => handleGuardar(partido.id)}
                          disabled={guardando === partido.id}
                          className="h-12 px-4 rounded-xl font-bold text-sm disabled:opacity-40 transition-all active:scale-95"
                          style={{ background: '#10b981', color: '#000' }}>
                          {guardando === partido.id ? '…' : 'Guardar ✓'}
                        </button>
                      )}
                      <button onClick={() => handleLimpiar(partido.id)}
                        className="h-12 px-3 rounded-xl text-sm transition-all active:scale-95"
                        style={{ background: '#334155', color: '#94a3b8' }}
                        title="Limpiar resultado">
                        🔄
                      </button>
                    </div>
                    {partido.jornada >= 5 && (
                      <div className="flex flex-col sm:flex-row gap-2 px-1">
                        <div className="flex-1">
                          <label className="block text-xs mb-1" style={{ color: '#64748b' }}>¿Quién clasificó?</label>
                          <select
                            value={extras[partido.id]?.clasificado ?? ''}
                            onChange={e => setExtras(prev => ({ ...prev, [partido.id]: { ...prev[partido.id], clasificado: e.target.value, como_termino: prev[partido.id]?.como_termino ?? 'reglamentario' } }))}
                            className="w-full rounded-lg px-2 py-1.5 text-sm outline-none"
                            style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                            <option value="">— seleccionar —</option>
                            <option value={partido.equipo_local}>{partido.equipo_local}</option>
                            <option value={partido.equipo_visitante}>{partido.equipo_visitante}</option>
                          </select>
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs mb-1" style={{ color: '#64748b' }}>¿Cómo terminó?</label>
                          <select
                            value={extras[partido.id]?.como_termino ?? ''}
                            onChange={e => setExtras(prev => ({ ...prev, [partido.id]: { ...prev[partido.id], clasificado: prev[partido.id]?.clasificado ?? '', como_termino: e.target.value as 'reglamentario' | 'tiempo_extra' | 'penales' } }))}
                            className="w-full rounded-lg px-2 py-1.5 text-sm outline-none"
                            style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                            <option value="">— seleccionar —</option>
                            <option value="reglamentario">⏱️ Tiempo reglamentario</option>
                            <option value="tiempo_extra">⏩ Tiempo extra</option>
                            <option value="penales">🥅 Penales</option>
                          </select>
                        </div>
                      </div>
                    )}
                    {partido.jornada >= 5 && (
                      <button onClick={() => handleGuardar(partido.id)}
                        disabled={guardando === partido.id}
                        className="w-full h-12 rounded-xl font-bold text-sm disabled:opacity-40 transition-all active:scale-95"
                        style={{ background: '#10b981', color: '#000' }}>
                        {guardando === partido.id ? '…' : 'Guardar ✓'}
                      </button>
                    )}
                  </div>
                )}
                {partido.estado === 'finalizado' && (
                  <div className="text-center space-y-1">
                    <p className="font-bold text-lg" style={{ fontFamily: 'var(--font-bebas)', color: 'var(--accent-gold)' }}>
                      {partido.goles_local} – {partido.goles_visitante}
                    </p>
                    {partido.jornada >= 5 && (partido as any).clasificado && (
                      <p className="text-xs flex items-center justify-center gap-1.5" style={{ color: '#94a3b8' }}>
                        <Bandera emoji={BANDERAS_EQUIPOS[(partido as any).clasificado] ?? ''} nombre={(partido as any).clasificado} size="sm" />
                        {(partido as any).clasificado}
                        {(partido as any).como_termino && (
                          <span>·{' '}
                            {(partido as any).como_termino === 'reglamentario' ? '⏱️' : (partido as any).como_termino === 'tiempo_extra' ? '⏩' : '🥅'}
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        )}
      </section>

      {/* ── NOTAS DEL ADMIN ── */}
      <section className="space-y-1">
        <button
          onClick={() => toggleSeccion('notas')}
          className="w-full flex items-center justify-between px-4 py-4 rounded-xl hover:border-orange-500/30 transition-all"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <span style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.1rem', color: 'var(--accent-gold)' }}>
            📝 NOTAS DEL ADMIN — {notas.length} nota{notas.length !== 1 ? 's' : ''}
          </span>
          <span style={{ color: '#64748b' }}>{seccionesAbiertas.notas ? '▲' : '▼'}</span>
        </button>
        {seccionesAbiertas.notas && (
          <div className="rounded-2xl p-4 space-y-2" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="Ej: Anibal me dio $50 en efectivo..."
                value={nuevaNota}
                onChange={e => setNuevaNota(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && agregarNota()}
                className="flex-1 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-orange-500"
                style={{ background: '#0a0a0a', border: '1px solid #1e1e2e' }}
              />
              <button
                onClick={agregarNota}
                className="px-4 py-2 rounded-lg font-bold text-sm transition-all active:scale-95"
                style={{ background: '#ea580c', color: '#fff' }}>
                ✓
              </button>
            </div>

            {notas.map((nota, i) => (
              <div key={i} className="flex items-start justify-between py-2 gap-2"
                style={{ borderBottom: i < notas.length - 1 ? '1px solid #1e1e2e' : 'none' }}>
                <div>
                  <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{nota.texto}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#475569' }}>{nota.fecha}</p>
                </div>
                <button
                  onClick={() => eliminarNota(i)}
                  className="text-xs flex-shrink-0 transition-opacity hover:opacity-70">
                  🗑️
                </button>
              </div>
            ))}

            {notas.length === 0 && (
              <p className="text-sm text-center py-4" style={{ color: '#475569' }}>
                Sin notas — escribe algo arriba
              </p>
            )}
          </div>
        )}
      </section>

      {/* ── CAMPEÓN MUNDIAL ── */}{false && (
      <section className="space-y-1">
        <button
          onClick={() => toggleSeccion('campeon')}
          className="w-full flex items-center justify-between px-4 py-4 rounded-xl hover:border-orange-500/30 transition-all"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <span style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.1rem', color: 'var(--accent-gold)' }}>
            🏆 CAMPEÓN MUNDIAL — declaración manual
          </span>
          <span style={{ color: '#64748b' }}>{seccionesAbiertas.campeon ? '▲' : '▼'}</span>
        </button>
        {seccionesAbiertas.campeon && (
          <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Úsalo si la detección automática no funcionó. Sobreescribe badges anteriores.
            </p>
            <div>
              <label className="text-xs uppercase tracking-widest font-semibold block mb-1.5"
                style={{ color: 'var(--text-secondary)' }}>
                Seleccionar campeón
              </label>
              <select
                value={equipoCampeonManual}
                onChange={e => setEquipoCampeonManual(e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                style={{
                  background: 'var(--bg-card-hover)',
                  border: '1px solid var(--border)',
                  color: equipoCampeonManual ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontFamily: 'var(--font-rajdhani)',
                }}
              >
                <option value="">Seleccionar equipo...</option>
                {[...new Set(partidos.flatMap(p => [p.equipo_local, p.equipo_visitante]))].sort().map(eq => (
                  <option key={eq} value={eq}>{eq}</option>
                ))}
              </select>
            </div>
            <button
              onClick={declararCampeonManual}
              disabled={!equipoCampeonManual || declarandoCampeon}
              className="w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-40"
              style={{ background: 'rgba(251,191,36,0.2)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.4)', fontFamily: 'var(--font-rajdhani)' }}
            >
              {declarandoCampeon ? '⏳ Declarando...' : '🏆 Declarar campeón'}
            </button>
          </div>
        )}
      </section>)}

      {/* ── BONO CAMPEÓN +5 PTS ── */}{false && (
      <section className="space-y-1">
        <button
          onClick={() => toggleSeccion('bonoCampeon')}
          className="w-full flex items-center justify-between px-4 py-4 rounded-xl hover:border-orange-500/30 transition-all"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <span style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.1rem', color: 'var(--accent-gold)' }}>
            🏆 BONO CAMPEÓN — sumar +5 pts
          </span>
          <span style={{ color: '#64748b' }}>{seccionesAbiertas.bonoCampeon ? '▲' : '▼'}</span>
        </button>
        {seccionesAbiertas.bonoCampeon && (
          <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Ejecuta esta acción para sumar <strong>+5 pts</strong> a quienes acertaron el campeón.
              Solo debe ejecutarse <strong>después de la Final</strong>.
            </p>
            <div className="rounded-xl p-3 text-xs flex items-start gap-2"
              style={{ background: 'rgba(234,88,12,0.1)', border: '1px solid rgba(234,88,12,0.25)', color: '#f97316' }}>
              <span>⚠️</span>
              <span>Esta acción es irreversible. Verifica que el campeón ya esté declarado antes de ejecutar.</span>
            </div>
            {bonoCampeonResult && (
              <div className="rounded-xl p-3 text-xs font-semibold"
                style={{
                  background: bonoCampeonResult.startsWith('✅') ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                  border: `1px solid ${bonoCampeonResult.startsWith('✅') ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                  color: bonoCampeonResult.startsWith('✅') ? '#22c55e' : '#ef4444',
                }}>
                {bonoCampeonResult}
              </div>
            )}
            <div className="flex gap-2">
              {confirmandoBono ? (
                <>
                  <button
                    onClick={aplicarBonoCampeon}
                    disabled={bonoCampeonLoading}
                    className="flex-1 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-40"
                    style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.4)', fontFamily: 'var(--font-rajdhani)' }}
                  >
                    {bonoCampeonLoading ? '⏳ Aplicando...' : '⚠️ Confirmar'}
                  </button>
                  <button
                    onClick={() => setConfirmandoBono(false)}
                    disabled={bonoCampeonLoading}
                    className="flex-1 py-3 rounded-xl font-bold text-sm transition-all active:scale-95"
                    style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)', fontFamily: 'var(--font-rajdhani)' }}
                  >
                    Cancelar
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setConfirmandoBono(true)}
                  disabled={bonoCampeonLoading}
                  className="w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-40"
                  style={{ background: 'rgba(251,191,36,0.2)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.4)', fontFamily: 'var(--font-rajdhani)' }}
                >
                  {bonoCampeonLoading ? '⏳ Aplicando...' : '🏆 Aplicar Bono a Campeón'}
                </button>
              )}
            </div>
          </div>
        )}
      </section>)}

      {/* ── CAMPEÓN J6 — CUARTOS DE FINAL +5 PTS ── */}
      <section className="space-y-1">
        <button
          onClick={() => toggleSeccion('campeonJ6')}
          className="w-full flex items-center justify-between px-4 py-4 rounded-xl hover:border-orange-500/30 transition-all"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <span style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.1rem', color: 'var(--accent-gold)' }}>
            🏆 CAMPEÓN J6 (CUARTOS) — declarar y dar +5 pts
          </span>
          <span style={{ color: '#64748b' }}>{seccionesAbiertas.campeonJ6 ? '▲' : '▼'}</span>
        </button>
        {seccionesAbiertas.campeonJ6 && (
          <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Declara el campeón del pick de J6. Otorga <strong>+5 pts</strong> a quienes
              acertaron en <code>quiniela_prediccion_campeon</code> con jornada=6.
              Acción idempotente — puedes corregirla si es necesario.
            </p>
            <div>
              <label className="text-xs uppercase tracking-widest font-semibold block mb-1.5"
                style={{ color: 'var(--text-secondary)' }}>
                Equipo campeón (J6)
              </label>
              <select
                value={campeonJ6Equipo}
                onChange={e => setCampeonJ6Equipo(e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                style={{
                  background: 'var(--bg-card-hover)',
                  border: '1px solid var(--border)',
                  color: campeonJ6Equipo ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontFamily: 'var(--font-rajdhani)',
                }}
              >
                <option value="">Seleccionar equipo de Cuartos...</option>
                {[...new Set(
                  partidos
                    .filter(p => p.jornada === 6)
                    .flatMap(p => [p.equipo_local, p.equipo_visitante])
                    .filter(e => e && e !== 'A definir')
                )].sort().map(eq => (
                  <option key={eq} value={eq}>{eq}</option>
                ))}
              </select>
            </div>
            {campeonJ6Result && (
              <div className="rounded-xl p-3 text-xs font-semibold"
                style={{
                  background: campeonJ6Result.startsWith('✅') ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                  border: `1px solid ${campeonJ6Result.startsWith('✅') ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                  color: campeonJ6Result.startsWith('✅') ? '#22c55e' : '#ef4444',
                }}>
                {campeonJ6Result}
              </div>
            )}
            <div className="flex gap-2">
              {confirmandoCampeonJ6 ? (
                <>
                  <button
                    onClick={declararCampeonJ6}
                    disabled={campeonJ6Loading}
                    className="flex-1 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-40"
                    style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.4)', fontFamily: 'var(--font-rajdhani)' }}
                  >
                    {campeonJ6Loading ? '⏳ Aplicando...' : '⚠️ Confirmar'}
                  </button>
                  <button
                    onClick={() => setConfirmandoCampeonJ6(false)}
                    disabled={campeonJ6Loading}
                    className="flex-1 py-3 rounded-xl font-bold text-sm transition-all active:scale-95"
                    style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)', fontFamily: 'var(--font-rajdhani)' }}
                  >
                    Cancelar
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setConfirmandoCampeonJ6(true)}
                  disabled={!campeonJ6Equipo || campeonJ6Loading}
                  className="w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-40"
                  style={{ background: 'rgba(251,191,36,0.2)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.4)', fontFamily: 'var(--font-rajdhani)' }}
                >
                  {campeonJ6Loading ? '⏳ Aplicando...' : '🏆 Declarar Campeón J6 y dar +5 pts'}
                </button>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ── GRUPOS MUNDIAL ── */}
      <section className="space-y-1">
        <button
          onClick={() => {
            toggleSeccion('grupos');
            if (!seccionesAbiertas.grupos) cargarGrupos();
          }}
          className="w-full flex items-center justify-between px-4 py-4 rounded-xl hover:border-orange-500/30 transition-all"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <span style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.1rem', color: 'var(--accent-gold)' }}>
            🌎 GRUPOS — tabla de posiciones
          </span>
          <span style={{ color: '#64748b' }}>{seccionesAbiertas.grupos ? '▲' : '▼'}</span>
        </button>
        {seccionesAbiertas.grupos && (
          <div className="rounded-2xl p-4 space-y-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            {/* Recalcular desde resultados */}
            <button
              onClick={recalcularGrupos}
              disabled={recalculando}
              className="w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-40"
              style={{ background: 'rgba(234,88,12,0.2)', color: 'var(--accent-gold)', border: '1px solid rgba(234,88,12,0.4)', fontFamily: 'var(--font-rajdhani)' }}
            >
              {recalculando ? '⏳ Calculando...' : '🔄 Recalcular grupos desde resultados'}
            </button>

            {/* Tabs grupos A–L */}
            <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {['A','B','C','D','E','F','G','H','I','J','K','L'].map(g => (
                <button
                  key={g}
                  onClick={() => setGrupoTabAdmin(g)}
                  className="px-3 py-1 rounded-lg text-xs font-bold shrink-0 transition-all"
                  style={{
                    fontFamily: 'var(--font-rajdhani)',
                    background: grupoTabAdmin === g ? 'rgba(234,88,12,0.2)' : 'var(--bg-card-hover)',
                    border: grupoTabAdmin === g ? '1px solid rgba(234,88,12,0.6)' : '1px solid var(--border)',
                    color: grupoTabAdmin === g ? 'var(--accent-gold)' : 'var(--text-secondary)',
                  }}
                >
                  {g}
                </button>
              ))}
            </div>

            {grupos.filter(e => e.grupo === grupoTabAdmin).length === 0 ? (
              <p className="text-xs text-center py-4" style={{ color: 'var(--text-secondary)' }}>
                No hay equipos en el Grupo {grupoTabAdmin}. Ejecuta el SQL seed primero.
              </p>
            ) : (
              <div className="space-y-3">
                {grupos
                  .filter(e => e.grupo === grupoTabAdmin)
                  .sort((a, b) => b.pts - a.pts || b.dg - a.dg)
                  .map(eq => {
                    const vals = editGrupo[eq.id] ?? {};
                    const field = (f: string) => vals[f] !== undefined ? vals[f] : eq[f];
                    return (
                      <div key={eq.id} className="rounded-xl p-3 space-y-3"
                        style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border)' }}>
                        <div className="flex items-center gap-2">
                          {eq.bandera && <Bandera emoji={eq.bandera} nombre={eq.equipo} size="sm" />}
                          <span style={{ fontFamily: 'var(--font-rajdhani)', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {eq.equipo}
                          </span>
                          <span className="ml-auto" style={{ fontFamily: 'var(--font-bebas)', fontSize: '1rem', color: 'var(--accent-gold)' }}>
                            {eq.pts} pts · DG {eq.dg}
                          </span>
                        </div>
                        <div className="grid grid-cols-6 gap-2">
                          {(['pj','g','e','p','gf','gc'] as const).map(f => (
                            <div key={f}>
                              <label className="text-[10px] uppercase tracking-widest block mb-1"
                                style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-rajdhani)' }}>
                                {f.toUpperCase()}
                              </label>
                              <input
                                type="number"
                                min={0}
                                value={field(f)}
                                onChange={e => setEditGrupo(prev => ({
                                  ...prev,
                                  [eq.id]: { ...(prev[eq.id] ?? {}), [f]: e.target.value }
                                }))}
                                className="w-full rounded-lg px-2 py-1.5 text-center text-sm outline-none"
                                style={{
                                  background: 'var(--bg-card)',
                                  border: '1px solid var(--border)',
                                  color: 'var(--text-primary)',
                                  fontFamily: 'var(--font-rajdhani)',
                                  fontWeight: 700,
                                }}
                              />
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={() => guardarEquipoGrupo(eq)}
                          disabled={guardandoEquipo === eq.id}
                          className="w-full py-2 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-40"
                          style={{
                            background: 'rgba(234,88,12,0.15)',
                            color: 'var(--accent-gold)',
                            border: '1px solid rgba(234,88,12,0.3)',
                            fontFamily: 'var(--font-rajdhani)',
                          }}
                        >
                          {guardandoEquipo === eq.id ? '⏳ Guardando...' : '💾 Guardar'}
                        </button>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
