import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Diccionario inglés → español
const EQUIPOS: Record<string, string> = {
  'Mexico': 'México',
  'South Africa': 'Sudáfrica',
  'South Korea': 'Corea del Sur',
  'Czech Republic': 'Chequia',
  'Canada': 'Canadá',
  'Bosnia': 'Bosnia y Herzegovina',
  'United States': 'Estados Unidos',
  'Paraguay': 'Paraguay',
  'Qatar': 'Catar',
  'Switzerland': 'Suiza',
  'Brazil': 'Brasil',
  'Morocco': 'Marruecos',
  'Haiti': 'Haití',
  'Scotland': 'Escocia',
  'Australia': 'Australia',
  'Turkey': 'Turquía',
  'Germany': 'Alemania',
  'Curacao': 'Curazao',
  'Ivory Coast': 'Costa de Marfil',
  'Ecuador': 'Ecuador',
  'Netherlands': 'Países Bajos',
  'Japan': 'Japón',
  'Sweden': 'Suecia',
  'Tunisia': 'Túnez',
  'Spain': 'España',
  'Cape Verde': 'Cabo Verde',
  'Belgium': 'Bélgica',
  'Egypt': 'Egipto',
  'Saudi Arabia': 'Arabia Saudita',
  'Uruguay': 'Uruguay',
  'Iran': 'Irán',
  'New Zealand': 'Nueva Zelanda',
  'France': 'Francia',
  'Senegal': 'Senegal',
  'Iraq': 'Irak',
  'Norway': 'Noruega',
  'Argentina': 'Argentina',
  'Algeria': 'Argelia',
  'Austria': 'Austria',
  'Jordan': 'Jordania',
  'Portugal': 'Portugal',
  'DR Congo': 'RD Congo',
  'England': 'Inglaterra',
  'Croatia': 'Croacia',
  'Ghana': 'Ghana',
  'Panama': 'Panamá',
  'Uzbekistan': 'Uzbekistán',
  'Colombia': 'Colombia',
}

const ESTADOS: Record<string, string> = {
  '1H': 'en_curso', '2H': 'en_curso', 'HT': 'en_curso',
  'ET': 'en_curso', 'P': 'en_curso', 'LIVE': 'en_curso',
  'FT': 'finalizado', 'AET': 'finalizado', 'PEN': 'finalizado',
  'NS': 'pendiente', 'TBD': 'pendiente',
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')

  if (secret !== process.env.CLEANUP_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // Obtener partidos de hoy
    const hoy = new Date().toISOString().split('T')[0]

    const response = await fetch(
      `https://v3.football.api-sports.io/fixtures?league=1&season=2026&date=${hoy}`,
      {
        headers: {
          'x-apisports-key': process.env.API_SPORTS_KEY!
        }
      }
    )

    const data = await response.json()

    if (!data.response?.length) {
      return NextResponse.json({
        message: 'No hay partidos hoy',
        date: hoy
      })
    }

    let actualizados = 0

    for (const fixture of data.response) {
      const equipoLocal = EQUIPOS[fixture.teams.home.name] || fixture.teams.home.name
      const equipoVisitante = EQUIPOS[fixture.teams.away.name] || fixture.teams.away.name
      const estado = ESTADOS[fixture.fixture.status.short] || 'pendiente'
      const golesLocal = fixture.goals.home ?? null
      const golesVisitante = fixture.goals.away ?? null

      // Buscar partido en Supabase
      const { data: partidos } = await supabase
        .from('quiniela_partidos')
        .select('id, goles_local, goles_visitante, estado')
        .eq('equipo_local', equipoLocal)
        .eq('equipo_visitante', equipoVisitante)
        .single()

      if (!partidos) continue

      // Solo actualizar si cambió algo
      if (
        partidos.estado !== estado ||
        partidos.goles_local !== golesLocal ||
        partidos.goles_visitante !== golesVisitante
      ) {
        await supabase
          .from('quiniela_partidos')
          .update({
            estado,
            goles_local: golesLocal,
            goles_visitante: golesVisitante
          })
          .eq('id', partidos.id)

        actualizados++
      }
    }

    return NextResponse.json({
      message: 'OK',
      date: hoy,
      partidos_api: data.response.length,
      actualizados
    })

  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
