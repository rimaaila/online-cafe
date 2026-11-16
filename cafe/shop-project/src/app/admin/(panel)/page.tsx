import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { getStats } from '@/lib/stats';
import { money, dateTime } from '@/lib/format';
import { ORDER_TYPE_LABEL, STATUSES, STATUS_LABEL } from '@/lib/constants';
import StatusBadge from '@/components/StatusBadge';
import DashboardCharts from '@/components/DashboardCharts';
import Flash from '@/components/Flash';

function Card({ label, value, href, tone }: { label: string; value: string | number; href?: string; tone?: string }) {
  const inner = (
    <div className={`card p-4 ${tone || ''}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-sage">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export default async function Dashboard({ searchParams }: { searchParams: { days?: string; error?: string } }) {
  const { profile } = await requireStaff();
  const days = [7, 30, 90].includes(Number(searchParams.days)) ? Number(searchParams.days) : 30;
  const st = await getStats(days);
  const limited = profile.role === 'staff'; // staff: today's orders only, no revenue/charts

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl">Dashboard</h1>
        {!limited && (
          <div className="flex gap-1">
            {[7, 30, 90].map((d) => (
              <Link key={d} href={`/admin?days=${d}`} className={`btn-sm rounded-lg px-3 py-1.5 text-xs font-semibold ${d === days ? 'bg-primary-500 text-ink' : 'border border-line bg-white'}`}>{d} days</Link>
            ))}
          </div>
        )}
      </div>
      <Flash error={searchParams.error} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Card label="Today's orders" value={st.todayCount} href="/admin/orders" />
        <Card label="Awaiting review" value={st.awaiting} href="/admin/orders?status=slip_uploaded" tone={st.awaiting ? 'border-amber-300 bg-amber-50' : ''} />
        <Card label="Pending payment" value={st.pending} href="/admin/orders?status=pending" />
        {!limited && <Card label={`Revenue (${days}d)`} value={money(st.revenue)} />}
        {!limited && <Card label="Low-stock items" value={st.lowStock.length} href="/admin/products" tone={st.lowStock.length ? 'border-red-200 bg-red-50' : ''} />}
      </div>

      {!limited && (
        <>
          <section className="card p-4">
            <h2 className="mb-3 font-semibold">Orders and revenue, last {days} days</h2>
            <DashboardCharts data={st.series} />
          </section>

          <div className="grid gap-4 md:grid-cols-2">
            <section className="card p-4">
              <h2 className="mb-3 font-semibold">Orders by status</h2>
              <ul className="space-y-2 text-sm">
                {STATUSES.map((s) => <li key={s} className="flex justify-between"><StatusBadge status={s} /><span className="font-semibold">{st.byStatus[s] || 0}</span></li>)}
              </ul>
              <h2 className="mb-3 mt-5 font-semibold">Orders by type</h2>
              <ul className="space-y-2 text-sm">
                {Object.keys(ORDER_TYPE_LABEL).map((t) => <li key={t} className="flex justify-between"><span>{ORDER_TYPE_LABEL[t]}</span><span className="font-semibold">{st.byType[t] || 0}</span></li>)}
              </ul>
            </section>
            <section className="card p-4">
              <h2 className="mb-3 font-semibold">Best sellers</h2>
              {st.best.length ? (
                <ol className="space-y-2 text-sm">
                  {st.best.map(([name, qty]) => <li key={name} className="flex justify-between"><span>{name}</span><span className="font-semibold">{qty} sold</span></li>)}
                </ol>
              ) : <p className="text-sm text-sage">No approved orders in this period yet.</p>}
              <h2 className="mb-3 mt-5 font-semibold">Low stock</h2>
              {st.lowStock.length ? (
                <ul className="space-y-1 text-sm">
                  {st.lowStock.slice(0, 8).map((l) => <li key={l.name} className="flex justify-between"><span>{l.name}</span><span className="font-semibold text-red-600">{l.stock} left</span></li>)}
                </ul>
              ) : <p className="text-sm text-sage">All tracked items are well stocked.</p>}
            </section>
          </div>
        </>
      )}

      <section className="card p-4">
        <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Latest orders</h2><Link href="/admin/orders" className="text-sm font-semibold text-primary-700">View all</Link></div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr><th className="th">Order</th><th className="th">Customer</th><th className="th">Total</th><th className="th">Status</th><th className="th">Placed</th></tr></thead>
            <tbody>
              {st.latest.map((o: any) => (
                <tr key={o.id} className="border-t border-line">
                  <td className="td"><Link className="font-semibold text-primary-700" href={`/admin/orders/${o.id}`}>{o.order_number}</Link></td>
                  <td className="td">{o.guest_name}</td>
                  <td className="td">{money(o.total)}</td>
                  <td className="td"><StatusBadge status={o.status} /></td>
                  <td className="td text-sage">{dateTime(o.created_at)}</td>
                </tr>
              ))}
              {!st.latest.length && <tr><td className="td text-sage" colSpan={5}>No orders yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
