'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { compressReceipt } from '@/lib/compress';

export default function ReceiptUpload({ orderNumber, token }: { orderNumber: string; token: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(null);
    setBusy(true);
    try {
      let body: Blob = file;
      if (file.type.startsWith('image/')) body = await compressReceipt(file);
      else if (file.type !== 'application/pdf') throw new Error('Please upload an image or a PDF.');
      if (body.size > 4 * 1024 * 1024) throw new Error('File is too large (max 4 MB). Please upload a smaller file.');
      const fd = new FormData();
      fd.append('file', new File([body], 'receipt', { type: body.type }));
      fd.append('t', token);
      const res = await fetch(`/api/orders/${orderNumber}/receipt`, { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      router.refresh();
    } catch (e: any) {
      setErr(e.message || 'Upload failed');
    }
    setBusy(false);
    e.target.value = '';
  }

  return (
    <div>
      <label className="label">Upload your payment receipt (photo or PDF)</label>
      <input type="file" accept="image/*,application/pdf" onChange={onChange} disabled={busy} className="input" />
      {busy && <p className="mt-2 text-sm text-sage">Uploading...</p>}
      {err && <p className="mt-2 rounded-lg bg-red-50 p-2 text-sm text-red-700">{err}</p>}
    </div>
  );
}
