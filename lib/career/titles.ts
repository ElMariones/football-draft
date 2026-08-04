import type {
  CareerPlayer, CareerClub, Title, Confederation, CompRun, CompStage,
} from '@/data/career/types';
import { getLeague } from '@/data/career/leagues';
import { clubsInLeague } from '@/data/career/clubs';
import { getNation } from '@/data/career/nations';
import { Rng, clamp, logistic } from './rng';
import { leagueMaxStrength, qualifiesContinental, SeasonOutput } from './engine';
import { isAttacker, leagueGamesByTier } from './config';

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
  /** every competition the club played, and how far it got */
  comps: CompRun[];
}

/**
 * Where a knockout run ends, given the odds of actually lifting it.
 *
 * `rounds` is the ladder the club enters at, so a domestic cup starts at the
 * last 32 and a continental campaign starts in the group. The per-round survival
 * rate is set so that clearing every round lands on `winChance` — the same
 * number the old binary roll used — which keeps the trophy count exactly where
 * it was tuned while giving every losing season a round to name.
 */
function knockoutStage(rounds: CompStage[], winChance: number, rng: Rng): CompStage {
  const p = clamp(0.25, 0.94, Math.pow(clamp(0.001, 0.999, winChance), 1 / rounds.length));
  for (let i = 0; i < rounds.length; i++) {
    if (!rng.chance(p)) return rounds[i];
  }
  return 'won';
}

const CUP_LADDER: CompStage[] = ['r32', 'r16', 'qf', 'sf', 'final'];
const CONT_LADDER: CompStage[] = ['group', 'r16', 'qf', 'sf', 'final'];

/** Teams in the division, inferred from the fixture list. */
function leagueSize(tier: number): number {
  return Math.round(leagueGamesByTier(tier) / 2) + 1;
}

/**
 * The final table, as far as the player's own line in it is concerned.
 *
 * Every club in the division is given its strength plus a season's worth of
 * noise, the player's own contribution is added to his club, and the table is
 * read off the sort. The pool holds fewer clubs than a real division, so the
 * rest of the table is filled with plausible mid-table sides below the weakest
 * real one — otherwise a bottom-half finish in a ten-club pool reads as 10th.
 */
function leaguePosition(
  club: CareerClub, tier: number, contribution: number, wonLeague: boolean, rng: Rng,
): { position: number; teams: number } {
  const teams = leagueSize(tier);
  const real = clubsInLeague(club.leagueId);
  const weakest = real.reduce((m, c) => Math.min(m, c.strength), 99);

  const scores: number[] = [];
  for (const c of real) {
    if (c.id === club.id) continue;
    scores.push(c.strength + rng.gauss(0, 4.5));
  }
  // filler sides for the places the club pool does not cover
  for (let i = real.length; i < teams; i++) {
    scores.push(weakest - 2 - rng.range(0, 9) + rng.gauss(0, 3.5));
  }
  const mine = club.strength + contribution * 22 + rng.gauss(0, 4.5);

  let above = 0;
  for (const s of scores) if (s > mine) above++;
  let position = clamp(1, teams, above + 1);

  // The table has to agree with the trophy: champions finish first, and a club
  // that did not win the league cannot be sitting top of it.
  if (wonLeague) position = 1;
  else if (position === 1) position = 2;
  return { position, teams };
}

export function rollClubTitles(p: CareerPlayer, club: CareerClub, out: SeasonOutput, rng: Rng): ClubTitleResult {
  const league = getLeague(club.leagueId)!;
  const max = leagueMaxStrength(club.leagueId);
  const titles: Title[] = [];
  const comps: CompRun[] = [];
  const t = (key: string): Title => ({ key, kind: 'club', scope: 'club', age: p.age, clubId: club.id });

  const contribution = clamp(-0.1, 0.15, (out.rating - 6.5) * 0.05);
  const leagueChance = clamp(0, 0.85, logistic((club.strength - (max - 3)) * 0.55) + contribution);
  let wonLeague = false;
  if (rng.chance(leagueChance)) { titles.push(t('league')); wonLeague = true; }
  const table = leaguePosition(club, league.tier, contribution, wonLeague, rng);
  comps.push({
    key: 'league', kind: 'league', entered: true, won: wonLeague,
    position: table.position, teams: table.teams,
  });

  const cupChance = 0.05 + 0.22 * logistic((club.strength - 72) * 0.15);
  const cupStage = knockoutStage(CUP_LADDER, cupChance, rng);
  if (cupStage === 'won') titles.push(t('domestic-cup'));
  comps.push({
    key: 'domestic-cup', kind: 'cup', entered: true,
    won: cupStage === 'won', stage: cupStage,
  });

  let wonContinental = false;
  let elite = false;
  if (qualifiesContinental(club)) {
    elite = club.strength >= max - 2;
    const contKey = continentalKey(league.confed, elite);
    const contChance = clamp(0, 0.5, logistic((club.strength - 84) * 0.32));
    const contStage = knockoutStage(CONT_LADDER, contChance, rng);
    if (contStage === 'won') {
      titles.push(t(contKey));
      wonContinental = true;
      if (elite && rng.chance(0.4)) titles.push(t('club-world-cup'));
    }
    comps.push({
      key: contKey, kind: 'continental', entered: true,
      won: wonContinental, stage: contStage,
    });
  } else {
    comps.push({
      key: continentalKey(league.confed, false), kind: 'continental', entered: false, won: false,
    });
  }
  return { titles, wonLeague, wonContinental, continentalElite: elite, comps };
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
