'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/',              label: '🏆 Ranking'      },
  { href: '/predicciones',  label: '⚽ Predicciones' },
];

export default function Navbar() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900 border-t border-zinc-700 flex">
      {links.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={`flex-1 py-3 text-center text-sm font-semibold transition-colors
            ${pathname === href ? 'text-amber-400' : 'text-zinc-400 hover:text-white'}`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
