# Predicciones — Desglose de puntos + Polling automático

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrar desglose de puntos por concepto en cada PartidoCard cuando el partido está finalizado, y recargar automáticamente cada 60 segundos para reflejar partidos recién finalizados.

**Architecture:** Todo el cálculo de desglose ocurre en `PartidoCard.tsx` usando datos que ya llegan via props (`partido.grupo`, `partido.clasificado`, `partido.como_termino`, `prediccion.puntos_ganados`). El polling se agrega en `app/predicciones/page.tsx` con `setInterval`/`clearInterval` dentro de un `useEffect`. No se toca la lógica de puntos — solo la presentación.

**Tech Stack:** React (Next.js App Router), TypeScript, Supabase (solo lectura en polling), Tailwind via `className`, CSS inline via `style`.

---

## File Map

| Archivo | Qué cambia |
|---|---|
| `components/PartidoCard.tsx` | Reemplazar badge simple de puntos por desglose por concepto (LMX vs LC) |
| `app/predicciones/page.tsx` | Agregar `useEffect` con `setInterval` de 60s que llama `cargarPredicciones()` y `cargarPartidos()` |

---

### Task 1: Desglose de puntos en PartidoCard — LMX

**Files:**
- Modify: `components/PartidoCard.tsx:56-62` (bloque `puntosInfo`)
- Modify: `components/PartidoCard.tsx:256-267` (render del badge)

**Contexto:** Para partidos con `partido.grupo !== 'LC'` (Liga MX), la lógica es simple: 3pts = exacto, 1pt = resultado correcto, 0pts = fallo. El badge actual ya muestra `+3 pts` / `+1 pt` / `0 pts` pero sin desglose ni ícono ⚽/✗. Mejorarlo para mostrar íconos y etiqueta descriptiva.

- [ ] **Step 1: Reemplazar bloque `puntosInfo` (líneas 56-62) con función que computa label + íconos LMX**

Elimina el objeto `puntosInfo` actual y reemplázalo con esta lógica (inmediatamente después de `const mostrarTerminacion = ...`):

```tsx
  const esLC = partido.grupo === 'LC';

  // Para LMX: badge simple con ícono
  const lmxBadge = (!esLC && prediccion && fin) ? (() => {
    const pts = prediccion.puntos_ganados;
    if (pts >= 3) return { color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)', label: '⚽⚽⚽ 3pts exacto' };
    if (pts === 1) return { color: '#f97316', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.2)', label: '⚽ 1pt resultado' };
    return { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)', label: '✗ 0pts' };
  })() : null;
```

- [ ] **Step 2: Reemplazar el render del badge LMX (líneas 256-267)**

El bloque actual:
```tsx
            {partido.estado === 'finalizado' && puntosInfo && (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                style={{
                  background: puntosInfo.bg,
                  color: puntosInfo.color,
                  border: `1px solid ${puntosInfo.border}`,
                }}
              >
                {puntosInfo.label}
              </span>
            )}
```

Reemplazarlo por:
```tsx
            {fin && !esLC && lmxBadge && (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                style={{
                  background: lmxBadge.bg,
                  color: lmxBadge.color,
                  border: `1px solid ${lmxBadge.border}`,
                }}
              >
                {lmxBadge.label}
              </span>
            )}
```

- [ ] **Step 3: Verificar que TypeScript compila sin errores**

```bash
cd C:/Users/pp_it/quiniela-metro && npx tsc --noEmit 2>&1 | head -30
```

Expected: sin errores (o solo warnings preexistentes).

- [ ] **Step 4: Commit**

```bash
cd C:/Users/pp_it/quiniela-metro
git add components/PartidoCard.tsx
git commit -m "feat: mostrar ícono ⚽/✗ en badge de puntos LMX en PartidoCard"
```

---

### Task 2: Desglose multi-concepto para LC en PartidoCard

**Files:**
- Modify: `components/PartidoCard.tsx` — agregar bloque de desglose LC después del badge LMX

**Contexto:** Para `partido.grupo === 'LC'`, los puntos se desglosan en:
- Base (marcador/resultado): `ptsBase = pts - ptsClasif - ptsComo` → ⚽⚽⚽ 3pts / ⚽ 1pt / ✗ 0pts
- Clasificado: `ptsClasif = partido.clasificado && pred.clasificado_pred === partido.clasificado ? 1 : 0`
- Como termina: `ptsComo = partido.como_termino && pred.como_termina_pred === partido.como_termino ? 1 : 0`
- Total: suma, coloreado por rango (≥4=dorado, 3=verde, 2=azul, 1=naranja, 0=rojo)

La lógica es idéntica a `renderFinalizadoCell` en `app/tabla/page.tsx:1053-1083`. Replicarla en PartidoCard.

- [ ] **Step 1: Agregar cálculo del desglose LC justo después del bloque `lmxBadge`**

```tsx
  // Para LC: desglose por concepto
  const lcDesglose = (esLC && prediccion && fin) ? (() => {
    const pts = prediccion.puntos_ganados;
    const ptsClasif = (partido.clasificado && prediccion.clasificado_pred === partido.clasificado) ? 1 : 0;
    const ptsComo   = (partido.como_termino && prediccion.como_termina_pred === partido.como_termino) ? 1 : 0;
    const ptsBase   = Math.max(0, pts - ptsClasif - ptsComo);
    const emojiComo = partido.como_termino === 'penales' ? '🥅'
      : partido.como_termino === 'tiempo_extra' ? '⏩' : '⏱️';
    const banderaClasif = prediccion.clasificado_pred
      ? (partido.equipo_local === prediccion.clasificado_pred ? (partido.bandera_local ?? '') :
         partido.equipo_visitante === prediccion.clasificado_pred ? (partido.bandera_visitante ?? '') :
         BANDERAS_EQUIPOS[prediccion.clasificado_pred] ?? prediccion.clasificado_pred)
      : null;
    const totalColor = pts >= 4 ? '#eab308' : pts === 3 ? '#10b981' : pts === 2 ? '#60a5fa' : pts === 1 ? '#f97316' : '#ef4444';
    return { pts, ptsBase, ptsClasif, ptsComo, emojiComo, banderaClasif, totalColor };
  })() : null;
```

- [ ] **Step 2: Renderizar el desglose LC en el área de "Mi predicción"**

Dentro del bloque `{prediccion && (...)` en "Mi predicción" (actualmente líneas 224-297), después del `<div className="flex items-center justify-between gap-2">` que contiene el badge LMX, agregar el bloque LC:

```tsx
          {/* Desglose LC */}
          {fin && esLC && lcDesglose && (
            <div
              className="rounded-xl px-3 py-2 space-y-1"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', fontSize: 11 }}
            >
              {/* Base (marcador / resultado) */}
              <div className="flex items-center justify-between">
                <span style={{ color: '#94a3b8' }}>
                  {lcDesglose.ptsBase >= 3 ? '⚽⚽⚽ Exacto' : lcDesglose.ptsBase >= 1 ? '⚽ Resultado' : '✗ Fallo'}
                </span>
                <span style={{ color: lcDesglose.ptsBase >= 3 ? '#10b981' : lcDesglose.ptsBase >= 1 ? '#f97316' : '#ef4444', fontWeight: 700 }}>
                  {lcDesglose.ptsBase >= 3 ? '+3pts' : lcDesglose.ptsBase >= 1 ? '+1pt' : '0pts'}
                </span>
              </div>

              {/* Clasificado */}
              {partido.clasificado && (
                <div className="flex items-center justify-between">
                  <span style={{ color: '#94a3b8' }}>
                    {lcDesglose.banderaClasif ?? '?'} Clasificado
                  </span>
                  <span style={{ color: lcDesglose.ptsClasif ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                    {lcDesglose.ptsClasif ? '+1pt' : '+0'}
                  </span>
                </div>
              )}

              {/* Cómo terminó */}
              {partido.como_termino && (
                <div className="flex items-center justify-between">
                  <span style={{ color: '#94a3b8' }}>
                    {lcDesglose.emojiComo} Terminación
                  </span>
                  <span style={{ color: lcDesglose.ptsComo ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                    {lcDesglose.ptsComo ? '+1pt' : '+0'}
                  </span>
                </div>
              )}

              {/* Total */}
              <div
                className="flex items-center justify-between"
                style={{ borderTop: '1px solid rgba(148,163,184,0.15)', paddingTop: 4, marginTop: 2 }}
              >
                <span style={{ color: '#64748b', fontWeight: 600 }}>Total</span>
                <span style={{ color: lcDesglose.totalColor, fontWeight: 700, fontSize: 13 }}>
                  {lcDesglose.pts}pts
                </span>
              </div>
            </div>
          )}
```

Colocar este bloque **después** del `<div className="flex items-center justify-between gap-2">` (la fila de "Mi pred: X-Y + badge LMX") y **antes** del `<div className="flex gap-2 flex-wrap">` (los badges de pago).

- [ ] **Step 3: Verificar TypeScript**

```bash
cd C:/Users/pp_it/quiniela-metro && npx tsc --noEmit 2>&1 | head -30
```

Expected: sin errores nuevos.

- [ ] **Step 4: Commit**

```bash
cd C:/Users/pp_it/quiniela-metro
git add components/PartidoCard.tsx
git commit -m "feat: desglose multi-concepto de puntos LC en PartidoCard (clasificado, terminación, total)"
```

---

### Task 3: Polling de 60 segundos en predicciones/page.tsx

**Files:**
- Modify: `app/predicciones/page.tsx` — agregar `useEffect` con polling

**Contexto:** Los datos se cargan una sola vez al montar. Cuando un partido cambia a `finalizado` y se actualizan `puntos_ganados` en BD, el usuario debe refrescar manualmente. Necesitamos un intervalo de 60s que recargue `cargarPartidos()` y `cargarPredicciones()` solo mientras hay partidos no finalizados (pendiente o en_curso). Si todos están finalizados, el polling no sirve — pero por simplicidad lo dejamos siempre activo mientras la página está abierta (el costo de 2 queries REST cada 60s es mínimo).

- [ ] **Step 1: Agregar `useEffect` de polling después de los `useEffect` existentes (línea ~667)**

Insertar después de la línea `if (userId) cargarPozoYParticipacion(userId, jornada);` / `}, [jornada, ...]);` (el último useEffect del bloque de carga inicial):

```tsx
  // Polling cada 60s para reflejar partidos recién finalizados
  useEffect(() => {
    const interval = setInterval(() => {
      cargarPartidos();
      if (userId) cargarPredicciones();
    }, 60_000);
    return () => clearInterval(interval);
  }, [cargarPartidos, cargarPredicciones, userId]);
```

El `useEffect` va justo después del bloque que termina en `}, [userId, jornada, cargarQuinielas, ...]);` (línea ~600) y antes de `const cargarPicksClasificacion = ...`.

- [ ] **Step 2: Verificar TypeScript**

```bash
cd C:/Users/pp_it/quiniela-metro && npx tsc --noEmit 2>&1 | head -30
```

Expected: sin errores nuevos.

- [ ] **Step 3: Commit**

```bash
cd C:/Users/pp_it/quiniela-metro
git add app/predicciones/page.tsx
git commit -m "feat: polling cada 60s en predicciones para reflejar partidos finalizados"
```

---

### Task 4: git push

- [ ] **Step 1: Push al remoto**

```bash
cd C:/Users/pp_it/quiniela-metro && git push
```

Expected: `Branch 'main' set up to track remote branch 'main'` o `Everything up-to-date` seguido de los 3 commits nuevos.

---

## Self-Review

**Spec coverage:**
- ✅ LMX: ⚽⚽⚽ 3pts exacto / ⚽ 1pt resultado / ✗ 0pts → Task 1
- ✅ LC: marcador +3pts / resultado +1pt / clasificado +1pt / terminación +1pt / total max 5pts → Task 2
- ✅ Desglose por concepto igual que en tabla → Task 2 replica lógica de `renderFinalizadoCell`
- ✅ Usa `p.puntos_ganados` de `quiniela_predicciones` → ya en el prop `prediccion.puntos_ganados`
- ✅ Polling 60s para recargar automático → Task 3

**Placeholder scan:** Ninguno — todo el código está completo.

**Type consistency:** `prediccion.clasificado_pred`, `prediccion.como_termina_pred`, `partido.clasificado`, `partido.como_termino`, `partido.grupo` — todos en tipos existentes (`Prediccion`, `Partido` en `types/index.ts`). `BANDERAS_EQUIPOS` importado en `PartidoCard.tsx` línea 7.
