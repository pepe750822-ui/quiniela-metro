import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const [{ data: picks }, { data: clasificados }] = await Promise.all([
    supabaseAdmin
      .from('quiniela_picks_clasificacion')
      .select('user_id, liga, equipos')
      .eq('temporada', 'ligamx2026'),
    supabaseAdmin
      .from('quiniela_clasificados_lc')
      .select('liga, equipos')
      .eq('temporada', 'ligamx2026'),
  ]);

  return NextResponse.json({ picks: picks ?? [], clasificados: clasificados ?? [] });
}
