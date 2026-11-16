'use client';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';

export default function SignOutButton({ to = '/', className = 'btn-outline btn-sm' }: { to?: string; className?: string }) {
  const router = useRouter();
  return (
    <button
      className={className}
      onClick={async () => {
        await supabaseBrowser().auth.signOut();
        router.push(to);
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}
