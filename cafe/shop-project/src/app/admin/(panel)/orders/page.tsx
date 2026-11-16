import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { money, dateTime } from '@/lib/format';
import { ORDER_TYPE_LABEL, STATUSES, STATUS_LABEL } from '@/lib/constants';
import StatusBadge from '@/components/StatusBadge';
import Flash from '@/components/Flash';

const PAGE = 20;

export default async function OrdersPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  await requireStaff();
  const { status, type, q, from, to } = searchParams;
  const page = Math.max(1, Number(searchParams.page) || 1);
  const a = supabaseAdmin();

  let query = a
    .from('orders')
    .select('id,order_number,guest_name,guest_phone,order_type,total,status,created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * PAGE, page * PAGE - 1);
  if (status) query = query.eq('status', status);
  if (type) query = query.eq('order_type', type);
  if (from) query = query.gte('created_at', new Date(from).toISOString());
  if (to) query = query.lte('created_at', new Date(new Date(to).getTime() + 864e5 - 1).toISOString());
  if (q) {
    const t = q.replace(/[%,()]/g, '');
    query = query.or(`order_number.ilike.%${t}%,guest_name.ilike.%${t}%,guest_phone.ilike.%${t}%`);
  }
  const { data: orders, count } = await query;
  const pages = Math.max(1, Math.ceil((count || 0) / PAGE));
  const href = (n: number) => {
    const p = new URLSearchParams();
    Object.entries(searchParams).forEach(([k, v]) => v && k !== 'page' && p.set(k, v));
    p.set('page', String(n));
    return `/admin/orders?${p}`;
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl">Orders</h1>
      <Flash error={searchParams.error} ok={searchParams.ok} />
      <form className="card grid gap-3 p-4 sm:grid-cols-3 lg:grid-cols-6">
        <input name="q" defaultValue={q} placeholder="Order no, name, phone" className="input lg:col-span-2" />
        <select name="status" defaultValue={status || ''} className="input">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        <select name="type" defaultValue={type || ''} className="input">
          <option value="">All types</option>
          {Object.entries(ORDER_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input type="date" name="from" defaultValue={from} className="input" aria-label="From date" />
        <input type="date" name="to" defaultValue={to} className="input" aria-label="To date" />
        <div className="flex gap-2 sm:col-span-3 lg:col-span-6">
          <button className="btn-primary btn-sm">Filter</button>
          <Link href="/admin/orders" className="btn-outline btn-sm">Reset</Link>
        </div>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead><tr><th className="th">Order</th><th className="th">Customer</th><th className="th">Type</th><th className="th">Total</th><th className="th">Status</th><th className="th">Placed</th></tr></thead>
          <tbody>
            {(orders || []).map((o: any) => (
              <tr key={o.id} className="border-t border-line hover:bg-primary-50">
                <td className="td"><Link className="font-semibold text-primary-700" href={`/admin/orders/${o.id}`}>{o.order_number}</Link></td>
                <td className="td">{o.guest_name}<div className="text-xs text-sage">{o.guest_phone}</div></td>
                <td className="td">{ORDER_TYPE_LABEL[o.order_type]}</td>
                <td className="td">{money(o.total)}</td>
                <td className="td"><StatusBadge status={o.status} /></td>
                <td className="td text-sage">{dateTime(o.created_at)}</td>
              </tr>
            ))}
            {!orders?.length && <tr><td colSpan={6} className="td text-sage">No orders found.</td></tr>}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {page > 1 && <Link href={href(page - 1)} className="btn-outline btn-sm">Previous</Link>}
          <span className="text-sm text-sage">Page {page} of {pages}</span>
          {page < pages && <Link href={href(page + 1)} className="btn-outline btn-sm">Next</Link>}
        </div>
      )}
    </div>
  );
}
