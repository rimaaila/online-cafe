import { supabaseAdmin } from '@/lib/supabase/admin';
import { supabaseServer } from '@/lib/supabase/server';
import { getStaffOrNull } from '@/lib/auth';
import { fromHex } from '@/lib/hex';

// Receipts are private: staff, or the order owner (token link / signed-in customer).
export async function GET(req: Request, { params }: { params: { orderId: string } }) {
  const a = supabaseAdmin();
  const t = new URL(req.url).searchParams.get('t');
  let allowed = !!(await getStaffOrNull());
  if (!allowed) {
    const { data: o } = await a.from('orders').select('access_token,user_id').eq('id', params.orderId).single();
    if (o) {
      if (t && t === o.access_token) allowed = true;
      else {
        const {
          data: { user },
        } = await supabaseServer().auth.getUser();
        allowed = !!user && user.id === o.user_id;
      }
    }
  }
  if (!allowed) return new Response('Forbidden', { status: 403 });

  const { data } = await a
    .from('order_receipts')
    .select('data, mime_type')
    .eq('order_id', params.orderId)
    .order('uploaded_at', { ascending: false })
    .limit(1)
    .single();
  if (!data) return new Response('Not found', { status: 404 });
  return new Response(fromHex((data as any).data), {
    headers: {
      'Content-Type': (data as any).mime_type,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
