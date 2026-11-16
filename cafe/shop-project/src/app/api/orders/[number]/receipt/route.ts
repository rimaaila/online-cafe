import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { supabaseServer } from '@/lib/supabase/server';

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });
const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

export async function POST(req: Request, { params }: { params: { number: string } }) {
  const form = await req.formData();
  const file = form.get('file') as File | null;
  const t = String(form.get('t') || '');
  if (!file) return bad('No file');
  if (!TYPES.includes(file.type)) return bad('Please upload a JPG, PNG, WebP or PDF file.');
  if (file.size > 4 * 1024 * 1024) return bad('File is too large (max 4 MB).');

  const a = supabaseAdmin();
  const { data: o } = await a.from('orders').select('id,access_token,user_id,status').eq('order_number', params.number).single();
  if (!o) return bad('Order not found', 404);

  let ok = !!t && t === o.access_token;
  if (!ok) {
    const {
      data: { user },
    } = await supabaseServer().auth.getUser();
    ok = !!user && user.id === o.user_id;
  }
  if (!ok) return bad('Not allowed', 403);

  const hex = Buffer.from(await file.arrayBuffer()).toString('hex');
  const { error } = await a.rpc('submit_receipt', { p_order_number: params.number, p_data: hex, p_mime: file.type });
  if (error) {
    if (error.message.includes('NOT_ALLOWED')) return bad('A receipt cannot be uploaded for this order right now.', 409);
    if (error.message.includes('OUT_OF_STOCK')) return bad('Some items in this order are no longer in stock. Please contact the shop.', 409);
    return bad('Upload failed. Please try again.', 500);
  }
  return NextResponse.json({ ok: true });
}
