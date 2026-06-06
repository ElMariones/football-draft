'use client';

import { motion } from 'framer-motion';
import { FORMATION_LAYOUTS } from '@/data/formations';
import { Player, TeamEra } from '@/data/types';
import PlayerCard from './PlayerCard';

interface Props {
  era: TeamEra;
  primaryColor: string;
  secondaryColor?: string;
  highlightedPlayer?: Player | null;
  staggered?: boolean;
}

export default function Pitch({ era, primaryColor, secondaryColor = '#fff', highlightedPlayer, staggered = true }: Props) {
  const slots = FORMATION_LAYOUTS[era.formation];

  return (
    <div className="relative w-full max-w-[640px] mx-auto aspect-[2/3]">
      {/* Pitch surface */}
      <div className="absolute inset-0 rounded-3xl overflow-hidden shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)] border border-white/10">
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, #1a8a3f 0%, #0d5e2a 50%, #073d1a 100%)',
          }}
        />
        {/* Pitch stripes */}
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
        {/* Pitch lines (SVG) */}
        <svg viewBox="0 0 100 150" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
          <g stroke="rgba(255,255,255,0.4)" fill="none" strokeWidth="0.3">
            <rect x="3" y="3" width="94" height="144" />
            <line x1="3" y1="75" x2="97" y2="75" />
            <circle cx="50" cy="75" r="9" />
            <circle cx="50" cy="75" r="0.6" fill="rgba(255,255,255,0.4)" />
            {/* Top penalty area */}
            <rect x="22" y="3" width="56" height="18" />
            <rect x="36" y="3" width="28" height="7" />
            <circle cx="50" cy="15" r="0.5" fill="rgba(255,255,255,0.4)" />
            <path d="M 38 21 A 13 13 0 0 0 62 21" />
            {/* Bottom penalty area */}
            <rect x="22" y="129" width="56" height="18" />
            <rect x="36" y="140" width="28" height="7" />
            <circle cx="50" cy="135" r="0.5" fill="rgba(255,255,255,0.4)" />
            <path d="M 38 129 A 13 13 0 0 1 62 129" />
          </g>
        </svg>
      </div>

      {/* Player markers */}
      {era.players.map((player, i) => {
        const slot = slots[i];
        if (!slot) return null;
        const top = 100 - slot.y;
        const left = slot.x;
        return (
          <motion.div
            key={`${player.name}-${i}`}
            initial={{ opacity: 0, scale: 0.4, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{
              delay: staggered ? 0.12 + i * 0.08 : 0,
              type: 'spring',
              stiffness: 220,
              damping: 18,
            }}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ top: `${top}%`, left: `${left}%` }}
          >
            <PlayerCard
              player={player}
              primaryColor={primaryColor}
              secondaryColor={secondaryColor}
              highlighted={highlightedPlayer === player}
            />
          </motion.div>
        );
      })}
    </div>
  );
}
