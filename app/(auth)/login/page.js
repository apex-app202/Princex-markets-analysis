'use client';
export const dynamic = 'force-dynamic';


import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      setError(loginError.message);
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role, is_active')
      .eq('id', data.user.id)
      .single();

    setLoading(false);

    if (profile?.role === 'admin') {
      router.push('/admin');
    } else if (profile?.is_active) {
      router.push('/dashboard');
    } else {
      router.push('/pricing');
    }
  }

  return (
    <main className="flex items-center justify-center min-h-screen px-4">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-sm bg-[#111] border border-white/10 rounded-xl p-6 space-y-4"
      >
        <h1 className="text-xl font-bold">Log in</h1>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full bg-black border border-white/20 rounded-lg px-3 py-2 outline-none focus:border-accent"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full bg-black border border-white/20 rounded-lg px-3 py-2 outline-none focus:border-accent"
        />

        {error && <p className="text-fall text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-accent text-black font-bold py-2 rounded-lg disabled:opacity-50"
        >
          {loading ? 'Logging in...' : 'Log In'}
        </button>

        <p className="text-sm text-white/60 text-center">
          No account?{' '}
          <a href="/signup" className="text-accent">Sign up</a>
        </p>
      </form>
    </main>
  );
}
