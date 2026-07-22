'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import type { Title } from '@/data/career/types';
import { getClub, clubLogoUrl } from '@/data/career/clubs';
import { nationFlag } from '@/data/career/nations';
import { trophyImageUrl, trophyEmoji } from '@/lib/career/trophies';
import { ovrTier } from '@/lib/career/format';

// Animated count-up number.
export function CountUp({ value, format }: { value: number; format?: (n: number) => string }) {
  const mv = useMotionValue(value);
  const text = useTransform(mv, v => (format ? format(v) : String(Math.round(v))));
  useEffect(() => {
    const controls = animate(mv, value, { duration: 0.6, ease: 'easeOut' });
    return controls.stop;
  }, [value, mv]);
  return <motion.span>{text}</motion.span>;
}

// Real club badge from the CDN, falling back to a color monogram on error.
export function Crest({ clubId, size = 40 }: { clubId: string; size?: number }) {
  const club = getClub(clubId);
  const [failed, setFailed] = useState(false);
  if (!club) return null;
  const logo = clubLogoUrl(clubId);
  if (logo && !failed) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={logo} alt={club.name} title={club.name}
        onError={() => setFailed(true)}
        className="object-contain flex-shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  const { primary, secondary } = club.colors;
  return (
    <div
      className="grid place-items-center font-display flex-shrink-0 rounded-lg"
      style={{
        width: size, height: size,
        background: `linear-gradient(135deg, ${primary} 0%, ${primary} 55%, ${secondary} 55%, ${secondary} 100%)`,
        border: `2px solid ${secondary}`,
        color: contrast(primary),
        fontSize: size * 0.34,
        lineHeight: 1,
      }}
      title={club.name}
    >
      {club.short}
    </div>
  );
}

// A trophy/award icon: real PNG when available, emoji otherwise. Scales up and
// reveals its name on hover.
export function TrophyBadge({ title, label, size = 22 }: { title: Title; label: string; size?: number }) {
  const url = trophyImageUrl(title);
  const [failed, setFailed] = useState(false);
  const [hover, setHover] = useState(false);
  const showImg = url && !failed;
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <motion.span whileHover={{ scale: 1.45, y: -3 }} transition={{ type: 'spring', stiffness: 320, damping: 14 }} className="inline-flex cursor-default">
        {showImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url!} alt={label} onError={() => setFailed(true)} className="object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)]" style={{ width: size, height: size }} />
        ) : (
          <span style={{ fontSize: size * 0.82, lineHeight: 1 }}>{trophyEmoji(title)}</span>
        )}
      </motion.span>
      <AnimatePresence>
        {hover && (
          <motion.span
            initial={{ opacity: 0, y: 4, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 4 }}
            className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 px-2 py-1 rounded-md bg-black/90 border border-white/15 text-[10px] font-semibold whitespace-nowrap z-30 pointer-events-none shadow-lg"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

const TIER_STYLE: Record<string, string> = {
  low: 'bg-amber-500 text-black',
  mid: 'bg-cl text-black',
  high: 'bg-gold text-black',
  elite: 'bg-wc text-black',
};

export function OvrBadge({ ovr, size = 'md', animated = false }: { ovr: number; size?: 'sm' | 'md' | 'lg'; animated?: boolean }) {
  const tier = ovrTier(ovr);
  const dims = size === 'lg' ? 'w-16 h-16 text-4xl' : size === 'sm' ? 'w-9 h-9 text-lg' : 'w-12 h-12 text-2xl';
  return (
    <motion.div
      key={Math.round(ovr)}
      initial={animated ? { scale: 0.8 } : false}
      animate={animated ? { scale: [1, 1.18, 1] } : {}}
      transition={{ duration: 0.5 }}
      className={`grid place-items-center rounded-xl font-display leading-none ${dims} ${TIER_STYLE[tier]}`}
    >
      {animated ? <CountUp value={Math.round(ovr)} /> : Math.round(ovr)}
    </motion.div>
  );
}

export function Flag({ code, className = '' }: { code: string; className?: string }) {
  return <span className={className}>{nationFlag(code)}</span>;
}

// A simple jersey preview in the nation's colours.
export function Jersey({
  primary, secondary, surname, number,
}: { primary: string; secondary: string; surname: string; number: number }) {
  const txt = contrast(primary);
  return (
    <svg viewBox="0 0 200 200" width="180" height="180" role="img" aria-label="jersey">
      <defs>
        <clipPath id="shirt">
          <path d="M70 20 L50 30 L20 55 L35 80 L55 70 L55 175 L145 175 L145 70 L165 80 L180 55 L150 30 L130 20 C120 35 80 35 70 20 Z" />
        </clipPath>
      </defs>
      <g>
        <path
          d="M70 20 L50 30 L20 55 L35 80 L55 70 L55 175 L145 175 L145 70 L165 80 L180 55 L150 30 L130 20 C120 35 80 35 70 20 Z"
          fill={primary} stroke={secondary} strokeWidth="3"
        />
        {/* two vertical stripes in the secondary colour */}
        <g clipPath="url(#shirt)">
          <rect x="85" y="20" width="12" height="160" fill={secondary} opacity="0.85" />
          <rect x="103" y="20" width="12" height="160" fill={secondary} opacity="0.85" />
        </g>
        <text x="100" y="105" textAnchor="middle" fontFamily="Bebas Neue, Impact, sans-serif" fontSize="16" fill={txt} letterSpacing="1">
          {(surname || 'APELLIDO').slice(0, 12).toUpperCase()}
        </text>
        <text x="100" y="150" textAnchor="middle" fontFamily="Bebas Neue, Impact, sans-serif" fontSize="52" fill={txt}>
          {number || 10}
        </text>
      </g>
    </svg>
  );
}

// Pick black/white text for readability over a hex background.
export function contrast(hex: string): string {
  const h = hex.replace('#', '');
  if (h.length < 6) return '#fff';
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? '#111' : '#fff';
}
