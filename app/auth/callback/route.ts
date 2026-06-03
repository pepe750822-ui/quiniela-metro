import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  console.log('Callback recibido, code:', code ? 'existe' : 'no existe', '| origin:', origin);

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL    || 'https://placeholder.supabase.co',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key',
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
    console.log('Exchange result:', sessionData?.user?.email ?? 'sin usuario', sessionError?.message ?? 'sin error');

    const { data: { user } } = await supabase.auth.getUser();
    console.log('Usuario autenticado:', user?.id ?? 'null', user?.email ?? 'null');

    if (user) {
      // Solo crear jugador si el callback llega desde quiniela-metro,
      // no desde otros proyectos que compartan Supabase (ej: cyberedumx).
      const referer = request.headers.get('referer') ?? '';
      const appUrl  = process.env.NEXT_PUBLIC_APP_URL ?? '';
      const isQuiniela =
        origin.includes('quiniela-metro') ||
        referer.includes('quiniela-metro') ||
        appUrl.includes('quiniela-metro');

      console.log('isQuiniela:', isQuiniela, '| referer:', referer, '| appUrl:', appUrl);

      if (isQuiniela) {
        const { error: upsertError } = await supabase.from('quiniela_jugadores').upsert({
          id:       user.id,
          nombre:   user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'Jugador',
          email:    user.email ?? '',
          rol:      'jugador',
          creditos: 1,
        }, { onConflict: 'id', ignoreDuplicates: true });

        if (upsertError) console.error('Error upsert jugador:', upsertError.message);

        await supabase
          .from('quiniela_jugadores')
          .update({ last_seen: new Date().toISOString() })
          .eq('id', user.id);
      }
    }
  }

  return NextResponse.redirect(new URL('/', request.url));
}
