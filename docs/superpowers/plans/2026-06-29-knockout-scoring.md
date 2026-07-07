# Puntuación Knockout (J5+) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar reglas de puntuación para rondas eliminatorias J5+: +1pt por equipo clasificado correcto, +1pt por cómo termina (reglamentario/prórroga/penales); mostrar resultados en la tabla; cobrar 100 MXN desde J5.

**Architecture:** DB-first — agregar 4 columnas (2 en partidos, 2 en predicciones), actualizar el trigger Postgres para sumar puntos bonus, luego actualizar frontend para capturar y mostrar los nuevos campos. El cambio al trigger es aditivo: la puntuación base (3/1/0) no cambia; el bonus solo aplica para jornada ≥ 5.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase (Postgres + RLS), Tailwind CSS, Sonner toasts.

---

### Task 1: DB migration — columnas nuevas + trigger actualizado

**Files:**
- Create: `scripts/knockout-scoring.sql`

- [ ] **Step 1: Crear el archivo de migración**

Crear `scripts/knockout-scoring.sql` con el contenido siguiente (correr **una vez** en el SQL Editor de Supabase):

```sql
-- Knockout scoring: new columns and updated trigger for J5+

-- 1. Agregar columnas
ALTER TABLE quiniela_predicciones
  ADD COLUMN IF NOT EXISTS clasificado_pred TEXT,
  ADD COLUMN IF NOT EXISTS como_termina_pred TEXT;

ALTER TABLE quiniela_partidos
  ADD COLUMN IF NOT EXISTS clasificado TEXT,
  ADD COLUMN IF NOT EXISTS como_termino TEXT;

-- 2. Reemplazar función del trigger con lógica de bonus para jornada >= 5
CREATE OR REPLACE FUNCTION calcular_puntos_quiniela()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE quiniela_predicciones p
  SET puntos_ganados =
    -- Puntos por marcador (sin cambios)
    CASE
      WHEN p.goles_local_pred  = NEW.goles_local
       AND p.goles_visitante_pred = NEW.goles_visitante
      THEN 3
      WHEN (p.goles_local_pred > p.goles_visitante_pred  AND NEW.goles_local > NEW.goles_visitante)
        OR (p.goles_local_pred < p.goles_visitante_pred  AND NEW.goles_local < NEW.goles_visitante)
        OR (p.goles_local_pred = p.goles_visitante_pred  AND NEW.goles_local = NEW.goles_visitante)
      THEN 1
      ELSE 0
    END
    -- Bonus: clasificado correcto (solo J5+)
    + CASE
        WHEN NEW.jornada >= 5
         AND NEW.clasificado IS NOT NULL
         AND p.clasificado_pred = NEW.clasificado
        THEN 1 ELSE 0
      END
    -- Bonus: cómo termina correcto (solo J5+)
    + CASE
        WHEN NEW.jornada >= 5
         AND NEW.como_termino IS NOT NULL
         AND p.como_termina_pred = NEW.como_termino
        THEN 1 ELSE 0
      END
  WHERE p.partido_id = NEW.id;

  INSERT INTO quiniela_ranking (user_id, jornada, puntos_total, exactos)
  SELECT
    p.user_id,
    NEW.jornada,
    SUM(p.puntos_ganados),
    COUNT(CASE WHEN p.puntos_ganados = 3 THEN 1 END)
  FROM quiniela_predicciones p
  JOIN quiniela_partidos pa ON pa.id = p.partido_id
  WHERE pa.jornada = NEW.jornada
    AND p.quiniela_extra_id IS NULL
  GROUP BY p.user_id
  ON CONFLICT (user_id, jornada)
  DO UPDATE SET
    puntos_total = EXCLUDED.puntos_total,
    exactos      = EXCLUDED.exactos,
    updated_at   = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Recrear trigger para que también dispare al actualizar clasificado / como_termino
DROP TRIGGER IF EXISTS trigger_calcular_puntos ON quiniela_partidos;
CREATE TRIGGER trigger_calcular_puntos
  AFTER UPDATE OF goles_local, goles_visitante, clasificado, como_termino
  ON quiniela_partidos
  FOR EACH ROW EXECUTE FUNCTION calcular_puntos_quiniela();
```

- [ ] **Step 2: Correr en Supabase SQL Editor**

Copiar y ejecutar el contenido de `scripts/knockout-scoring.sql`. Verificar que no haya errores.

Confirmar columnas con:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name IN ('quiniela_predicciones','quiniela_partidos')
  AND column_name IN ('clasificado_pred','como_termina_pred','clasificado','como_termino')
ORDER BY table_name, column_name;
```
Resultado esperado: 4 filas.

- [ ] **Step 3: Commit**

```bash
git add scripts/knockout-scoring.sql
git commit -m "feat: add DB columns and trigger for J5+ knockout scoring"
```

---

### Task 2: Types — extender Partido y Prediccion

**Files:**
- Modify: `types/index.ts`

- [ ] **Step 1: Agregar campos a la interfaz Partido**

En `types/index.ts`, agregar dos campos opcionales después de `estado` (antes de `estadio`):

Old:
```typescript
  fecha_hora: string;
  estado: EstadoPartido;
  estadio?: string | null;
```

New:
```typescript
  fecha_hora: string;
  estado: EstadoPartido;
  clasificado?: string | null;
  como_termino?: string | null;
  estadio?: string | null;
```

- [ ] **Step 2: Agregar campos a la interfaz Prediccion**

Old:
```typescript
  quiniela_extra_id?: string | null;
  created_at: string;
```

New:
```typescript
  quiniela_extra_id?: string | null;
  clasificado_pred?: string | null;
  como_termina_pred?: string | null;
  created_at: string;
```

- [ ] **Step 3: Commit**

```bash
git add types/index.ts
git commit -m "feat: add knockout fields to Partido and Prediccion types"
```

---

### Task 3: Utils — getMontoJornada para J5+

**Files:**
- Modify: `lib/utils.ts:55`

- [ ] **Step 1: Actualizar getMontoJornada**

Old (línea 55):
```typescript
export const getMontoJornada = (j: number) => 50;
```

New:
```typescript
export const getMontoJornada = (j: number) => j >= 5 ? 100 : 50;
```

- [ ] **Step 2: Commit**

```bash
git add lib/utils.ts
git commit -m "feat: getMontoJornada returns 100 for J5+"
```

---

### Task 4: PrediccionForm — selectores de knockout

**Files:**
- Modify: `components/PrediccionForm.tsx`

- [ ] **Step 1: Agregar import de getMontoJornada**

Old (línea 8):
```typescript
import { Bandera } from '@/components/Bandera';
```

New:
```typescript
import { Bandera } from '@/components/Bandera';
import { getMontoJornada } from '@/lib/utils';
```

- [ ] **Step 2: Extender tipo de prediccionExistente en Props**

Old (línea 13):
```typescript
  prediccionExistente?: { goles_local_pred: number; goles_visitante_pred: number } | null;
```

New:
```typescript
  prediccionExistente?: {
    goles_local_pred: number;
    goles_visitante_pred: number;
    clasificado_pred?: string | null;
    como_termina_pred?: string | null;
  } | null;
```

- [ ] **Step 3: Agregar variables de estado**

Old (líneas 45-47):
```typescript
  const [local,   setLocal]   = useState(prediccionExistente?.goles_local_pred ?? 0);
  const [visita,  setVisita]  = useState(prediccionExistente?.goles_visitante_pred ?? 0);
  const [loading, setLoading] = useState(false);
```

New:
```typescript
  const [local,           setLocal]           = useState(prediccionExistente?.goles_local_pred ?? 0);
  const [visita,          setVisita]          = useState(prediccionExistente?.goles_visitante_pred ?? 0);
  const [clasificadoPred, setClasificadoPred] = useState<string | null>(prediccionExistente?.clasificado_pred ?? null);
  const [comoTerminaPred, setComoTerminaPred] = useState<string | null>(prediccionExistente?.como_termina_pred ?? null);
  const [loading,         setLoading]         = useState(false);
```

- [ ] **Step 4: Usar getMontoJornada en lugar del valor hardcodeado 50**

Old (línea 69):
```typescript
        monto:             50,
```

New:
```typescript
        monto:             getMontoJornada(partido.jornada),
```

- [ ] **Step 5: Incluir nuevos campos en el upsert**

Old (líneas 77-87):
```typescript
    const { error } = await supabase
      .from('quiniela_predicciones')
      .upsert({
        user_id:              userId,
        partido_id:           partido.id,
        quiniela_extra_id:    quinielaExtraId || null,
        goles_local_pred:     local,
        goles_visitante_pred: visita,
        updated_at:           new Date().toISOString(),
      }, {
        onConflict: 'user_id,partido_id,quiniela_extra_id',
        ignoreDuplicates: false,
      });
```

New:
```typescript
    const { error } = await supabase
      .from('quiniela_predicciones')
      .upsert({
        user_id:              userId,
        partido_id:           partido.id,
        quiniela_extra_id:    quinielaExtraId || null,
        goles_local_pred:     local,
        goles_visitante_pred: visita,
        ...(partido.jornada >= 5 && {
          clasificado_pred:  clasificadoPred,
          como_termina_pred: comoTerminaPred,
        }),
        updated_at:           new Date().toISOString(),
      }, {
        onConflict: 'user_id,partido_id,quiniela_extra_id',
        ignoreDuplicates: false,
      });
```

- [ ] **Step 6: Insertar bloque JSX de selectores antes de los botones de acción**

Insertar el siguiente bloque ANTES de `<div className="flex gap-3">` (que contiene los botones Cancelar/Guardar):

```tsx
        {partido.jornada >= 5 && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <p className="text-xs text-center uppercase tracking-widest font-semibold" style={{ color: 'var(--text-secondary)' }}>
                ¿Quién clasifica?
              </p>
              <div className="flex gap-2">
                {[partido.equipo_local, partido.equipo_visitante].map(equipo => (
                  <button
                    key={equipo}
                    type="button"
                    onClick={() => setClasificadoPred(equipo)}
                    className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95"
                    style={{
                      background: clasificadoPred === equipo ? 'var(--accent-gold)' : 'var(--bg-card-hover)',
                      color: clasificadoPred === equipo ? '#000' : 'var(--text-secondary)',
                      border: `1px solid ${clasificadoPred === equipo ? 'var(--accent-gold)' : 'var(--border)'}`,
                    }}
                  >
                    {equipo}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs text-center uppercase tracking-widest font-semibold" style={{ color: 'var(--text-secondary)' }}>
                ¿Cómo termina?
              </p>
              <div className="flex gap-2">
                {(['reglamentario', 'tiempo_extra', 'penales'] as const).map(opcion => (
                  <button
                    key={opcion}
                    type="button"
                    onClick={() => setComoTerminaPred(opcion)}
                    className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95"
                    style={{
                      background: comoTerminaPred === opcion ? 'var(--accent-gold)' : 'var(--bg-card-hover)',
                      color: comoTerminaPred === opcion ? '#000' : 'var(--text-secondary)',
                      border: `1px solid ${comoTerminaPred === opcion ? 'var(--accent-gold)' : 'var(--border)'}`,
                    }}
                  >
                    {opcion === 'reglamentario' ? '⚽ Normal' : opcion === 'tiempo_extra' ? '⏱️ Prórroga' : '🥅 Penales'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
```

- [ ] **Step 7: Commit**

```bash
git add components/PrediccionForm.tsx
git commit -m "feat: add clasificado/como_termina selectors in PrediccionForm for J5+"
```

---

### Task 5: Tabla — mostrar clasificado y como_termino en headers

**Files:**
- Modify: `app/tabla/page.tsx`

- [ ] **Step 1: Agregar import de BANDERAS_EQUIPOS**

Old (línea 7):
```typescript
import { getNombreJornada } from '@/lib/utils';
```

New:
```typescript
import { getNombreJornada, BANDERAS_EQUIPOS } from '@/lib/utils';
```

- [ ] **Step 2: Extender SELECT de partidos**

Old (línea 51):
```typescript
      .select('id, jornada, equipo_local, equipo_visitante, bandera_local, bandera_visitante, goles_local, goles_visitante, estado, grupo, fecha_hora')
```

New:
```typescript
      .select('id, jornada, equipo_local, equipo_visitante, bandera_local, bandera_visitante, goles_local, goles_visitante, estado, grupo, fecha_hora, clasificado, como_termino')
```

- [ ] **Step 3: Extender SELECT de predicciones**

Old (línea 85):
```typescript
    const selectPreds = 'user_id, partido_id, goles_local_pred, goles_visitante_pred, puntos_ganados, quiniela_extra_id';
```

New:
```typescript
    const selectPreds = 'user_id, partido_id, goles_local_pred, goles_visitante_pred, puntos_ganados, quiniela_extra_id, clasificado_pred, como_termina_pred';
```

- [ ] **Step 4: Agregar helper emojiComoTermino**

Agregar después de la función `ptsClass` (después de línea 128):

```typescript
  const emojiComoTermino = (como: string | null | undefined) => {
    if (como === 'reglamentario') return '⚽';
    if (como === 'tiempo_extra')  return '⏱️';
    if (como === 'penales')       return '🥅';
    return '';
  };
```

- [ ] **Step 5: Mostrar clasificado + como_termino en headers de partidos finalizados**

En el header de cada partido finalizado, el bloque que actualmente termina así (líneas 439-444):

```tsx
                  <div className="rounded px-1 py-0.5 font-bold text-xs"
                    style={{ background: 'rgba(234,88,12,0.2)', border: '1px solid rgba(234,88,12,0.3)', color: '#fb923c' }}>
                    {partido.goles_local}-{partido.goles_visitante}
                  </div>
                </th>
              ))}
```

Agregar el bloque de clasificado justo antes del `</th>`:

```tsx
                  <div className="rounded px-1 py-0.5 font-bold text-xs"
                    style={{ background: 'rgba(234,88,12,0.2)', border: '1px solid rgba(234,88,12,0.3)', color: '#fb923c' }}>
                    {partido.goles_local}-{partido.goles_visitante}
                  </div>
                  {jornada >= 5 && partido.clasificado && (
                    <div className="flex items-center justify-center gap-0.5 mt-0.5">
                      <Bandera emoji={BANDERAS_EQUIPOS[partido.clasificado] ?? ''} nombre={partido.clasificado} size="sm" />
                      <span style={{ fontSize: '0.6rem', color: '#94a3b8' }}>
                        {emojiComoTermino(partido.como_termino)}
                      </span>
                    </div>
                  )}
                </th>
              ))}
```

- [ ] **Step 6: Commit**

```bash
git add app/tabla/page.tsx
git commit -m "feat: show clasificado flag and como_termino emoji in tabla for J5+"
```

---

### Task 6: Push

- [ ] **Step 1: Push**

```bash
git push
```

Resultado esperado: 5 commits nuevos subidos al remote.

---

## Self-review — cobertura del spec

| Requisito | Task |
|---|---|
| `quiniela_predicciones`: columnas `clasificado_pred` + `como_termina_pred` | Task 1 |
| `quiniela_partidos`: columnas `clasificado` + `como_termino` | Task 1 |
| Trigger: +1pt si `clasificado_pred = clasificado` para J5+ | Task 1 |
| Trigger: +1pt si `como_termina_pred = como_termino` para J5+ | Task 1 |
| PrediccionForm: selectores cuando `jornada >= 5` | Task 4 |
| tabla/page.tsx: bandera del clasificado + emoji cómo terminó | Task 5 |
| `getMontoJornada(5) = 100` | Task 3 |

Todos los ítems cubiertos. Sin placeholders. Tipos consistentes entre tasks.
