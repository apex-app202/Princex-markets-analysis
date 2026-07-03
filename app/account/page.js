'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import AppHeader from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';
import LogoutButton from '@/components/LogoutButton';

export default function AccountPage() {
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/login'); return; }
      const { data: userRow } = await supabase.from('users').select('*').eq('id', data.user.id).single();
      setProfile(userRow);
    });
  }, []);

  return (
    <main className="min-h-screen px-4 py-6 pb-24 max-w-2xl mx-auto">
      <AppHeader profile={profile} />
      <h2 className="text-lg font-bold mb-3">Account</h2>

      {profile && (
        <div className="bg-[#111] border border-white/10 rounded-xl p-5 space-y-3 text-sm mb-4">
          <div className="flex justify-between"><span className="text-white/50">Name</span><span>{profile.full_name || '—'}</span></div>
          <div className="flex justify-between"><span className="text-white/50">Email</span><span>{profile.email}</span></div>
          <div className="flex justify-between"><span className="text-white/50">Phone</span><span>{profile.phone || '—'}</span></div>
          <div className="flex justify-between"><span className="text-white/50">Plan</span><span className="capitalize">{profile.subscription_plan || '—'}</span></div>
          <div className="flex justify-between">
            <span className="text-white/50">Status</span>
            <span className={profile.is_active ? 'text-rise' : 'text-fall'}>{profile.is_active ? 'Active' : 'Inactive'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/50">Expires</span>
            <span>{profile.subscription_end ? new Date(profile.subscription_end).toLocaleDateString() : '—'}</span>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <a href="/pricing" className="flex-1 bg-accent text-black font-bold py-3 rounded-lg text-center">
          Manage Plan
        </a>
        <LogoutButton className="flex-1 border border-fall text-fall font-bold py-3 rounded-lg text-center" />
      </div>

      <BottomNav active="account" />
    </main>
  );
}
