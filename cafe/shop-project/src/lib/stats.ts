import { supabaseAdmin } from './supabase/admin';

const TZ = process.env.SHOP_TIMEZONE || 'Indian/Maldives';
const dayKey = (d: Date | string) => new Date(d).toLocaleDateString('en-CA', { timeZone: TZ }); // YYYY-MM-DD

export async function getStats(days: number) {
  const a = supabaseAdmin();
  const since = new Date(Date.now() - days * 864e5).toISOString();
  const today = dayKey(new Date());

  const [{ data: orders }, awaiting, pending, { data: products }, { data: soldRows }, { data: latest }] = await Promise.all([
    a.from('orders').select('id,created_at,total,status,order_type').gte('created_at', since).limit(5000),
    a.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'slip_uploaded'),
    a.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    a.from('products').select('id,name,track_stock,stock,low_stock_threshold,variants:product_variants(id,name,stock,is_active)').eq('status', 'active'),
    a.from('order_items').select('name,variant_name,quantity,orders!inner(status,created_at)').in('orders.status', ['approved', 'delivered']).gte('orders.created_at', since).limit(5000),
    a.from('orders').select('id,order_number,guest_name,total,status,created_at').order('created_at', { ascending: false }).limit(8),
  ]);

  const list = orders || [];
  const revenueStatuses = ['approved', 'delivered'];
  const todayOrders = list.filter((o: any) => dayKey(o.created_at) === today);
  const revenue = list.filter((o: any) => revenueStatuses.includes(o.status)).reduce((n: number, o: any) => n + Number(o.total), 0);

  const series: { label: string; orders: number; revenue: number }[] = [];
  const idx: Record<string, number> = {};
  for (let i = days - 1; i >= 0; i--) {
    const k = dayKey(new Date(Date.now() - i * 864e5));
    idx[k] = series.length;
    series.push({ label: k.slice(5), orders: 0, revenue: 0 });
  }
  list.forEach((o: any) => {
    const i = idx[dayKey(o.created_at)];
    if (i === undefined) return;
    series[i].orders += 1;
    if (revenueStatuses.includes(o.status)) series[i].revenue += Number(o.total);
  });

  const byStatus: Record<string, number> = {};
  const byType: Record<string, number> = {};
  list.forEach((o: any) => {
    byStatus[o.status] = (byStatus[o.status] || 0) + 1;
    byType[o.order_type] = (byType[o.order_type] || 0) + 1;
  });

  const sold: Record<string, number> = {};
  (soldRows || []).forEach((r: any) => { sold[r.name] = (sold[r.name] || 0) + r.quantity; });
  const best = Object.entries(sold).sort((x, y) => y[1] - x[1]).slice(0, 5);

  const lowStock: { name: string; stock: number }[] = [];
  (products || []).forEach((p: any) => {
    if (!p.track_stock) return;
    const vs = (p.variants || []).filter((v: any) => v.is_active);
    if (vs.length) vs.forEach((v: any) => { if (v.stock <= p.low_stock_threshold) lowStock.push({ name: `${p.name} (${v.name})`, stock: v.stock }); });
    else if (p.stock <= p.low_stock_threshold) lowStock.push({ name: p.name, stock: p.stock });
  });
  lowStock.sort((x, y) => x.stock - y.stock);

  return {
    todayCount: todayOrders.length,
    todayAwaiting: todayOrders.filter((o: any) => o.status === 'slip_uploaded').length,
    revenue,
    awaiting: awaiting.count || 0,
    pending: pending.count || 0,
    lowStock,
    series,
    byStatus,
    byType,
    best,
    latest: latest || [],
  };
}
