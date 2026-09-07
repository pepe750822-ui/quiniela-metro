import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const bodySchema = z.object({
  equipo: z.string().min(1, 'equipo requerido'),
  secret: z.string().min(1, 'secret requerido'),
});

// Jornada especial para bono LC (distinto de J6=6)
const JORNADA_CAMPEON_LC = 10;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Payload inválido', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { equipo, secret } = parsed.data;

  if (secret !== process.env.CLEANUP_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  // 1. Fetch all LC picks
  const { data: picks, error: picksErr } = await supabaseAdmin
    .from('quiniela_prediccion_campeon_lc')
    .select('user_id, equipo')
    .eq('temporada', 'ligamx2026');

  if (picksErr) return NextResponse.json({ error: picksErr.message }, { status: 500 });

  if (!picks || picks.length === 0) {
    return NextResponse.json({ acertaron: [], fallaron: [], total: 0 });
  }

  const acertaron = picks.filter(p => p.equipo === equipo);
  const fallaron  = picks.filter(p => p.equipo !== equipo);

  // 2. Update acerto column (requiere ejecutar scripts/campeon-lc-acerto.sql primero)
  const [updateAcerto, updateFallo] = await Promise.all([
    supabaseAdmin
      .from('quiniela_prediccion_campeon_lc')
      .update({ acerto: true })
      .eq('temporada', 'ligamx2026')
      .eq('equipo', equipo),
    supabaseAdmin
      .from('quiniela_prediccion_campeon_lc')
      .update({ acerto: false })
      .eq('temporada', 'ligamx2026')
      .neq('equipo', equipo),
  ]);

  // Log si la columna no existe aún (no bloquea la operación)
  if (updateAcerto.error) console.warn('acerto update error:', updateAcerto.error.message);
  if (updateFallo.error)  console.warn('acerto update error:', updateFallo.error.message);

  // 3. Borrar bonos previos LC (idempotente)
  await supabaseAdmin
    .from('quiniela_bono_campeon')
    .delete()
    .eq('jornada', JORNADA_CAMPEON_LC);

  // 4. Insertar bonos +5 pts a quienes acertaron
  if (acertaron.length > 0) {
    const { error: insErr } = await supabaseAdmin
      .from('quiniela_bono_campeon')
      .insert(
        acertaron.map(p => ({
          user_id: p.user_id,
          quiniela_extra_id: null,
          jornada: JORNADA_CAMPEON_LC,
          equipo,
          puntos: 5,
        }))
      );
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({
    campeon: equipo,
    acertaron: acertaron.map(p => ({ user_id: p.user_id, equipo: p.equipo })),
    fallaron:  fallaron.map(p =>  ({ user_id: p.user_id, equipo: p.equipo })),
    total: picks.length,
  });
}
