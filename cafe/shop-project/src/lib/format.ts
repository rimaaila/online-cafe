import { CURRENCY } from './constants';

export const money = (n: number | string | null | undefined) =>
  `${CURRENCY} ${Number(n || 0).toFixed(2)}`;

export const dateTime = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: process.env.SHOP_TIMEZONE || 'Indian/Maldives' }) : '';

export const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
