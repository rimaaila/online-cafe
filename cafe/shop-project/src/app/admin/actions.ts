'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireStaff } from '@/lib/auth';
import { slugify } from '@/lib/format';

function bounce(path: string, msg: string): never {
  redirect(`${path}${path.includes('?') ? '&' : '?'}error=${encodeURIComponent(msg)}`);
}
function ok(path: string, msg = 'Saved'): never {
  redirect(`${path}${path.includes('?') ? '&' : '?'}ok=${encodeURIComponent(msg)}`);
}
function friendly(m: string) {
  if (m.includes('INVALID_TRANSITION')) return 'That status change is not allowed.';
  if (m.includes('REASON_REQUIRED')) return 'A reason is required when rejecting an order.';
  if (m.includes('NOTE_REQUIRED')) return 'A note is required for a manual override.';
  if (m.includes('OUT_OF_STOCK')) return 'Not enough stock to restore this order.';
  return m;
}

// ---------------------------------------------------------------- Orders
export async function updateOrderStatus(fd: FormData) {
  const me = await requireStaff();
  const orderId = String(fd.get('orderId'));
  const back = `/admin/orders/${orderId}`;
  const force = fd.get('force') === '1';
  if (force && !['admin', 'manager'].includes(me.profile.role)) bounce(back, 'Only admins and managers can override a status.');
  const { error } = await supabaseAdmin().rpc('change_order_status', {
    p_order: orderId,
    p_to: String(fd.get('to') || ''),
    p_note: String(fd.get('note') || ''),
    p_user: me.user.id,
    p_force: force,
  });
  if (error) bounce(back, friendly(error.message));
  revalidatePath('/admin/orders');
  revalidatePath('/admin');
  ok(back, 'Order updated');
}

export async function saveInternalNote(fd: FormData) {
  await requireStaff();
  const id = String(fd.get('orderId'));
  await supabaseAdmin().from('orders').update({ internal_notes: String(fd.get('internal_notes') || '') }).eq('id', id);
  ok(`/admin/orders/${id}`, 'Note saved');
}

export async function deleteOrder(fd: FormData) {
  await requireStaff(['admin']);
  await supabaseAdmin().from('orders').delete().eq('id', String(fd.get('orderId')));
  revalidatePath('/admin/orders');
  redirect('/admin/orders?ok=' + encodeURIComponent('Order deleted'));
}

// ---------------------------------------------------------------- Stock (all staff)
export async function updateStock(fd: FormData) {
  const me = await requireStaff();
  const kind = String(fd.get('kind'));
  const id = String(fd.get('id'));
  const stock = Math.max(0, parseInt(String(fd.get('stock'))) || 0);
  const a = supabaseAdmin();
  const table = kind === 'variant' ? 'product_variants' : 'products';
  const { data: cur } = await a.from(table).select(kind === 'variant' ? 'stock, product_id' : 'stock').eq('id', id).single();
  if (!cur) bounce('/admin/products', 'Item not found');
  await a.from(table).update({ stock }).eq('id', id);
  await a.from('stock_movements').insert({
    product_id: kind === 'variant' ? (cur as any).product_id : id,
    variant_id: kind === 'variant' ? id : null,
    change: stock - (cur as any).stock,
    reason: 'manual_adjustment',
    user_id: me.user.id,
  });
  revalidatePath('/admin/products');
  revalidatePath('/admin');
  ok('/admin/products', 'Stock updated');
}

// ---------------------------------------------------------------- Categories
export async function saveCategory(fd: FormData) {
  await requireStaff(['admin', 'manager']);
  const name = String(fd.get('name') || '').trim();
  if (!name) bounce('/admin/categories', 'Name is required');
  const row = {
    name,
    slug: slugify(String(fd.get('slug') || name)),
    sort_order: parseInt(String(fd.get('sort_order'))) || 0,
    is_active: fd.get('is_active') === 'on',
    parent_id: String(fd.get('parent_id') || '') || null,
  };
  const id = String(fd.get('id') || '');
  const a = supabaseAdmin();
  const { error } = id ? await a.from('categories').update(row).eq('id', id) : await a.from('categories').insert({ ...row, is_active: id ? row.is_active : true });
  if (error) bounce('/admin/categories', error.message.includes('slug') ? 'That slug already exists.' : error.message);
  revalidatePath('/admin/categories');
  ok('/admin/categories', 'Category saved');
}

export async function deleteCategory(fd: FormData) {
  await requireStaff(['admin', 'manager']);
  const id = String(fd.get('id'));
  const a = supabaseAdmin();
  const { count } = await a.from('products').select('id', { count: 'exact', head: true }).eq('category_id', id);
  if (count) bounce('/admin/categories', `This category still has ${count} product(s). Move or delete them first.`);
  await a.from('categories').delete().eq('id', id);
  revalidatePath('/admin/categories');
  ok('/admin/categories', 'Category deleted');
}

// ---------------------------------------------------------------- Users (admin only)
async function activeAdminCount() {
  const { count } = await supabaseAdmin().from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'admin').eq('is_active', true);
  return count || 0;
}

export async function createStaffUser(fd: FormData) {
  await requireStaff(['admin']);
  const email = String(fd.get('email') || '').trim();
  const password = String(fd.get('password') || '');
  const role = String(fd.get('role'));
  if (!['admin', 'manager', 'staff'].includes(role)) bounce('/admin/users', 'Choose a valid role.');
  if (password.length < 8) bounce('/admin/users', 'Password must be at least 8 characters.');
  const a = supabaseAdmin();
  const { data, error } = await a.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: String(fd.get('name') || ''), phone: String(fd.get('phone') || '') },
  });
  if (error || !data.user) bounce('/admin/users', error?.message || 'Could not create user');
  await a.from('profiles').update({ role, full_name: String(fd.get('name') || ''), phone: String(fd.get('phone') || '') }).eq('id', data.user!.id);
  revalidatePath('/admin/users');
  ok('/admin/users', 'User created');
}

export async function setUserRole(fd: FormData) {
  const me = await requireStaff(['admin']);
  const id = String(fd.get('id'));
  const role = String(fd.get('role'));
  if (!['admin', 'manager', 'staff'].includes(role)) bounce('/admin/users', 'Invalid role');
  const a = supabaseAdmin();
  const { data: target } = await a.from('profiles').select('role,is_active').eq('id', id).single();
  if (target?.role === 'admin' && target.is_active && role !== 'admin' && (await activeAdminCount()) <= 1) bounce('/admin/users', 'At least one active Admin must exist.');
  await a.from('profiles').update({ role }).eq('id', id);
  revalidatePath('/admin/users');
  ok('/admin/users', 'Role updated');
}

export async function toggleUserActive(fd: FormData) {
  const me = await requireStaff(['admin']);
  const id = String(fd.get('id'));
  const a = supabaseAdmin();
  const { data: target } = await a.from('profiles').select('role,is_active').eq('id', id).single();
  if (!target) bounce('/admin/users', 'User not found');
  if (target!.is_active && target!.role === 'admin' && (await activeAdminCount()) <= 1) bounce('/admin/users', 'At least one active Admin must exist.');
  if (id === me.user.id && target!.is_active) bounce('/admin/users', 'You cannot deactivate your own account.');
  await a.from('profiles').update({ is_active: !target!.is_active }).eq('id', id);
  revalidatePath('/admin/users');
  ok('/admin/users', target!.is_active ? 'User deactivated' : 'User reactivated');
}

export async function resetUserPassword(fd: FormData) {
  await requireStaff(['admin']);
  const password = String(fd.get('password') || '');
  if (password.length < 8) bounce('/admin/users', 'Password must be at least 8 characters.');
  const { error } = await supabaseAdmin().auth.admin.updateUserById(String(fd.get('id')), { password });
  if (error) bounce('/admin/users', error.message);
  ok('/admin/users', 'Password updated');
}

export async function deleteUser(fd: FormData) {
  const me = await requireStaff(['admin']);
  const id = String(fd.get('id'));
  if (id === me.user.id) bounce('/admin/users', 'You cannot delete your own account.');
  const a = supabaseAdmin();
  const { data: target } = await a.from('profiles').select('role,is_active').eq('id', id).single();
  if (target?.role === 'admin' && target.is_active && (await activeAdminCount()) <= 1) bounce('/admin/users', 'At least one active Admin must exist.');
  const { error } = await a.auth.admin.deleteUser(id);
  if (error) bounce('/admin/users', error.message);
  revalidatePath('/admin/users');
  ok('/admin/users', 'User deleted');
}

// ---------------------------------------------------------------- Settings (admin only)
const SETTING_KEYS = ['shop_name','tagline','phone','email','address','opening_hours','bank_details','fee_male','fee_hulhumale','min_order','pending_expiry_hours','low_stock_default'];

export async function saveSettings(fd: FormData) {
  await requireStaff(['admin']);
  const rows = SETTING_KEYS.map((key) => ({ key, value: String(fd.get(key) ?? '') }));
  rows.push({ key: 'pickup_enabled', value: fd.get('pickup_enabled') === 'on' ? 'true' : 'false' });
  rows.push({ key: 'delivery_enabled', value: fd.get('delivery_enabled') === 'on' ? 'true' : 'false' });
  const { error } = await supabaseAdmin().from('settings').upsert(rows, { onConflict: 'key' });
  if (error) bounce('/admin/settings', error.message);
  revalidatePath('/', 'layout');
  ok('/admin/settings', 'Settings saved');
}
