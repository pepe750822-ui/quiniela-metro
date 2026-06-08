import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')
  const error = requestUrl.searchParams.get('error')

  console.log('=== AUTH CALLBACK ===')
  console.log('code:', code ? 'EXISTE' : 'NO')
  console.log('token_hash:', token_hash ? 'EXISTE' : 'NO')
  console.log('type:', type)
  console.log('error:', error)

  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${error}`, requestUrl.origin)
    )
  }

  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ 
    cookies: () => cookieStore 
  })

  let redirectTo = '/'

  // Manejar Magic Link (token_hash)
  if (token_hash && type) {
    const { data, error: verifyError } = await supabase.auth
      .verifyOtp({ token_hash, type: type as any })
    
    console.log('OTP verify:', data?.user?.email, verifyError?.message)
    
    if (!verifyError && data?.user) {
      await supabase
        .from('quiniela_jugadores')
        .upsert({
          id: data.user.id,
          nombre: data.user.user_metadata?.full_name || 
                  data.user.email?.split('@')[0] || 'Jugador',
          email: data.user.email!,
          rol: 'jugador',
          last_seen: new Date().toISOString()
        }, { onConflict: 'id', ignoreDuplicates: false })

      const tiempoCreacion = new Date(data.user.created_at).getTime();
      if ((Date.now() - tiempoCreacion) < 10000) {
        redirectTo = '/instrucciones'
      }
    }
  }

  // Manejar Google OAuth (code)
  if (code) {
    const { data, error: exchangeError } = await supabase.auth
      .exchangeCodeForSession(code)
    
    if (!exchangeError && data?.user) {
      await supabase
        .from('quiniela_jugadores')
        .upsert({
          id: data.user.id,
          nombre: data.user.user_metadata?.full_name || 
                  data.user.email?.split('@')[0] || 'Jugador',
          email: data.user.email!,
          rol: 'jugador',
          last_seen: new Date().toISOString()
        }, { onConflict: 'id', ignoreDuplicates: false })

      const tiempoCreacion = new Date(data.user.created_at).getTime();
      if ((Date.now() - tiempoCreacion) < 10000) {
        redirectTo = '/instrucciones'
      }
    }
  }

  return NextResponse.redirect(new URL(redirectTo, requestUrl.origin))
}
