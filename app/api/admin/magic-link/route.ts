import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  
  const { email, secret } = await request.json()
  
  if (secret !== process.env.CLEANUP_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin.auth.admin
    .generateLink({
      type: 'email' as any,
      email,
      options: {
        redirectTo: 'https://quinielamundial2026metro.vercel.app/auth/callback'
      }
    })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ 
    link: data.properties?.action_link 
  })
}
