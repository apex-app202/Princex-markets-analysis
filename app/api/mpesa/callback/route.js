import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

const PLAN_DURATIONS = {
  weekly: 7,
  monthly: 30,
  annual: 365,
};

export async function POST(request) {
  try {
    const body = await request.json();
    const callback = body?.Body?.stkCallback;

    if (!callback) {
      return NextResponse.json({ error: 'Invalid callback payload' }, { status: 400 });
    }

    const checkoutRequestId = callback.CheckoutRequestID;
    const resultCode = callback.ResultCode;

    const supabase = createServiceClient();

    // Always ack Safaricom even on business logic issues below —
    // Safaricom will retry the callback if we don't return 200.
    if (resultCode !== 0) {
      await supabase
        .from('payments')
        .update({ status: 'failed' })
        .eq('mpesa_checkout_request_id', checkoutRequestId);

      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    const items = callback.CallbackMetadata?.Item || [];
    const getValue = (name) => items.find((i) => i.Name === name)?.Value;

    const mpesaReceiptNumber = getValue('MpesaReceiptNumber');

    // Look up the pending payment row to get user_id and plan
    const { data: payment, error: fetchError } = await supabase
      .from('payments')
      .select('id, user_id, plan')
      .eq('mpesa_checkout_request_id', checkoutRequestId)
      .single();

    if (fetchError || !payment) {
      console.error('Callback: payment row not found for', checkoutRequestId);
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    // Update payment record
    const { error: updatePaymentError } = await supabase
      .from('payments')
      .update({
        status: 'confirmed',
        mpesa_receipt_number: mpesaReceiptNumber,
      })
      .eq('id', payment.id);

    if (updatePaymentError) {
      console.error('Callback: failed to update payment', updatePaymentError);
    }

    // Activate subscription
    const days = PLAN_DURATIONS[payment.plan] || 0;
    const now = new Date();
    const subscriptionEnd = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const { error: updateUserError } = await supabase
      .from('users')
      .update({
        is_active: true,
        subscription_plan: payment.plan,
        subscription_start: now.toISOString(),
        subscription_end: subscriptionEnd.toISOString(),
      })
      .eq('id', payment.user_id);

    if (updateUserError) {
      console.error('Callback: failed to activate user', updateUserError);
    }

    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (err) {
    console.error('Callback error:', err);
    // Still return 200 to prevent Safaricom retry storms on our own bugs;
    // the payment stays 'pending' and can be reconciled manually via admin panel.
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  }
}
