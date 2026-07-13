import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Usa service_role para bypassear RLS y leer predicciones publicadas de todos los usuarios
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  const { partidoIds } = await request.json();

  if (!Array.isArray(partidoIds) || partidoIds.length === 0) {
    return NextResponse.json({ error: 'partidoIds requerido' }, { status: 400 });
  }

  const selectPreds = 'user_id, partido_id, goles_local_pred, goles_visitante_pred, puntos_ganados, quiniela_extra_id, clasificado_pred, como_termina_pred';

  // Fetch en chunks de 1000 con service_role (sin RLS)
  const [{ data: preds1 }, { data: preds2 }, { data: preds3 }, { data: preds4 }] = await Promise.all([
    supabaseAdmin.from('quiniela_predicciones').select(selectPreds).in('partido_id', partidoIds).order('id').range(0, 999),
    supabaseAdmin.from('quiniela_predicciones').select(selectPreds).in('partido_id', partidoIds).order('id').range(1000, 1999),
    supabaseAdmin.from('quiniela_predicciones').select(selectPreds).in('partido_id', partidoIds).order('id').range(2000, 2999),
    supabaseAdmin.from('quiniela_predicciones').select(selectPreds).in('partido_id', partidoIds).order('id').range(3000, 3999),
  ]);

  const allPreds = [...(preds1 || []), ...(preds2 || []), ...(preds3 || []), ...(preds4 || [])];
  return NextResponse.json({ predicciones: allPreds });
}
