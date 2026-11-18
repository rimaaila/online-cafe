'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChefHat, Check } from 'lucide-react';
import { useCart } from './CartProvider';
import { activeVariants, imgUrl } from '@/lib/products';
import { money } from '@/lib/format';

export default function ProductBuy({ product: p, tags }: { product: any; tags: string[] }) {
  const { add } = useCart();
  const variants = useMemo(() => activeVariants(p), [p]);
  const images = useMemo(
    () => [...(p.images || [])].sort((a: any, b: any) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0) || a.sort_order - b.sort_order),
    [p]
  );
  const [variantId, setVariantId] = useState<string | null>(variants[0]?.id ?? null);
  const [qty, setQty] = useState(1);
  const [imgIdx, setImgIdx] = useState(0);
  const [added, setAdded] = useState(false);

  const variant = variants.find((v: any) => v.id === variantId) || null;
  const price = Number(variant?.price ?? p.base_price);
  const stock: number | null = !p.track_stock ? null : variant ? variant.stock : p.stock;
  const soldOut = stock !== null && stock <= 0;

  function addToCart() {
    add(
      {
        key: `${p.id}:${variant?.id ?? ''}`,
        product_id: p.id,
        variant_id: variant?.id ?? null,
        name: p.name,
        variant_name: variant?.name ?? null,
        price,
        slug: p.slug,
        image_id: images[0]?.id ?? null,
        image_url: p.image_url ?? null,
        max: stock,
      },
      qty
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div>
        <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-primary-100">
          {images.length ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imgUrl(images[imgIdx]?.id, 'full')!} alt={p.name} className="h-full w-full object-cover" />
          ) : p.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-primary-500"><ChefHat size={64} /></div>
          )}
        </div>
        {images.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto">
            {images.map((im: any, i: number) => (
              <button key={im.id} onClick={() => setImgIdx(i)} className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${i === imgIdx ? 'border-primary-600' : 'border-transparent'}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imgUrl(im.id)!} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <h1 className="text-3xl">{p.name}</h1>
        <p className="mt-2 text-2xl font-bold text-primary-800">{money(price)}</p>
        {!!tags.length && (
          <div className="mt-3 flex flex-wrap gap-2">
            {tags.map((t) => <span key={t} className="badge bg-primary-100 text-primary-800">{t}</span>)}
          </div>
        )}
        {p.description && <p className="mt-4 whitespace-pre-line text-sage">{p.description}</p>}

        {variants.length > 0 && (
          <div className="mt-6">
            <p className="label">Choose an option</p>
            <div className="flex flex-wrap gap-2">
              {variants.map((v: any) => {
                const out = p.track_stock && v.stock <= 0;
                return (
                  <button
                    key={v.id}
                    disabled={out}
                    onClick={() => { setVariantId(v.id); setQty(1); }}
                    className={`rounded-xl border px-4 py-2 text-sm font-medium disabled:opacity-40 ${v.id === variantId ? 'border-primary-600 bg-primary-100' : 'border-line bg-white hover:bg-primary-50'}`}
                  >
                    {v.name} <span className="text-sage">({money(v.price ?? p.base_price)})</span>
                    {out && ' - sold out'}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <p className="mt-4 text-sm">
          {soldOut ? <span className="font-semibold text-red-600">Sold out</span> :
            stock !== null && stock <= 5 ? <span className="font-semibold text-amber-700">Only {stock} left</span> :
            <span className="font-semibold text-primary-700">In stock</span>}
        </p>

        <div className="mt-5 flex items-center gap-3">
          <div className="flex items-center rounded-xl border border-line bg-white">
            <button className="px-3 py-2" onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Decrease">-</button>
            <span className="w-8 text-center text-sm">{qty}</span>
            <button className="px-3 py-2" onClick={() => setQty(stock !== null ? Math.min(stock, qty + 1) : qty + 1)} aria-label="Increase">+</button>
          </div>
          <button disabled={soldOut} onClick={addToCart} className="btn-primary flex-1">
            {added ? <><Check size={16} /> Added</> : 'Add to cart'}
          </button>
        </div>
        <Link href="/cart" className="mt-3 inline-block text-sm font-semibold text-primary-700 hover:underline">View cart</Link>
      </div>
    </div>
  );
}
