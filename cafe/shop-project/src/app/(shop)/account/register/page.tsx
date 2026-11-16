import Link from 'next/link';
import AuthForm from '@/components/AuthForm';

export default function RegisterPage() {
  return (
    <div className="card mx-auto max-w-md space-y-4 p-6">
      <h1 className="text-2xl">Create an account</h1>
      <AuthForm mode="register" />
      <p className="text-sm text-sage">Already have an account? <Link href="/account/login" className="font-semibold text-primary-700">Sign in</Link></p>
    </div>
  );
}
