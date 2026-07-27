'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import type { Title } from '@/data/career/types';
import { getClub, clubLogoUrl } from '@/data/career/clubs';
import { CREST_URL } from '@/data/career/crest-urls';
import { nationFlag } from '@/data/career/nations';
import { trophyImageUrl } from '@/lib/career/trophies';
import { ovrTier } from '@/lib/career/format';
import { ClubCrest } from './crests';
import { TrophyIcon } from './TrophyArt';

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

// Real club badge from the CDN, falling back to a generated crest on error.
export function Crest({ clubId, size = 40 }: { clubId: string; size?: number }) {
  const club = getClub(clubId);
  const [failed, setFailed] = useState(false);
  if (!club) return null;
  // Real crest first (Wikipedia-resolved), then the legacy CDN, then a
  // generated badge so nothing ever renders as a blank square.
  const logo = CREST_URL[clubId] ?? clubLogoUrl(clubId);
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
  // No licensed logo: draw a real badge from the club's own identity rather
  // than showing a flat colour square.
  return <ClubCrest clubId={clubId} size={size} />;
}

// A trophy/award icon: real PNG when available, a generated one otherwise. Scales up and
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
          <TrophyIcon title={title} size={size} />
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

// Jersey preview (back view) in the nation's colours. Raglan sleeves in the
// secondary colour, a collar band, soft fabric shading, and the name arched
// over the number the way it actually sits on a shirt.
const SHIRT_BODY =
  'M84 30 C96 50 144 50 156 30 L168 62 L172 116 L178 246 L62 246 L68 116 L72 62 Z';
const SLEEVE_L = 'M84 30 L40 50 L20 106 L64 122 L72 62 Z';
const SLEEVE_R = 'M156 30 L200 50 L220 106 L176 122 L168 62 Z';

export function Jersey({
  primary, secondary, surname, number, size = 200,
}: { primary: string; secondary: string; surname: string; number: number; size?: number }) {
  const txt = contrast(primary);
  const trim = contrast(secondary);
  const uid = `${primary}${secondary}`.replace(/[^a-z0-9]/gi, '');
  return (
    <svg
      viewBox="0 0 240 260" width={size} height={size} role="img"
      aria-label={`Camiseta ${number} ${surname}`}
      style={{ filter: 'drop-shadow(0 10px 18px rgba(0,0,0,.45))' }}
    >
      <defs>
        {/* fabric shading: lit at the top, falling off toward the hem */}
        <linearGradient id={`fab${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.20" />
          <stop offset="45%" stopColor="#fff" stopOpacity="0.03" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.22" />
        </linearGradient>
        {/* a soft crease down the middle so it doesn't read as a flat sticker */}
        <linearGradient id={`crease${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#000" stopOpacity="0.10" />
          <stop offset="50%" stopColor="#fff" stopOpacity="0.07" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.10" />
        </linearGradient>
        <clipPath id={`body${uid}`}><path d={SHIRT_BODY} /></clipPath>
        <path id={`arc${uid}`} d="M72 108 Q120 88 168 108" fill="none" />
      </defs>

      {/* sleeves sit behind the body */}
      <path d={SLEEVE_L} fill={secondary} />
      <path d={SLEEVE_R} fill={secondary} />
      <path d={SLEEVE_L} fill={`url(#fab${uid})`} />
      <path d={SLEEVE_R} fill={`url(#fab${uid})`} />
      {/* cuffs */}
      <path d="M20 106 L64 122 L61 132 L17 116 Z" fill={primary} opacity="0.9" />
      <path d="M220 106 L176 122 L179 132 L223 116 Z" fill={primary} opacity="0.9" />

      {/* body */}
      <path d={SHIRT_BODY} fill={primary} />
      <g clipPath={`url(#body${uid})`}>
        <rect x="96" y="0" width="48" height="260" fill={`url(#crease${uid})`} />
        <rect x="0" y="0" width="240" height="260" fill={`url(#fab${uid})`} />
      </g>

      {/* collar band */}
      <path
        d="M84 30 C96 50 144 50 156 30 L150 24 C140 40 100 40 90 24 Z"
        fill={secondary}
      />
      <path d="M84 30 C96 50 144 50 156 30" fill="none" stroke={trim} strokeWidth="1.5" opacity="0.55" />

      {/* outline last so it sits above the shading */}
      <path d={SHIRT_BODY} fill="none" stroke="rgba(0,0,0,.35)" strokeWidth="2" />

      {/* name arched above the number */}
      <text
        fontFamily="Bebas Neue, Impact, sans-serif" fontSize="19"
        fill={txt} letterSpacing="2.5" opacity="0.95"
      >
        <textPath href={`#arc${uid}`} startOffset="50%" textAnchor="middle">
          {(surname || 'APELLIDO').slice(0, 12).toUpperCase()}
        </textPath>
      </text>
      <text
        x="120" y="196" textAnchor="middle"
        fontFamily="Bebas Neue, Impact, sans-serif" fontSize="76"
        fill={txt} letterSpacing="-2"
      >
        {number || 10}
      </text>
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
