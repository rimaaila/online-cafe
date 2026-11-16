import { requireStaff } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { saveSettings } from '../../actions';
import Flash from '@/components/Flash';

export default async function SettingsPage({ searchParams }: { searchParams: { error?: string; ok?: string } }) {
  const { profile } = await requireStaff(['admin', 'manager']);
  const s = await getSettings();
  const ro = profile.role !== 'admin'; // managers can view only
  const F = ({ k, label, type = 'text', area = false }: { k: keyof typeof s; label: string; type?: string; area?: boolean }) => (
    <div className={area ? 'sm:col-span-2' : ''}>
      <label className="label">{label}</label>
      {area ? <textarea name={k} defaultValue={s[k]} rows={4} disabled={ro} className="input" /> : <input name={k} type={type} step="0.01" defaultValue={s[k]} disabled={ro} className="input" />}
    </div>
  );
  return (
    <div className="space-y-4">
      <h1 className="text-2xl">Settings</h1>
      {ro && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">You can view settings, but only an Admin can change them.</p>}
      <Flash error={searchParams.error} ok={searchParams.ok} />
      <form action={saveSettings} className="space-y-6">
        <section className="card grid gap-4 p-4 sm:grid-cols-2">
          <h2 className="font-semibold sm:col-span-2">Shop</h2>
          <F k="shop_name" label="Shop name" /><F k="tagline" label="Tagline" />
          <F k="phone" label="Phone" /><F k="email" label="Email" />
          <F k="address" label="Cafe address (pickup)" /><F k="opening_hours" label="Opening hours" />
          <p className="text-xs text-sage sm:col-span-2">The logo is a placeholder component (src/components/Logo.tsx). Replace it when you have the final logo.</p>
        </section>
        <section className="card grid gap-4 p-4 sm:grid-cols-2">
          <h2 className="font-semibold sm:col-span-2">Ordering</h2>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="pickup_enabled" defaultChecked={s.pickup_enabled === 'true'} disabled={ro} className="accent-primary-600" /> Pickup from the cafe enabled</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="delivery_enabled" defaultChecked={s.delivery_enabled === 'true'} disabled={ro} className="accent-primary-600" /> Home delivery enabled</label>
          <F k="fee_male" label="Delivery fee: Malé" type="number" /><F k="fee_hulhumale" label="Delivery fee: Hulhumalé" type="number" />
          <F k="min_order" label="Minimum order amount" type="number" />
          <F k="pending_expiry_hours" label="Pending order expiry (hours, informational)" type="number" />
          <F k="low_stock_default" label="Default low-stock level" type="number" />
        </section>
        <section className="card grid gap-4 p-4 sm:grid-cols-2">
          <h2 className="font-semibold sm:col-span-2">Payment</h2>
          <F k="bank_details" label="Bank transfer details shown to customers" area />
        </section>
        {!ro && <button className="btn-primary">Save settings</button>}
      </form>
    </div>
  );
}
