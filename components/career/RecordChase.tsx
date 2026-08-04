'use client';

import { motion } from 'framer-motion';
import { useCareerStore } from '@/store/careerStore';
import { activeChases, chaseLine, type Chase } from '@/lib/career/recordbook';
import { getClub } from '@/data/career/clubs';
import { getNation } from '@/data/career/nations';
import { Crest } from './bits';
import type { Lang } from '@/lib/career/i18n';

function Row({ c, lang, i }: { c: Chase; lang: Lang; i: number }) {
  const es = lang === 'es';
  const club = c.entry.clubId ? getClub(c.entry.clubId) : null;
  const nation = c.entry.nationCode ? getNation(c.entry.nationCode) : null;
  const pct = Math.round(c.progress * 100);

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
      transition={{ delay: i * 0.06 }}
      className={`rounded-xl border px-2.5 py-2 ${
        c.held ? 'border-gold/40 bg-gold/[0.08]' : 'border-white/10 bg-white/[0.03]'
      }`}
    >
      <div className="flex items-center gap-2 mb-1.5">
        {club ? <Crest clubId={club.id} size={16} /> : <span className="text-sm leading-none">{nation?.flag}</span>}
        <span className="text-[10px] uppercase tracking-wider text-white/45">
          {c.entry.kind === 'club-goals' || c.entry.kind === 'nation-goals'
            ? (es ? 'Goles' : 'Goals')
            : (es ? 'Partidos' : 'Appearances')}
        </span>
        <span className={`ml-auto font-display text-sm ${c.held ? 'text-gold' : 'text-white/80'}`}>
          {c.entry.current}
          <span className="text-white/30"> / {c.entry.target + 1}</span>
        </span>
      </div>

      <div className="h-1 rounded-full bg-white/10 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${c.held ? 'bg-gold' : 'bg-wc'}`}
          initial={{ width: 0 }} animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 90, damping: 20, delay: 0.1 + i * 0.06 }}
        />
      </div>

      <p className={`mt-1.5 text-[10px] leading-snug ${c.held ? 'text-gold/90' : 'text-white/45'}`}>
        {c.held && '🏅 '}{chaseLine(c, lang)}
      </p>
    </motion.div>
  );
}

/**
 * What is still in reach.
 *
 * Only records you can still add to — the current club and the current country.
 * A record at a club you left four years ago is history, not a target, and
 * listing every one of them would bury the two you can do something about.
 */
export default function RecordChase({ lang }: { lang: Lang }) {
  const { player, stages } = useCareerStore();
  if (!player) return null;
  const es = lang === 'es';

  const chases = activeChases(player, stages)
    // A record 300 goals away is noise in your first season. Show it once it is
    // genuinely a target, and always show anything already broken.
    .filter(c => c.held || c.progress >= 0.18)
    .slice(0, 3);

  if (!chases.length) return null;

  return (
    <div className="card p-4 sm:p-5">
      <div className="text-[10px] tracking-[0.3em] text-white/40 uppercase mb-3">
        {es ? 'Libro de récords' : 'Record book'}
      </div>
      <div className="space-y-2">
        {chases.map((c, i) => (
          <Row key={`${c.entry.kind}-${c.entry.clubId ?? c.entry.nationCode}`} c={c} lang={lang} i={i} />
        ))}
      </div>
    </div>
  );
}
