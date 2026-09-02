import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const responseSchema = z.array(z.object({
  user_id: z.string().uuid(),
  equipo: z.string().min(1),
}));

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('quiniela_prediccion_campeon_lc')
    .select('user_id, equipo')
    .eq('temporada', 'ligamx2026');

  if (error) {
    console.error('Error picks-campeon-lc:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const parsed = responseSchema.safeParse(data ?? []);
  if (!parsed.success) {
    console.error('Respuesta inválida picks-campeon-lc:', parsed.error.flatten());
    return NextResponse.json({ error: 'Formato de datos inesperado' }, { status: 500 });
  }

  return NextResponse.json({ picks: parsed.data });
}