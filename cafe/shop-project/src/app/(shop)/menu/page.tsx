import Link from 'next/link';
import { supabaseServer } from '@/lib/supabase/server';
import ProductCard from '@/components/ProductCard';
import { inStock, priceInfo } from '@/lib/products';
import { ZERO_UUID } from '@/lib/constants';

export const dynamic = 'force-dynamic';
const PAGE_SIZE = 24;

type SP = { [k: string]: string | string[] | undefined };
const arr = (v: string | string[] | undefined) => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

export default async function MenuPage({ searchParams }: { searchParams: SP }) {
  const sb = supabaseServer();
  const q = ((searchParams.q as string) || '').trim();
  const cats = arr(searchParams.cat);
  const tags = arr(searchParams.tag);
  const min = Number(searchParams.min) || 0;
  const max = Number(searchParams.max) || 0;
  const onlyStock = searchParams.stock === '1';
  const sort = (searchParams.sort as string) || 'newest';
  const page = Math.max(1, Number(searchParams.page) || 1);

  const [{ data: categories }, { data: allTags }] = await Promise.all([
    sb.from('categories').select('id,name,slug').eq('is_active', true).order('sort_order'),
    sb.from('tags').select('id,name').order('name'),
  ]);

  let query = sb
    .from('products')
    .select(
      'id,name,slug,base_price,track_stock,stock,created_at,category:categories(name,slug),variants:product_variants(id,name,price,stock,is_active,sort_order),images:product_images(id,is_primary,sort_order)'
    )
    .eq('status', 'active')
    .limit(500);

  if (q) {
    const { data: ids } = await sb.rpc('search_products', { q });
    const list = (ids as any as string[]) || [];
    query = query.in('id', list.length ? list : [ZERO_UUID]);
  }
  if (cats.length) {
    const ids = (categories || []).filter((c: any) => cats.includes(c.slug)).map((c: any) => c.id);
    query = query.in('category_id', ids.length ? ids : [ZERO_UUID]);
  }
  if (tags.length) {
    const tagIds = (allTags || []).filter((t: any) => tags.includes(t.name)).map((t: any) => t.id);
    const { data: pt } = await sb.from('product_tags').select('product_id').in('tag_id', tagIds.length ? tagIds : [ZERO_UUID]);
    const pids = Array.from(new Set((pt || []).map((r: any) => r.product_id)));
    query = query.in('id', pids.length ? pids : [ZERO_UUID]);
  }

  const { data } = await query;
  let products: any[] = data || [];
  if (min) products = products.filter((p) => priceInfo(p).max >= min);
  if (max) products = products.filter((p) => priceInfo(p).min <= max);
  if (onlyStock) products = products.filter(inStock);
  products.sort((a, b) => {
    if (sort === 'price_asc') return priceInfo(a).min - priceInfo(b).min;
    if (sort === 'price_desc') return priceInfo(b).min - priceInfo(a).min;
    if (sort === 'name') return a.name.localeCompare(b.name);
    return +new Date(b.created_at) - +new Date(a.created_at);
  });

  const total = products.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const shown = products.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const pageHref = (n: number) => {
    const p = new URLSearchParams();
    Object.entries(searchParams).forEach(([k, v]) => arr(v).forEach((x) => k !== 'page' && p.append(k, x)));
    p.set('page', String(n));
    return '/menu?' + p.toString();
  };

  return (
    <div className="grid gap-8 md:grid-cols-[220px_1fr]">
      <form method="get" className="card h-fit space-y-5 p-4 text-sm">
        {q && <input type="hidden" name="q" value={q} />}
        <div>
          <p className="mb-2 font-semibold">Categories</p>
          <div className="space-y-1">
            {(categories || []).map((c: any) => (
              <label key={c.id} className="flex items-center gap-2">
                <input type="checkbox" name="cat" value={c.slug} defaultChecked={cats.includes(c.slug)} className="accent-primary-600" /> {c.name}
              </label>
            ))}
          </div>
        </div>
        {!!allTags?.length && (
          <div>
            <p className="mb-2 font-semibold">Dietary / tags</p>
            <div className="space-y-1">
              {allTags.map((t: any) => (
                <label key={t.id} className="flex items-center gap-2">
                  <input type="checkbox" name="tag" value={t.name} defaultChecked={tags.includes(t.name)} className="accent-primary-600" /> {t.name}
                </label>
              ))}
            </div>
          </div>
        )}
        <div>
          <p className="mb-2 font-semibold">Price range</p>
          <div className="flex gap-2">
            <input name="min" type="number" min={0} placeholder="Min" defaultValue={min || ''} className="input" />
            <input name="max" type="number" min={0} placeholder="Max" defaultValue={max || ''} className="input" />
          </div>
        </div>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="stock" value="1" defaultChecked={onlyStock} className="accent-primary-600" /> In stock only
        </label>
        <div>
          <p className="mb-2 font-semibold">Sort by</p>
          <select name="sort" defaultValue={sort} className="input">
            <option value="newest">Newest</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
            <option value="name">Name</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button className="btn-primary flex-1">Apply</button>
          <Link href="/menu" className="btn-outline">Reset</Link>
        </div>
      </form>

      <div>
        <div className="mb-4 flex items-baseline justify-between">
          <h1 className="text-2xl">{q ? `Results for "${q}"` : 'Menu'}</h1>
          <p className="text-sm text-sage">{total} item{total === 1 ? '' : 's'}</p>
        </div>
        {shown.length ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            {shown.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        ) : (
          <div className="card p-8 text-center text-sage">No items match your search or filters.</div>
        )}
        {pages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-2">
            {page > 1 && <Link href={pageHref(page - 1)} className="btn-outline btn-sm">Previous</Link>}
            <span className="text-sm text-sage">Page {page} of {pages}</span>
            {page < pages && <Link href={pageHref(page + 1)} className="btn-outline btn-sm">Next</Link>}
          </div>
        )}
      </div>
    </div>
  );
}
