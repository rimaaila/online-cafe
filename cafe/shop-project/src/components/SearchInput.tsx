'use client';
import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';

// Debounced as-you-type search. Updates the URL so results are shareable.
export default function SearchInput({ className = '' }: { className?: string }) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const [v, setV] = useState(sp.get('q') || '');

  useEffect(() => {
    const t = setTimeout(() => {
      if (v === (sp.get('q') || '')) return;
      const params = new URLSearchParams(path === '/menu' ? sp.toString() : '');
      if (v) params.set('q', v);
      else params.delete('q');
      params.delete('page');
      router.push('/menu?' + params.toString());
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v]);

  return (
    <div className={`relative ${className}`}>
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-sage" />
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        placeholder="Search the menu..."
        className="input pl-9"
        aria-label="Search the menu"
      />
    </div>
  );
}
