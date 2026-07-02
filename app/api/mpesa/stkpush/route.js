import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

const PLAN_PRICES = {
  weekly: 479,
  monthly: 1399,
  annual: 12999,
};

function normalizePhone(raw) {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('254') && digits.length === 12) return digits;
  if (digits.startsWith('0') && digits.length === 10) return '254' + digits.slice(1);
  if (digits.startsWith('7') && digits.length === 9) return '254' + digits;
  if (digits.startsWith('1') && digits.length === 9) return '254' + digits;
  return null;
}

async function getAccessToken() {
  const key = process.env.MPESA_CONSUMER_KEY;
  const secret = process.env.MPESA_CONSUMER_SECRET;
  const auth = Buffer.from(`${key}:${secret}`).toString('base64');

  const res = await fetch(
    'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
    { headers: { Authorization: `Basic ${auth}` } }
  );

  if (!res.ok) throw new Error('Failed to get M-Pesa access token');
  const data = await res.json();
  return data.access_token;
}

function generateTimestamp() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return (
    now.getFullYear().toString() +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds())
  );
}

export async function POST(request) {
  try {
    const { userId, phone, plan } = await request.json();

    if (!userId || !phone || !plan) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const amount = PLAN_PRICES[plan];
    if (!amount) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      return NextResponse.json({ error: 'Invalid phone number format' }, { status: 400 });
    }

    const shortCode = process.env.MPESA_SHORTCODE;
    const passkey = process.env.MPESA_PASSKEY;
    const timestamp = generateTimestamp();
    const password = Buffer.from(`${shortCode}${passkey}${timestamp}`).toString('base64');

    const accessToken = await getAccessToken();

    const stkRes = await fetch(
      'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          BusinessShortCode: shortCode,
          Password: password,
          Timestamp: timestamp,
          TransactionType: 'CustomerPayBillOnline',
          Amount: amount,
          PartyA: normalizedPhone,
          PartyB: shortCode,
          PhoneNumber: normalizedPhone,
          CallBackURL: process.env.MPESA_CALLBACK_URL,
          AccountReference: 'PrincexMarkets',
          TransactionDesc: `${plan} Subscription`,
        }),
      }
    );

    const stkData = await stkRes.json();

    if (!stkRes.ok || stkData.ResponseCode !== '0') {
      return NextResponse.json(
        { error: stkData.errorMessage || 'STK push failed' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    const { error: insertError } = await supabase.from('payments').insert({
      user_id: userId,
      phone: normalizedPhone,
      amount,
      plan,
      mpesa_checkout_request_id: stkData.CheckoutRequestID,
      status: 'pending',
    });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      checkoutRequestId: stkData.CheckoutRequestID,
    });
  } catch (err) {
    console.error('STK push error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
