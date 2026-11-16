import Link from 'next/link';
import { ChefHat } from 'lucide-react';

// Placeholder logo (free Lucide icon + shop name). Replace this one component with the real logo later.
export default function Logo({ name, href = '/' }: { name: string; href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 font-bold text-primary-800">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-500 text-ink">
        <ChefHat size={20} />
      </span>
      <span className="text-lg">{name}</span>
    </Link>
  );
}
