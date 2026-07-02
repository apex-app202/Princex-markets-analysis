'use client';
export const dynamic = 'force-dynamic';


import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';

export default function AdminPage() {
  const router = useRouter();
  const supabase = createClient();

  const [me, setMe] = useState(null);
  const [users, setUsers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [signals, setSignals] = useState([]);
  const [tab, setTab] = useState('users');
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    checkAdminAndLoad();
  }, []);

  async function checkAdminAndLoad() {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      router.push('/login');
      return;
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', authData.user.id)
      .single();

    if (profile?.role !== 'admin') {
      router.push('/dashboard');
      return;
    }

    setMe(authData.user);
    await loadData();
    setLoading(false);
  }

  async function loadData() {
    const [{ data: usersData }, { data: paymentsData }, { data: signalsData }] =
      await Promise.all([
        supabase.from('users').select('*').order('created_at', { ascending: false }),
        supabase.from('payments').select('*').order('created_at', { ascending: false }),
        supabase.from('signals').select('*').order('created_at', { ascending: false }).limit(100),
      ]);

    setUsers(usersData || []);
    setPayments(paymentsData || []);
    setSignals(signalsData || []);
  }

  async function toggleSubscription(targetUserId, currentStatus) {
    setActionError('');
    const res = await fetch('/api/admin/toggle-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requesterId: me.id,
        targetUserId,
        isActive: !currentStatus,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setActionError(data.error || 'Action failed');
      return;
    }
    await loadData();
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white/50">
        Loading admin dashboard...
      </div>
    );
  }

  const activeCount = users.filter((u) => u.is_active).length;

  return (
    <main className="min-h-screen px-4 py-6 max-w-4xl mx-auto">
      <h1 className="text-xl font-bold mb-1">Admin Dashboard</h1>
      <p className="text-white/50 text-sm mb-6">
        {users.length} users · {activeCount} active subscriptions · {payments.length} payments
      </p>

      <div className="flex gap-2 mb-4 border-b border-white/10">
        {['users', 'payments', 'signals'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm capitalize ${
              tab === t ? 'border-b-2 border-accent text-accent' : 'text-white/50'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {actionError && <p className="text-fall text-sm mb-4">{actionError}</p>}

      {tab === 'users' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-white/50 border-b border-white/10">
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3">Email</th>
                <th className="py-2 pr-3">Phone</th>
                <th className="py-2 pr-3">Plan</th>
                <th className="py-2 pr-3">Expires</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-white/5">
                  <td className="py-2 pr-3">{u.full_name || '—'}</td>
                  <td className="py-2 pr-3">{u.email}</td>
                  <td className="py-2 pr-3">{u.phone || '—'}</td>
                  <td className="py-2 pr-3 capitalize">{u.subscription_plan || '—'}</td>
                  <td className="py-2 pr-3">
                    {u.subscription_end
                      ? new Date(u.subscription_end).toLocaleDateString()
                      : '—'}
                  </td>
                  <td className="py-2 pr-3">
                    <span className={u.is_active ? 'text-rise' : 'text-fall'}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-2 pr-3">
                    {u.role !== 'admin' && (
                      <button
                        onClick={() => toggleSubscription(u.id, u.is_active)}
                        className="text-xs border border-white/20 rounded px-2 py-1 hover:border-accent"
                      >
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'payments' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-white/50 border-b border-white/10">
                <th className="py-2 pr-3">Phone</th>
                <th className="py-2 pr-3">Plan</th>
                <th className="py-2 pr-3">Amount</th>
                <th className="py-2 pr-3">Receipt</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-white/5">
                  <td className="py-2 pr-3">{p.phone}</td>
                  <td className="py-2 pr-3 capitalize">{p.plan}</td>
                  <td className="py-2 pr-3">KES {p.amount}</td>
                  <td className="py-2 pr-3">{p.mpesa_receipt_number || '—'}</td>
                  <td className="py-2 pr-3">
                    <span
                      className={
                        p.status === 'confirmed'
                          ? 'text-rise'
                          : p.status === 'failed'
                          ? 'text-fall'
                          : 'text-white/50'
                      }
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="py-2 pr-3">
                    {new Date(p.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'signals' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-white/50 border-b border-white/10">
                <th className="py-2 pr-3">Pair</th>
                <th className="py-2 pr-3">Direction</th>
                <th className="py-2 pr-3">Score</th>
                <th className="py-2 pr-3">Tier</th>
                <th className="py-2 pr-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {signals.map((s) => (
                <tr key={s.id} className="border-b border-white/5">
                  <td className="py-2 pr-3">{s.pair}</td>
                  <td className={`py-2 pr-3 ${s.direction === 'RISE' ? 'text-rise' : 'text-fall'}`}>
                    {s.direction}
                  </td>
                  <td className="py-2 pr-3">{s.score}/14</td>
                  <td className="py-2 pr-3">{s.tier}</td>
                  <td className="py-2 pr-3">
                    {new Date(s.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {signals.length === 0 && (
            <p className="text-white/30 text-sm py-4">
              No signals logged yet — signals are only recorded server-side once wired up.
            </p>
          )}
        </div>
      )}
    </main>
  );
}
