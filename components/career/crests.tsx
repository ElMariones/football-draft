'use client';

// Procedurally generated club crests, league badges and trophies.
//
// Most clubs in the dataset have no licensed logo, and a flat colour square
// reads as "missing asset". These are drawn from the entity's own identity
// (id hash + colours + short tag), so every club gets a distinct, repeatable
// badge that looks deliberate — and nothing here reproduces a real crest.
import { getClub } from '@/data/career/clubs';
import { getLeague } from '@/data/career/leagues';

// ---- deterministic hash ----------------------------------------------------
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0);
}

function contrastOn(hex: string): string {
  const h = hex.replace('#', '');
  if (h.length < 6) return '#fff';
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? '#111' : '#fff';
}

// ---- club crest ------------------------------------------------------------

const SHAPES = ['shield', 'round', 'pointed', 'hex'] as const;
const PATTERNS = ['stripes', 'half', 'sash', 'hoop', 'solid', 'quarters'] as const;

function shapePath(shape: (typeof SHAPES)[number]): string {
  switch (shape) {
    case 'round':
      return 'M50 4 A46 46 0 1 1 49.9 4 Z';
    case 'pointed':
      return 'M50 3 L94 20 L94 56 C94 78 74 92 50 98 C26 92 6 78 6 56 L6 20 Z';
    case 'hex':
      return 'M50 3 L92 26 L92 74 L50 97 L8 74 L8 26 Z';
    default: // shield
      return 'M8 12 L50 3 L92 12 L92 52 C92 76 72 90 50 97 C28 90 8 76 8 52 Z';
  }
}

export function ClubCrest({ clubId, size = 40 }: { clubId: string; size?: number }) {
  const club = getClub(clubId);
  if (!club) return null;
  const h = hash(club.id);
  const shape = SHAPES[h % SHAPES.length];
  const pattern = PATTERNS[(h >> 3) % PATTERNS.length];
  const { primary, secondary } = club.colors;
  const fg = contrastOn(primary);
  const uid = `c${h.toString(36)}`;
  const d = shapePath(shape);

  return (
    <svg
      viewBox="0 0 100 100" width={size} height={size} role="img"
      aria-label={club.name} className="flex-shrink-0"
      style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.45))' }}
    >
      <defs>
        <clipPath id={`clip${uid}`}><path d={d} /></clipPath>
        <linearGradient id={`sh${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.28" />
          <stop offset="55%" stopColor="#fff" stopOpacity="0.04" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.28" />
        </linearGradient>
      </defs>

      <path d={d} fill={primary} />
      <g clipPath={`url(#clip${uid})`}>
        {pattern === 'stripes' && [18, 38, 58, 78].map(x => (
          <rect key={x} x={x} y="0" width="10" height="100" fill={secondary} />
        ))}
        {pattern === 'half' && <rect x="50" y="0" width="50" height="100" fill={secondary} />}
        {pattern === 'sash' && <path d="M-10 78 L78 -10 L100 12 L12 100 Z" fill={secondary} />}
        {pattern === 'hoop' && <rect x="0" y="38" width="100" height="26" fill={secondary} />}
        {pattern === 'quarters' && (
          <>
            <rect x="50" y="0" width="50" height="50" fill={secondary} />
            <rect x="0" y="50" width="50" height="50" fill={secondary} />
          </>
        )}
        <rect x="0" y="0" width="100" height="100" fill={`url(#sh${uid})`} />
      </g>
      <path d={d} fill="none" stroke={secondary} strokeWidth="4" />
      <path d={d} fill="none" stroke="rgba(0,0,0,.45)" strokeWidth="1.5" />
      <text
        x="50" y="62" textAnchor="middle"
        fontFamily="Bebas Neue, Impact, sans-serif" fontSize="34"
        fill={fg} letterSpacing="0.5"
        style={{ paintOrder: 'stroke', stroke: 'rgba(0,0,0,.35)', strokeWidth: 2 }}
      >
        {club.short}
      </text>
    </svg>
  );
}

// ---- league badge ----------------------------------------------------------

// Confederations get a family colour so leagues read by region at a glance.
const CONFED_COLOR: Record<string, [string, string]> = {
  UEFA: ['#1B3FA0', '#7CC0FF'],
  CONMEBOL: ['#0B7A3B', '#FFD84D'],
  CONCACAF: ['#8A1538', '#FF9E4D'],
  AFC: ['#B8860B', '#FFE99C'],
  CAF: ['#1E6B4F', '#F2B705'],
};

export function LeagueBadge({ leagueId, size = 28 }: { leagueId: string; size?: number }) {
  const league = getLeague(leagueId);
  if (!league) return null;
  const [base, accent] = CONFED_COLOR[league.confed] ?? CONFED_COLOR.UEFA;
  const h = hash(league.id);
  const uid = `l${h.toString(36)}`;
  // Two initials from the league name read better than a squashed full name.
  const initials = league.en
    .replace(/[^A-Za-z ]/g, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();
  // Tier drives how many pips sit under the mark: elite leagues show more.
  const pips = Math.max(1, 6 - league.tier);

  return (
    <svg
      viewBox="0 0 100 100" width={size} height={size} role="img"
      aria-label={league.en} className="flex-shrink-0"
    >
      <defs>
        <linearGradient id={`lg${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={accent} />
          <stop offset="100%" stopColor={base} />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="46" fill={`url(#lg${uid})`} />
      <circle cx="50" cy="50" r="46" fill="none" stroke={accent} strokeWidth="3" />
      <circle cx="50" cy="50" r="37" fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="1.5" />
      <text
        x="50" y="58" textAnchor="middle"
        fontFamily="Bebas Neue, Impact, sans-serif" fontSize="34" fill="#fff"
        letterSpacing="1"
      >
        {initials}
      </text>
      {Array.from({ length: pips }).map((_, i) => (
        <circle
          key={i}
          cx={50 + (i - (pips - 1) / 2) * 9}
          cy="80" r="2.4" fill="#fff" fillOpacity="0.85"
        />
      ))}
    </svg>
  );
}
