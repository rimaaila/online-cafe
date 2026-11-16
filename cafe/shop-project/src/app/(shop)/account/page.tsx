import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { money, dateTime } from '@/lib/format';
import StatusBadge from '@/components/StatusBadge';
import SignOutButton from '@/components/SignOutButton';

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const me = await getCurrentProfile();
  if (!me) redirect('/account/login');
  const { data: orders } = await supabaseAdmin()
    .from('orders')
    .select('order_number,access_token,status,total,created_at')
    .eq('user_id', me.user.id)
    .order('created_at', { ascending: false });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl">Hi, {me.profile.full_name || me.user.email}</h1>
          <p className="text-sm text-sage">{me.user.email}</p>
        </div>
        <div className="flex gap-2">
          {me.profile.role !== 'customer' && <Link href="/admin" className="btn-dark btn-sm">Admin dashboard</Link>}
          <SignOutButton />
        </div>
      </div>
      <h2 className="text-lg">Your orders</h2>
      {orders?.length ? (
        <div className="space-y-2">
          {orders.map((o: any) => (
            <Link key={o.order_number} href={`/order/${o.order_number}?t=${o.access_token}`} className="card flex items-center justify-between p-3 hover:bg-primary-50">
              <div><p className="font-semibold">{o.order_number}</p><p className="text-xs text-sage">{dateTime(o.created_at)}</p></div>
              <div className="flex items-center gap-3"><span className="text-sm font-semibold">{money(o.total)}</span><StatusBadge status={o.status} /></div>
            </Link>
          ))}
        </div>
      ) : <p className="text-sage">No orders yet. <Link href="/menu" className="font-semibold text-primary-700">Browse the menu</Link></p>}
    </div>
  );
}
