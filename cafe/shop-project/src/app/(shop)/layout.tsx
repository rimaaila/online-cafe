import { CartProvider } from '@/components/CartProvider';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getSettings } from '@/lib/settings';

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  return (
    <CartProvider>
      <Header shopName={s.shop_name} />
      <main className="mx-auto min-h-[70vh] max-w-6xl px-4 py-8">{children}</main>
      <Footer s={s} />
    </CartProvider>
  );
}
