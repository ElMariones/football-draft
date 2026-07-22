'use client';

import { motion } from 'framer-motion';
import type { CareerPlayer, SeasonRecord } from '@/data/career/types';
import { getClub } from '@/data/career/clubs';
import { careerT, titleLabel, Lang } from '@/lib/career/i18n';
import { ovrTier } from '@/lib/career/format';
import { Crest } from './bits';

const PILL: Record<string, string> = {
  low: 'bg-amber-500/90 text-black', mid: 'bg-cl/90 text-black',
  high: 'bg-gold/90 text-black', elite: 'bg-wc/90 text-black',
};

function Row({ s, lang, t, isLatest }: { s: SeasonRecord; lang: Lang; t: ReturnType<typeof careerT>; isLatest: boolean }) {
  const club = getClub(s.clubId);
  const titleIcons = s.titles.map(tt => (tt.kind === 'individual' ? '🥇' : tt.kind === 'national' ? '🌍' : '🏆'));
  return (
    <motion.tr
      initial={isLatest ? { opacity: 0, x: 20, backgroundColor: 'rgba(0,223,162,0.18)' } : false}
      animate={{ opacity: 1, x: 0, backgroundColor: 'rgba(0,0,0,0)' }}
      transition={{ duration: 0.6 }}
      className="border-b border-white/5">
      <td className="py-2 pl-2 text-white/50 text-xs">{s.age}</td>
      <td className="py-2">
        <div className="flex items-center gap-2 min-w-0">
          {club && <Crest clubId={club.id} size={22} />}
          <span className="truncate text-sm">{club?.name}</span>
          {s.onLoan && <span className="text-[9px] px-1 rounded bg-white/10 text-white/50">{lang === 'es' ? 'PRÉST' : 'LOAN'}</span>}
          {titleIcons.slice(0, 4).map((ic, i) => <span key={i} title={s.titles[i] && titleLabel(s.titles[i].key, lang)}>{ic}</span>)}
        </div>
      </td>
      <td className="py-2 text-center"><span className={`inline-grid place-items-center w-7 h-7 rounded-md text-xs font-display ${PILL[ovrTier(s.overallAtSeason)]}`}>{s.overallAtSeason}</span></td>
      <td className="py-2 text-center text-sm text-white/70">{s.apps}</td>
      <td className="py-2 text-center text-sm text-white/70">{s.goals}</td>
      <td className="py-2 pr-2 text-center text-sm text-white/70">{s.assists}</td>
    </motion.tr>
  );
}

export default function CareerTimeline({
  player, stages, lang, choosing,
}: { player: CareerPlayer; stages: SeasonRecord[]; lang: Lang; choosing: boolean }) {
  const t = careerT(lang);
  return (
    <div className="card p-3 sm:p-4">
      <div className="text-[10px] tracking-[0.3em] text-white/40 uppercase mb-2 pl-1">{t.timeline}</div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-[10px] uppercase tracking-widest text-white/35">
              <th className="pl-2 text-left font-normal py-1">{t.age}</th>
              <th className="text-left font-normal py-1">Club</th>
              <th className="text-center font-normal py-1">OVR</th>
              <th className="text-center font-normal py-1">{t.apps}</th>
              <th className="text-center font-normal py-1">{t.goals}</th>
              <th className="text-center font-normal py-1 pr-2">{t.assists}</th>
            </tr>
          </thead>
          <tbody>
            {stages.map((s, i) => <Row key={i} s={s} lang={lang} t={t} isLatest={i === stages.length - 1} />)}
            {choosing && (
              <tr className="bg-white/5">
                <td className="py-2 pl-2 text-white/60 text-xs">{player.age}</td>
                <td className="py-2 text-sm text-white/40" colSpan={5}>❓ {t.choosing}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
