'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminNav({ links }: { links: { href: string; label: string }[] }) {
  const path = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col">
      {links.map((l) => {
        const active = l.href === '/admin' ? path === '/admin' : path.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href} className={`whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium ${active ? 'bg-primary-500 text-ink' : 'hover:bg-primary-100'}`}>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
