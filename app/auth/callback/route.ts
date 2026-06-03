import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;

  console.log('=== CALLBACK DEBUG ===');
  console.log('Full URL:', request.url);
  console.log('Search params:', requestUrl.searchParams.toString());
  console.log('Code:', requestUrl.searchParams.get('code'));
  console.log('Error:', requestUrl.searchParams.get('error'));
  console.log('Error description:', requestUrl.searchParams.get('error_description'));
  console.log('===================');

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL    || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      {
        cookies: {
          getAll()                  { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    console.log('Exchange:', data?.user?.email ?? 'sin usuario', error?.message ?? 'sin error');

    if (!error && data.user) {
      const { error: upsertError } = await supabase
        .from('quiniela_jugadores')
        .upsert({
          id:        data.user.id,
          nombre:    data.user.user_metadata?.full_name ?? data.user.email?.split('@')[0] ?? 'Jugador',
          email:     data.user.email!,
          rol:       'jugador',
          creditos:  1,
          last_seen: new Date().toISOString(),
        }, { onConflict: 'id', ignoreDuplicates: false });

      if (upsertError) console.error('Error upsert jugador:', upsertError.message);
    }
  }

  return NextResponse.redirect(`${origin}/`);
}
