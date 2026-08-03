'use client';

// Two boards live here now: the draft/XI seasons and career mode. They rank
// completely different things, so they get tabs rather than a merged table.
import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import LeaderboardClient from './LeaderboardClient';
import CareerBoard from './CareerBoard';

type Tab = 'draft' | 'career';

const TAB_LABEL: Record<Tab, { en: string; es: string }> = {
  draft: { en: 'Draft XI', es: 'Draft XI' },
  career: { en: 'Career mode', es: 'Modo carrera' },
};

export default function LeaderboardTabs({ only }: { only?: Tab }) {
  const language = useGameStore(s => s.language);
  const lang: 'en' | 'es' = language === 'en' ? 'en' : 'es';
  const [tab, setTab] = useState<Tab>(only ?? 'draft');

  // Reached from inside career mode, the draft board is noise — the player is
  // in the middle of a career and wants to see where that career would place.
  if (only) return only === 'career' ? <CareerBoard /> : <LeaderboardClient />;

  return (
    <div>
      <div className="flex gap-2 mb-5 border-b border-white/10">
        {(['draft', 'career'] as const).map(key => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`relative px-4 py-2 font-display text-sm tracking-wide transition-colors ${
              tab === key ? 'text-white' : 'text-white/40 hover:text-white/70'
            }`}
          >
            {TAB_LABEL[key][lang]}
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
