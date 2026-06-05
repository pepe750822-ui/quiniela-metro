'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function UpdateLastSeen() {
  const pathname = usePathname();

  useEffect(() => {
    const actualizar = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const nombrePagina: Record<string, string> = {
        '/': 'Inicio',
        '/dashboard': 'Dashboard',
        '/predicciones': 'Predicciones',
        '/calendario': 'Calendario',
        '/tabla': 'Tabla de puntos',
        '/perfil': 'Perfil',
        '/instrucciones': 'Instrucciones',
        '/ranking': 'Ranking',
        '/admin': 'Admin',
      };

      let pagina = nombrePagina[pathname] || pathname;
      if (pathname.startsWith('/jornada/')) {
        pagina = `Jornada ${pathname.split('/')[2]}`;
      }

      await supabase
        .from('quiniela_jugadores')
        .update({
          last_seen: new Date().toISOString(),
          ultima_pagina: pagina,
        })
        .eq('id', user.id);
    };

    actualizar();
  }, [pathname]);

  return null;
}
