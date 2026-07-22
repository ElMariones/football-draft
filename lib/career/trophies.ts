import type { Title } from '@/data/career/types';
import { getNation } from '@/data/career/nations';

const BASE = 'https://media.copero.com.ar/trophies/football/';

// Verified copero trophy PNGs, keyed by our title key. Anything not here (most
// individual awards, league titles, minor cups) renders an emoji instead.
const TROPHY_IMG: Record<string, string> = {
  champions: 'international/UEFA/champions-league.png',
  europa: 'international/UEFA/europa-league.png',
  libertadores: 'international/CONMEBOL/libertadores.png',
  sudamericana: 'international/CONMEBOL/copa-sudamericana.png',
  'world-cup': 'international/FIFA/world-cup.png',
};

export function trophyImageUrl(title: Title): string | null {
  let path = TROPHY_IMG[title.key];
  if (!path && title.key === 'continental-cup') {
    // Copa América is available; the Euro image isn't on the CDN.
    if (getNation(title.nationCode ?? '')?.confed === 'CONMEBOL') {
      path = 'international/CONMEBOL/copa-america.png';
    }
  }
  return path ? BASE + path : null;
}

export function trophyEmoji(title: Title): string {
  return title.kind === 'national' ? '🌍' : title.kind === 'individual' ? '🥇' : '🏆';
}
