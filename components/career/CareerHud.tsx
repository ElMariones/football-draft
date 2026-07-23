'use client';

import type { CareerPlayer, Title } from '@/data/career/types';
import { getClub } from '@/data/career/clubs';
import { careerT, titleLabel, Lang } from '@/lib/career/i18n';
import { formatValue, positionAbbr } from '@/lib/career/format';
import { isKeeperOrDef } from '@/lib/career/config';
import { motion } from 'framer-motion';
import { Crest, OvrBadge, Flag, CountUp, TrophyBadge } from './bits';

function Stat({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="text-center flex-1">
      <div className="text-[10px] tracking-widest text-white/40 uppercase flex items-center justify-center gap-1">
        <span aria-hidden className="text-[11px]">{icon}</span>{label}
      </div>
      <div className="font-display text-xl"><CountUp value={value} /></div>
    </div>
  );
}

function Meter({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex-1">
      <div className="flex justify-between text-[9px] uppercase tracking-widest text-white/40 mb-1">
        <span>{label}</span><span>{Math.round(value)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <motion.div className="h-full rounded-full" style={{ background: color }} animate={{ width: `${value}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
      </div>
    </div>
  );
}

export default function CareerHud({
  player, trophies, lang,
}: { player: CareerPlayer; trophies: Title[]; lang: Lang }) {
  const t = careerT(lang);
  const club = player.clubId ? getClub(player.clubId) : null;
  const showCS = isKeeperOrDef(player.position);

  return (
    <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card p-4 sm:p-5">
      <div className="flex items-center gap-4">
        <OvrBadge ovr={player.overall} size="lg" animated />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs text-white/60 mb-1">
            <Flag code={player.ntNationCode} className="text-base" />
            <span className="px-1.5 py-0.5 rounded bg-white/10 font-display tracking-wide">#{player.number} {positionAbbr(player.position, lang)}</span>
            {player.secondNationCode && <Flag code={player.secondNationCode} className="opacity-50" />}
          </div>
          <div className="flex items-center gap-2 min-w-0">
            {club ? <Crest clubId={club.id} size={28} /> : <span className="text-lg">🎓</span>}
            <span className="font-display text-2xl truncate">{club ? club.name : t.free}</span>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-[10px] tracking-widest text-white/40 uppercase">{t.age}</div>
          <div className="font-display text-2xl">{player.age}</div>
          <div className="text-[10px] tracking-widest text-white/40 uppercase mt-1">{t.value}</div>
          <div className="font-display text-lg text-emerald-300"><CountUp value={player.value} format={formatValue} /></div>
        </div>
      </div>

      <div className="flex items-stretch mt-4 pt-3 border-t border-white/10">
        <Stat label={t.apps} value={player.apps} icon="🎽" />
        <Stat label={t.goals} value={player.goals} icon="⚽" />
        <Stat label={t.assists} value={player.assists} icon="👟" />
        {showCS && <Stat label={t.cleanSheets} value={player.cleanSheets} icon="🧤" />}
      </div>

      <div className="flex gap-3 mt-4">
        <Meter label={t.morale} value={player.morale} color="#00DFA2" />
        <Meter label={t.form} value={player.form} color="#3DA9FC" />
      </div>

      <div className="mt-4 pt-3 border-t border-white/10">
        {trophies.length === 0 ? (
          <div className="text-center text-white/30 text-xs tracking-widest uppercase py-1">🏆 {t.emptyCabinet}</div>
        ) : (
          <div className="flex flex-wrap gap-1.5 items-center">
            {trophies.slice().reverse().slice(0, 22).map((tt, i) => (
              <TrophyBadge key={i} title={tt} label={titleLabel(tt.key, lang)} size={22} />
            ))}
            {trophies.length > 22 && <span className="text-xs text-white/40 self-center">+{trophies.length - 22}</span>}
          </div>
        )}
      </div>
    </motion.div>
  );
}
