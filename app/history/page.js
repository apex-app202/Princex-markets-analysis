'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import AppHeader from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';

export default function HistoryPage() {
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/login'); return; }
      const { data: userRow } = await supabase.from('users').select('*').eq('id', data.user.id).single();
      setProfile(userRow);

      const { data: paymentRows } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', data.user.id)
        .order('created_at', { ascending: false });
      setPayments(paymentRows || []);
      setLoading(false);
    });
  }, []);

  return (
    <main className="min-h-screen px-4 py-6 pb-24 max-w-2xl mx-auto">
      <AppHeader profile={profile} />
      <h2 className="text-lg font-bold mb-3">Payment History</h2>

      {loading && <p className="text-white/40 text-sm">Loading...</p>}
      {!loading && payments.length === 0 && (
        <p className="text-white/40 text-sm">No payments yet.</p>
      )}

      <div className="space-y-2">
        {payments.map((p) => (
          <div key={p.id} className="bg-[#111] border border-white/10 rounded-lg p-3 flex justify-between items-center text-sm">
            <div>
              <div className="capitalize font-medium">{p.plan} plan</div>
              <div className="text-xs text-white/40">{new Date(p.created_at).toLocaleString()}</div>
            </div>
            <div className="text-right">
              <div className="font-bold">KES {p.amount}</div>
              <div className={
                p.status === 'confirmed' ? 'text-rise text-xs' :
                p.status === 'failed' ? 'text-fall text-xs' : 'text-white/40 text-xs'
              }>
                {p.status}
              </div>
            </div>
          </div>
        ))}
      </div>

      <BottomNav active="history" />
    </main>
  );
}
