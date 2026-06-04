import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const error_description = requestUrl.searchParams.get('error_description')

  console.log('=== AUTH CALLBACK ===')
  console.log('code:', code ? 'EXISTE' : 'NO EXISTE')
  console.log('error:', error)
  console.log('error_description:', error_description)
  console.log('full URL:', request.url)
  console.log('====================')

  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${error}`, requestUrl.origin)
    )
  }

  if (code) {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore 
    })
    
    const { data, error: exchangeError } = await supabase.auth
      .exchangeCodeForSession(code)
    
    console.log('Exchange error:', exchangeError?.message)
    console.log('User:', data?.user?.email)

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
        }, {
          onConflict: 'id',
          ignoreDuplicates: false
        })

      const tiempoCreacion = new Date(data.user.created_at).getTime();
      const esNuevo = (Date.now() - tiempoCreacion) < 10000;

      return NextResponse.redirect(
        new URL(esNuevo ? '/instrucciones' : '/', requestUrl.origin)
      )
    }
  }

  return NextResponse.redirect(new URL('/', requestUrl.origin))
}
