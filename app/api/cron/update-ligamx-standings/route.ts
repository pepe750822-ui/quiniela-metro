import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
    const season = 2026
    const league = 310 // Liga MX

    const response = await fetch(
      `https://v3.football.api-sports.io/standings?league=${league}&season=${season}`,
      {
        headers: {
          'x-apisports-key': process.env.API_SPORTS_KEY!
        }
      }
    )

    const data = await response.json()

    if (!data.response?.length || !data.response[0].league?.standings?.[0]?.length) {
      return NextResponse.json({
        message: 'No standings data available',
        season
      })
    }

    const standings = data.response[0].league.standings[0]

    let actualizados = 0
    let insertados = 0

    for (const team of standings) {
      const equipo = team.team.name
      const pj = team.all.played
      const g = team.all.win
      const e = team.all.draw
      const p = team.all.lose
      const gf = team.all.goals.for
      const gc = team.all.goals.against
      const dg = team.goalsDiff
      const pts = team.points

      // Upsert: try update first, if no rows affected, insert
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
      season,
      teams_processed: standings.length,
      actualizados,
      insertados
    })

  } catch (error) {
    console.error('Update Liga MX standings error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}