import { requireStaff } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import ProductForm from '@/components/ProductForm';

export default async function NewProduct() {
  await requireStaff(['admin', 'manager']);
  const { data: categories } = await supabaseAdmin().from('categories').select('id,name').order('sort_order');
  return (
    <div className="space-y-4">
      <h1 className="text-2xl">Add product</h1>
      <ProductForm categories={categories || []} />
    </div>
  );
}
