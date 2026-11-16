export function activeVariants(p: any): any[] {
  return (p.variants || [])
    .filter((v: any) => v.is_active)
    .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
}

export function priceInfo(p: any) {
  const vs = activeVariants(p);
  if (!vs.length) return { min: Number(p.base_price), max: Number(p.base_price) };
  const prices = vs.map((v: any) => Number(v.price ?? p.base_price));
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

export function inStock(p: any) {
  if (!p.track_stock) return true;
  const vs = activeVariants(p);
  return vs.length ? vs.some((v: any) => v.stock > 0) : p.stock > 0;
}

export function primaryImage(p: any): string | null {
  const imgs = [...(p.images || [])].sort(
    (a: any, b: any) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0) || (a.sort_order ?? 0) - (b.sort_order ?? 0)
  );
  return imgs[0]?.id ?? null;
}

export const imgUrl = (id: string | null | undefined, size: 'thumb' | 'full' = 'thumb') =>
  id ? `/api/images/${id}?size=${size}` : null;
