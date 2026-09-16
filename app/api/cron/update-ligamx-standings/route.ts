import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const EQUIPOS: Record<string, string> = {
  'CD Guadalajara': 'Guadalajara',
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
    const response = await fetch(
      'https://www.thesportsdb.com/api/v1/json/3/lookuptable.php?l=4350&s=2026-2027'
    )

    const data = await response.json()

    if (!data.table?.length) {
      return NextResponse.json({
        message: 'No standings data available',
        raw: JSON.stringify(data).substring(0, 1000)
      })
    }

    const standings = data.table

    let actualizados = 0
    let insertados = 0

    for (const team of standings) {
      const equipo = EQUIPOS[team.strTeam] || team.strTeam
      const pj = parseInt(team.intPlayed)
      const g = parseInt(team.intWin)
      const e = parseInt(team.intDraw)
      const p = parseInt(team.intLoss)
      const gf = parseInt(team.intGoalsFor)
      const gc = parseInt(team.intGoalsAgainst)
      const dg = parseInt(team.intGoalDifference)
      const pts = parseInt(team.intPoints)

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
          .update({ pj, g, e, p, gf, gc, dg, pts, updated_at: team.dateUpdated })
          .eq('id', existing.id)

        if (!updateError) actualizados++
      } else {
        const { error: insertError } = await supabase
          .from('ligamx_posiciones')
          .insert({
            equipo,
            temporada: 'ligamx2026',
            pj, g, e, p, gf, gc, dg, pts,
            updated_at: team.dateUpdated
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