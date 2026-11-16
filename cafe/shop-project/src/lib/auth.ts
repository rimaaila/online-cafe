import { redirect } from 'next/navigation';
import { supabaseServer } from './supabase/server';
import { supabaseAdmin } from './supabase/admin';

export type Role = 'admin' | 'manager' | 'staff' | 'customer';

export async function getCurrentProfile() {
  const sb = supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  // service client: the profile row is needed regardless of RLS timing
  const { data: profile } = await supabaseAdmin().from('profiles').select('*').eq('id', user.id).single();
  if (!profile) return null;
  return { user, profile: profile as { id: string; full_name: string; phone: string; role: Role; is_active: boolean } };
}

export async function getStaffOrNull() {
  const c = await getCurrentProfile();
  if (!c || !c.profile.is_active || c.profile.role === 'customer') return null;
  return c;
}

// For pages and server actions. Redirects when not allowed.
export async function requireStaff(allowed?: Role[]) {
  const c = await getCurrentProfile();
  if (!c) redirect('/admin/login');
  if (!c.profile.is_active || c.profile.role === 'customer') redirect('/admin/login?denied=1');
  if (allowed && !allowed.includes(c.profile.role)) redirect('/admin?error=' + encodeURIComponent('You do not have access to that page.'));
  return c;
}

export const canManageCatalog = (r: Role) => r === 'admin' || r === 'manager';
export const canEditOrders = (r: Role) => r === 'admin' || r === 'manager';
export const isAdmin = (r: Role) => r === 'admin';
