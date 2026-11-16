import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import ProductBuy from '@/components/ProductBuy';

export const dynamic = 'force-dynamic';

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const sb = supabaseServer();
  const { data: p } = await sb
    .from('products')
    .select(
      'id,name,slug,description,base_price,track_stock,stock,category:categories(name,slug),variants:product_variants(id,name,price,stock,is_active,sort_order),images:product_images(id,variant_id,is_primary,sort_order),tags:product_tags(tag:tags(name))'
    )
    .eq('slug', params.slug)
    .eq('status', 'active')
    .single();
  if (!p) notFound();

  const tags = ((p as any).tags || []).map((t: any) => t.tag?.name).filter(Boolean);
  const cat: any = (p as any).category;

  return (
    <div>
      <p className="mb-4 text-sm text-sage">
        <Link href="/menu" className="hover:underline">Menu</Link>
        {cat?.name && <> / <Link href={`/menu?cat=${cat.slug}`} className="hover:underline">{cat.name}</Link></>}
      </p>
      <ProductBuy product={p} tags={tags} />
    </div>
  );
}
