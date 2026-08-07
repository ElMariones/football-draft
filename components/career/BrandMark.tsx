'use client';

// Brand marks.
//
// Three tiers, in order:
//
//   1. A real logo image the project ships in public/brands/<brand-id>.png.
//      Anything in there wins. Run `npm run brands` after adding one.
//   2. The official mark geometry carried by `simple-icons` — real logos, real
//      brand colours. The icon data is CC0; the marks themselves are the
//      trademarks of their respective owners and are used here to identify the
//      brands they belong to.
//   3. A drawn geometric glyph, for the brands neither source has. These are
//      original artwork and are NOT anybody's logo — they exist so a brand with
//      no available mark still renders as something deliberate rather than a
//      grey box. Every one of them is listed in DRAWN_ONLY.
//
// All three have to survive being 16px in a side panel and 64px in a modal, so
// everything is a single bold silhouette on a field, with no fine detail.

import { useState } from 'react';
import { getBrand, type Glyph } from '@/data/career/brands';
import { BRAND_LOGOS } from '@/data/career/brandLogos';

/** The drawn fallback glyph, in a 100x100 box. Original artwork, not a logo. */
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

/** Perceived lightness, so a mark on a pale field is drawn dark rather than white. */
function isLight(hex: string): boolean {
  const h = hex.replace('#', '');
  if (h.length < 6) return false;
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62;
}

/**
 * The colour that identifies a brand across the UI — accent stripes, the wash
 * behind a modal header. Prefers the brand's official hex where a real mark
 * supplied one, and never returns something invisible on a dark background.
 */
export function brandAccent(brandId: string): string {
  const b = getBrand(brandId);
  if (!b) return '#888888';
  const official = BRAND_LOGOS[brandId]?.hex;
  const c = official ?? b.primary;
  // Nike and adidas are officially black, which is not a usable accent here.
  const h = c.replace('#', '').toLowerCase();
  const dark = ['000000', '111111', '0b0b0b', '1a1a1a', '1d1d1d', '242b2f'];
  return dark.includes(h) ? b.secondary : c;
}

/**
 * One brand's mark, at any size.
 *
 * `flat` drops the field and draws the mark alone, for places that already have
 * a background of their own.
 */
export default function BrandMark({
  brandId, size = 32, flat = false,
}: { brandId: string; size?: number; flat?: boolean }) {
  const [imgBroken, setImgBroken] = useState(false);
  const b = getBrand(brandId);
  if (!b) return null;
  const logo = BRAND_LOGOS[brandId];

  // ---- 1. a real logo image shipped for this brand ----
  if (logo?.file && !imgBroken) {
    return (
      <span
        className="inline-grid place-items-center rounded-[22%] bg-white/95 overflow-hidden shrink-0"
        style={{ width: size, height: size, padding: size * 0.13 }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/brands/${logo.file}`} alt={b.name}
          width={size} height={size}
          onError={() => setImgBroken(true)}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      </span>
    );
  }

  // ---- 2. the official mark, in the brand's own colour ----
  if (logo?.path) {
    const field = logo.hex ?? b.primary;
    const ink = isLight(field) ? '#111111' : '#FFFFFF';
    if (flat) {
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-label={b.name} role="img">
          <path d={logo.path} fill={field} />
        </svg>
      );
    }
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-label={b.name} role="img">
        <rect x="0" y="0" width="24" height="24" rx="5.6" fill={field} />
        <g transform="translate(12 12) scale(0.66) translate(-12 -12)">
          <path d={logo.path} fill={ink} />
        </g>
      </svg>
    );
  }

  // ---- 3. the drawn fallback ----
  const round = ROUND.includes(b.glyph);
  if (flat) {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" aria-label={b.name} role="img">
        <path d={glyphPath(b.glyph)} fill={b.secondary} fillRule="evenodd" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-label={b.name} role="img">
      {round
        ? <circle cx="50" cy="50" r="50" fill={b.primary} />
        : <rect x="0" y="0" width="100" height="100" rx="24" fill={b.primary} />}
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
