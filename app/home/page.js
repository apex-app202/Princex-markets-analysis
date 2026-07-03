'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import AppHeader from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';

export default function HomePage() {
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/login'); return; }
      const { data: userRow } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();
      setProfile(userRow);
    });
  }, []);

  return (
    <main className="min-h-screen px-4 py-6 pb-24 max-w-2xl mx-auto">
      <AppHeader profile={profile} />

      <div className="bg-[#111] border border-white/10 rounded-xl p-5 mb-4">
        <p className="text-white/60 text-sm mb-1">Welcome back{profile?.full_name ? `, ${profile.full_name}` : ''}</p>
        <p className="text-2xl font-bold">
          {profile?.role === 'admin' ? 'Admin Access' : profile?.is_active ? 'Subscription Active' : 'No Active Plan'}
        </p>
        {profile?.subscription_end && (
          <p className="text-xs text-white/50 mt-1">
            Expires {new Date(profile.subscription_end).toLocaleDateString()}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <a href="/dashboard" className="bg-accent text-black font-bold py-4 rounded-lg text-center">
          Get Signals
        </a>
        <a href="/pricing" className="border border-accent text-accent font-bold py-4 rounded-lg text-center">
          Manage Plan
        </a>
      </div>

      <BottomNav active="home" />
    </main>
  );
}
