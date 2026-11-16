'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';

export default function AuthForm({ mode, redirectTo = '/account' }: { mode: 'login' | 'register'; redirectTo?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setMsg(null);
    const f = new FormData(e.currentTarget);
    const email = String(f.get('email'));
    const password = String(f.get('password'));
    const sb = supabaseBrowser();
    if (mode === 'login') {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) setErr(error.message);
      else {
        router.push(redirectTo);
        router.refresh();
        return;
      }
    } else {
      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: { data: { full_name: String(f.get('name') || ''), phone: String(f.get('phone') || '') } },
      });
      if (error) setErr(error.message);
      else if (!data.session) setMsg('Account created. Check your email to confirm it, then sign in.');
      else {
        router.push(redirectTo);
        router.refresh();
        return;
      }
    }
    setBusy(false);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {mode === 'register' && (
        <>
          <div><label className="label">Full name</label><input name="name" required className="input" /></div>
          <div><label className="label">Phone</label><input name="phone" required className="input" inputMode="tel" /></div>
        </>
      )}
      <div><label className="label">Email</label><input name="email" type="email" required className="input" autoComplete="email" /></div>
      <div>
        <label className="label">Password</label>
        <input name="password" type="password" required minLength={6} className="input" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
      </div>
      {err && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{err}</p>}
      {msg && <p className="rounded-lg bg-primary-50 p-2 text-sm text-primary-800">{msg}</p>}
      <button disabled={busy} className="btn-primary w-full">{busy ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
    </form>
  );
}
