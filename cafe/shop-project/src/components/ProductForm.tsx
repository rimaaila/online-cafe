'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { slugify } from '@/lib/format';

type Variant = { id?: string; name: string; sku: string; price: string | number; stock: number | string; is_active: boolean };

export default function ProductForm({ product, categories }: { product?: any; categories: { id: string; name: string }[] }) {
  const router = useRouter();
  const [f, setF] = useState({
    name: product?.name || '',
    slug: product?.slug || '',
    description: product?.description || '',
    category_id: product?.category_id || '',
    base_price: product?.base_price ?? 0,
    status: product?.status || 'draft',
    is_featured: !!product?.is_featured,
    track_stock: product?.track_stock ?? true,
    stock: product?.stock ?? 0,
    low_stock_threshold: product?.low_stock_threshold ?? 5,
    tags: (product?.tags || []).join(', '),
    image_url: product?.image_url || '',
  });
  const [variants, setVariants] = useState<Variant[]>(
    (product?.variants || []).map((v: any) => ({ id: v.id, name: v.name, sku: v.sku || '', price: v.price ?? '', stock: v.stock, is_active: v.is_active }))
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const set = (k: string, v: any) => setF((s) => ({ ...s, [k]: v }));
  const setVar = (i: number, k: keyof Variant, v: any) => setVariants((vs) => vs.map((x, j) => (j === i ? { ...x, [k]: v } : x)));

  async function save() {
    setBusy(true);
    setMsg(null);
    const res = await fetch('/api/admin/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...f, id: product?.id, slug: f.slug || slugify(f.name), tags: f.tags.split(','), variants }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setMsg({ type: 'err', text: data.error || 'Could not save' });
    if (!product) {
      router.push(`/admin/products/${data.id}`); // add images on the edit page
    } else {
      setMsg({ type: 'ok', text: 'Saved' });
      router.refresh();
    }
  }

  async function remove() {
    if (!confirm('Delete this product? This cannot be undone. Past orders keep their item names.')) return;
    const res = await fetch(`/api/admin/products/${product.id}`, { method: 'DELETE' });
    if (res.ok) router.push('/admin/products');
    else setMsg({ type: 'err', text: 'Could not delete' });
  }

  return (
    <div className="space-y-6">
      <section className="card grid gap-4 p-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><label className="label">Name</label><input className="input" value={f.name} onChange={(e) => set('name', e.target.value)} /></div>
        <div><label className="label">Slug (URL)</label><input className="input" value={f.slug} placeholder={slugify(f.name)} onChange={(e) => set('slug', e.target.value)} /></div>
        <div>
          <label className="label">Category</label>
          <select className="input" value={f.category_id} onChange={(e) => set('category_id', e.target.value)}>
            <option value="">No category</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2"><label className="label">Description</label><textarea rows={4} className="input" value={f.description} onChange={(e) => set('description', e.target.value)} /></div>
        <div><label className="label">Base price</label><input type="number" min={0} step="0.01" className="input" value={f.base_price} onChange={(e) => set('base_price', e.target.value)} /></div>
        <div>
          <label className="label">Status</label>
          <select className="input" value={f.status} onChange={(e) => set('status', e.target.value)}>
            <option value="draft">Draft (hidden)</option><option value="active">Active (visible)</option><option value="archived">Archived (hidden)</option>
          </select>
        </div>
        <div className="sm:col-span-2"><label className="label">Tags (comma separated, e.g. vegetarian, spicy, halal)</label><input className="input" value={f.tags} onChange={(e) => set('tags', e.target.value)} /></div>
        <div className="sm:col-span-2"><label className="label">Image URL (optional placeholder, hidden once you upload a photo)</label><input className="input" value={f.image_url} onChange={(e) => set('image_url', e.target.value)} placeholder="https://..." /></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-primary-600" checked={f.is_featured} onChange={(e) => set('is_featured', e.target.checked)} /> Featured on the home page</label>
      </section>

      <section className="card space-y-4 p-4">
        <h2 className="font-semibold">Stock</h2>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-primary-600" checked={f.track_stock} onChange={(e) => set('track_stock', e.target.checked)} /> Track stock (untick for made-to-order / unlimited items)</label>
        {f.track_stock && (
          <div className="grid gap-4 sm:grid-cols-2">
            {variants.length === 0 && <div><label className="label">Stock quantity</label><input type="number" min={0} className="input" value={f.stock} onChange={(e) => set('stock', e.target.value)} /></div>}
            <div><label className="label">Low-stock warning at</label><input type="number" min={0} className="input" value={f.low_stock_threshold} onChange={(e) => set('low_stock_threshold', e.target.value)} /></div>
          </div>
        )}
      </section>

      <section className="card space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Variants (optional)</h2>
          <button type="button" className="btn-outline btn-sm" onClick={() => setVariants((v) => [...v, { name: '', sku: '', price: '', stock: 0, is_active: true }])}><Plus size={14} /> Add variant</button>
        </div>
        <p className="text-xs text-sage">e.g. Small / Medium / Large. Leave price empty to use the base price. When variants exist, stock is tracked per variant.</p>
        {variants.map((v, i) => (
          <div key={i} className="grid items-end gap-2 rounded-xl border border-line p-3 sm:grid-cols-[1.5fr_1fr_1fr_1fr_auto_auto]">
            <div><label className="label">Name</label><input className="input" value={v.name} onChange={(e) => setVar(i, 'name', e.target.value)} /></div>
            <div><label className="label">SKU</label><input className="input" value={v.sku} onChange={(e) => setVar(i, 'sku', e.target.value)} /></div>
            <div><label className="label">Price</label><input type="number" min={0} step="0.01" className="input" value={v.price} onChange={(e) => setVar(i, 'price', e.target.value)} placeholder="base" /></div>
            <div><label className="label">Stock</label><input type="number" min={0} className="input" value={v.stock} onChange={(e) => setVar(i, 'stock', e.target.value)} /></div>
            <label className="flex items-center gap-1 pb-2 text-sm"><input type="checkbox" className="accent-primary-600" checked={v.is_active} onChange={(e) => setVar(i, 'is_active', e.target.checked)} /> Active</label>
            <button type="button" className="pb-2 text-sage hover:text-red-600" onClick={() => setVariants((vs) => vs.filter((_, j) => j !== i))} aria-label="Remove variant"><Trash2 size={16} /></button>
          </div>
        ))}
      </section>

      {msg && <p className={`rounded-xl p-3 text-sm ${msg.type === 'err' ? 'bg-red-50 text-red-700' : 'bg-primary-100 text-primary-900'}`}>{msg.text}</p>}
      <div className="flex items-center gap-3">
        <button onClick={save} disabled={busy} className="btn-primary">{busy ? 'Saving...' : product ? 'Save changes' : 'Create product'}</button>
        {product && <button onClick={remove} className="btn-danger">Delete product</button>}
      </div>
      {!product && <p className="text-xs text-sage">You can add photos right after creating the product.</p>}
    </div>
  );
}
