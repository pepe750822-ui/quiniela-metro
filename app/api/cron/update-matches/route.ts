import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Esto se ejecutará por Vercel Cron
export async function GET(request: Request) {
  // Validar seguridad del Cron (Vercel manda un header específico)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    // Inicializar supabase con admin privileges para saltar RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // TODO: 1. Llamar a la API externa de resultados (ej. API-Football)
    // const response = await fetch('https://v3.football.api-sports.io/fixtures?date=YYYY-MM-DD', {
    //   headers: { 'x-apisports-key': process.env.API_SPORTS_KEY }
    // });
    // const data = await response.json();

    // Simulación: vamos a suponer que parseamos los datos y tenemos actualizaciones
    const actualizaciones_mock: any[] = [
      // { equipo_local: 'México', goles_local: 2, goles_visitante: 1, estado: 'finalizado' }
    ];

    // 2. Por cada actualización, actualizamos la base de datos
    // para disparar el trigger_calcular_puntos
    for (const act of actualizaciones_mock) {
      /*
      await supabaseAdmin
        .from('quiniela_partidos')
        .update({
          goles_local: act.goles_local,
          goles_visitante: act.goles_visitante,
          estado: act.estado
        })
        .eq('equipo_local', act.equipo_local);
      */
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Partidos actualizados',
      // data: actualizaciones_mock
    });

  } catch (error) {
    console.error('Error en cron de partidos:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
