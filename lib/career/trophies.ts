import type { Title } from '@/data/career/types';
import { TROPHY_WIKI } from '@/data/career/trophy-urls';

const BASE = 'https://media.copero.com.ar/trophies/football/';

// Verified copero trophy PNGs, keyed by our title key. Anything not here (most
// individual awards, league titles, minor cups) renders an emoji instead.
const TROPHY_IMG: Record<string, string> = {
  champions: 'international/UEFA/champions-league.png',
  europa: 'international/UEFA/europa-league.png',
  libertadores: 'international/CONMEBOL/libertadores.png',
  sudamericana: 'international/CONMEBOL/copa-sudamericana.png',
  'copa-america': 'international/CONMEBOL/copa-america.png',
  'world-cup': 'international/FIFA/world-cup.png',
  'club-world-cup': 'international/FIFA/club-world-cup.png',
};

export function trophyImageUrl(title: Title): string | null {
  const path = TROPHY_IMG[title.key];
  if (path) return BASE + path;
  // Everything the trophy CDN does not carry is resolved from Wikipedia (see
  // scripts/fetch-trophies.mjs); anything still missing falls back to the drawn
  // icon in components/career/TrophyArt.tsx.
  return TROPHY_WIKI[title.key] ?? null;
}

export function trophyEmoji(title: Title): string {
  return title.kind === 'national' ? '🌍' : title.kind === 'individual' ? '🥇' : '🏆';
}
