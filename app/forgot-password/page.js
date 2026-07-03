'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-client';

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleReset(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setSent(true);
  }

  return (
    <main className="flex items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-sm bg-[#111] border border-white/10 rounded-xl p-6 space-y-4">
        <h1 className="text-xl font-bold">Reset your password</h1>

        {sent ? (
          <p className="text-rise text-sm">
            Check your email for a password reset link.
          </p>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <input
              type="email" placeholder="Email" value={email}
              onChange={(e) => setEmail(e.target.value)} required
              className="w-full bg-black border border-white/20 rounded-lg px-3 py-2 outline-none focus:border-accent"
            />
            {error && <p className="text-fall text-sm">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full bg-accent text-black font-bold py-2 rounded-lg disabled:opacity-50">
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        )}

        <p className="text-sm text-white/60 text-center">
          <a href="/login" className="text-accent">Back to login</a>
        </p>
      </div>
    </main>
  );
}
