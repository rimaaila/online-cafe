import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { supabaseServer } from '@/lib/supabase/server';
import { getSettings } from '@/lib/settings';
import { money, dateTime } from '@/lib/format';
import { ORDER_TYPE_LABEL, STATUSES, STATUS_LABEL } from '@/lib/constants';
import StatusBadge from '@/components/StatusBadge';
import ReceiptUpload from '@/components/ReceiptUpload';

export const dynamic = 'force-dynamic';

export default async function OrderPage({ params, searchParams }: { params: { number: string }; searchParams: { t?: string } }) {
  const a = supabaseAdmin();
  const { data: o } = await a
    .from('orders')
    .select('*, items:order_items(*), receipts:order_receipts(id,uploaded_at,mime_type)')
    .eq('order_number', params.number)
    .single();

  let allowed = false;
  if (o) {
    if (searchParams.t && searchParams.t === o.access_token) allowed = true;
    else {
      const {
        data: { user },
      } = await supabaseServer().auth.getUser();
      allowed = !!user && user.id === o.user_id;
    }
  }

  if (!o || !allowed)
    return (
      <div className="card mx-auto max-w-md p-6 text-center">
        <p className="font-semibold">We could not open that order</p>
        <p className="mt-1 text-sm text-sage">Use the link you received after ordering, or look it up with your order number and phone number.</p>
        <Link href="/track" className="btn-primary mt-4">Track my order</Link>
      </div>
    );

  const s = await getSettings();
  const token = o.access_token;
  const canUpload = o.status === 'pending' || o.status === 'rejected';
  const lastReceipt = [...(o.receipts || [])].sort((x: any, y: any) => +new Date(y.uploaded_at) - +new Date(x.uploaded_at))[0];
  const stepIndex = STATUSES.indexOf(o.status === 'rejected' ? 'slip_uploaded' : o.status);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl">Order {o.order_number}</h1>
        <StatusBadge status={o.status} />
      </div>
      <p className="text-sm text-sage">Placed {dateTime(o.created_at)}. Keep this page link to check your order later.</p>

      <ol className="grid grid-cols-4 gap-2 text-center text-xs">
        {['pending', 'slip_uploaded', 'approved', 'delivered'].map((st, i) => (
          <li key={st} className={`rounded-lg px-2 py-2 font-semibold ${i <= stepIndex && o.status !== 'rejected' ? 'bg-primary-500 text-ink' : o.status === 'rejected' && i <= 1 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-sage'}`}>
            {STATUS_LABEL[st]}
          </li>
        ))}
      </ol>

      {o.status === 'rejected' && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-semibold">Your payment receipt was rejected</p>
          <p className="mt-1">{o.rejection_reason}</p>
          <p className="mt-1">Please upload a new receipt below.</p>
        </div>
      )}

      {canUpload && (
        <section className="card space-y-4 p-4">
          <h2 className="font-semibold">Pay by bank transfer</h2>
          <p className="text-sm">Transfer <strong>{money(o.total)}</strong> using the details below, then upload your receipt.</p>
          <pre className="whitespace-pre-wrap rounded-xl bg-primary-50 p-3 text-sm">{s.bank_details || 'Bank details will be shared by the shop.'}</pre>
          <ReceiptUpload orderNumber={o.order_number} token={token} />
        </section>
      )}

      {o.status === 'slip_uploaded' && <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Thanks! We received your receipt and will review it shortly.</p>}
      {o.status === 'approved' && <p className="rounded-xl bg-green-50 p-4 text-sm text-green-900">Payment confirmed. Your order is being prepared.</p>}
      {o.status === 'delivered' && <p className="rounded-xl bg-teal-50 p-4 text-sm text-teal-900">{o.order_type === 'pickup' ? 'Your order has been picked up.' : 'Your order has been delivered.'} Enjoy!</p>}

      {lastReceipt && (
        <section className="card p-4">
          <h2 className="mb-2 font-semibold">Your uploaded receipt</h2>
          {lastReceipt.mime_type === 'application/pdf' ? (
            <a className="btn-outline btn-sm" href={`/api/receipts/${o.id}?t=${token}`} target="_blank">Open PDF</a>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/receipts/${o.id}?t=${token}`} alt="Receipt" className="max-h-72 rounded-lg border border-line" />
          )}
        </section>
      )}

      <section className="card space-y-3 p-4">
        <h2 className="font-semibold">Order details</h2>
        <ul className="space-y-1 text-sm">
          {o.items.map((i: any) => (
            <li key={i.id} className="flex justify-between"><span>{i.quantity} x {i.name}{i.variant_name ? ` (${i.variant_name})` : ''}</span><span>{money(i.price * i.quantity)}</span></li>
          ))}
        </ul>
        <div className="space-y-1 border-t border-line pt-2 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>{money(o.subtotal)}</span></div>
          <div className="flex justify-between"><span>Delivery</span><span>{money(o.delivery_fee)}</span></div>
          <div className="flex justify-between font-bold"><span>Total</span><span>{money(o.total)}</span></div>
        </div>
        <div className="border-t border-line pt-2 text-sm text-sage">
          <p><strong className="text-ink">{ORDER_TYPE_LABEL[o.order_type]}</strong></p>
          {o.order_type === 'delivery' ? <p>{o.delivery_area}: {o.delivery_address}</p> : <p>{s.address}{o.pickup_time ? ` | Pickup: ${dateTime(o.pickup_time)}` : ''}</p>}
          <p>{o.guest_name} | {o.guest_phone}</p>
        </div>
      </section>
    </div>
  );
}
