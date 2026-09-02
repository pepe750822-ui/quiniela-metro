import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const bodySchema = z.object({
  partidoIds: z.array(z.string().uuid()).min(1, 'partidoIds requerido (array no vacío de UUIDs)'),
});

const selectPreds = 'user_id, partido_id, goles_local_pred, goles_visitante_pred, puntos_ganados, quiniela_extra_id, clasificado_pred, como_termina_pred';

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

  const { partidoIds } = parsed.data;

  const [{ data: preds1 }, { data: preds2 }, { data: preds3 }, { data: preds4 }] = await Promise.all([
    supabaseAdmin.from('quiniela_predicciones').select(selectPreds).in('partido_id', partidoIds).order('id').range(0, 999),
    supabaseAdmin.from('quiniela_predicciones').select(selectPreds).in('partido_id', partidoIds).order('id').range(1000, 1999),
    supabaseAdmin.from('quiniela_predicciones').select(selectPreds).in('partido_id', partidoIds).order('id').range(2000, 2999),
    supabaseAdmin.from('quiniela_predicciones').select(selectPreds).in('partido_id', partidoIds).order('id').range(3000, 3999),
  ]);

  const allPreds = [...(preds1 || []), ...(preds2 || []), ...(preds3 || []), ...(preds4 || [])];
  return NextResponse.json({ predicciones: allPreds });
}