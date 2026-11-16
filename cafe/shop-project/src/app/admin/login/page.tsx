import Logo from '@/components/Logo';
import AuthForm from '@/components/AuthForm';

export default function AdminLogin({ searchParams }: { searchParams: { denied?: string } }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-primary-50 p-4">
      <div className="card w-full max-w-sm space-y-5 p-6">
        <Logo name="Admin" href="/admin" />
        <h1 className="text-xl">Staff sign in</h1>
        {searchParams.denied && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">This account does not have dashboard access.</p>}
        <AuthForm mode="login" redirectTo="/admin" />
      </div>
    </div>
  );
}
