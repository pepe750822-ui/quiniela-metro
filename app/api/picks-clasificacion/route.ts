import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const pickSchema = z.object({
  user_id: z.string().uuid(),
  liga: z.enum(['ligamx', 'mls']),
  equipos: z.array(z.string().min(1)),
});

const clasificadoSchema = z.object({
  liga: z.enum(['ligamx', 'mls']),
  equipos: z.array(z.string().min(1)),
});

export async function GET() {
  const [{ data: picks, error: picksError }, { data: clasificados, error: clasError }] = await Promise.all([
    supabaseAdmin
      .from('quiniela_picks_clasificacion')
      .select('user_id, liga, equipos')
      .eq('temporada', 'ligamx2026'),
    supabaseAdmin
      .from('quiniela_clasificados_lc')
      .select('liga, equipos')
      .eq('temporada', 'ligamx2026'),
  ]);

  if (picksError || clasError) {
    console.error('Error picks-clasificacion:', picksError ?? clasError);
    return NextResponse.json({ error: 'Error al obtener datos' }, { status: 500 });
  }

  const picksParsed = z.array(pickSchema).safeParse(picks ?? []);
  const clasParsed = z.array(clasificadoSchema).safeParse(clasificados ?? []);

  if (!picksParsed.success || !clasParsed.success) {
    console.error('Respuesta inválida picks-clasificacion:', picksParsed.error?.flatten(), clasParsed.error?.flatten());
    return NextResponse.json({ error: 'Formato de datos inesperado' }, { status: 500 });
  }

  return NextResponse.json({ picks: picksParsed.data, clasificados: clasParsed.data });
}