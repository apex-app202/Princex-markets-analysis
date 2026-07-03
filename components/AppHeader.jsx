'use client';

import ThemeToggle from './ThemeToggle';
import LogoutButton from './LogoutButton';

export default function AppHeader({ profile }) {
  return (
    <div className="flex justify-between items-center mb-6">
      <h1 className="text-xl font-bold">Princex Markets</h1>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        {profile && (
          <div className="text-right text-xs text-white/60 mr-1">
            {profile.role === 'admin' ? (
              <span className="text-accent">Admin</span>
            ) : (
              <span className="capitalize">{profile.subscription_plan || 'No plan'}</span>
            )}
          </div>
        )}
        <LogoutButton />
      </div>
    </div>
  );
}
