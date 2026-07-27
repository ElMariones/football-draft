'use client';

// Trophy and award artwork.
//
// Every honour gets its own silhouette and palette: the Ballon d'Or is a ball
// on a plinth, the Golden Boot is a boot, best keeper is a glove, best defender
// a shield. League and domestic-cup titles take the colours of the country they
// were won in, so ten league titles from three countries read as three
// different trophies instead of ten identical cups.
import type { Title } from '@/data/career/types';
import { getClub } from '@/data/career/clubs';
import { getLeague } from '@/data/career/leagues';

type Shape = 'cup' | 'bigear' | 'plate' | 'star' | 'boot' | 'glove' | 'ball' | 'shield' | 'medal' | 'crown' | 'globe';

interface Spec { shape: Shape; a: string; b: string }

// Country palettes for domestic honours.
const NATION_COLOR: Record<string, [string, string]> = {
  EN: ['#E8EDF2', '#3D195B'], ES: ['#FFC400', '#C60B1E'], DE: ['#E8E8E8', '#111111'],
  IT: ['#66C0FF', '#0B3E8F'], FR: ['#8FB8FF', '#0B2A6B'], PT: ['#3FA34D', '#C8102E'],
  NL: ['#FF8A3D', '#123A75'], AR: ['#8FC7EA', '#0B3E8F'], BR: ['#FFDD1C', '#0B7A3B'],
  MX: ['#0B7A3B', '#C8102E'], US: ['#B7C9E5', '#0A3161'], CL: ['#C8102E', '#0039A6'],
  SA: ['#0B7A3B', '#E8E8E8'], BE: ['#F2C300', '#111111'], TR: ['#E30A17', '#E8E8E8'],
  SC: ['#9CC4E8', '#0B2A6B'], CH: ['#E8E8E8', '#DA291C'], AT: ['#F0C9C9', '#ED2939'],
  GR: ['#9FC7F0', '#0D5EAF'], UA: ['#FFD700', '#0057B7'], RU: ['#E8E8E8', '#0039A6'],
  DK: ['#F0B8C0', '#C60C30'], NO: ['#E8A0AC', '#00205B'], SE: ['#FFD84D', '#006AA7'],
  PL: ['#F2D0D6', '#DC143C'], CZ: ['#E8A6AA', '#11457E'], HR: ['#F0C0C4', '#C6363C'],
  RS: ['#E8B4B8', '#0C4076'], IE: ['#8FD6A8', '#169B62'], CO: ['#FCD116', '#003893'],
  UY: ['#9FD4F5', '#0B3E8F'], PE: ['#F5B7BD', '#D91023'], EC: ['#FFDD00', '#0033A0'],
  PY: ['#F0BEC4', '#0038A8'], CR: ['#F2C2C8', '#002B7F'], JP: ['#F5C7CE', '#BC002D'],
  KR: ['#E8B9BF', '#0047A0'], AU: ['#FFCD00', '#00843D'], EG: ['#F2CDD2', '#CE1126'],
  MA: ['#EFC9CD', '#C1272D'], NG: ['#9FD9B4', '#008751'], DZ: ['#A8DCBC', '#006233'],
  SN: ['#A8D9B8', '#00853F'], GH: ['#FFD86B', '#006B3F'], CI: ['#FFC48A', '#F77F00'],
  CM: ['#9AD4BE', '#007A5E'],
};

// Fixed identities for the honours that are the same trophy everywhere.
const SPECS: Record<string, Spec> = {
  // ---- club competitions ----
  champions:         { shape: 'bigear', a: '#EAF2FF', b: '#5B7FBF' },
  europa:            { shape: 'cup',    a: '#FFB84D', b: '#8A4B00' },
  libertadores:      { shape: 'cup',    a: '#FFE082', b: '#0B7A3B' },
  sudamericana:      { shape: 'cup',    a: '#C8D8E8', b: '#8A1538' },
  'concacaf-cup':    { shape: 'cup',    a: '#9FD8FF', b: '#0B4C8A' },
  'afc-cl':          { shape: 'cup',    a: '#FFE9A8', b: '#8A6D00' },
  'caf-cl':          { shape: 'cup',    a: '#A8E0C0', b: '#146B3F' },
  'club-world-cup':  { shape: 'globe',  a: '#FFD700', b: '#8A6D00' },
  // ---- national team ----
  'world-cup':       { shape: 'globe',  a: '#FFD700', b: '#7A5C00' },
  'continental-cup': { shape: 'cup',    a: '#F2E2A8', b: '#6B5A1E' },
  'nations-league':  { shape: 'cup',    a: '#D8E4F5', b: '#2A4A8A' },
  // ---- individual: each one visually distinct ----
  'ballon-dor':      { shape: 'ball',   a: '#FFD700', b: '#8A6D00' },
  'the-best':        { shape: 'crown',  a: '#FFE9A8', b: '#8A6D00' },
  'golden-shoe':     { shape: 'boot',   a: '#FFD700', b: '#8A6D00' },
  'league-top-scorer':   { shape: 'boot',   a: '#E6B84D', b: '#6B4A00' },
  'continent-top-scorer':{ shape: 'boot',   a: '#F0C978', b: '#7A5400' },
  'tournament-golden-boot': { shape: 'boot', a: '#FFC93D', b: '#7A5400' },
  'tournament-golden-ball': { shape: 'ball', a: '#FFDF6B', b: '#7A5400' },
  'league-top-assist':   { shape: 'medal',  a: '#B8E0FF', b: '#2A5C8A' },
  'league-mvp':          { shape: 'star',   a: '#FFE9A8', b: '#8A6D00' },
  'best-player-continent':{ shape: 'star',  a: '#D8C0FF', b: '#4A2A8A' },
  'league-best-keeper':  { shape: 'glove',  a: '#A8E8D0', b: '#146B52' },
  'world-best-keeper':   { shape: 'glove',  a: '#7CF5D5', b: '#0B5442' },
  'league-best-defender':{ shape: 'shield', a: '#C0D0E0', b: '#3A4A5C' },
  'world-best-defender': { shape: 'shield', a: '#DCE8F5', b: '#1E3A5C' },
  'league-best-midfielder': { shape: 'medal', a: '#C8E6C9', b: '#2E6B33' },
  'world-best-midfielder':  { shape: 'medal', a: '#A5E8B0', b: '#175E22' },
  'league-best-forward': { shape: 'star',   a: '#FFC2C2', b: '#8A2A2A' },
  'world-best-forward':  { shape: 'star',   a: '#FF9E9E', b: '#6B1414' },
  'league-best-young':   { shape: 'medal',  a: '#FFE0A8', b: '#8A5A00' },
  'world-best-young':    { shape: 'star',   a: '#FFD08A', b: '#7A4A00' },
};

function specFor(t: Title): Spec {
  const fixed = SPECS[t.key];
  if (fixed) return fixed;
  // Domestic honours take the colours of the country they were won in.
  const club = t.clubId ? getClub(t.clubId) : null;
  const nation = club ? getLeague(club.leagueId)?.nationCode : t.nationCode;
  const [a, b] = NATION_COLOR[nation ?? ''] ?? ['#E7C46B', '#8A6D00'];
  if (t.key === 'league') return { shape: 'plate', a, b };
  if (t.key === 'domestic-cup') return { shape: 'cup', a, b };
  return { shape: t.kind === 'individual' ? 'star' : 'cup', a, b };
}

function Body({ shape, fill, stroke }: { shape: Shape; fill: string; stroke: string }) {
  switch (shape) {
    case 'bigear': // continental cup with the oversized handles
      return (
        <g fill={fill} stroke={stroke} strokeWidth="1.2">
          <path d="M20 8 H40 V22 C40 31 35 37 30 37 C25 37 20 31 20 22 Z" />
          <path d="M20 10 C8 10 6 18 8 24 C10 29 15 31 19 30 L18 25 C14 25 12 22 13 18 C14 15 17 14 20 14 Z" />
          <path d="M40 10 C52 10 54 18 52 24 C50 29 45 31 41 30 L42 25 C46 25 48 22 47 18 C46 15 43 14 40 14 Z" />
          <rect x="27" y="36" width="6" height="8" />
          <rect x="18" y="43" width="24" height="4" rx="1.5" />
          <rect x="14" y="46" width="32" height="6" rx="2" />
        </g>
      );
    case 'plate': // league salver
      return (
        <g fill={fill} stroke={stroke} strokeWidth="1.2">
          <ellipse cx="30" cy="24" rx="20" ry="14" />
          <ellipse cx="30" cy="24" rx="13" ry="8.5" fill={stroke} opacity="0.35" stroke="none" />
          <path d="M10 24 C10 33 19 39 30 39 C41 39 50 33 50 24 L50 28 C50 37 41 43 30 43 C19 43 10 37 10 28 Z" />
          <rect x="26" y="42" width="8" height="5" />
          <rect x="19" y="46" width="22" height="5" rx="2" />
        </g>
      );
    case 'boot':
      return (
        <g fill={fill} stroke={stroke} strokeWidth="1.2">
          <path d="M17 14 C22 14 25 17 26 22 L28 30 C29 34 33 35 39 36 C46 37 50 39 50 43 L50 46 H14 L13 30 C12 22 13 14 17 14 Z" />
          <path d="M14 46 H50 V50 H14 Z" fill={stroke} stroke="none" />
          <circle cx="20" cy="42" r="1.6" fill={stroke} stroke="none" />
          <circle cx="27" cy="42" r="1.6" fill={stroke} stroke="none" />
          <circle cx="34" cy="42" r="1.6" fill={stroke} stroke="none" />
        </g>
      );
    case 'glove':
      return (
        <g fill={fill} stroke={stroke} strokeWidth="1.2">
          <path d="M20 20 C20 15 25 13 27 17 L28 24 L29 14 C29 9 35 9 35 14 L35 24 L37 16 C38 11 43 12 43 17 L42 30 C42 40 36 46 30 46 C23 46 18 40 18 33 Z" />
          <path d="M18 33 C14 30 12 24 15 22 C17 21 19 23 19 26 Z" />
          <rect x="19" y="44" width="22" height="6" rx="2" fill={stroke} stroke="none" />
        </g>
      );
    case 'ball':
      return (
        <g>
          <circle cx="30" cy="24" r="15" fill={fill} stroke={stroke} strokeWidth="1.2" />
          <path d="M30 13 L36 18 L34 25 H26 L24 18 Z" fill={stroke} opacity="0.75" />
          <path d="M30 39 L30 43 M22 36 L20 41 M38 36 L40 41" stroke={stroke} strokeWidth="1.5" />
          <rect x="24" y="42" width="12" height="4" fill={fill} stroke={stroke} strokeWidth="1" />
          <rect x="18" y="45" width="24" height="6" rx="2" fill={fill} stroke={stroke} strokeWidth="1.2" />
        </g>
      );
    case 'shield':
      return (
        <g fill={fill} stroke={stroke} strokeWidth="1.4">
          <path d="M12 12 L30 6 L48 12 V28 C48 40 40 48 30 52 C20 48 12 40 12 28 Z" />
          <path d="M30 14 V44" stroke={stroke} strokeWidth="1.2" opacity="0.6" />
        </g>
      );
    case 'medal':
      return (
        <g fill={fill} stroke={stroke} strokeWidth="1.3">
          <path d="M20 6 L27 26 L20 28 Z" />
          <path d="M40 6 L33 26 L40 28 Z" />
          <circle cx="30" cy="37" r="14" />
          <circle cx="30" cy="37" r="8" fill={stroke} opacity="0.35" stroke="none" />
        </g>
      );
    case 'crown':
      return (
        <g fill={fill} stroke={stroke} strokeWidth="1.3">
          <path d="M12 40 L9 16 L20 26 L30 10 L40 26 L51 16 L48 40 Z" />
          <rect x="12" y="41" width="36" height="7" rx="2" />
        </g>
      );
    case 'globe':
      return (
        <g fill={fill} stroke={stroke} strokeWidth="1.3">
          <circle cx="30" cy="21" r="13" />
          <ellipse cx="30" cy="21" rx="6" ry="13" fill="none" stroke={stroke} strokeWidth="1.1" />
          <path d="M17 21 H43" stroke={stroke} strokeWidth="1.1" fill="none" />
          <path d="M22 34 C24 40 22 44 20 47 H40 C38 44 36 40 38 34 Z" />
          <rect x="15" y="46" width="30" height="6" rx="2" />
        </g>
      );
    default: // cup
      return (
        <g fill={fill} stroke={stroke} strokeWidth="1.2">
          <path d="M19 8 H41 V23 C41 32 36 38 30 38 C24 38 19 32 19 23 Z" />
          <path d="M19 10 H11 V18 C11 25 15 29 21 30 L20 25 C16 24 15 21 15 18 V14 H19 Z" />
          <path d="M41 10 H49 V18 C49 25 45 29 39 30 L40 25 C44 24 45 21 45 18 V14 H41 Z" />
          <rect x="27" y="37" width="6" height="8" />
          <rect x="19" y="44" width="22" height="4" rx="1.5" />
          <rect x="15" y="47" width="30" height="5" rx="2" />
        </g>
      );
  }
}

export function TrophyIcon({ title, size = 22 }: { title: Title; size?: number }) {
  const spec = specFor(title);
  const uid = `tr${(title.key + (title.clubId ?? title.nationCode ?? '')).replace(/[^a-z0-9]/gi, '')}`;
  return (
    <svg
      viewBox="0 0 60 60" width={size} height={size} role="img" aria-label={title.key}
      className="flex-shrink-0" style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.55))' }}
    >
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="40%" stopColor={spec.a} />
          <stop offset="100%" stopColor={spec.b} />
        </linearGradient>
      </defs>
      <Body shape={spec.shape} fill={`url(#${uid})`} stroke={spec.b} />
    </svg>
  );
}
