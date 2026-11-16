import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { canManageCatalog, getStaffOrNull } from '@/lib/auth';

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const me = await getStaffOrNull();
  if (!me || !canManageCatalog(me.profile.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { error } = await supabaseAdmin().from('products').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
