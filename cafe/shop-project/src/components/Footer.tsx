import type { Settings } from '@/lib/settings';

export default function Footer({ s }: { s: Settings }) {
  return (
    <footer className="mt-12 border-t border-line bg-primary-50">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 text-sm sm:grid-cols-3">
        <div>
          <p className="font-bold text-primary-800">{s.shop_name}</p>
          <p className="mt-1 text-sage">{s.tagline}</p>
        </div>
        <div>
          <p className="font-semibold">Pickup from the cafe</p>
          <p className="text-sage">{s.address}</p>
          <p className="text-sage">{s.opening_hours}</p>
        </div>
        <div>
          <p className="font-semibold">Contact</p>
          <p className="text-sage">{s.phone}</p>
          <p className="text-sage">{s.email}</p>
        </div>
      </div>
    </footer>
  );
}
