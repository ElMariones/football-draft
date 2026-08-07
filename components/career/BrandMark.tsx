'use client';

// Brand marks.
//
// ORIGINAL artwork, on purpose. The brand names in this game are real, the same
// way the club names are real — but the club crests are generated rather than
// copied, and these follow exactly the same rule. Every mark below is a
// geometric glyph drawn from the brand's own colours; none of them reproduces
// anybody's trademarked logo.
//
// They have to survive being 16px in a side panel and 64px in a modal, so each
// one is a single bold silhouette on a field, with no fine detail to lose.

import { getBrand, type Glyph } from '@/data/career/brands';

/** The glyph, in a 100x100 box, drawn in the accent colour. */
function glyphPath(g: Glyph): string {
  switch (g) {
    case 'wedge':   return 'M12 70 C34 66 62 50 88 24 C84 44 66 68 34 78 Z';
    case 'bars':    return 'M22 78 L40 22 L52 22 L34 78 Z M44 78 L62 22 L74 22 L56 78 Z M66 78 L84 22 L96 22 L78 78 Z';
    case 'chevron': return 'M50 18 L82 44 L70 54 L50 38 L30 54 L18 44 Z M50 46 L82 72 L70 82 L50 66 L30 82 L18 72 Z';
    case 'orbit':   return 'M50 14 A36 36 0 1 1 49.9 14 Z M50 32 A18 18 0 1 0 50.1 32 Z M74 66 L92 84 L84 92 L66 74 Z';
    case 'blade':   return 'M20 82 C24 44 46 20 84 14 C80 52 58 76 20 82 Z';
    case 'grid':    return 'M18 18 H46 V46 H18 Z M54 30 H82 V58 H54 Z M18 54 H46 V82 H18 Z';
    case 'wave':    return 'M10 62 C26 38 38 38 52 54 C64 68 76 68 92 44 L92 68 C76 90 62 90 50 74 C38 58 26 58 10 82 Z';
    case 'star':    return 'M50 12 L61 40 L91 41 L67 59 L76 88 L50 71 L24 88 L33 59 L9 41 L39 40 Z';
    case 'shard':   return 'M56 8 L34 50 H52 L40 92 L74 44 H54 Z';
    case 'ring':    return 'M50 10 A40 40 0 1 1 49.9 10 Z M50 26 A24 24 0 1 0 50.1 26 Z M50 38 A12 12 0 1 1 49.9 38 Z';
    case 'bolt':    return 'M60 6 L22 56 H46 L40 94 L80 42 H54 Z';
    case 'diamond': return 'M50 8 L92 50 L50 92 L8 50 Z M50 32 L68 50 L50 68 L32 50 Z';
    case 'flame':   return 'M50 8 C66 30 82 40 82 60 A32 32 0 0 1 18 60 C18 44 30 40 36 28 C40 44 50 44 50 8 Z';
    case 'arch':    return 'M12 84 C12 40 34 14 50 14 C66 14 88 40 88 84 L68 84 C68 50 58 34 50 34 C42 34 32 50 32 84 Z';
    case 'crown':   return 'M12 76 L20 26 L36 48 L50 18 L64 48 L80 26 L88 76 Z';
    case 'pulse':   return 'M6 54 H30 L38 26 L50 78 L60 44 L68 54 H94 V64 H62 L54 90 L42 34 L34 64 H6 Z';
  }
}

/** Round marks want a circular field; angular ones want a squircle. */
const ROUND: Glyph[] = ['orbit', 'ring', 'flame', 'star'];

/**
 * One brand's mark, at any size.
 *
 * `flat` drops the field and draws the glyph alone in the brand colour, for
 * places that already have a background of their own.
 */
export default function BrandMark({
  brandId, size = 32, flat = false,
}: { brandId: string; size?: number; flat?: boolean }) {
  const b = getBrand(brandId);
  if (!b) return null;
  const round = ROUND.includes(b.glyph);
  const id = `bm-${b.id}`;

  if (flat) {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" aria-label={b.name} role="img">
        <path d={glyphPath(b.glyph)} fill={b.secondary} fillRule="evenodd" />
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-label={b.name} role="img">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={b.primary} />
          {/* a second stop keeps a flat black field from reading as a hole */}
          <stop offset="100%" stopColor={b.primary === '#111111' || b.primary === '#0B0B0B' ? '#2A2A2A' : b.primary} />
        </linearGradient>
      </defs>
      {round
        ? <circle cx="50" cy="50" r="50" fill={`url(#${id})`} />
        : <rect x="0" y="0" width="100" height="100" rx="24" fill={`url(#${id})`} />}
      <g transform="translate(50 50) scale(0.72) translate(-50 -50)">
        <path d={glyphPath(b.glyph)} fill={b.secondary} fillRule="evenodd" />
      </g>
    </svg>
  );
}

/** Mark plus wordmark, for headers and offer cards. */
export function BrandLockup({
  brandId, size = 34, className = '',
}: { brandId: string; size?: number; className?: string }) {
  const b = getBrand(brandId);
  if (!b) return null;
  return (
    <div className={`flex items-center gap-2.5 min-w-0 ${className}`}>
      <BrandMark brandId={brandId} size={size} />
      <span
        className="font-display tracking-wide truncate"
        style={{ fontSize: size * 0.52, lineHeight: 1 }}
      >
        {b.name}
      </span>
    </div>
  );
}
