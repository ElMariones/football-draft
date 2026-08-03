'use client';

// The front door of career mode.
//
// It used to be a trophy, two lines and a button, which told a new player
// nothing about what they were about to do and a returning one nothing about
// how they were doing. This gives it the three things a landing screen owes
// you: what the mode is, what you have already done in it, and what everyone
// else has managed.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { careerT, type Lang } from '@/lib/career/i18n';
import { loadRecords, type Records } from '@/lib/career/records';
import { loadUnlocked } from '@/lib/career/achievements';
import { ACHIEVEMENTS } from '@/lib/career/achievements';
import { nationFlag } from '@/data/career/nations';

interface BoardEntry {
  id: string; surname: string; nationCode: string; score: number;
  peakOverall: number; seasonsPlayed: number;
}

const FEATURES: { emoji: string; en: [string, string]; es: [string, string] }[] = [
  {
    emoji: '🎲',
    en: ['Every career is a world', 'A seed decides your talent, your suitors and every event. Blank rolls one.'],
    es: ['Cada carrera es un mundo', 'Una semilla decide tu talento, tus pretendientes y cada evento. En blanco se sortea.'],
  },
  {
    emoji: '⚡',
    en: ['You play the big moments', 'Penalties, derbies and knockout ties are yours to win, not the dice’s.'],
    es: ['Juegas los momentos grandes', 'Penales, clásicos y eliminatorias los ganas tú, no el dado.'],
  },
  {
    emoji: '🌍',
    en: ['Your country matters', 'Carrying a small nation to a quarter-final is worth more than cruising with a giant.'],
    es: ['Tu selección importa', 'Llevar a una selección chica a cuartos vale más que pasear con una grande.'],
  },
  {
    emoji: '❤️',
    en: ['The terraces remember', 'Stay and become an idol, or leave for a rival and never be forgiven.'],
    es: ['La tribuna se acuerda', 'Quédate y sé ídolo, o vete a un rival y no te lo perdonan nunca.'],
  },
];

export default function CareerLanding({
  lang, onStart,
}: { lang: Lang; onStart: () => void }) {
  const t = careerT(lang);
  const es = lang === 'es';
  const [records, setRecords] = useState<Records | null>(null);
  const [unlocked, setUnlocked] = useState(0);
  const [board, setBoard] = useState<BoardEntry[] | null>(null);

  useEffect(() => {
    setRecords(loadRecords());
    setUnlocked(Object.keys(loadUnlocked()).length);
    let live = true;
    fetch('/api/career-leaderboard?sort=score', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => { if (live) setBoard((d.entries ?? []).slice(0, 5)); })
      .catch(() => { if (live) setBoard([]); });
    return () => { live = false; };
  }, []);

  const best = records?.random?.[0] ?? null;
  const played = (records?.random?.length ?? 0) + (records?.custom?.length ?? 0);

  return (
    <div className="max-w-5xl mx-auto pb-10">
      {/* ---- hero ---- */}
      <motion.div
        initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-white/12 bg-gradient-to-br from-white/[0.08] to-transparent px-5 sm:px-8 py-8 sm:py-10 text-center"
      >
        {/* a slow drifting glow so the screen is not static while you read it */}
        <motion.div
          animate={{ opacity: [0.18, 0.4, 0.18], scale: [1, 1.15, 1] }}
          transition={{ duration: 7, repeat: Infinity }}
          className="absolute -top-28 left-1/2 -translate-x-1/2 h-72 w-72 rounded-full bg-wc/25 blur-3xl pointer-events-none"
        />
        <motion.div
          animate={{ y: [0, -10, 0], rotate: [0, -4, 4, 0] }}
          transition={{ duration: 4.5, repeat: Infinity }}
          className="relative text-6xl sm:text-7xl mb-3"
        >
          🏆
        </motion.div>
        <h1 className="relative font-display text-4xl sm:text-6xl leading-none">
          {t.heroTitle}
        </h1>
        <p className="relative text-white/60 max-w-lg mx-auto mt-3 text-sm sm:text-base">
          {t.heroDesc}
        </p>

        <motion.button
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
          onClick={onStart}
          className="relative btn-primary text-xl px-10 mt-6"
        >
          {t.start}
        </motion.button>

        {/* your own history with the mode, once you have any */}
        {played > 0 && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="relative flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-6 pt-5 border-t border-white/10"
          >
            {([
              [es ? 'Carreras' : 'Careers', String(played)],
              [es ? 'Tu mejor puntaje' : 'Your best score', best ? String(best.score) : '—'],
              [es ? 'Mejor pico' : 'Best peak', best ? String(best.peakOverall) : '—'],
              [es ? 'Logros' : 'Achievements', `${unlocked}/${ACHIEVEMENTS.length}`],
            ] as const).map(([label, value]) => (
              <div key={label} className="text-center">
                <div className="font-display text-2xl leading-none text-wc">{value}</div>
                <div className="text-[9px] uppercase tracking-widest text-white/40 mt-1">{label}</div>
              </div>
            ))}
          </motion.div>
        )}
      </motion.div>

      {/* ---- what the mode is ---- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
        {FEATURES.map((f, i) => {
          const [title, body] = es ? f.es : f.en;
          return (
            <motion.div
              key={f.emoji}
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 * i, type: 'spring', stiffness: 110, damping: 18 }}
              whileHover={{ y: -3 }}
              className="card p-4 flex gap-3"
            >
              <span className="text-2xl leading-none shrink-0">{f.emoji}</span>
              <div className="min-w-0">
                <div className="font-display text-lg leading-tight">{title}</div>
                <p className="text-[12px] text-white/50 leading-snug mt-1">{body}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ---- the global board, top five ---- */}
      <motion.div
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="card p-4 sm:p-5 mt-4"
      >
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <h3 className="text-[10px] tracking-[0.3em] text-white/40 uppercase">
            {es ? 'Mejores carreras' : 'Best careers'}
          </h3>
          <Link href="/leaderboard?tab=career" className="text-[11px] text-wc hover:underline">
            {es ? 'Ver tabla completa →' : 'Full leaderboard →'}
          </Link>
        </div>

        {board === null ? (
          <div className="space-y-1.5">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-9 rounded-lg bg-white/[0.03] animate-pulse" />
            ))}
          </div>
        ) : board.length === 0 ? (
          <div className="text-white/35 text-xs py-6 text-center">
            {es ? 'Todavía no hay carreras. Sé el primero.' : 'No careers yet. Be the first.'}
          </div>
        ) : (
          <div className="space-y-1">
            {board.map((e, i) => (
              <motion.div
                key={e.id}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.05 }}
                className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 bg-white/[0.03]"
              >
                <span className="w-5 text-center text-sm shrink-0">
                  {['🥇', '🥈', '🥉'][i] ?? <span className="text-white/35 text-xs">{i + 1}</span>}
                </span>
                <span className="shrink-0">{nationFlag(e.nationCode)}</span>
                <span className="font-display truncate">{e.surname}</span>
                <span className="text-[11px] text-white/35 shrink-0 hidden sm:inline">
                  {e.seasonsPlayed} {es ? 'temp.' : 'seasons'} · {es ? 'pico' : 'peak'} {e.peakOverall}
                </span>
                <span className="ml-auto font-display text-wc shrink-0">{e.score}</span>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
