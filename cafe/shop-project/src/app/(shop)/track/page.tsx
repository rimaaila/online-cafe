import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

async function lookup(fd: FormData) {
  'use server';
  const number = String(fd.get('number') || '').trim().toUpperCase();
  const phone = String(fd.get('phone') || '').replace(/\s+/g, '');
  const { data: o } = await supabaseAdmin().from('orders').select('order_number,guest_phone,access_token').eq('order_number', number).single();
  if (!o || o.guest_phone.replace(/\s+/g, '') !== phone) redirect('/track?error=1');
  redirect(`/order/${o.order_number}?t=${o.access_token}`);
}

export default function TrackPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <div className="card mx-auto max-w-md space-y-4 p-6">
      <h1 className="text-2xl">Track your order</h1>
      <form action={lookup} className="space-y-4">
        <div><label className="label">Order number</label><input name="number" required placeholder="ORD-1001" className="input" /></div>
        <div><label className="label">Phone number used for the order</label><input name="phone" required inputMode="tel" className="input" /></div>
        {searchParams.error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">We could not find an order with those details.</p>}
        <button className="btn-primary w-full">Find my order</button>
      </form>
    </div>
  );
}
