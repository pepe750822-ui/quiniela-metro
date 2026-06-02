'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/',             label: 'Ranking',      emoji: '🏆' },
  { href: '/predicciones', label: 'Predicciones', emoji: '⚽' },
];

export default function Navbar() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex backdrop-blur-xl border-t"
      style={{
        background: 'rgba(10,10,15,0.95)',
        borderColor: 'rgba(245,158,11,0.2)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {links.map(({ href, label, emoji }) => {
        const active = pathname === href;
        return (
          <Link key={href} href={href}
            className="flex-1 flex flex-col items-center justify-center py-3 gap-0.5 transition-all min-h-[48px]"
          >
            <span className="text-xl leading-none" style={active ? {
              filter: 'drop-shadow(0 0 8px rgba(245,158,11,0.8))',
            } : {}}>
              {emoji}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: active ? 'var(--accent-gold)' : '#64748b' }}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
