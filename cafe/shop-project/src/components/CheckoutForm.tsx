'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from './CartProvider';
import { money } from '@/lib/format';
import { DELIVERY_AREAS } from '@/lib/constants';

type Props = {
  settings: { pickup_enabled: boolean; delivery_enabled: boolean; fee_male: number; fee_hulhumale: number; min_order: number; address: string; opening_hours: string };
  prefill: { name: string; phone: string; email: string };
};

export default function CheckoutForm({ settings, prefill }: Props) {
  const { items, subtotal, clear } = useCart();
  const router = useRouter();
  const [type, setType] = useState<'pickup' | 'delivery'>(settings.pickup_enabled ? 'pickup' : 'delivery');
  const [area, setArea] = useState<string>(DELIVERY_AREAS[0]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const fee = type === 'delivery' ? (area === 'Malé' ? settings.fee_male : settings.fee_hulhumale) : 0;
  const total = subtotal + fee;

  if (!items.length)
    return (
      <div className="card p-10 text-center">
        <p className="text-lg font-semibold">Your cart is empty</p>
        <Link href="/menu" className="btn-primary mt-4">Browse the menu</Link>
      </div>
    );

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    if (subtotal < settings.min_order) return setErr(`The minimum order is ${money(settings.min_order)}.`);
    setBusy(true);
    const f = new FormData(e.currentTarget);
    const pt = String(f.get('pickup_time') || '');
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: f.get('name'),
        phone: f.get('phone'),
        email: f.get('email'),
        order_type: type,
        pickup_time: pt ? new Date(pt).toISOString() : null,
        delivery_area: type === 'delivery' ? area : null,
        delivery_address: type === 'delivery' ? f.get('address') : null,
        notes: f.get('notes'),
        items: items.map((i) => ({ product_id: i.product_id, variant_id: i.variant_id, quantity: i.quantity, name: i.name })),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(data.error || 'Something went wrong. Please try again.');
      setBusy(false);
      return;
    }
    clear();
    router.push(`/order/${data.order_number}?t=${data.access_token}`);
  }

  return (
    <form onSubmit={submit} className="grid gap-8 md:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <h1 className="text-2xl">Checkout</h1>

        <section className="card space-y-3 p-4">
          <h2 className="font-semibold">How would you like to receive your order?</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={`rounded-xl border p-3 ${type === 'pickup' ? 'border-primary-600 bg-primary-50' : 'border-line'} ${!settings.pickup_enabled && 'opacity-40'}`}>
              <input type="radio" className="mr-2 accent-primary-600" checked={type === 'pickup'} disabled={!settings.pickup_enabled} onChange={() => setType('pickup')} />
              <span className="font-semibold">Pickup from the cafe</span>
              <p className="mt-1 text-xs text-sage">{settings.address}</p>
            </label>
            <label className={`rounded-xl border p-3 ${type === 'delivery' ? 'border-primary-600 bg-primary-50' : 'border-line'} ${!settings.delivery_enabled && 'opacity-40'}`}>
              <input type="radio" className="mr-2 accent-primary-600" checked={type === 'delivery'} disabled={!settings.delivery_enabled} onChange={() => setType('delivery')} />
              <span className="font-semibold">Home delivery</span>
              <p className="mt-1 text-xs text-sage">Malé and Hulhumalé only</p>
            </label>
          </div>
          {type === 'pickup' ? (
            <div>
              <label className="label">Preferred pickup time (optional)</label>
              <input type="datetime-local" name="pickup_time" className="input" />
              <p className="mt-1 text-xs text-sage">Leave empty for as soon as possible. {settings.opening_hours}</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label">Delivery area</label>
                <select value={area} onChange={(e) => setArea(e.target.value)} className="input">
                  {DELIVERY_AREAS.map((a) => <option key={a}>{a}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="label">Delivery address</label>
                <textarea name="address" required rows={2} className="input" placeholder="House / building, street, ward" />
              </div>
            </div>
          )}
        </section>

        <section className="card grid gap-3 p-4 sm:grid-cols-2">
          <h2 className="font-semibold sm:col-span-2">Your details</h2>
          <div><label className="label">Name</label><input name="name" required defaultValue={prefill.name} className="input" /></div>
          <div><label className="label">Phone</label><input name="phone" required defaultValue={prefill.phone} inputMode="tel" className="input" /></div>
          <div className="sm:col-span-2"><label className="label">Email (optional)</label><input name="email" type="email" defaultValue={prefill.email} className="input" /></div>
          <div className="sm:col-span-2"><label className="label">Notes (optional)</label><textarea name="notes" rows={2} className="input" /></div>
        </section>
      </div>

      <aside className="card h-fit space-y-3 p-4">
        <h2 className="font-semibold">Order summary</h2>
        <ul className="space-y-1 text-sm">
          {items.map((i) => (
            <li key={i.key} className="flex justify-between gap-2">
              <span>{i.quantity} x {i.name}{i.variant_name ? ` (${i.variant_name})` : ''}</span>
              <span>{money(i.price * i.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="space-y-1 border-t border-line pt-3 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>{money(subtotal)}</span></div>
          <div className="flex justify-between"><span>Delivery</span><span>{money(fee)}</span></div>
          <div className="flex justify-between text-base font-bold"><span>Total</span><span>{money(total)}</span></div>
        </div>
        {err && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{err}</p>}
        <button disabled={busy} className="btn-primary w-full">{busy ? 'Placing order...' : 'Place order'}</button>
        <p className="text-xs text-sage">You will pay by bank transfer and upload the receipt on the next page.</p>
      </aside>
    </form>
  );
}
