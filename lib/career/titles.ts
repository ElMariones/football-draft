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

const BIG = new Set(['league', 'champions', 'libertadores', 'world-cup', 'continental-cup']);
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

export function rollInternational(p: CareerPlayer, out: SeasonOutput, year: number, rng: Rng): IntlResult {
  const nation = getNation(p.ntNationCode);
  const res: IntlResult = { titles: [], played: null, finalist: false, won: false };
  if (!nation) return res;

  // call-up gate
  const threshold = clamp(35, 82, nation.strength - 24);
  if (!p.ntCapped) {
    if (p.reputation >= threshold && p.overall >= 68) {
      p.ntCapped = true;
      p.flags['ntDebut'] = true;
    } else {
      return res;
    }
  }

  // caps + goals for the year
  const yearCaps = Math.round(rng.range(6, 11));
  p.ntCaps += yearCaps;
  if (isAttacker(p.position)) {
    p.ntGoals += Math.max(0, Math.round(rng.gauss(yearCaps * 0.35 * (p.overall / 85), 1.5)));
  }

  const tour = tournamentThisYear(year);
  if (!tour) return res;
  res.played = tour;

  const eff = out.effOverall;
  const base = nation.strength + eff * 0.15 - (tour === 'world' ? 97 : 95);
  const winChance = clamp(0.01, 0.6, logistic(base * 0.28));
  const finalistChance = clamp(0.03, 0.75, logistic((base + 4) * 0.26));

  res.finalist = rng.chance(finalistChance);
  if (res.finalist && rng.chance(winChance / Math.max(0.05, finalistChance))) {
    res.won = true;
    const key = tour === 'world' ? 'world-cup' : 'continental-cup';
    res.titles.push({ key, kind: 'national', scope: 'national', age: p.age, nationCode: p.ntNationCode });
    p.flags[tour === 'world' ? 'wonWorldCup' : 'wonContinental'] = true;
  }
  return res;
}
