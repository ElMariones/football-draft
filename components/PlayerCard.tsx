'use client';

import { Player } from '@/data/types';
import clsx from 'clsx';

interface Props {
  player: Player;
  primaryColor: string;
  secondaryColor?: string;
  highlighted?: boolean;
  size?: 'sm' | 'md';
}

function ratingTier(overall: number): 'gold' | 'silver' | 'bronze' {
  if (overall >= 85) return 'gold';
  if (overall >= 75) return 'silver';
  return 'bronze';
}

const TIER_STYLES = {
  gold: {
    bg: 'linear-gradient(135deg, #fff8c8 0%, #FFD700 45%, #BB8E11 100%)',
    text: '#3a2900',
    border: '1px solid rgba(255, 215, 0, 0.6)',
  },
  silver: {
    bg: 'linear-gradient(135deg, #f3f5f7 0%, #c5cdd5 50%, #7d8a96 100%)',
    text: '#1a2027',
    border: '1px solid rgba(255,255,255,0.4)',
  },
  bronze: {
    bg: 'linear-gradient(135deg, #f4c08e 0%, #c47a40 50%, #6e3e1e 100%)',
    text: '#2a1402',
    border: '1px solid rgba(196, 122, 64, 0.6)',
  },
};

export default function PlayerCard({
  player,
  primaryColor,
  secondaryColor,
  highlighted,
  size = 'md',
}: Props) {
  const tier = ratingTier(player.overall);
  const style = TIER_STYLES[tier];
  const isCompact = size === 'sm';

  return (
    <div
      className={clsx(
        'flex flex-col items-center text-center select-none',
        highlighted && 'animate-pulse-glow',
      )}
      style={{ width: isCompact ? 64 : 78 }}
    >
      <div
        className="relative rounded-xl flex items-center justify-center font-display"
        style={{
          width: isCompact ? 52 : 66,
          height: isCompact ? 60 : 76,
          background: style.bg,
          color: style.text,
          border: style.border,
          boxShadow: highlighted
            ? '0 0 25px rgba(255, 215, 0, 0.7)'
            : '0 6px 14px rgba(0,0,0,0.45)',
        }}
      >
        <div className="absolute top-0.5 left-1 text-[10px] font-bold leading-none">
          {player.position}
        </div>
        <div className="text-3xl sm:text-4xl leading-none mt-2">{player.overall}</div>
        <div
          className="absolute bottom-0 inset-x-0 h-1.5 rounded-b-xl"
          style={{ background: primaryColor }}
        />
      </div>
      <div
        className="mt-1 px-1 py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold leading-tight max-w-[78px] truncate"
        style={{ background: primaryColor, color: secondaryColor ?? '#fff' }}
        title={player.name}
      >
        {player.name}
      </div>
    </div>
  );
}
