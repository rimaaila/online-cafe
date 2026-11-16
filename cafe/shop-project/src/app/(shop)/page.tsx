import Link from 'next/link';
import { Bike, Clock, Store } from 'lucide-react';
import { supabaseServer } from '@/lib/supabase/server';
import { getSettings } from '@/lib/settings';
import ProductCard from '@/components/ProductCard';

export const dynamic = 'force-dynamic';

const SELECT =
  'id,name,slug,base_price,track_stock,stock,category:categories(name,slug),variants:product_variants(id,name,price,stock,is_active,sort_order),images:product_images(id,is_primary,sort_order)';

export default async function Home() {
  const sb = supabaseServer();
  const s = await getSettings();
  const [{ data: categories }, { data: featured }] = await Promise.all([
    sb.from('categories').select('id,name,slug').eq('is_active', true).order('sort_order'),
    sb.from('products').select(SELECT).eq('status', 'active').eq('is_featured', true).limit(8),
  ]);
  let products: any[] = featured || [];
  if (!products.length) {
    const { data } = await sb.from('products').select(SELECT).eq('status', 'active').order('created_at', { ascending: false }).limit(8);
    products = data || [];
  }

  return (
    <div className="space-y-12">
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-primary-100 via-primary-50 to-cream p-8 sm:p-14">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary-700">{s.shop_name}</p>
        <h1 className="mt-2 max-w-xl text-4xl font-extrabold text-primary-900 sm:text-5xl">{s.tagline}</h1>
        <p className="mt-3 max-w-lg text-sage">
          Order online for pickup from our cafe or home delivery in Malé and Hulhumalé. Pay by bank transfer and upload your receipt.
        </p>
        <div className="mt-6 flex gap-3">
          <Link href="/menu" className="btn-primary">Order now</Link>
          <Link href="/track" className="btn-outline">Track an order</Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="card flex gap-3 p-4"><Store className="text-primary-700" /><div><p className="font-semibold">Pickup from the cafe</p><p className="text-sm text-sage">{s.address || 'Collect your order at the cafe.'}</p></div></div>
        <div className="card flex gap-3 p-4"><Bike className="text-primary-700" /><div><p className="font-semibold">Home delivery</p><p className="text-sm text-sage">Malé and Hulhumalé</p></div></div>
        <div className="card flex gap-3 p-4"><Clock className="text-primary-700" /><div><p className="font-semibold">Opening hours</p><p className="text-sm text-sage">{s.opening_hours || 'See contact details below.'}</p></div></div>
      </section>

      {!!categories?.length && (
        <section>
          <h2 className="mb-3 text-xl">Browse by category</h2>
          <div className="flex flex-wrap gap-2">
            {categories.map((c: any) => (
              <Link key={c.id} href={`/menu?cat=${c.slug}`} className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium hover:bg-primary-100">
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-xl">Popular right now</h2>
          <Link href="/menu" className="text-sm font-semibold text-primary-700 hover:underline">See full menu</Link>
        </div>
        {products.length ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {products.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        ) : (
          <p className="text-sage">The menu is being prepared. Please check back soon.</p>
        )}
      </section>
    </div>
  );
}
