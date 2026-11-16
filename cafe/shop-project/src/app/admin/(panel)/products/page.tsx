import Link from 'next/link';
import { canManageCatalog, requireStaff } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { money } from '@/lib/format';
import { imgUrl, primaryImage } from '@/lib/products';
import { updateStock } from '../../actions';
import Flash from '@/components/Flash';

function StockForm({ kind, id, stock }: { kind: 'product' | 'variant'; id: string; stock: number }) {
  return (
    <form action={updateStock} className="flex items-center gap-1">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      <input name="stock" type="number" min={0} defaultValue={stock} className="input w-20 py-1" />
      <button className="btn-outline btn-sm">Save</button>
    </form>
  );
}

export default async function ProductsPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const { profile } = await requireStaff();
  const manage = canManageCatalog(profile.role);
  const a = supabaseAdmin();
  const { q, status, cat } = searchParams;

  let query = a
    .from('products')
    .select('id,name,slug,base_price,status,track_stock,stock,low_stock_threshold,category:categories(name),variants:product_variants(id,name,stock,is_active),images:product_images(id,is_primary,sort_order)')
    .order('created_at', { ascending: false })
    .limit(300);
  if (q) query = query.ilike('name', `%${q.replace(/[%,]/g, '')}%`);
  if (status) query = query.eq('status', status);
  if (cat) query = query.eq('category_id', cat);
  const [{ data: products }, { data: categories }] = await Promise.all([query, a.from('categories').select('id,name').order('sort_order')]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl">Products</h1>
        {manage && <Link href="/admin/products/new" className="btn-primary">Add product</Link>}
      </div>
      <Flash error={searchParams.error} ok={searchParams.ok} />
      <form className="card grid gap-3 p-4 sm:grid-cols-4">
        <input name="q" defaultValue={q} placeholder="Search products" className="input" />
        <select name="status" defaultValue={status || ''} className="input">
          <option value="">All statuses</option><option value="active">Active</option><option value="draft">Draft</option><option value="archived">Archived</option>
        </select>
        <select name="cat" defaultValue={cat || ''} className="input">
          <option value="">All categories</option>
          {(categories || []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="flex gap-2"><button className="btn-primary btn-sm">Filter</button><Link href="/admin/products" className="btn-outline btn-sm">Reset</Link></div>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead><tr><th className="th">Product</th><th className="th">Category</th><th className="th">Price</th><th className="th">Stock</th><th className="th">Status</th><th className="th"></th></tr></thead>
          <tbody>
            {(products || []).map((p: any) => {
              const vs = (p.variants || []).filter((v: any) => v.is_active);
              const img = imgUrl(primaryImage(p));
              return (
                <tr key={p.id} className="border-t border-line align-top">
                  <td className="td">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-primary-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {img && <img src={img} alt="" className="h-full w-full object-cover" />}
                      </div>
                      <span className="font-semibold">{p.name}</span>
                    </div>
                  </td>
                  <td className="td">{p.category?.name || '-'}</td>
                  <td className="td">{money(p.base_price)}</td>
                  <td className="td">
                    {!p.track_stock ? <span className="text-sage">Not tracked</span> : vs.length ? (
                      <div className="space-y-1">
                        {vs.map((v: any) => (
                          <div key={v.id} className="flex items-center gap-2"><span className="w-20 truncate text-xs text-sage">{v.name}</span><StockForm kind="variant" id={v.id} stock={v.stock} /></div>
                        ))}
                      </div>
                    ) : <StockForm kind="product" id={p.id} stock={p.stock} />}
                  </td>
                  <td className="td"><span className={`badge ${p.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>{p.status}</span></td>
                  <td className="td">{manage && <Link href={`/admin/products/${p.id}`} className="btn-outline btn-sm">Edit</Link>}</td>
                </tr>
              );
            })}
            {!products?.length && <tr><td colSpan={6} className="td text-sage">No products yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
