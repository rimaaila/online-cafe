import { notFound } from 'next/navigation';
import { requireStaff } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import ProductForm from '@/components/ProductForm';
import ImageManager from '@/components/ImageManager';

export default async function EditProduct({ params }: { params: { id: string } }) {
  await requireStaff(['admin', 'manager']);
  const a = supabaseAdmin();
  const [{ data: p }, { data: categories }, { data: images }] = await Promise.all([
    a.from('products').select('*, variants:product_variants(*), tags:product_tags(tag:tags(name))').eq('id', params.id).single(),
    a.from('categories').select('id,name').order('sort_order'),
    a.from('product_images').select('id,is_primary,sort_order').eq('product_id', params.id).order('sort_order'),
  ]);
  if (!p) notFound();
  const product = {
    ...p,
    tags: ((p as any).tags || []).map((t: any) => t.tag?.name).filter(Boolean),
    variants: [...((p as any).variants || [])].sort((x: any, y: any) => x.sort_order - y.sort_order),
  };
  return (
    <div className="space-y-6">
      <h1 className="text-2xl">Edit: {p.name}</h1>
      <ProductForm product={product} categories={categories || []} />
      <ImageManager productId={p.id} images={images || []} />
    </div>
  );
}
