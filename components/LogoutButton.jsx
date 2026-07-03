'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';

export default function LogoutButton({ className }) {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <button
      onClick={handleLogout}
      className={className || 'text-xs border border-fall text-fall rounded-full px-3 py-1'}
    >
      Log out
    </button>
  );
}
