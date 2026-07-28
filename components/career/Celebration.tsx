'use client';

// Full-screen celebration for the honours that actually deserve one: the Ballon
// d'Or, the World Cup, the Champions League and the other continental crowns.
// Everything is CSS/motion — no canvas, no dependency.
import { useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Title } from '@/data/career/types';
import { TrophyIcon } from './TrophyArt';
import { titleLabel, type Lang } from '@/lib/career/i18n';

/** Honours big enough to stop the game for. */
export const CELEBRATED = new Set([
  'ballon-dor', 'the-best', 'world-cup', 'champions', 'libertadores',
  'club-world-cup', 'euro', 'copa-america', 'asian-cup', 'afcon', 'gold-cup', 'golden-shoe',
]);

export function pickCelebration(titles: Title[]): Title | null {
  // If several land at once, celebrate the biggest.
  const order = ['world-cup', 'ballon-dor', 'champions', 'libertadores',
    'club-world-cup', 'the-best', 'euro', 'copa-america', 'asian-cup', 'afcon', 'gold-cup', 'golden-shoe'];
  for (const key of order) {
    const t = titles.find(x => x.key === key);
    if (t) return t;
  }
  return null;
}

const COLORS = ['#FFD700', '#00DFA2', '#3DA9FC', '#FF6B6B', '#FFFFFF', '#C8A2FF'];

export default function Celebration({
  title, lang, onDone,
}: { title: Title | null; lang: Lang; onDone: () => void }) {
  // Confetti pieces are generated once per celebration so they don't re-roll
  // on every render mid-animation.
  const pieces = useMemo(
    () => Array.from({ length: 90 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 0.9,
      dur: 2.4 + Math.random() * 2.2,
      size: 6 + Math.random() * 8,
      color: COLORS[i % COLORS.length],
      rot: Math.random() * 720 - 360,
      drift: Math.random() * 24 - 12,
      round: Math.random() > 0.6,
    })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [title?.key, title?.age],
  );

  useEffect(() => {
    if (!title) return;
    const t = window.setTimeout(onDone, 4200);
    return () => window.clearTimeout(t);
  }, [title, onDone]);

  const es = lang === 'es';

  return (
    <AnimatePresence>
      {title && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onDone}
          className="fixed inset-0 z-[90] overflow-hidden bg-black/70 backdrop-blur-[2px] grid place-items-center cursor-pointer"
        >
          {/* confetti */}
          {pieces.map(p => (
            <motion.span
              key={p.id}
              initial={{ y: '-12vh', x: `${p.x}vw`, opacity: 0, rotate: 0 }}
              animate={{ y: '110vh', x: `${p.x + p.drift}vw`, opacity: [0, 1, 1, 0.9], rotate: p.rot }}
              transition={{ duration: p.dur, delay: p.delay, ease: 'easeIn' }}
              style={{
                position: 'absolute', top: 0, left: 0,
                width: p.size, height: p.size * (p.round ? 1 : 1.7),
                background: p.color,
                borderRadius: p.round ? '50%' : 2,
              }}
            />
          ))}

          {/* the trophy itself */}
          <motion.div
            initial={{ scale: 0.4, y: 40, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 160, damping: 14 }}
            className="relative text-center px-6"
          >
            <motion.div
              animate={{ rotate: [0, -6, 6, -3, 0], scale: [1, 1.06, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 0.6 }}
              className="inline-block"
            >
              <TrophyIcon title={title} size={150} />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <div className="text-[11px] tracking-[0.4em] text-gold uppercase mt-3">
                {es ? '¡Lo ganaste!' : 'You won it!'}
              </div>
              <div className="font-display text-5xl sm:text-6xl leading-none mt-1 drop-shadow-[0_4px_20px_rgba(0,0,0,0.8)]">
                {titleLabel(title.key, lang)}
              </div>
              <div className="text-white/50 text-xs mt-3">
                {es ? 'Toca para seguir' : 'Tap to continue'}
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
