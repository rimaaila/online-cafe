import { supabaseAdmin } from '@/lib/supabase/admin';
import { fromHex } from '@/lib/hex';

// Serves product images stored in the database, with long-lived cache headers.
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const col = new URL(req.url).searchParams.get('size') === 'full' ? 'full_data' : 'thumb_data';
  const etag = `"${params.id}-${col}"`;
  if (req.headers.get('if-none-match') === etag) return new Response(null, { status: 304, headers: { ETag: etag } });

  const { data } = await supabaseAdmin().from('product_images').select(`${col}, mime_type`).eq('id', params.id).single();
  if (!data) return new Response('Not found', { status: 404 });
  const buf = fromHex((data as any)[col]);
  return new Response(buf, {
    headers: {
      'Content-Type': (data as any).mime_type || 'image/webp',
      'Cache-Control': 'public, max-age=31536000, immutable',
      ETag: etag,
    },
  });
}
