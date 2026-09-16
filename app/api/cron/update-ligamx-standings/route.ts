import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const EQUIPOS: Record<string, string> = {
  'Guadalajara': 'Guadalajara',
  'Santos Laguna': 'Santos',
  'Juárez': 'Juárez',
  'San Luis': 'San Luis',
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
    const res = await fetch(
      'https://v3.football.api-sports.io/standings?league=262&season=2026',
      { headers: { 'x-apisports-key': process.env.API_SPORTS_KEY! } }
    )

    const data = await res.json()

    if (data.errors && Object.keys(data.errors).length > 0) {
      return NextResponse.json({ message: 'API error', errors: data.errors }, { status: 502 })
    }

    if (!data.response?.length || !data.response[0].league?.standings?.[0]?.length) {
      return NextResponse.json({
        message: 'No standings data available',
        raw: JSON.stringify(data).substring(0, 1000)
      })
    }

    const standings = data.response[0].league.standings[0]

    let actualizados = 0
    let insertados = 0

    for (const team of standings) {
      const equipo = EQUIPOS[team.team.name] || team.team.name
      const pj = team.all.played
      const g = team.all.win
      const e = team.all.draw
      const p = team.all.lose
      const gf = team.all.goals.for
      const gc = team.all.goals.against
      const dg = team.goalsDiff
      const pts = team.points

      const { data: existing, error: selectError } = await supabase
        .from('ligamx_posiciones')
        .select('id')
        .eq('equipo', equipo)
        .eq('temporada', 'ligamx2026')
        .maybeSingle()

      if (selectError) {
        console.error(`Error checking ${equipo}:`, selectError)
        continue
      }

      if (existing) {
        const { error: updateError } = await supabase
          .from('ligamx_posiciones')
          .update({ pj, g, e, p, gf, gc, dg, pts, updated_at: new Date().toISOString() })
          .eq('id', existing.id)

        if (!updateError) actualizados++
      } else {
        const { error: insertError } = await supabase
          .from('ligamx_posiciones')
          .insert({
            equipo,
            temporada: 'ligamx2026',
            pj, g, e, p, gf, gc, dg, pts,
            updated_at: new Date().toISOString()
          })

        if (!insertError) insertados++
      }
    }

    return NextResponse.json({
      message: 'OK',
      teams_processed: standings.length,
      actualizados,
      insertados
    })

  } catch (error) {
    console.error('Update Liga MX standings error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}