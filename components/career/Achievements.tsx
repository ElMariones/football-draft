'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCareerStore } from '@/store/careerStore';
import {
  ACHIEVEMENTS, achName, achDesc, TIER_STYLE, type AchTier,
} from '@/lib/career/achievements';
import type { Lang } from '@/lib/career/i18n';

const TIER_LABEL: Record<AchTier, { en: string; es: string }> = {
  bronze: { en: 'Bronze', es: 'Bronce' },
  silver: { en: 'Silver', es: 'Plata' },
  gold: { en: 'Gold', es: 'Oro' },
  legend: { en: 'Legend', es: 'Leyenda' },
};

/** Toast stack — pops the moment a logro unlocks, mid-career. */
export function AchievementToasts({ lang }: { lang: Lang }) {
  const { achievementQueue, dismissAchievement } = useCareerStore();
  const es = lang === 'es';
  const shown = achievementQueue.slice(0, 3);

  // Nothing used to retire a toast except a click on it, so they stacked up for
  // a whole career and permanently covered the bottom-right — 46 clicks to clear
  // at the end of a run, and on a 375px screen four of them hid half the page.
  // Each one now retires itself; clicking still dismisses early.
  const oldest = shown[0]?.id;
  useEffect(() => {
    if (!oldest) return;
    const t = window.setTimeout(() => dismissAchievement(oldest), 4200);
    return () => window.clearTimeout(t);
  }, [oldest, dismissAchievement]);

  return (
    <div className="fixed bottom-3 right-3 left-3 sm:left-auto z-[70] flex flex-col items-end gap-2 pointer-events-none">
      <AnimatePresence>
        {shown.map(a => {
          const st = TIER_STYLE[a.tier];
          return (
            <motion.button
              key={a.id}
              initial={{ opacity: 0, x: 60, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 220, damping: 20 }}
              onClick={() => dismissAchievement(a.id)}
              className={`pointer-events-auto text-left w-full sm:w-72 rounded-2xl border-2 ${st.ring} ${st.glow} bg-[#0b0f14]/95 backdrop-blur px-4 py-2.5`}
            >
              <div className={`text-[9px] uppercase tracking-[0.3em] ${st.text}`}>
                {es ? '¡Logro desbloqueado!' : 'Achievement unlocked!'}
              </div>
              <div className="flex items-center gap-2.5 mt-1">
                <motion.span
                  animate={{ scale: [1, 1.35, 1], rotate: [0, -12, 12, 0] }}
                  transition={{ duration: 0.8 }}
                  className="text-3xl leading-none"
                >{a.emoji}</motion.span>
                <div className="min-w-0">
                  <div className="font-display text-lg leading-tight">{achName(a, lang)}</div>
                  <div className="text-[11px] text-white/55 leading-snug">{achDesc(a, lang)}</div>
                </div>
              </div>
            </motion.button>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

/** The full logros book — every achievement, locked ones greyed with their hint. */
export function AchievementsBook({ lang }: { lang: Lang }) {
  const { unlocked } = useCareerStore();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | AchTier>('all');
  const es = lang === 'es';

  const total = ACHIEVEMENTS.length;
  const got = ACHIEVEMENTS.filter(a => unlocked[a.id]).length;
  const shown = filter === 'all' ? ACHIEVEMENTS : ACHIEVEMENTS.filter(a => a.tier === filter);

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-ghost text-sm">
        🏅 {es ? 'Logros' : 'Achievements'} <span className="text-white/45">{got}/{total}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[80] bg-black/85 backdrop-blur-sm grid place-items-center p-4"
          >
            <motion.div
              initial={{ scale: 0.94, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-3xl max-h-[86vh] overflow-hidden flex flex-col rounded-3xl border border-white/15 bg-[#0b0f14]"
            >
              <div className="p-5 pb-3 border-b border-white/10">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="font-display text-3xl">
                    🏅 {es ? 'LOGROS' : 'ACHIEVEMENTS'}
                  </h2>
                  <button onClick={() => setOpen(false)} className="text-white/50 hover:text-white text-sm">
                    {es ? 'Cerrar' : 'Close'} ✕
                  </button>
                </div>
                <p className="text-xs text-white/50 mt-1">
                  {es
                    ? 'Se guardan entre partidas: prueba carreras distintas para completarlos todos.'
                    : 'Saved between runs — try different careers to collect them all.'}
                </p>
                <div className="mt-3 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-wc-dark via-wc to-gold"
                    initial={{ width: '0%' }} animate={{ width: `${(got / total) * 100}%` }}
                    transition={{ type: 'spring', stiffness: 60, damping: 18 }}
                  />
                </div>
                <div className="flex gap-1.5 mt-3 flex-wrap">
                  {(['all', 'bronze', 'silver', 'gold', 'legend'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full border transition-colors ${
                        filter === f ? 'border-wc bg-wc/15 text-wc' : 'border-white/12 text-white/50 hover:bg-white/5'
                      }`}
                    >
                      {f === 'all' ? (es ? 'Todos' : 'All') : TIER_LABEL[f][es ? 'es' : 'en']}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {shown.map(a => {
                  const has = !!unlocked[a.id];
                  const st = TIER_STYLE[a.tier];
                  return (
                    <div
                      key={a.id}
                      className={`flex gap-3 rounded-xl border p-3 transition-colors ${
                        has ? `${st.ring} bg-white/[0.06] ${st.glow}` : 'border-white/8 bg-white/[0.02]'
                      }`}
                    >
                      <span className={`text-2xl leading-none ${has ? '' : 'grayscale opacity-30'}`}>
                        {has ? a.emoji : '🔒'}
                      </span>
                      <div className="min-w-0">
                        <div className={`font-display text-base leading-tight ${has ? st.text : 'text-white/40'}`}>
                          {achName(a, lang)}
                        </div>
                        {/* the explanation always shows, so locked ones read as goals */}
                        <div className={`text-[11px] leading-snug ${has ? 'text-white/60' : 'text-white/30'}`}>
                          {achDesc(a, lang)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
