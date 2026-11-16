import Link from 'next/link';
import AuthForm from '@/components/AuthForm';

export default function LoginPage() {
  return (
    <div className="card mx-auto max-w-md space-y-4 p-6">
      <h1 className="text-2xl">Sign in</h1>
      <AuthForm mode="login" />
      <p className="text-sm text-sage">New here? <Link href="/account/register" className="font-semibold text-primary-700">Create an account</Link>. You can also order as a guest.</p>
    </div>
  );
}
