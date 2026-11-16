export default function Flash({ error, ok }: { error?: string; ok?: string }) {
  if (!error && !ok) return null;
  return (
    <p className={`mb-4 rounded-xl p-3 text-sm ${error ? 'bg-red-50 text-red-700' : 'bg-primary-100 text-primary-900'}`}>
      {error || ok}
    </p>
  );
}
