import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServiceClient } from '@/lib/supabase-server';

export async function POST(request) {
  try {
    const { requesterId, targetUserId, isActive } = await request.json();

    if (!requesterId || !targetUserId || typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Verify the requester is actually an admin before doing anything
    const { data: requester, error: requesterError } = await supabase
      .from('users')
      .select('role')
      .eq('id', requesterId)
      .single();

    if (requesterError || requester?.role !== 'admin') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({ is_active: isActive })
      .eq('id', targetUserId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Admin toggle error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
