'use client';

import { motion } from 'framer-motion';
import { useCareerStore } from '@/store/careerStore';
import { getClub } from '@/data/career/clubs';
import { derbyBetween } from '@/data/career/derbies';
import { mainRival } from '@/data/career/rivals';
import { playedRivalries, recordVs, heatLabel } from '@/lib/career/rivalry';
import { Crest } from './bits';
import type { Lang } from '@/lib/career/i18n';

/**
 * The rivalries rail.
 *
 * The one you are living right now sits on top, whether or not you have played
 * it yet — a signing knows exactly which fixture is coming. Everything below is
 * the record you have built against clubs you no longer see every year.
 */
export default function RivalryPanel({ lang }: { lang: Lang }) {
  const { player } = useCareerStore();
  if (!player) return null;
  const es = lang === 'es';

  const currentRival = player.clubId ? mainRival(player.clubId) : null;
  const played = playedRivalries(player);
  const others = played.filter(x => x.rivalId !== currentRival).slice(0, 3);
  if (!currentRival && !played.length) return null;

  const cur = currentRival ? recordVs(player, currentRival) : null;
  const curDerby = player.clubId && currentRival ? derbyBetween(player.clubId, currentRival) : null;
  const curClub = currentRival ? getClub(currentRival) : null;
  const games = cur ? cur.w + cur.d + cur.l : 0;

  return (
    <div className="card p-4 sm:p-5 space-y-3">
      <div className="text-[10px] tracking-[0.3em] text-white/40 uppercase">
        {es ? 'Clásicos' : 'Derbies'}
      </div>

      {/* ---- the one you are living ---- */}
      {curClub && cur && (
        <div className="rounded-xl border border-red-500/25 bg-red-500/[0.05] p-3">
          <div className="flex items-center gap-2 mb-2">
            <Crest clubId={curClub.id} size={20} />
            <div className="min-w-0">
              <div className="text-[11px] font-display leading-none truncate">
                {curDerby ? (es ? curDerby.es : curDerby.en) : curClub.name}
              </div>
              {curDerby && (
                <div className="text-[9px] text-white/35 mt-1 leading-none truncate">{curClub.name}</div>
              )}
            </div>
            {curDerby && (
              <span className="ml-auto text-[9px] text-red-300/70 shrink-0" title={es ? 'Tamaño del partido' : 'Size of the occasion'}>
                {'●'.repeat(Math.round(curDerby.heat / 2.5))}
              </span>
            )}
          </div>

          {games > 0 ? (
            <>
              <div className="flex items-center gap-1 text-[11px] font-display">
                <span className="text-wc">{cur.w}{es ? 'G' : 'W'}</span>
                <span className="text-white/35">{cur.d}{es ? 'E' : 'D'}</span>
                <span className="text-red-300">{cur.l}{es ? 'P' : 'L'}</span>
                {cur.goals > 0 && (
                  <span className="ml-auto text-gold">
                    {cur.goals} {es ? 'gol' : 'goal'}{cur.goals === 1 ? '' : es ? 'es' : 's'}
                  </span>
                )}
              </div>
              {/* won / drawn / lost, as a single bar */}
              <div className="flex h-1 rounded-full overflow-hidden bg-white/10 mt-2">
                {(['w', 'd', 'l'] as const).map(k => (
                  <motion.div
                    key={k}
                    className={k === 'w' ? 'bg-wc' : k === 'd' ? 'bg-white/40' : 'bg-red-400'}
                    initial={{ width: '0%' }}
                    animate={{ width: `${(cur[k] / games) * 100}%` }}
                    transition={{ type: 'spring', stiffness: 90, damping: 20 }}
                  />
                ))}
              </div>
              <div className="text-[9px] text-red-300/70 mt-1.5 uppercase tracking-wider">
                {heatLabel(cur.heat, lang)}
              </div>
            </>
          ) : (
            <p className="text-[10px] text-white/40 leading-snug">
              {es ? 'Todavía no lo has jugado.' : 'You have not played it yet.'}
            </p>
          )}
        </div>
      )}

      {/* ---- the ones you carry from before ---- */}
      {others.length > 0 && (
        <div className="space-y-1.5">
          {others.map(({ rivalId, rec }) => {
            const c = getClub(rivalId);
            if (!c) return null;
            return (
              <div key={rivalId} className="flex items-center gap-2">
                <Crest clubId={rivalId} size={14} />
                <span className="text-[10px] text-white/50 truncate">{c.name}</span>
                <span className="ml-auto text-[10px] font-display shrink-0">
                  <span className="text-wc/80">{rec.w}</span>
                  <span className="text-white/25">-{rec.d}-</span>
                  <span className="text-red-300/80">{rec.l}</span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
