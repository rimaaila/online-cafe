'use client';
import Link from 'next/link';
import { ChefHat, Trash2 } from 'lucide-react';
import { useCart } from '@/components/CartProvider';
import { imgUrl } from '@/lib/products';
import { money } from '@/lib/format';

export default function CartPage() {
  const { items, subtotal, setQty, remove } = useCart();
  if (!items.length)
    return (
      <div className="card p-10 text-center">
        <p className="text-lg font-semibold">Your cart is empty</p>
        <Link href="/menu" className="btn-primary mt-4">Browse the menu</Link>
      </div>
    );
  return (
    <div className="grid gap-8 md:grid-cols-[1fr_320px]">
      <div className="space-y-3">
        <h1 className="text-2xl">Your cart</h1>
        {items.map((i) => (
          <div key={i.key} className="card flex gap-4 p-3">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-primary-100">
              {i.image_id ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imgUrl(i.image_id)!} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-primary-500"><ChefHat /></div>
              )}
            </div>
            <div className="flex-1">
              <Link href={`/product/${i.slug}`} className="font-semibold hover:underline">{i.name}</Link>
              {i.variant_name && <p className="text-sm text-sage">{i.variant_name}</p>}
              <p className="text-sm">{money(i.price)}</p>
              <div className="mt-2 flex items-center gap-3">
                <div className="flex items-center rounded-lg border border-line">
                  <button className="px-2.5 py-1" onClick={() => setQty(i.key, i.quantity - 1)}>-</button>
                  <span className="w-7 text-center text-sm">{i.quantity}</span>
                  <button className="px-2.5 py-1" onClick={() => setQty(i.key, i.quantity + 1)}>+</button>
                </div>
                <button onClick={() => remove(i.key)} className="text-sage hover:text-red-600" aria-label="Remove"><Trash2 size={16} /></button>
              </div>
            </div>
            <p className="font-semibold">{money(i.price * i.quantity)}</p>
          </div>
        ))}
      </div>
      <aside className="card h-fit p-4">
        <div className="flex justify-between"><span>Subtotal</span><span className="font-bold">{money(subtotal)}</span></div>
        <p className="mt-1 text-xs text-sage">Delivery fee is added at checkout.</p>
        <Link href="/checkout" className="btn-primary mt-4 w-full">Checkout</Link>
      </aside>
    </div>
  );
}
