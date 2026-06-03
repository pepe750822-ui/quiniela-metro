import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get('secret') !== process.env.CLEANUP_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: jornadas } = await supabase
    .from('quiniela_partidos')
    .select('jornada, fecha_hora')
    .order('fecha_hora', { ascending: true });

  // Primer partido por jornada
  const primerosPartidos: Record<number, string> = {};
  jornadas?.forEach(p => {
    if (!primerosPartidos[p.jornada]) {
      primerosPartidos[p.jornada] = p.fecha_hora;
    }
  });

  let totalEliminados = 0;

  for (const [jornada, fechaHora] of Object.entries(primerosPartidos)) {
    const horasRestantes = (new Date(fechaHora).getTime() - Date.now()) / (1000 * 60 * 60);

    if (horasRestantes < 24 && horasRestantes > 0) {
      const { data: noPagadas } = await supabase
        .from('quiniela_participaciones')
        .select('id, user_id')
        .eq('jornada', parseInt(jornada))
        .eq('pagado', false);

      const { data: partidos } = await supabase
        .from('quiniela_partidos')
        .select('id')
        .eq('jornada', parseInt(jornada));

      const partidoIds = partidos?.map(p => p.id) ?? [];

      for (const part of noPagadas ?? []) {
        if (partidoIds.length) {
          await supabase
            .from('quiniela_predicciones')
            .delete()
            .eq('user_id', part.user_id)
            .in('partido_id', partidoIds);
        }

        await supabase
          .from('quiniela_participaciones')
          .delete()
          .eq('id', part.id);

        totalEliminados++;
      }
    }
  }

  return NextResponse.json({
    eliminados: totalEliminados,
    timestamp: new Date().toISOString(),
  });
}
