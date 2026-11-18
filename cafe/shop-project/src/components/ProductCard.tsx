import Link from 'next/link';
import { ChefHat } from 'lucide-react';
import { cardImage, inStock, priceInfo } from '@/lib/products';
import { money } from '@/lib/format';

export default function ProductCard({ p }: { p: any }) {
  const img = cardImage(p);
  const { min, max } = priceInfo(p);
  const available = inStock(p);
  return (
    <Link href={`/product/${p.slug}`} className="card group overflow-hidden transition hover:shadow-md">
      <div className="relative aspect-[4/3] bg-primary-100">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt={p.name} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-primary-500"><ChefHat size={40} /></div>
        )}
        {!available && (
          <span className="badge absolute left-2 top-2 bg-ink text-white">Sold out</span>
        )}
      </div>
      <div className="p-3">
        {p.category?.name && <p className="text-xs text-sage">{p.category.name}</p>}
        <h3 className="font-semibold group-hover:text-primary-700">{p.name}</h3>
        <p className="mt-1 text-sm font-semibold text-primary-800">
          {min === max ? money(min) : `${money(min)} - ${money(max)}`}
        </p>
      </div>
    </Link>
  );
}
