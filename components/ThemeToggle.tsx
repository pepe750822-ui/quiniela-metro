'use client';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return <span style={{ width: 52, height: 32 }} />;

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      role="switch"
      aria-checked={isDark}
      aria-label="Tema oscuro"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="relative rounded-full transition-colors duration-200"
      style={{ width: 52, height: 32, background: isDark ? 'var(--br)' : 'var(--sf2)', border: '1px solid var(--ln)' }}
    >
      <span className="absolute top-[3px] rounded-full transition-all duration-200"
        style={{ width: 24, height: 24, left: isDark ? 24 : 3, background: isDark ? 'var(--brI)' : 'var(--sf)', boxShadow: '0 1px 3px rgba(0,0,0,.25)' }} />
    </button>
  );
}
