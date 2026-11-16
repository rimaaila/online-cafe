'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Star, Trash2 } from 'lucide-react';
import { compressProductFull, compressProductThumb } from '@/lib/compress';

export default function ImageManager({ productId, images }: { productId: string; images: { id: string; is_primary: boolean }[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setBusy(true);
    setErr(null);
    try {
      for (const file of files) {
        const [full, thumb] = await Promise.all([compressProductFull(file), compressProductThumb(file)]);
        const fd = new FormData();
        fd.append('full', new File([full], 'full', { type: full.type }));
        fd.append('thumb', new File([thumb], 'thumb', { type: thumb.type }));
        const res = await fetch(`/api/admin/products/${productId}/images`, { method: 'POST', body: fd });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Upload failed');
      }
      router.refresh();
    } catch (er: any) {
      setErr(er.message);
    }
    setBusy(false);
    e.target.value = '';
  }

  async function act(id: string, method: 'PATCH' | 'DELETE') {
    if (method === 'DELETE' && !confirm('Delete this image?')) return;
    await fetch(`/api/admin/images/${id}`, { method });
    router.refresh();
  }

  return (
    <section className="card space-y-3 p-4">
      <h2 className="font-semibold">Photos</h2>
      <p className="text-xs text-sage">Photos are compressed in your browser (high quality, max 2000 px) and stored in the database. The starred photo is the main one.</p>
      <div className="flex flex-wrap gap-3">
        {images.map((im) => (
          <div key={im.id} className={`relative h-28 w-28 overflow-hidden rounded-xl border-2 ${im.is_primary ? 'border-primary-600' : 'border-line'}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/images/${im.id}`} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-white/90 p-1">
              <button onClick={() => act(im.id, 'PATCH')} title="Make main photo" className={im.is_primary ? 'text-accent' : 'text-sage hover:text-accent'}><Star size={16} /></button>
              <button onClick={() => act(im.id, 'DELETE')} title="Delete" className="text-sage hover:text-red-600"><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
        {!images.length && <p className="text-sm text-sage">No photos yet.</p>}
      </div>
      <input type="file" accept="image/*" multiple onChange={onFiles} disabled={busy} className="input" />
      {busy && <p className="text-sm text-sage">Compressing and uploading...</p>}
      {err && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{err}</p>}
    </section>
  );
}
