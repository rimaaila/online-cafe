import Link from 'next/link';
import { notFound } from 'next/navigation';
import { canEditOrders, isAdmin, requireStaff } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { money, dateTime } from '@/lib/format';
import { ORDER_TYPE_LABEL, STAFF_NEXT, STATUSES, STATUS_LABEL } from '@/lib/constants';
import { deleteOrder, saveInternalNote, updateOrderStatus } from '../../../actions';
import StatusBadge from '@/components/StatusBadge';
import Flash from '@/components/Flash';
import PrintButton from '@/components/PrintButton';

export default async function OrderDetail({ params, searchParams }: { params: { id: string }; searchParams: { error?: string; ok?: string } }) {
  const { profile } = await requireStaff();
  const a = supabaseAdmin();
  const { data: o } = await a
    .from('orders')
    .select('*, items:order_items(*), receipts:order_receipts(id,uploaded_at,mime_type), history:order_status_history(*)')
    .eq('id', params.id)
    .single();
  if (!o) notFound();

  const history = [...(o.history || [])].sort((x: any, y: any) => +new Date(y.created_at) - +new Date(x.created_at));
  const lastReceipt = [...(o.receipts || [])].sort((x: any, y: any) => +new Date(y.uploaded_at) - +new Date(x.uploaded_at))[0];
  const next = STAFF_NEXT[o.status] || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Link href="/admin/orders" className="text-sm text-sage hover:underline">Orders</Link>
          <h1 className="text-2xl">{o.order_number}</h1>
          <StatusBadge status={o.status} />
        </div>
        <PrintButton />
      </div>
      <Flash error={searchParams.error} ok={searchParams.ok} />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="card space-y-3 p-4">
            <h2 className="font-semibold">Items</h2>
            <ul className="space-y-1 text-sm">
              {o.items.map((i: any) => (
                <li key={i.id} className="flex justify-between"><span>{i.quantity} x {i.name}{i.variant_name ? ` (${i.variant_name})` : ''}</span><span>{money(i.price * i.quantity)}</span></li>
              ))}
            </ul>
            <div className="space-y-1 border-t border-line pt-2 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>{money(o.subtotal)}</span></div>
              <div className="flex justify-between"><span>Delivery fee</span><span>{money(o.delivery_fee)}</span></div>
              <div className="flex justify-between text-base font-bold"><span>Total</span><span>{money(o.total)}</span></div>
            </div>
          </section>

          <section className="card space-y-1 p-4 text-sm">
            <h2 className="mb-2 font-semibold">Customer and delivery</h2>
            <p><strong>{o.guest_name}</strong> | {o.guest_phone}{o.guest_email ? ` | ${o.guest_email}` : ''}</p>
            <p>{ORDER_TYPE_LABEL[o.order_type]}</p>
            {o.order_type === 'delivery' ? <p>{o.delivery_area}: {o.delivery_address}</p> : <p>Pickup time: {o.pickup_time ? dateTime(o.pickup_time) : 'As soon as possible'}</p>}
            {o.notes && <p className="rounded-lg bg-amber-50 p-2">Customer note: {o.notes}</p>}
            <p className="text-sage">Placed {dateTime(o.created_at)} | {o.user_id ? 'Registered customer' : 'Guest'}</p>
          </section>

          <section className="card p-4">
            <h2 className="mb-3 font-semibold">Payment receipt</h2>
            {lastReceipt ? (
              lastReceipt.mime_type === 'application/pdf' ? (
                <a href={`/api/receipts/${o.id}`} target="_blank" className="btn-outline btn-sm">Open PDF receipt</a>
              ) : (
                <a href={`/api/receipts/${o.id}`} target="_blank">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/receipts/${o.id}`} alt="Receipt" className="max-h-[480px] rounded-lg border border-line" />
                </a>
              )
            ) : <p className="text-sm text-sage">No receipt uploaded yet.</p>}
            {o.receipts?.length > 1 && <p className="mt-2 text-xs text-sage">Showing the latest of {o.receipts.length} uploads.</p>}
          </section>
        </div>

        <div className="space-y-6">
          <section className="card space-y-3 p-4 no-print">
            <h2 className="font-semibold">Update status</h2>
            {o.status === 'rejected' && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">Rejected: {o.rejection_reason}</p>}
            {next.length ? (
              <form action={updateOrderStatus} className="space-y-3">
                <input type="hidden" name="orderId" value={o.id} />
                <textarea name="note" rows={2} className="input" placeholder="Note (required when rejecting; shown to the customer)" />
                <div className="flex flex-wrap gap-2">
                  {next.map((s) => (
                    <button key={s} name="to" value={s} className={s === 'rejected' ? 'btn-danger btn-sm' : 'btn-primary btn-sm'}>
                      {s === 'approved' ? 'Approve' : s === 'rejected' ? 'Reject' : 'Mark delivered'}
                    </button>
                  ))}
                </div>
              </form>
            ) : (
              <p className="text-sm text-sage">
                {o.status === 'pending' ? 'Waiting for the customer to upload a receipt.' : o.status === 'rejected' ? 'Waiting for the customer to upload a new receipt.' : 'No further actions.'}
              </p>
            )}

            {canEditOrders(profile.role) && (
              <details className="border-t border-line pt-3">
                <summary className="cursor-pointer text-sm font-semibold">Override status (admin / manager)</summary>
                <form action={updateOrderStatus} className="mt-3 space-y-2">
                  <input type="hidden" name="orderId" value={o.id} />
                  <input type="hidden" name="force" value="1" />
                  <select name="to" defaultValue={o.status} className="input">
                    {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                  </select>
                  <textarea name="note" required rows={2} className="input" placeholder="Reason for override (required)" />
                  <button className="btn-outline btn-sm">Apply override</button>
                </form>
              </details>
            )}
          </section>

          <section className="card p-4 no-print">
            <h2 className="mb-2 font-semibold">Internal notes</h2>
            <form action={saveInternalNote} className="space-y-2">
              <input type="hidden" name="orderId" value={o.id} />
              <textarea name="internal_notes" rows={3} defaultValue={o.internal_notes || ''} className="input" placeholder="Only visible to staff" />
              <button className="btn-outline btn-sm">Save note</button>
            </form>
          </section>

          <section className="card p-4">
            <h2 className="mb-3 font-semibold">History</h2>
            <ol className="space-y-3 border-l-2 border-primary-200 pl-4 text-sm">
              {history.map((h: any) => (
                <li key={h.id}>
                  <StatusBadge status={h.to_status} />
                  <p className="mt-1 text-xs text-sage">{dateTime(h.created_at)}{h.changed_by ? '' : ' | system / customer'}</p>
                  {h.note && <p className="text-xs">{h.note}</p>}
                </li>
              ))}
            </ol>
          </section>

          {isAdmin(profile.role) && (
            <form action={deleteOrder} className="no-print">
              <input type="hidden" name="orderId" value={o.id} />
              <button className="btn-danger btn-sm">Delete order</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
