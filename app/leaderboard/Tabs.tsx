'use client';

// Two boards live here now: the draft/XI seasons and career mode. They rank
// completely different things, so they get tabs rather than a merged table.
import { useState } from 'react';
import LeaderboardClient from './LeaderboardClient';
import CareerBoard from './CareerBoard';

type Tab = 'draft' | 'career';

export default function LeaderboardTabs() {
  const [tab, setTab] = useState<Tab>('draft');

  return (
    <div>
      <div className="flex gap-2 mb-5 border-b border-white/10">
        {([
          ['draft', 'Draft XI'],
          ['career', 'Career mode'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`relative px-4 py-2 font-display text-sm tracking-wide transition-colors ${
              tab === key ? 'text-white' : 'text-white/40 hover:text-white/70'
            }`}
          >
            {label}
            {tab === key && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 bg-wc rounded-full" />
            )}
          </button>
        ))}
      </div>

      {tab === 'draft' ? <LeaderboardClient /> : <CareerBoard />}
    </div>
  );
}
