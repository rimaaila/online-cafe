import { supabaseServer } from './supabase/server';

export const SETTING_DEFAULTS = {
  shop_name: 'Fresh Bites',
  tagline: 'Fresh ready meals, made daily',
  phone: '',
  email: '',
  address: '',
  opening_hours: '',
  bank_details: '',
  pickup_enabled: 'true',
  delivery_enabled: 'true',
  fee_male: '0',
  fee_hulhumale: '0',
  min_order: '0',
  pending_expiry_hours: '24',
  low_stock_default: '5',
};
export type Settings = typeof SETTING_DEFAULTS;

export async function getSettings(client?: any): Promise<Settings> {
  const sb = client || supabaseServer();
  const { data } = await sb.from('settings').select('key,value');
  const out: any = { ...SETTING_DEFAULTS };
  (data || []).forEach((r: any) => {
    out[r.key] = r.value;
  });
  return out as Settings;
}
