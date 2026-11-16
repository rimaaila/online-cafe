import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { canManageCatalog, getStaffOrNull } from '@/lib/auth';

async function guard() {
  const me = await getStaffOrNull();
  return me && canManageCatalog(me.profile.role);
}

// Make this image the primary one
export async function PATCH(_req: Request, { params }: { params: { id: string } }) {
  if (!(await guard())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const a = supabaseAdmin();
  const { data: img } = await a.from('product_images').select('product_id').eq('id', params.id).single();
  if (!img) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await a.from('product_images').update({ is_primary: false }).eq('product_id', img.product_id);
  await a.from('product_images').update({ is_primary: true, sort_order: -1 }).eq('id', params.id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  if (!(await guard())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const a = supabaseAdmin();
  const { data: img } = await a.from('product_images').select('product_id,is_primary').eq('id', params.id).single();
  await a.from('product_images').delete().eq('id', params.id);
  if (img?.is_primary) {
    const { data: next } = await a.from('product_images').select('id').eq('product_id', img.product_id).order('sort_order').limit(1);
    if (next?.[0]) await a.from('product_images').update({ is_primary: true }).eq('id', next[0].id);
  }
  return NextResponse.json({ ok: true });
}
