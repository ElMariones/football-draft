'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { DraftSlot } from '@/lib/draft';
import PlayerCard from './PlayerCard';

interface Props {
  xi: DraftSlot[];
  highlightedSlots?: number[];  // slots eligible for currently-selected pool player
  onSlotClick?: (idx: number) => void;
  placing?: boolean;
}

export default function FantasyXIBoard({
  xi,
  highlightedSlots = [],
  onSlotClick,
  placing = false,
}: Props) {
  const set = new Set(highlightedSlots);

  return (
    <div className="relative w-full mx-auto aspect-[2/3]">
      <div className="absolute inset-0 rounded-3xl overflow-hidden shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)] border border-white/10">
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, #1a8a3f 0%, #0d5e2a 50%, #073d1a 100%)',
          }}
        />
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute left-0 right-0"
            style={{
              top: `${i * 12.5}%`,
              height: '12.5%',
              background: i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent',
            }}
          />
        ))}
        <svg viewBox="0 0 100 150" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
          <g stroke="rgba(255,255,255,0.4)" fill="none" strokeWidth="0.3">
            <rect x="3" y="3" width="94" height="144" />
            <line x1="3" y1="75" x2="97" y2="75" />
            <circle cx="50" cy="75" r="9" />
            <rect x="22" y="3" width="56" height="18" />
            <rect x="36" y="3" width="28" height="7" />
            <path d="M 38 21 A 13 13 0 0 0 62 21" />
            <rect x="22" y="129" width="56" height="18" />
            <rect x="36" y="140" width="28" height="7" />
            <path d="M 38 129 A 13 13 0 0 1 62 129" />
          </g>
        </svg>
      </div>

      {xi.map((slot, i) => {
        const isEligible = set.has(i);
        const top = 100 - slot.y;
        const left = slot.x;
        return (
          <div
            key={i}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ top: `${top}%`, left: `${left}%` }}
          >
            <AnimatePresence mode="wait">
              {slot.player ? (
                <motion.div
                  key="filled"
                  initial={{ scale: 0.4, opacity: 0, rotate: -8 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  exit={{ scale: 0.6, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 240, damping: 18 }}
                >
                  <PlayerCard
                    player={slot.player.player}
                    primaryColor="#FFD700"
                    secondaryColor="#0a0a0f"
                    size="sm"
                  />
                </motion.div>
              ) : (
                <motion.button
                  key="empty"
                  type="button"
                  disabled={!isEligible || !placing}
                  onClick={() => isEligible && onSlotClick?.(i)}
                  initial={{ opacity: 0.5, scale: 0.9 }}
                  animate={
                    isEligible
                      ? { opacity: 1, scale: [1, 1.08, 1] }
                      : { opacity: 0.6, scale: 1 }
                  }
                  transition={
                    isEligible
                      ? { duration: 1.1, repeat: Infinity, ease: 'easeInOut' }
                      : { duration: 0.3 }
                  }
                  className={`rounded-xl border-2 border-dashed grid place-items-center text-center select-none ${
                    isEligible
                      ? 'border-gold bg-gold/15 text-gold shadow-[0_0_25px_rgba(255,215,0,0.55)] cursor-pointer'
                      : 'border-white/30 bg-black/30 text-white/60'
                  }`}
                  style={{ width: 52, height: 60 }}
                >
                  <div className="font-display text-[11px] tracking-widest leading-none">
                    {slot.position}
                  </div>
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
