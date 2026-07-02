'use client';
export const dynamic = 'force-dynamic';


import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';

const PLANS = [
  { id: 'weekly', name: 'Weekly', price: 479 },
  { id: 'monthly', name: 'Monthly', price: 1399 },
  { id: 'annual', name: 'Annual', price: 12999 },
];

export default function PricingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [userId, setUserId] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState('idle'); // idle | sending | polling | timeout | error
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push('/login');
      } else {
        setUserId(data.user.id);
      }
    });
  }, []);

  async function handlePay() {
    if (!selectedPlan || !phone) return;
    setStatus('sending');
    setErrorMsg('');

    const res = await fetch('/api/mpesa/stkpush', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, phone, plan: selectedPlan }),
    });

    const data = await res.json();

    if (!res.ok) {
      setStatus('error');
      setErrorMsg(data.error || 'Payment request failed');
      return;
    }

    setStatus('polling');
    pollForConfirmation(data.checkoutRequestId);
  }

  function pollForConfirmation(checkoutRequestId) {
    const startTime = Date.now();
    const interval = setInterval(async () => {
      if (Date.now() - startTime > 60000) {
        clearInterval(interval);
        setStatus('timeout');
        return;
      }

      const res = await fetch(
        `/api/mpesa/status?checkoutRequestId=${checkoutRequestId}`
      );
      const data = await res.json();

      if (data.status === 'confirmed') {
        clearInterval(interval);
        router.push('/dashboard');
      } else if (data.status === 'failed') {
        clearInterval(interval);
        setStatus('error');
        setErrorMsg('Payment failed. Please try again.');
      }
    }, 5000);
  }

  return (
    <main className="min-h-screen px-4 py-10">
      <h1 className="text-2xl font-bold text-center mb-2">Choose your plan</h1>
      <p className="text-white/60 text-center mb-8">
        Precision signals for Deriv Rise/Fall trading
      </p>

      <div className="grid gap-4 max-w-md mx-auto">
        {PLANS.map((plan) => (
          <button
            key={plan.id}
            onClick={() => setSelectedPlan(plan.id)}
            className={`text-left border rounded-xl p-4 transition ${
              selectedPlan === plan.id
                ? 'border-accent bg-accent/10'
                : 'border-white/10 bg-[#111]'
            }`}
          >
            <div className="flex justify-between items-center">
              <span className="font-bold">{plan.name}</span>
              <span className="text-accent font-bold">KES {plan.price.toLocaleString()}</span>
            </div>
          </button>
        ))}
      </div>

      {selectedPlan && (
        <div className="max-w-md mx-auto mt-6 space-y-3">
          <input
            type="tel"
            placeholder="M-Pesa Phone Number (07XX / 01XX)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full bg-black border border-white/20 rounded-lg px-3 py-2 outline-none focus:border-accent"
          />

          <button
            onClick={handlePay}
            disabled={status === 'sending' || status === 'polling'}
            className="w-full bg-accent text-black font-bold py-3 rounded-lg disabled:opacity-50"
          >
            {status === 'sending' && 'Sending request...'}
            {status === 'polling' && 'Waiting for confirmation...'}
            {(status === 'idle' || status === 'error' || status === 'timeout') && 'PAY NOW'}
          </button>

          {status === 'polling' && (
            <p className="text-sm text-white/60 text-center">
              Check your phone for the M-Pesa prompt
            </p>
          )}
          {status === 'timeout' && (
            <p className="text-sm text-fall text-center">
              Payment pending — check your phone and try again if needed
            </p>
          )}
          {status === 'error' && (
            <p className="text-sm text-fall text-center">{errorMsg}</p>
          )}
        </div>
      )}
    </main>
  );
}
