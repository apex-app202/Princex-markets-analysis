'use client';
export const dynamic = 'force-dynamic';


import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignup(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      const { error: profileError } = await supabase.from('users').insert({
        id: data.user.id,
        email,
        full_name: fullName,
        phone,
        role: 'user',
      });

      if (profileError) {
        setError(profileError.message);
        setLoading(false);
        return;
      }
    }

    setLoading(false);
    router.push('/pricing');
  }

  return (
    <main className="flex items-center justify-center min-h-screen px-4">
      <form
        onSubmit={handleSignup}
        className="w-full max-w-sm bg-[#111] border border-white/10 rounded-xl p-6 space-y-4"
      >
        <h1 className="text-xl font-bold">Create your account</h1>

        <input
          type="text"
          placeholder="Full Name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          className="w-full bg-black border border-white/20 rounded-lg px-3 py-2 outline-none focus:border-accent"
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full bg-black border border-white/20 rounded-lg px-3 py-2 outline-none focus:border-accent"
        />
        <input
          type="tel"
          placeholder="Phone Number (07XX / 01XX)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          className="w-full bg-black border border-white/20 rounded-lg px-3 py-2 outline-none focus:border-accent"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="w-full bg-black border border-white/20 rounded-lg px-3 py-2 outline-none focus:border-accent"
        />

        {error && <p className="text-fall text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-accent text-black font-bold py-2 rounded-lg disabled:opacity-50"
        >
          {loading ? 'Creating account...' : 'Sign Up'}
        </button>

        <p className="text-sm text-white/60 text-center">
          Already have an account?{' '}
          <a href="/login" className="text-accent">Log in</a>
        </p>
      </form>
    </main>
  );
}
