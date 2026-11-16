import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { canManageCatalog, getStaffOrNull } from '@/lib/auth';
import { toHex } from '@/lib/hex';

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });
const MAX = 3 * 1024 * 1024;

// Receives an already-compressed full image + thumbnail from the browser.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const me = await getStaffOrNull();
  if (!me || !canManageCatalog(me.profile.role)) return bad('Forbidden', 403);
  const form = await req.formData();
  const full = form.get('full') as File | null;
  const thumb = form.get('thumb') as File | null;
  if (!full || !thumb) return bad('Missing image');
  if (!full.type.startsWith('image/') || !thumb.type.startsWith('image/')) return bad('Files must be images');
  if (full.size > MAX || thumb.size > MAX) return bad('Image is too large after compression (max 3 MB).');

  const a = supabaseAdmin();
  const { count } = await a.from('product_images').select('id', { count: 'exact', head: true }).eq('product_id', params.id);
  const { data, error } = await a
    .from('product_images')
    .insert({
      product_id: params.id,
      variant_id: (form.get('variant_id') as string) || null,
      full_data: toHex(await full.arrayBuffer()),
      thumb_data: toHex(await thumb.arrayBuffer()),
      mime_type: full.type,
      is_primary: !count,
      sort_order: count || 0,
    })
    .select('id')
    .single();
  if (error) return bad(error.message);
  return NextResponse.json({ id: data!.id });
}
