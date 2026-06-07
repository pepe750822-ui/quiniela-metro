# Predicción de Campeón Mundial — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Users pick the World Cup champion before the inaugural match (2026-06-11T20:00 UTC) and receive a `badge_campeon` on their profile if correct. Admin can declare the champion automatically (when Final match result is saved) or manually via a new accordion.

**Architecture:** New Supabase table `quiniela_campeon_picks` (one row per user, upsert), `badge_campeon TEXT` column on `quiniela_jugadores`. UI sections in `/predicciones` (full picker at top), `/dashboard` (compact card), and `/admin` (auto-detect in `handleGuardar` + manual accordion). Badge rendered in `RankingTable` and `jornada/[id]`.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase client, Tailwind CSS, `sonner` toasts. All changes use client-side Supabase (no server actions).

---

### Task 1: SQL schema and TypeScript type

**Files:**
- Create: `scripts/campeon-pick.sql`
- Modify: `types/index.ts`

- [ ] **Step 1: Create scripts/campeon-pick.sql**

```sql
CREATE TABLE IF NOT EXISTS quiniela_campeon_picks (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL UNIQUE REFERENCES quiniela_jugadores(id) ON DELETE CASCADE,
  equipo     TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE quiniela_campeon_picks ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read all picks (needed for aggregate stats)
CREATE POLICY "campeon_picks_read" ON quiniela_campeon_picks
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Own user can insert before deadline
CREATE POLICY "campeon_picks_insert" ON quiniela_campeon_picks
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND NOW() < '2026-06-11T20:00:00+00'::timestamptz
  );

-- Own user can update before deadline
CREATE POLICY "campeon_picks_update" ON quiniela_campeon_picks
  FOR UPDATE USING (
    auth.uid() = user_id
    AND NOW() < '2026-06-11T20:00:00+00'::timestamptz
  );

-- badge_campeon: team name when user guessed correctly, NULL otherwise
ALTER TABLE quiniela_jugadores
  ADD COLUMN IF NOT EXISTS badge_campeon TEXT;
```

Run this SQL in the Supabase dashboard (SQL editor) before testing.

- [ ] **Step 2: Add badge_campeon to types/index.ts**

The `Jugador` interface currently ends with `badge_ultimo?: string | null;` (line 44). Add `badge_campeon` right after it:

```typescript
export interface Jugador {
  id: string;
  nombre: string;
  apodo: string | null;
  email: string;
  rol: RolJugador;
  avatar_url: string | null;
  creditos: number;
  created_at: string;
  last_seen?: string | null;
  ultima_pagina?: string | null;
  referencia_admin?: string | null;
  quiniela_nombre?: string | null;
  badge_ultimo?: string | null;
  badge_campeon?: string | null;
}
```

- [ ] **Step 3: Commit**

```bash
git add scripts/campeon-pick.sql types/index.ts
git commit -m "feat: add campeon_picks table schema and badge_campeon type"
```

---

### Task 2: Champion pick section in /predicciones

**Files:**
- Modify: `app/predicciones/page.tsx`

The section goes **between the `{/* Header */}` div and the `{participando === false && ...}` banner** (pago pendiente).

- [ ] **Step 1: Add DEADLINE_CAMPEON constant**

After the import block in `app/predicciones/page.tsx`, add:

```typescript
const DEADLINE_CAMPEON = new Date('2026-06-11T20:00:00Z');
```

- [ ] **Step 2: Add champion states inside PrediccionesPage**

After the existing state declarations (after `const [publicando, setPublicando] = useState<boolean>(false);`), add:

```typescript
const [campeonEquipos, setCampeonEquipos]     = useState<string[]>([]);
const [miCampeonPick, setMiCampeonPick]       = useState<string | null>(null);
const [campeonPickTemp, setCampeonPickTemp]   = useState<string | null>(null);
const [campeonGuardando, setCampeonGuardando] = useState(false);
const [campeonStats, setCampeonStats]         = useState<{ equipo: string; total: number }[]>([]);
const [campeonDeclarado, setCampeonDeclarado] = useState<string | null>(null);
const [miBadgeCampeon, setMiBadgeCampeon]     = useState<string | null>(null);
```

- [ ] **Step 3: Add cargarCampeon useEffect**

After the existing `useEffect(() => { if (userId) { cargarQuinielas(userId); ... } }, [userId, ...])` block, add a new effect:

```typescript
useEffect(() => {
  if (!userId) return;
  const cargarCampeon = async () => {
    const [{ data: ps }, { data: pick }, { data: jug }, { data: allPicks }, { data: final }] = await Promise.all([
      supabase.from('quiniela_partidos').select('equipo_local, equipo_visitante'),
      supabase.from('quiniela_campeon_picks').select('equipo').eq('user_id', userId).maybeSingle(),
      supabase.from('quiniela_jugadores').select('badge_campeon').eq('id', userId).maybeSingle(),
      supabase.from('quiniela_campeon_picks').select('equipo'),
      supabase
        .from('quiniela_partidos')
        .select('goles_local, goles_visitante, equipo_local, equipo_visitante')
        .eq('grupo', 'FIN')
        .eq('estado', 'finalizado')
        .maybeSingle(),
    ]);

    const allTeams = [
      ...new Set(
        (ps ?? []).flatMap((p: { equipo_local: string; equipo_visitante: string }) => [p.equipo_local, p.equipo_visitante])
      ),
    ].sort();
    setCampeonEquipos(allTeams);

    setMiCampeonPick(pick?.equipo ?? null);
    setCampeonPickTemp(pick?.equipo ?? null);
    setMiBadgeCampeon((jug as { badge_campeon?: string | null } | null)?.badge_campeon ?? null);

    if (final) {
      const ganador = (final.goles_local ?? 0) > (final.goles_visitante ?? 0)
        ? final.equipo_local
        : final.equipo_visitante;
      setCampeonDeclarado(ganador);
    }

    const statsMap: Record<string, number> = {};
    (allPicks ?? []).forEach((p: { equipo: string }) => {
      statsMap[p.equipo] = (statsMap[p.equipo] || 0) + 1;
    });
    setCampeonStats(
      Object.entries(statsMap)
        .map(([equipo, total]) => ({ equipo, total }))
        .sort((a, b) => b.total - a.total)
    );
  };
  cargarCampeon();
}, [userId]);
```

- [ ] **Step 4: Add guardarCampeonPick handler**

After the `crearQuiniela` function, add:

```typescript
const guardarCampeonPick = async () => {
  if (!userId || !campeonPickTemp) return;
  setCampeonGuardando(true);
  const { error } = await supabase
    .from('quiniela_campeon_picks')
    .upsert({ user_id: userId, equipo: campeonPickTemp }, { onConflict: 'user_id' });
  setCampeonGuardando(false);
  if (error) {
    toast.error('Error al guardar: ' + error.message);
  } else {
    setMiCampeonPick(campeonPickTemp);
    toast.success('🏆 ¡Campeón guardado!');
  }
};
```

- [ ] **Step 5: Add champion section JSX**

In the `return` block, right after the `{/* Header */}` div and before `{/* Banner: pago pendiente */}` (the `{participando === false && (...)}` block), insert:

```tsx
{/* ── PREDICCIÓN CAMPEÓN ── */}
{campeonEquipos.length > 0 && (() => {
  const deadlinePasado = Date.now() >= DEADLINE_CAMPEON.getTime();
  const acerto = campeonDeclarado && miBadgeCampeon === campeonDeclarado;
  const fallo  = campeonDeclarado && miCampeonPick && miCampeonPick !== campeonDeclarado;
  return (
    <div
      className="rounded-2xl p-4 space-y-3"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', animation: 'fadeInUp 0.4s ease-out 0.03s both' }}
    >
      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--accent-gold)', fontFamily: 'var(--font-rajdhani)' }}>
        🏆 Predicción: Campeón Mundial
      </p>

      {acerto && (
        <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.4)' }}>
          <p className="font-bold" style={{ color: '#fbbf24', fontFamily: 'var(--font-rajdhani)' }}>
            ✅ ¡Acertaste! — {campeonDeclarado}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>🏆 Tienes el badge de Campeón</p>
        </div>
      )}

      {fallo && (
        <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(100,116,139,0.1)', border: '1px solid rgba(100,116,139,0.2)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-rajdhani)' }}>
            ❌ No fue {miCampeonPick} — ganó <strong style={{ color: '#fbbf24' }}>{campeonDeclarado}</strong>
          </p>
        </div>
      )}

      {campeonDeclarado && !miCampeonPick && (
        <p className="text-sm text-center" style={{ color: 'var(--text-secondary)' }}>
          No hiciste una predicción — ganó <strong style={{ color: '#fbbf24' }}>{campeonDeclarado}</strong>
        </p>
      )}

      {!campeonDeclarado && deadlinePasado && !miCampeonPick && (
        <p className="text-sm text-center" style={{ color: 'var(--text-secondary)' }}>No hiciste una predicción 🔒</p>
      )}

      {!campeonDeclarado && deadlinePasado && miCampeonPick && (
        <>
          <div className="rounded-xl p-3 flex items-center gap-2"
            style={{ background: 'rgba(100,116,139,0.08)', border: '1px solid rgba(100,116,139,0.2)' }}>
            <span>🔒</span>
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Tu campeón: <strong style={{ color: '#fbbf24' }}>{miCampeonPick}</strong>
            </span>
          </div>
          {campeonStats.length > 0 && (
            <div className="space-y-1 pt-1">
              <p className="text-[10px] uppercase tracking-widest" style={{ color: '#64748b' }}>Picks del grupo</p>
              {campeonStats.map(s => (
                <div key={s.equipo} className="flex items-center justify-between text-xs py-0.5">
                  <span style={{ color: s.equipo === miCampeonPick ? '#fbbf24' : 'var(--text-secondary)' }}>
                    {s.equipo}
                  </span>
                  <span style={{ color: '#64748b' }}>{s.total} jugador{s.total !== 1 ? 'es' : ''}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {!deadlinePasado && !campeonDeclarado && (
        <>
          {miCampeonPick && (
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Pick actual: <strong style={{ color: '#fbbf24' }}>{miCampeonPick}</strong> · Puedes cambiar hasta el 11 jun 15:00 CDMX
            </p>
          )}
          <div className="grid grid-cols-3 gap-1.5 max-h-64 overflow-y-auto">
            {campeonEquipos.map(equipo => (
              <button
                key={equipo}
                onClick={() => setCampeonPickTemp(equipo)}
                className="py-2 px-1 rounded-lg text-xs font-semibold text-center transition-all active:scale-95"
                style={{
                  background: campeonPickTemp === equipo ? '#ea580c' : 'var(--bg-card-hover)',
                  color: campeonPickTemp === equipo ? '#fff' : 'var(--text-secondary)',
                  border: `1px solid ${campeonPickTemp === equipo ? '#ea580c' : 'var(--border)'}`,
                  fontFamily: 'var(--font-rajdhani)',
                }}
              >
                {equipo}
              </button>
            ))}
          </div>
          <button
            onClick={guardarCampeonPick}
            disabled={!campeonPickTemp || campeonGuardando || campeonPickTemp === miCampeonPick}
            className="w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-40"
            style={{ background: '#ea580c', color: '#fff', fontFamily: 'var(--font-rajdhani)' }}
          >
            {campeonGuardando ? '⏳ Guardando...' : miCampeonPick ? '🔄 Actualizar predicción' : '🏆 Guardar predicción'}
          </button>
        </>
      )}
    </div>
  );
})()}
```

- [ ] **Step 6: Commit**

```bash
git add app/predicciones/page.tsx
git commit -m "feat: add champion pick section to /predicciones"
```

---

### Task 3: Admin — auto-detect champion in handleGuardar

**Files:**
- Modify: `app/admin/page.tsx`

- [ ] **Step 1: Add declararCampeonLogic function**

In `app/admin/page.tsx`, after the `declararUltimo` function (which ends around line 416), add:

```typescript
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
```

- [ ] **Step 2: Wire champion detection into handleGuardar**

In `handleGuardar`, the current success branch (lines ~258-263) is:

```typescript
} else {
  toast.success('✅ Resultado guardado');
  setResultados(prev => { const n = { ...prev }; delete n[partidoId]; return n; });
  await cargarPartidos();
}
```

Change to:

```typescript
} else {
  const partidoObj = partidos.find(p => p.id === partidoId);
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
```

- [ ] **Step 3: Commit**

```bash
git add app/admin/page.tsx
git commit -m "feat: auto-detect champion when Final match result is saved in admin"
```

---

### Task 4: Admin — manual champion accordion

**Files:**
- Modify: `app/admin/page.tsx`

- [ ] **Step 1: Add champion states**

After the `declarandoUltimo` state declaration, add:

```typescript
const [declarandoCampeon, setDeclarandoCampeon] = useState(false);
const [equipoCampeonManual, setEquipoCampeonManual] = useState('');
```

- [ ] **Step 2: Add campeon key to seccionesAbiertas**

Change `seccionesAbiertas` initial state from:

```typescript
const [seccionesAbiertas, setSeccionesAbiertas] = useState({
  pago: true,
  pozos: false,
  apodos: false,
  usuarios: false,
  resultados: false,
  notas: false,
});
```

To:

```typescript
const [seccionesAbiertas, setSeccionesAbiertas] = useState({
  pago: true,
  pozos: false,
  apodos: false,
  usuarios: false,
  resultados: false,
  notas: false,
  campeon: false,
});
```

- [ ] **Step 3: Add declararCampeonManual handler**

After `declararCampeonLogic`, add:

```typescript
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
```

- [ ] **Step 4: Add the accordion section in JSX**

In the `return` block, after the `{/* ── NOTAS DEL ADMIN ── */}` section and before `</main>`, add:

```tsx
{/* ── CAMPEÓN MUNDIAL ── */}
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
</section>
```

- [ ] **Step 5: Commit**

```bash
git add app/admin/page.tsx
git commit -m "feat: add manual champion declaration accordion to admin"
```

---

### Task 5: Dashboard compact card

**Files:**
- Modify: `app/dashboard/page.tsx`

- [ ] **Step 1: Add champion states in DashboardPage**

After existing state declarations (after `const { d, h, m, s, started, mounted: countdownReady } = useCountdown(INAUGURAL);`), add:

```typescript
const [campeonPick, setCampeonPick]           = useState<string | null>(null);
const [campeonBadge, setCampeonBadge]         = useState<string | null>(null);
const [campeonDeclarado, setCampeonDeclarado] = useState<string | null>(null);
const [campeonLoaded, setCampeonLoaded]       = useState(false);
```

- [ ] **Step 2: Load champion data in the existing auth useEffect**

The current `useEffect` with `[]` dependency (lines ~277-294) calls `supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id))`. Change it to also load champion data:

```typescript
useEffect(() => {
  supabase.auth.getUser().then(async ({ data }) => {
    const uid = data.user?.id;
    setUserId(uid);
    if (uid) {
      const [{ data: pick }, { data: jug }, { data: final }] = await Promise.all([
        supabase.from('quiniela_campeon_picks').select('equipo').eq('user_id', uid).maybeSingle(),
        supabase.from('quiniela_jugadores').select('badge_campeon').eq('id', uid).maybeSingle(),
        supabase
          .from('quiniela_partidos')
          .select('goles_local, goles_visitante, equipo_local, equipo_visitante')
          .eq('grupo', 'FIN')
          .eq('estado', 'finalizado')
          .maybeSingle(),
      ]);
      setCampeonPick(pick?.equipo ?? null);
      setCampeonBadge((jug as { badge_campeon?: string | null } | null)?.badge_campeon ?? null);
      if (final) {
        const ganador = (final.goles_local ?? 0) > (final.goles_visitante ?? 0)
          ? final.equipo_local
          : final.equipo_visitante;
        setCampeonDeclarado(ganador);
      }
      setCampeonLoaded(true);
    }
  });

  supabase
    .from('quiniela_pozo')
    .select('*')
    .order('jornada')
    .then(({ data }) => setPozos((data as Pozo[]) ?? []));

  supabase
    .from('quiniela_participaciones')
    .select('user_id')
    .eq('pagado', false)
    .then(({ data }) => {
      const ids = [...new Set((data ?? []).map((p: { user_id: string }) => p.user_id))];
      setPendienteIds(ids);
    });
}, []);
```

- [ ] **Step 3: Add compact card JSX**

In the `return` block, between the `{/* Countdown */}` div (which ends around line 369) and the `{/* Pozos por jornada */}` div (which starts at line 371), insert:

```tsx
{/* Champion pick compact card */}
{campeonLoaded && (
  <div
    className="rounded-2xl px-4 py-3 text-center"
    style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', animation: 'fadeInUp 0.5s ease-out 0.2s both' }}
  >
    {campeonDeclarado && campeonBadge === campeonDeclarado && (
      <p className="text-sm font-bold" style={{ color: '#fbbf24', fontFamily: 'var(--font-rajdhani)' }}>
        🏆 ¡Acertaste el Campeón! — {campeonDeclarado}
      </p>
    )}
    {campeonDeclarado && campeonPick && campeonPick !== campeonDeclarado && (
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        🏆 Campeón: <strong style={{ color: '#fbbf24' }}>{campeonDeclarado}</strong> · Tu pick: {campeonPick} ❌
      </p>
    )}
    {campeonDeclarado && !campeonPick && (
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        🏆 Campeón mundial: <strong style={{ color: '#fbbf24' }}>{campeonDeclarado}</strong>
      </p>
    )}
    {!campeonDeclarado && Date.now() >= INAUGURAL.getTime() && campeonPick && (
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        🔒 Tu campeón: <strong style={{ color: '#fbbf24' }}>{campeonPick}</strong>
      </p>
    )}
    {!campeonDeclarado && Date.now() < INAUGURAL.getTime() && !campeonPick && (
      <Link href="/predicciones" className="text-sm font-semibold hover:opacity-80"
        style={{ color: '#ea580c', fontFamily: 'var(--font-rajdhani)' }}>
        🏆 ¿Ya elegiste tu campeón? → Ir a Predicciones
      </Link>
    )}
    {!campeonDeclarado && Date.now() < INAUGURAL.getTime() && campeonPick && (
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        🏆 Tu campeón: <strong style={{ color: '#fbbf24' }}>{campeonPick}</strong>
      </p>
    )}
  </div>
)}
```

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat: add champion pick compact card to dashboard"
```

---

### Task 6: badge_campeon in RankingTable and dashboard jugadores select

**Files:**
- Modify: `components/RankingTable.tsx`
- Modify: `app/dashboard/page.tsx`

- [ ] **Step 1: Add badge_campeon in podio (top3 block)**

In `components/RankingTable.tsx`, inside the podio block (line ~64-69), find the `badge_ultimo` span:

```tsx
{entry.jugador?.badge_ultimo && (
  <span className="text-[9px] px-1.5 py-0.5 rounded-full"
    style={{ background: 'rgba(202,138,4,0.15)', border: '1px solid rgba(202,138,4,0.3)', color: '#facc15' }}>
    🤡 Último J{entry.jugador.badge_ultimo.replace('J', '')}
  </span>
)}
```

Immediately after it, add:

```tsx
{entry.jugador?.badge_campeon && (
  <span className="text-[9px] px-1.5 py-0.5 rounded-full"
    style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.4)', color: '#fbbf24' }}>
    🏆 {entry.jugador.badge_campeon}
  </span>
)}
```

- [ ] **Step 2: Add badge_campeon in resto list (position 4+)**

In `components/RankingTable.tsx`, inside `resto.map(...)` (line ~109), find its `badge_ultimo` span:

```tsx
{entry.jugador?.badge_ultimo && (
  <span className="text-[10px] px-1.5 py-0.5 rounded-full"
    style={{ background: 'rgba(202,138,4,0.15)', border: '1px solid rgba(202,138,4,0.3)', color: '#facc15' }}>
    🤡 Último J{entry.jugador.badge_ultimo.replace('J', '')}
  </span>
)}
```

Immediately after it, add:

```tsx
{entry.jugador?.badge_campeon && (
  <span className="text-[10px] px-1.5 py-0.5 rounded-full"
    style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.4)', color: '#fbbf24' }}>
    🏆 {entry.jugador.badge_campeon}
  </span>
)}
```

- [ ] **Step 3: Add badge_campeon in ≤3 fallback list**

In `components/RankingTable.tsx`, inside `ranking.map(...)` fallback block (line ~165), find its `badge_ultimo` span and add the same badge immediately after it.

- [ ] **Step 4: Update dashboard jugadores selects to fetch badge_campeon**

In `app/dashboard/page.tsx`, `cargarRanking` has two `.select('id, nombre, email, apodo, avatar_url, badge_ultimo')` calls. Change **both** to:

```typescript
.select('id, nombre, email, apodo, avatar_url, badge_ultimo, badge_campeon')
```

Then in both `.map()` calls that build the `jugador` object, after `badge_ultimo: jug?.badge_ultimo ?? null`, add:

```typescript
badge_campeon: jug?.badge_campeon ?? null,
```

- [ ] **Step 5: Commit**

```bash
git add components/RankingTable.tsx app/dashboard/page.tsx
git commit -m "feat: display badge_campeon in ranking table"
```

---

### Task 7: badge_campeon in jornada/[id]

**Files:**
- Modify: `app/jornada/[id]/page.tsx`

- [ ] **Step 1: Add badge_campeon to ParticipanteVista jugador type**

In `app/jornada/[id]/page.tsx` line 12, change the jugador type from:

```typescript
jugador: { nombre: string; email: string; apodo: string | null; badge_ultimo?: string | null } | null;
```

To:

```typescript
jugador: { nombre: string; email: string; apodo: string | null; badge_ultimo?: string | null; badge_campeon?: string | null } | null;
```

- [ ] **Step 2: Add badge_campeon to jugadores select query**

In `app/jornada/[id]/page.tsx`, line 76, change:

```typescript
.select('id, nombre, email, apodo, badge_ultimo')
```

To:

```typescript
.select('id, nombre, email, apodo, badge_ultimo, badge_campeon')
```

- [ ] **Step 3: Display badge_campeon in participant header**

In `app/jornada/[id]/page.tsx`, after the `badge_ultimo` span (lines 195-200):

```tsx
{p.jugador?.badge_ultimo && (
  <span className="text-[10px] px-2 py-0.5 rounded-full"
    style={{ background: 'rgba(202,138,4,0.15)', border: '1px solid rgba(202,138,4,0.3)', color: '#facc15' }}>
    🤡 Último J{p.jugador.badge_ultimo.replace('J', '')}
  </span>
)}
```

Immediately after it, add:

```tsx
{p.jugador?.badge_campeon && (
  <span className="text-[10px] px-2 py-0.5 rounded-full"
    style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.4)', color: '#fbbf24' }}>
    🏆 {p.jugador.badge_campeon}
  </span>
)}
```

- [ ] **Step 4: Commit**

```bash
git add app/jornada/[id]/page.tsx
git commit -m "feat: display badge_campeon in jornada participant list"
```

---

## Checklist before testing

1. Run the SQL from `scripts/campeon-pick.sql` in Supabase dashboard
2. Test `/predicciones` — pick a team, save, refresh — pick should persist
3. Test admin: save a match result with `grupo = 'FIN'` — champion should auto-declare
4. Test admin: open "CAMPEÓN MUNDIAL" accordion, pick team, click Declarar
5. Test `/predicciones` after deadline (or manually set `Date.now()` past `DEADLINE_CAMPEON`) — grid should be locked, stats should show
6. Verify `badge_campeon` appears in `/dashboard` ranking and `/jornada/[id]` participant list for users who got it right
