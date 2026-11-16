'use client';
import Link from 'next/link';
import { Suspense } from 'react';
import { ShoppingBag, User } from 'lucide-react';
import Logo from './Logo';
import SearchInput from './SearchInput';
import { useCart } from './CartProvider';

export default function Header({ shopName }: { shopName: string }) {
  const { count } = useCart();
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-cream/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Logo name={shopName} />
        <nav className="ml-4 hidden items-center gap-5 text-sm font-medium md:flex">
          <Link href="/menu" className="hover:text-primary-700">Menu</Link>
          <Link href="/track" className="hover:text-primary-700">Track order</Link>
        </nav>
        <Suspense fallback={null}>
          <SearchInput className="ml-auto hidden max-w-xs flex-1 sm:block" />
        </Suspense>
        <div className="ml-auto flex items-center gap-2 sm:ml-0">
          <Link href="/account" className="btn-outline btn-sm" aria-label="Account">
            <User size={16} /> <span className="hidden sm:inline">Account</span>
          </Link>
          <Link href="/cart" className="btn-primary btn-sm relative" aria-label="Cart">
            <ShoppingBag size={16} /> <span className="hidden sm:inline">Cart</span>
            {count > 0 && (
              <span className="ml-1 rounded-full bg-ink px-1.5 text-[11px] text-white">{count}</span>
            )}
          </Link>
        </div>
      </div>
      <div className="px-4 pb-3 sm:hidden">
        <Suspense fallback={null}>
          <SearchInput />
        </Suspense>
      </div>
    </header>
  );
}
