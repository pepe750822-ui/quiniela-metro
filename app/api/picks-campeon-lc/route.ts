import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Service_role para bypassear RLS — los picks de campeón LC son información pública
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('quiniela_prediccion_campeon_lc')
    .select('user_id, equipo')
    .eq('temporada', 'ligamx2026');

  if (error) {
    console.error('Error picks-campeon-lc:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ picks: data ?? [] });
}