'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type CartItem = {
  key: string;
  product_id: string;
  variant_id: string | null;
  name: string;
  variant_name: string | null;
  price: number;
  quantity: number;
  slug: string;
  image_id: string | null;
  max: number | null;
};

type CartCtx = {
  items: CartItem[];
  count: number;
  subtotal: number;
  add: (item: Omit<CartItem, 'quantity'>, qty?: number) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
};

const Ctx = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('cart');
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem('cart', JSON.stringify(items));
    } catch {}
  }, [items, ready]);

  const add = useCallback((item: Omit<CartItem, 'quantity'>, qty = 1) => {
    setItems((cur) => {
      const found = cur.find((i) => i.key === item.key);
      const cap = (n: number) => (item.max != null ? Math.min(n, item.max) : n);
      if (found) return cur.map((i) => (i.key === item.key ? { ...i, quantity: cap(i.quantity + qty) } : i));
      return [...cur, { ...item, quantity: cap(qty) }];
    });
  }, []);
  const setQty = useCallback(
    (key: string, qty: number) =>
      setItems((cur) =>
        cur
          .map((i) => (i.key === key ? { ...i, quantity: i.max != null ? Math.min(qty, i.max) : qty } : i))
          .filter((i) => i.quantity > 0)
      ),
    []
  );
  const remove = useCallback((key: string) => setItems((cur) => cur.filter((i) => i.key !== key)), []);
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(
    () => ({
      items,
      count: items.reduce((n, i) => n + i.quantity, 0),
      subtotal: items.reduce((n, i) => n + i.price * i.quantity, 0),
      add,
      setQty,
      remove,
      clear,
    }),
    [items, add, setQty, remove, clear]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useCart must be used inside CartProvider');
  return c;
}
