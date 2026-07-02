import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

export async function POST(request) {
  try {
    const { pair, direction, score, tier, fires } = await request.json();

    if (!pair || !direction || typeof score !== 'number') {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Only log signals that actually fired (score 8+), per spec —
    // no point cluttering the admin log with WAIT/no-signal scans.
    if (!fires) {
      return NextResponse.json({ skipped: true });
    }

    const supabase = createServiceClient();
    const { error } = await supabase.from('signals').insert({
      pair,
      direction,
      score,
      tier,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Signal log error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
