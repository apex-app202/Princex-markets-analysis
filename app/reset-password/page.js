'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleUpdate(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({ password });

    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setSuccess(true);
    setTimeout(() => router.push('/login'), 2000);
  }

  return (
    <main className="flex items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-sm bg-[#111] border border-white/10 rounded-xl p-6 space-y-4">
        <h1 className="text-xl font-bold">Set a new password</h1>

        {success ? (
          <p className="text-rise text-sm">Password updated. Redirecting to login...</p>
        ) : (
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="New password" value={password}
                onChange={(e) => setPassword(e.target.value)} required minLength={6}
                className="w-full bg-black border border-white/20 rounded-lg px-3 py-2 pr-16 outline-none focus:border-accent"
              />
              <button
                type="button" onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-accent"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {error && <p className="text-fall text-sm">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full bg-accent text-black font-bold py-2 rounded-lg disabled:opacity-50">
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
