import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const EQUIPOS: Record<string, string> = {
  'Club Deportivo Guadalajara': 'Guadalajara',
  'Santos Laguna': 'Santos',
  'FC Juárez': 'Juárez',
  'Atlético de San Luis': 'San Luis',
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
      'https://api.football-data.org/v4/competitions/MX1/standings',
      { headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY! } }
    )

    const data = await res.json()

    if (data.errorCode) {
      return NextResponse.json({ message: 'API error', error: data }, { status: 502 })
    }

    if (!data.standings?.length) {
      return NextResponse.json({
        message: 'No standings data available',
        raw: JSON.stringify(data).substring(0, 1000)
      })
    }

    const table = data.standings.find((s: any) => s.type === 'TOTAL') || data.standings[0]

    if (!table?.table?.length) {
      return NextResponse.json({
        message: 'No TOTAL standings found',
        raw: JSON.stringify(data).substring(0, 1000)
      })
    }

    let actualizados = 0
    let insertados = 0

    for (const entry of table.table) {
      const equipo = EQUIPOS[entry.team.name] || entry.team.name
      const pj = entry.playedGames
      const g = entry.won
      const e = entry.draw
      const p = entry.lost
      const gf = entry.goalsFor
      const gc = entry.goalsAgainst
      const dg = entry.goalDifference
      const pts = entry.points

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
      teams_processed: table.table.length,
      actualizados,
      insertados
    })

  } catch (error) {
    console.error('Update Liga MX standings error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}