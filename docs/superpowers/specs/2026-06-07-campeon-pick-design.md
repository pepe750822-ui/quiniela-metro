# Predicción de Campeón Mundial — Design Spec
**Fecha:** 2026-06-07  
**Proyecto:** Quiniela Metro  
**Estado:** Aprobado

---

## Resumen

Agregar una predicción de campeón mundial antes de que inicie el torneo. Los usuarios eligen qué país ganará el Mundial 2026. El premio es un badge de reconocimiento (no puntos al ranking). La detección del campeón es automática cuando se registra el resultado de la Final, con botón manual en admin como respaldo.

---

## Base de datos

### Nueva tabla: `quiniela_campeon_picks`

```sql
CREATE TABLE quiniela_campeon_picks (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL UNIQUE REFERENCES quiniela_jugadores(id) ON DELETE CASCADE,
  equipo     TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

- `UNIQUE` en `user_id`: un pick por usuario; permite upsert limpio.
- RLS:
  - `SELECT`: todos los usuarios autenticados pueden leer todos los picks (para stats agregadas post-deadline).
  - `INSERT/UPDATE`: solo el propio usuario puede escribir su pick, y solo antes del deadline.
    ```sql
    CREATE POLICY "pick_own_before_deadline" ON quiniela_campeon_picks
    FOR ALL USING (
      auth.uid() = user_id
      AND NOW() < '2026-06-11T20:00:00+00'::timestamptz
    );
    ```

### Columna nueva en `quiniela_jugadores`

```sql
ALTER TABLE quiniela_jugadores
ADD COLUMN IF NOT EXISTS badge_campeon TEXT;
-- Valor: nombre del equipo campeón cuando el usuario acertó, ej: 'Argentina'
-- NULL si no acertó o aún no se ha declarado campeón
```

### Script

`scripts/campeon-pick.sql` — contiene CREATE TABLE, RLS policies y ALTER TABLE.

---

## Deadline

Constante: `2026-06-11T20:00:00Z` (partido inaugural, misma que ya existe en `dashboard/page.tsx`).

- Aplicado **en el cliente**: si `Date.now() >= INAUGURAL`, el selector se bloquea.
- No requiere lógica de servidor adicional — el deadline es público y conocido.

---

## Lista de equipos disponibles

Extraída dinámicamente de `quiniela_partidos`:

```sql
SELECT DISTINCT unnest(ARRAY[equipo_local, equipo_visitante]) AS equipo
FROM quiniela_partidos
ORDER BY equipo;
```

No se mantiene una lista hardcodeada — usa los equipos ya registrados en la DB.

---

## Detección automática del campeón

Ubicación: `handleGuardar()` en `app/admin/page.tsx`.

Flujo al guardar un resultado:
1. Verificar si el partido tiene `grupo = 'FIN'` y el nuevo estado es `'finalizado'`.
2. Determinar ganador: `goles_local > goles_visitante ? equipo_local : equipo_visitante`.
   - El admin ingresa el resultado definitivo (incluye tiempo extra / penales).
3. Consultar `quiniela_campeon_picks` filtrando por `equipo = ganador`.
4. Hacer `UPDATE quiniela_jugadores SET badge_campeon = ganador WHERE id IN (user_ids que acertaron)`.
5. Mostrar `toast.success('🏆 Campeón declarado — X usuarios acertaron')`.

Si el partido final ya tenía resultado previo (corrección), la lógica se vuelve a ejecutar y sobreescribe los badges anteriores.

---

## Botón manual en admin (respaldo)

En `app/admin/page.tsx`, nueva sección "🏆 CAMPEÓN" (acordeón, al final del panel):

- Dropdown con la lista de equipos (misma query dinámica).
- Botón "🏆 Declarar campeón".
- Al pulsar: ejecuta directamente el paso 3–5 del flujo automático.
- Sobreescribe cualquier badge existente — útil para correcciones.

Estado de UI: `declarandoCampeon: boolean`.

---

## UI — `/predicciones`

Nueva sección al **tope de la página**, antes de la lista de partidos.

### Estados

| Condición | Vista |
|---|---|
| Antes del deadline, sin pick | Tarjeta con grid de equipos + botón "Guardar predicción" |
| Antes del deadline, con pick | Tarjeta con pick actual resaltado + botón para cambiar |
| Después del deadline, campeón no declarado | Pick bloqueado 🔒 + stats agregadas (cuántos eligieron cada equipo) |
| Campeón declarado, acertó | `✅ Acertaste — [equipo]` + badge visible |
| Campeón declarado, no acertó | `❌ No fue [tu equipo] — ganó [campeón]` |
| Sin pick y deadline pasado | "No hiciste una predicción para esta jornada" |

### Stats agregadas (post-deadline, pre-declaración)

Mostrar un ranking de popularidad de picks:
```
🇦🇷 Argentina — 4 jugadores
🇧🇷 Brasil    — 3 jugadores
🇫🇷 Francia   — 2 jugadores
...
```
Sin revelar nombres individuales hasta que se declare al campeón.

### Interacción

- Grid de botones (uno por equipo) — botón activo resaltado en naranja.
- `upsert` en `quiniela_campeon_picks` al guardar.
- Toast de confirmación.

---

## UI — `/dashboard`

Tarjeta compacta entre el countdown y la sección de pozos.

- **Antes del deadline sin pick:** `"🏆 ¿Ya elegiste tu campeón? → [Ir a Predicciones]"` — link a `/predicciones`.
- **Antes del deadline con pick:** `"🏆 Tu campeón: [equipo]"` pequeño.
- **Después del deadline:** pick bloqueado, sin stats (no dominar la pantalla).
- **Campeón declarado:** resultado visible con badge o mensaje de "no acertaste".

---

## Badge

**Columna:** `badge_campeon TEXT` en `quiniela_jugadores`.  
**Valor:** nombre del equipo (ej. `'Argentina'`), `NULL` si no acertó.  
**Visual:** `🏆 Campeón [equipo]` en color dorado (`#fbbf24`) — distinto al amarillo de `badge_ultimo`.

### Dónde se muestra (post-declaración)

- `components/RankingTable.tsx` — junto al nombre en podio y lista (igual que `badge_ultimo`)
- `app/jornada/[id]/page.tsx` — junto al nombre en tarjetas de participantes
- `app/dashboard/page.tsx` — en la tarjeta compacta del pick

---

## Archivos a crear / modificar

| Archivo | Cambio |
|---|---|
| `scripts/campeon-pick.sql` | Nuevo — CREATE TABLE, RLS, ALTER TABLE |
| `types/index.ts` | Agregar `badge_campeon?: string \| null` a `Jugador` |
| `app/predicciones/page.tsx` | Nueva sección al tope |
| `app/dashboard/page.tsx` | Nueva tarjeta compacta |
| `app/admin/page.tsx` | Detección automática en `handleGuardar()` + sección manual |
| `components/RankingTable.tsx` | Mostrar `badge_campeon` |
| `app/jornada/[id]/page.tsx` | Mostrar `badge_campeon` |

---

## Fuera de alcance

- No se agregan puntos al ranking general por acertar el campeón.
- No hay notificaciones push al declarar el campeón.
- No se revela quién eligió qué antes de declarar al campeón.
- No hay lógica para manejar empates en la Final (el admin siempre ingresa el resultado definitivo).
