import type { CareerPlayer, CareerClub, Title, Confederation } from '@/data/career/types';
import { getLeague } from '@/data/career/leagues';
import { getNation } from '@/data/career/nations';
import { Rng, clamp, logistic } from './rng';
import { leagueMaxStrength, qualifiesContinental, SeasonOutput } from './engine';
import { isAttacker } from './config';

function continentalKey(confed: Confederation, elite: boolean): string {
  switch (confed) {
    case 'UEFA': return elite ? 'champions' : 'europa';
    case 'CONMEBOL': return elite ? 'libertadores' : 'sudamericana';
    case 'CONCACAF': return 'concacaf-cup';
    case 'AFC': return 'afc-cl';
    case 'CAF': return 'caf-cl';
  }
}

const BIG = new Set([
  'league', 'champions', 'libertadores', 'world-cup',
  'euro', 'copa-america', 'asian-cup', 'afcon', 'gold-cup',
]);

// Each confederation's own championship — "Copa Continental" was a placeholder
// standing in for five real, very different trophies.
const CONTINENTAL_KEY: Record<string, string> = {
  UEFA: 'euro',
  CONMEBOL: 'copa-america',
  AFC: 'asian-cup',
  CAF: 'afcon',
  CONCACAF: 'gold-cup',
};
export function isBigTitle(key: string): boolean {
  return BIG.has(key);
}

export interface ClubTitleResult {
  titles: Title[];
  wonLeague: boolean;
  wonContinental: boolean;
  continentalElite: boolean;
}

export function rollClubTitles(p: CareerPlayer, club: CareerClub, out: SeasonOutput, rng: Rng): ClubTitleResult {
  const league = getLeague(club.leagueId)!;
  const max = leagueMaxStrength(club.leagueId);
  const titles: Title[] = [];
  const t = (key: string): Title => ({ key, kind: 'club', scope: 'club', age: p.age, clubId: club.id });

  const contribution = clamp(-0.1, 0.15, (out.rating - 6.5) * 0.05);
  const leagueChance = clamp(0, 0.85, logistic((club.strength - (max - 3)) * 0.55) + contribution);
  let wonLeague = false;
  if (rng.chance(leagueChance)) { titles.push(t('league')); wonLeague = true; }

  const cupChance = 0.05 + 0.22 * logistic((club.strength - 72) * 0.15);
  if (rng.chance(cupChance)) titles.push(t('domestic-cup'));

  let wonContinental = false;
  let elite = false;
  if (qualifiesContinental(club)) {
    elite = club.strength >= max - 2;
    const contChance = clamp(0, 0.5, logistic((club.strength - 84) * 0.32));
    if (rng.chance(contChance)) {
      titles.push(t(continentalKey(league.confed, elite)));
      wonContinental = true;
      if (elite && rng.chance(0.4)) titles.push(t('club-world-cup'));
    }
  }
  return { titles, wonLeague, wonContinental, continentalElite: elite };
}

// ---- international ----------------------------------------------------------

export interface IntlResult {
  titles: Title[];
  played: null | 'world' | 'continental';
  finalist: boolean;
  won: boolean;
}

// Real-ish cycle: World Cup on years ≡ 2026 (mod 4), continental on the even
// years in between.
function tournamentThisYear(year: number): null | 'world' | 'continental' {
  if ((year - 2026) % 4 === 0) return 'world';
  if (year % 2 === 0) return 'continental';
  return null;
}

// rollInternational moved to lib/career/international.ts, which models
// selection, squad role, qualification and tournament results properly.
