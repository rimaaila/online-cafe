import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { dateTime } from '@/lib/format';
import { createStaffUser, deleteUser, resetUserPassword, setUserRole, toggleUserActive } from '../../actions';
import Flash from '@/components/Flash';

export default async function UsersPage({ searchParams }: { searchParams: { tab?: string; error?: string; ok?: string } }) {
  const me = await requireStaff(['admin']);
  const a = supabaseAdmin();
  const customers = searchParams.tab === 'customers';

  const { data: profiles } = await a.from('profiles').select('*').order('created_at', { ascending: false });
  const { data: authList } = await a.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const info: Record<string, { email?: string; last?: string | null }> = {};
  (authList?.users || []).forEach((u: any) => { info[u.id] = { email: u.email, last: u.last_sign_in_at }; });

  const staff = (profiles || []).filter((p: any) => p.role !== 'customer');
  const custs = (profiles || []).filter((p: any) => p.role === 'customer');
  const orderCounts: Record<string, number> = {};
  if (customers) {
    const { data: os } = await a.from('orders').select('user_id').not('user_id', 'is', null).limit(10000);
    (os || []).forEach((o: any) => { orderCounts[o.user_id] = (orderCounts[o.user_id] || 0) + 1; });
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl">Users</h1>
      <Flash error={searchParams.error} ok={searchParams.ok} />
      <div className="flex gap-2">
        <Link href="/admin/users" className={`btn-sm rounded-lg px-3 py-1.5 text-xs font-semibold ${!customers ? 'bg-primary-500 text-ink' : 'border border-line bg-white'}`}>Staff ({staff.length})</Link>
        <Link href="/admin/users?tab=customers" className={`btn-sm rounded-lg px-3 py-1.5 text-xs font-semibold ${customers ? 'bg-primary-500 text-ink' : 'border border-line bg-white'}`}>Customers ({custs.length})</Link>
      </div>

      {!customers ? (
        <>
          <form action={createStaffUser} className="card grid items-end gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6">
            <div><label className="label">Name</label><input name="name" required className="input" /></div>
            <div><label className="label">Email</label><input name="email" type="email" required className="input" /></div>
            <div><label className="label">Phone</label><input name="phone" className="input" /></div>
            <div><label className="label">Temporary password</label><input name="password" type="text" minLength={8} required className="input" /></div>
            <div>
              <label className="label">Role</label>
              <select name="role" defaultValue="staff" className="input"><option value="admin">Admin</option><option value="manager">Manager</option><option value="staff">Staff</option></select>
            </div>
            <button className="btn-primary">Add user</button>
          </form>

          <div className="space-y-2">
            {staff.map((p: any) => (
              <div key={p.id} className="card flex flex-wrap items-center gap-3 p-3">
                <div className="min-w-[180px] flex-1">
                  <p className="font-semibold">{p.full_name || '(no name)'} {p.id === me.user.id && <span className="text-xs text-sage">(you)</span>}</p>
                  <p className="text-xs text-sage">{info[p.id]?.email} | last sign-in {info[p.id]?.last ? dateTime(info[p.id]!.last!) : 'never'}</p>
                </div>
                <span className={`badge ${p.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>{p.is_active ? 'Active' : 'Deactivated'}</span>
                <form action={setUserRole} className="flex gap-1">
                  <input type="hidden" name="id" value={p.id} />
                  <select name="role" defaultValue={p.role} className="input py-1"><option value="admin">Admin</option><option value="manager">Manager</option><option value="staff">Staff</option></select>
                  <button className="btn-outline btn-sm">Set role</button>
                </form>
                <form action={resetUserPassword} className="flex gap-1">
                  <input type="hidden" name="id" value={p.id} />
                  <input name="password" minLength={8} required placeholder="New password" className="input w-36 py-1" />
                  <button className="btn-outline btn-sm">Reset</button>
                </form>
                <form action={toggleUserActive}><input type="hidden" name="id" value={p.id} /><button className="btn-outline btn-sm">{p.is_active ? 'Deactivate' : 'Reactivate'}</button></form>
                <form action={deleteUser}><input type="hidden" name="id" value={p.id} /><button className="text-xs text-red-600 hover:underline">Delete</button></form>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead><tr><th className="th">Name</th><th className="th">Email</th><th className="th">Phone</th><th className="th">Orders</th><th className="th">Joined</th></tr></thead>
            <tbody>
              {custs.map((p: any) => (
                <tr key={p.id} className="border-t border-line">
                  <td className="td">{p.full_name || '-'}</td><td className="td">{info[p.id]?.email}</td><td className="td">{p.phone || '-'}</td>
                  <td className="td">{orderCounts[p.id] || 0}</td><td className="td text-sage">{dateTime(p.created_at)}</td>
                </tr>
              ))}
              {!custs.length && <tr><td colSpan={5} className="td text-sage">No customer accounts yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
