import { getSettings } from '@/lib/settings';
import { getCurrentProfile } from '@/lib/auth';
import CheckoutForm from '@/components/CheckoutForm';

export const dynamic = 'force-dynamic';

export default async function CheckoutPage() {
  const s = await getSettings();
  const me = await getCurrentProfile();
  return (
    <CheckoutForm
      settings={{
        pickup_enabled: s.pickup_enabled === 'true',
        delivery_enabled: s.delivery_enabled === 'true',
        fee_male: Number(s.fee_male) || 0,
        fee_hulhumale: Number(s.fee_hulhumale) || 0,
        min_order: Number(s.min_order) || 0,
        address: s.address,
        opening_hours: s.opening_hours,
      }}
      prefill={{ name: me?.profile.full_name || '', phone: me?.profile.phone || '', email: me?.user.email || '' }}
    />
  );
}
