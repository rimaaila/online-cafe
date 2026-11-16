import { requireStaff } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { deleteCategory, saveCategory } from '../../actions';
import Flash from '@/components/Flash';

export default async function CategoriesPage({ searchParams }: { searchParams: { error?: string; ok?: string } }) {
  await requireStaff(['admin', 'manager']);
  const { data: cats } = await supabaseAdmin().from('categories').select('*').order('sort_order');
  const list = cats || [];
  return (
    <div className="space-y-4">
      <h1 className="text-2xl">Categories</h1>
      <Flash error={searchParams.error} ok={searchParams.ok} />

      <form action={saveCategory} className="card grid items-end gap-3 p-4 sm:grid-cols-[1.5fr_1fr_1fr_1fr_auto]">
        <div><label className="label">New category</label><input name="name" required className="input" placeholder="e.g. Soups" /></div>
        <div><label className="label">Slug (optional)</label><input name="slug" className="input" /></div>
        <div>
          <label className="label">Parent</label>
          <select name="parent_id" className="input"><option value="">None</option>{list.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        </div>
        <div><label className="label">Order</label><input name="sort_order" type="number" defaultValue={list.length + 1} className="input" /></div>
        <button className="btn-primary">Add</button>
      </form>

      <div className="space-y-2">
        {list.map((c: any) => (
          <div key={c.id} className="card p-3">
            <form action={saveCategory} className="grid items-end gap-2 sm:grid-cols-[1.5fr_1fr_1fr_80px_auto_auto]">
              <input type="hidden" name="id" value={c.id} />
              <input name="name" defaultValue={c.name} required className="input" />
              <input name="slug" defaultValue={c.slug} className="input" />
              <select name="parent_id" defaultValue={c.parent_id || ''} className="input">
                <option value="">No parent</option>
                {list.filter((x: any) => x.id !== c.id).map((x: any) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
              <input name="sort_order" type="number" defaultValue={c.sort_order} className="input" />
              <label className="flex items-center gap-1 text-sm"><input type="checkbox" name="is_active" defaultChecked={c.is_active} className="accent-primary-600" /> Active</label>
              <button className="btn-outline btn-sm">Save</button>
            </form>
            <form action={deleteCategory} className="mt-1 text-right">
              <input type="hidden" name="id" value={c.id} />
              <button className="text-xs text-red-600 hover:underline">Delete</button>
            </form>
          </div>
        ))}
        {!list.length && <p className="text-sage">No categories yet.</p>}
      </div>
    </div>
  );
}
