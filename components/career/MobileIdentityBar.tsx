'use client';

// A compact "who am I" strip, shown only on small screens.
//
// The career screen's three rails stack vertically on a phone, and the decisions
// rail deliberately comes first — you want the choice above the fold. The cost
// was that the player card ended up ~1800px down the page, so you were asked to
// pick a club, take a preseason card and resolve an event before anything told
// you your name, overall, age or club. This puts the context back above the
// decision without pushing the decision off the screen.
import { motion } from 'framer-motion';
import type { CareerPlayer } from '@/data/career/types';
import { getClub } from '@/data/career/clubs';
import { nationFlag } from '@/data/career/nations';
import { positionAbbr } from '@/lib/career/format';
import type { Lang } from '@/lib/career/i18n';
import { Crest } from './bits';
import Face from './Face';

export default function MobileIdentityBar({
  player, lang,
}: { player: CareerPlayer; lang: Lang }) {
  const es = lang === 'es';
  const club = player.clubId ? getClub(player.clubId) : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="lg:hidden order-first sticky top-0 z-30 -mx-3 sm:-mx-6 px-3 sm:px-6 py-2
                 bg-[#0b0f14]/92 backdrop-blur border-b border-white/10
                 flex items-center gap-3"
    >
      <Face genes={player.face} age={player.age} size={38} className="shrink-0" />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-sm leading-none">{nationFlag(player.nationCode)}</span>
          <span className="font-display text-base leading-none truncate">{player.surname}</span>
          <span className="text-[10px] text-white/40 shrink-0">
            #{player.number} · {positionAbbr(player.position, lang)}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-1 min-w-0">
          {club && <Crest clubId={club.id} size={14} />}
          <span className="text-[11px] text-white/55 truncate">
            {club ? club.name : (es ? 'Sin club' : 'No club')}
          </span>
        </div>
      </div>

      <div className="text-right shrink-0">
        <div className="font-display text-xl leading-none text-gold">{player.overall}</div>
        <div className="text-[9px] uppercase tracking-widest text-white/40">
          {es ? `${player.age} años` : `age ${player.age}`}
        </div>
      </div>
    </motion.div>
  );
}
