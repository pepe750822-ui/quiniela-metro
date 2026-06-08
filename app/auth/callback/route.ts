import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')
  const error = requestUrl.searchParams.get('error')

  console.log('Callback:', { code: !!code, token_hash: !!token_hash, type, error })

  if (error) {
    return NextResponse.redirect(new URL(`/login?error=${error}`, requestUrl.origin))
  }

  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )

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
      
      return NextResponse.redirect(new URL('/', requestUrl.origin))
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
    }
  }

  return NextResponse.redirect(new URL('/', requestUrl.origin))
}
