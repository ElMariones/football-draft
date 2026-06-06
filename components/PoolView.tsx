'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Player, Team, EraKey } from '@/data/types';
import { ERAS } from '@/data/eras';
import { eligibleSlotIndices, DraftSlot } from '@/lib/draft';

interface Props {
  team: Team;
  era: EraKey;
  xi: DraftSlot[];                    // your fantasy XI (to compute eligibility)
  selectedIdx: number | null;
  onSelect: (idx: number) => void;
  rerolling?: 'team' | 'era' | null;
}

export default function PoolView({ team, era, xi, selectedIdx, onSelect, rerolling }: Props) {
  const teamEra = team.eras[era];
  if (!teamEra) return null;
  const eraLabel = ERAS.find(e => e.key === era)?.label ?? era;

  return (
    <div className="space-y-3 relative">
      {/* Header (re-animates on team change) */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={`header-${team.id}`}
          initial={{ opacity: 0, scale: 0.92, rotateX: -25 }}
          animate={{ opacity: 1, scale: 1, rotateX: 0 }}
          exit={{ opacity: 0, scale: 0.92, rotateX: 25 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="rounded-2xl px-4 py-3 border border-white/10 relative overflow-hidden"
          style={{
            background: `linear-gradient(120deg, ${team.colors.primary} 0%, ${team.colors.primary}cc 60%, #0a0a0f 100%)`,
            transformOrigin: 'top',
          }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_60%)]" />
          <div className="relative flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl grid place-items-center font-display text-lg shadow-md"
              style={{ background: team.colors.secondary ?? '#fff', color: team.colors.primary }}
            >
              {team.shortName}
            </div>
            <div className="min-w-0 flex-1">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={`era-${era}`}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.25 }}
                  className="text-[10px] tracking-[0.3em] text-white/70 uppercase"
                >
                  {eraLabel}
                </motion.div>
              </AnimatePresence>
              <div className="font-display text-xl text-white truncate">{team.name}</div>
              {teamEra.notes && (
                <div className="text-[11px] italic text-white/70 truncate">{teamEra.notes}</div>
              )}
            </div>
          </div>
          {/* Reroll flash */}
          <AnimatePresence>
            {rerolling && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    'radial-gradient(circle at center, rgba(255,215,0,0.55) 0%, transparent 65%)',
                  mixBlendMode: 'screen',
                }}
              />
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>

      <p className="text-xs text-white/60 px-1">
        Pick one player. Highlighted players fit at least one empty slot in your XI.
      </p>

      {/* Players list (re-animates whenever the pool changes) */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={`pool-${team.id}-${era}`}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-2"
        >
          {teamEra.players.map((p, i) => {
            const fits = eligibleSlotIndices(xi, p.position).length > 0;
            const selected = selectedIdx === i;
            return (
              <PoolPlayerCard
                key={`${p.name}-${i}`}
                player={p}
                fits={fits}
                selected={selected}
                onClick={() => fits && onSelect(i)}
                index={i}
              />
            );
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function PoolPlayerCard({
  player,
  fits,
  selected,
  onClick,
  index,
}: {
  player: Player;
  fits: boolean;
  selected: boolean;
  onClick: () => void;
  index: number;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={!fits}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04 * index }}
      whileHover={fits ? { y: -2, scale: 1.02 } : {}}
      whileTap={fits ? { scale: 0.97 } : {}}
      className={`group relative flex items-center gap-3 rounded-xl px-3 py-2 border text-left transition-colors ${
        selected
          ? 'border-gold bg-gold/15 shadow-[0_0_25px_rgba(255,215,0,0.5)]'
          : fits
          ? 'border-white/15 bg-white/5 hover:bg-white/10 cursor-pointer'
          : 'border-white/5 bg-black/40 opacity-40 cursor-not-allowed'
      }`}
    >
      <div
        className={`flex flex-col items-center justify-center rounded-md font-display ${
          player.overall >= 85
            ? 'bg-gradient-to-br from-yellow-200 to-yellow-600 text-black'
            : player.overall >= 75
            ? 'bg-gradient-to-br from-white to-gray-400 text-black'
            : 'bg-gradient-to-br from-orange-300 to-orange-700 text-black'
        }`}
        style={{ width: 42, height: 50 }}
      >
        <div className="text-[8px] font-bold leading-none mt-1">{player.position}</div>
        <div className="text-xl leading-none">{player.overall}</div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold truncate">{player.name}</div>
        <div className="text-[10px] text-white/50">
          {fits ? 'Can fill a slot →' : 'No matching open slot'}
        </div>
      </div>
    </motion.button>
  );
}
