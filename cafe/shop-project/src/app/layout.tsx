import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Fresh Bites | Order online',
  description: 'Fresh ready meals for pickup or home delivery.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
