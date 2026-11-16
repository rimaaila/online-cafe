import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { supabaseServer } from '@/lib/supabase/server';
import { getSettings } from '@/lib/settings';
import { DELIVERY_AREAS } from '@/lib/constants';
import { money } from '@/lib/format';

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  if (!b) return bad('Invalid request');
  const name = String(b.name || '').trim();
  const phone = String(b.phone || '').trim();
  if (!name || !phone) return bad('Please enter your name and phone number.');
  if (!Array.isArray(b.items) || !b.items.length) return bad('Your cart is empty.');

  const a = supabaseAdmin();
  const s = await getSettings(a);

  const type = b.order_type;
  let fee = 0;
  let area: string | null = null;
  if (type === 'pickup') {
    if (s.pickup_enabled !== 'true') return bad('Pickup is not available right now.');
  } else if (type === 'delivery') {
    if (s.delivery_enabled !== 'true') return bad('Delivery is not available right now.');
    area = b.delivery_area;
    if (!DELIVERY_AREAS.includes(area as any)) return bad('We deliver to Malé and Hulhumalé only.');
    if (!String(b.delivery_address || '').trim()) return bad('Please enter your delivery address.');
    fee = Number(area === 'Malé' ? s.fee_male : s.fee_hulhumale) || 0;
  } else return bad('Please choose pickup or delivery.');

  const {
    data: { user },
  } = await supabaseServer().auth.getUser();

  const { data, error } = await a.rpc('place_order', {
    p: {
      name,
      phone,
      email: String(b.email || '').trim(),
      order_type: type,
      pickup_time: b.pickup_time || null,
      delivery_area: area,
      delivery_address: String(b.delivery_address || '').trim(),
      delivery_fee: fee,
      min_order: Number(s.min_order) || 0,
      notes: String(b.notes || '').trim(),
      user_id: user?.id || null,
      items: b.items.map((i: any) => ({ product_id: i.product_id, variant_id: i.variant_id || '', quantity: Number(i.quantity) || 1, name: i.name })),
    },
  });

  if (error) {
    const m = error.message || '';
    if (m.includes('OUT_OF_STOCK:')) return bad(`Sorry, "${m.split('OUT_OF_STOCK:')[1]}" does not have enough stock for your quantity. Please reduce it or choose another item.`, 409);
    if (m.includes('UNAVAILABLE:')) return bad(`Sorry, "${m.split('UNAVAILABLE:')[1]}" is no longer available. Please remove it from your cart.`, 409);
    if (m.includes('MIN_ORDER:')) return bad(`The minimum order is ${money(Number(m.split('MIN_ORDER:')[1]))}.`);
    if (m.includes('EMPTY_CART')) return bad('Your cart is empty.');
    return bad('Could not place your order. Please try again.', 500);
  }
  return NextResponse.json(data);
}
