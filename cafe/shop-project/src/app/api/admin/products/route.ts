import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { canManageCatalog, getStaffOrNull } from '@/lib/auth';
import { slugify } from '@/lib/format';

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

// Create or update a product together with its variants and tags.
export async function POST(req: Request) {
  const me = await getStaffOrNull();
  if (!me || !canManageCatalog(me.profile.role)) return bad('Forbidden', 403);
  const b = await req.json().catch(() => null);
  if (!b || !String(b.name || '').trim()) return bad('Product name is required.');

  const a = supabaseAdmin();
  const row = {
    name: String(b.name).trim(),
    slug: slugify(b.slug || b.name),
    description: String(b.description || ''),
    category_id: b.category_id || null,
    base_price: Math.max(0, Number(b.base_price) || 0),
    status: ['active', 'draft', 'archived'].includes(b.status) ? b.status : 'draft',
    image_url: String(b.image_url || '').trim() || null,
    is_featured: !!b.is_featured,
    track_stock: !!b.track_stock,
    stock: Math.max(0, parseInt(b.stock) || 0),
    low_stock_threshold: Math.max(0, parseInt(b.low_stock_threshold) || 0),
    updated_at: new Date().toISOString(),
  };
  if (!row.slug) return bad('Please provide a valid name or slug.');

  let id: string = b.id;
  if (id) {
    const { error } = await a.from('products').update(row).eq('id', id);
    if (error) return bad(error.message.includes('slug') ? 'That slug is already used by another product.' : error.message);
  } else {
    const { data, error } = await a.from('products').insert(row).select('id').single();
    if (error) return bad(error.message.includes('slug') ? 'That slug is already used by another product.' : error.message);
    id = data!.id;
  }

  // Variants: update existing, insert new, delete removed
  const incoming: any[] = Array.isArray(b.variants) ? b.variants.filter((v: any) => String(v.name || '').trim()) : [];
  const keep = incoming.filter((v) => v.id).map((v) => v.id);
  const del = a.from('product_variants').delete().eq('product_id', id);
  if (keep.length) await del.not('id', 'in', `(${keep.join(',')})`);
  else await del;
  for (let i = 0; i < incoming.length; i++) {
    const v = incoming[i];
    const payload = {
      product_id: id,
      name: String(v.name).trim(),
      sku: v.sku ? String(v.sku) : null,
      price: v.price === '' || v.price == null ? null : Math.max(0, Number(v.price)),
      stock: Math.max(0, parseInt(v.stock) || 0),
      is_active: v.is_active !== false,
      sort_order: i,
    };
    const res = v.id ? await a.from('product_variants').update(payload).eq('id', v.id) : await a.from('product_variants').insert(payload);
    if (res.error) return bad(res.error.message);
  }

  // Tags
  const names: string[] = Array.from(new Set<string>((b.tags || []).map((t: string) => String(t).trim().toLowerCase()).filter(Boolean)));
  await a.from('product_tags').delete().eq('product_id', id);
  if (names.length) {
    const { data: tags } = await a.from('tags').upsert(names.map((name) => ({ name })), { onConflict: 'name' }).select('id,name');
    if (tags?.length) await a.from('product_tags').insert(tags.map((t: any) => ({ product_id: id, tag_id: t.id })));
  }

  return NextResponse.json({ id });
}
