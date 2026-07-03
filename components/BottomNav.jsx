'use client';

import Link from 'next/link';

export default function BottomNav({ active }) {
  const tabs = [
    { key: 'analysis', label: 'Analysis', href: '/dashboard' },
    { key: 'home', label: 'Home', href: '/home' },
    { key: 'account', label: 'Account', href: '/account' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#111] border-t border-white/10 flex justify-around py-3">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={active === tab.key ? 'text-accent text-xs' : 'text-white/50 text-xs'}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
