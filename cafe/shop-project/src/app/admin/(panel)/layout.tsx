import Logo from '@/components/Logo';
import AdminNav from '@/components/AdminNav';
import SignOutButton from '@/components/SignOutButton';
import { requireStaff } from '@/lib/auth';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const { profile, user } = await requireStaff();
  const s = await getSettings();
  const r = profile.role;
  const links = [
    { href: '/admin', label: 'Dashboard' },
    { href: '/admin/orders', label: 'Orders' },
    { href: '/admin/products', label: 'Products' },
    ...(r !== 'staff' ? [{ href: '/admin/categories', label: 'Categories' }] : []),
    ...(r === 'admin' ? [{ href: '/admin/users', label: 'Users' }] : []),
    ...(r !== 'staff' ? [{ href: '/admin/settings', label: 'Settings' }] : []),
  ];
  return (
    <div className="min-h-screen md:grid md:grid-cols-[220px_1fr]">
      <aside className="no-print border-b border-line bg-white p-4 md:border-b-0 md:border-r">
        <Logo name={s.shop_name} href="/admin" />
        <p className="mt-1 text-xs text-sage">Dashboard</p>
        <div className="mt-4"><AdminNav links={links} /></div>
        <div className="mt-4 hidden border-t border-line pt-4 text-xs text-sage md:block">
          <p className="truncate font-semibold text-ink">{profile.full_name || user.email}</p>
          <p className="capitalize">{r}</p>
          <div className="mt-2 flex gap-2">
            <a href="/" className="btn-outline btn-sm" target="_blank">View shop</a>
            <SignOutButton to="/admin/login" />
          </div>
        </div>
      </aside>
      <main className="min-w-0 p-4 md:p-8">{children}</main>
    </div>
  );
}
