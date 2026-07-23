import type { CareerPlayer, CareerClub, Title, TitleScope } from '@/data/career/types';
import { getLeague } from '@/data/career/leagues';
import { Rng, clamp } from './rng';
import { SeasonOutput } from './engine';
import { ClubTitleResult, IntlResult } from './titles';
import { isAttacker, isMidfielder } from './config';

function group(pos: string) {
  const attacker = ['ST', 'CF', 'RW', 'LW', 'CAM'].includes(pos);
  const forwardWorld = ['ST', 'CF', 'RW', 'LW'].includes(pos);
  const midfield = ['CDM', 'CM', 'CAM', 'RM', 'LM'].includes(pos);
  const defender = ['CB', 'LB', 'RB', 'RWB', 'LWB'].includes(pos);
  const keeper = pos === 'GK';
  return { attacker, forwardWorld, midfield, defender, keeper };
}

export function rollAwards(
  p: CareerPlayer, club: CareerClub, out: SeasonOutput,
  clubT: ClubTitleResult, intl: IntlResult, rng: Rng,
): Title[] {
  const titles: Title[] = [];
  const league = getLeague(club.leagueId)!;
  const tier = league.tier;
  const g = group(p.position);

  const keys = new Set(clubT.titles.map(t => t.key));
  const bigClub = keys.has('champions') || keys.has('libertadores');
  const wonLeague = clubT.wonLeague;

  // title contribution to a season score
  let titleScore = 0;
  if (wonLeague) titleScore += 0.12;
  if (bigClub) titleScore += 0.2;
  if (intl.won) titleScore += 0.25;
  if (keys.has('domestic-cup')) titleScore += 0.03;

  const ratingScore = (out.rating - 6.0) / 3.5;
  const ovrScore = (out.effOverall - 70) / 29;
  const score = clamp(0, 1.4, 0.42 * ratingScore + titleScore + 0.18 * ovrScore + p.reputation / 400);

  const add = (key: string, scope: TitleScope, prob: number) => {
    if (rng.chance(prob)) {
      titles.push({ key, kind: 'individual', scope, age: p.age, clubId: club.id });
    }
  };

  // Top-scorer / playmaker bars — with the new (lower) goal scale only genuinely
  // elite attackers clear these, so no league-ease inflation is needed.
  const goalBar = Math.round(rng.gauss(16, 2.5));
  const assistBar = Math.round(rng.gauss(10, 2));

  // ---- League tier ----
  if (out.apps >= 12) {
    if (out.rating >= 7.6 && score >= rng.gauss(0.55, 0.06)) add('league-mvp', 'league', 0.85);
    if (g.attacker && out.goals >= goalBar) add('league-top-scorer', 'league', 0.9);
    if ((g.attacker || g.midfield) && out.assists >= assistBar) add('league-top-assist', 'league', 0.85);
    if (g.keeper && out.rating >= 7.3 && score >= rng.gauss(0.5, 0.06)) add('league-best-keeper', 'league', 0.8);
    if (g.defender && out.rating >= 7.4 && (wonLeague || score >= 0.6)) add('league-best-defender', 'league', 0.7);
    if (g.midfield && out.rating >= 7.5 && score >= rng.gauss(0.55, 0.06)) add('league-best-midfielder', 'league', 0.7);
    if (g.forwardWorld && out.rating >= 7.5 && out.goals >= goalBar - 4) add('league-best-forward', 'league', 0.7);
    if (p.age <= 21 && out.rating >= 7.3 && out.apps >= 15) add('league-best-young', 'league', 0.75);
  }

  // Context gates: reputation is the natural gate for elite honours — it only
  // climbs high through big minutes in strong leagues and major trophies, so a
  // lower-division hero can never reach the world/continental thresholds.
  const majorTrophy = bigClub || intl.won || wonLeague;
  const contContext = majorTrophy && p.reputation >= 70;
  const worldContext = majorTrophy && p.reputation >= 80;

  // ---- Continental ----
  if (score >= rng.gauss(0.88, 0.06) && contContext) add('best-player-continent', 'continent', 0.6);
  if (g.attacker && tier <= 2 && out.goals >= goalBar + 6 && p.reputation >= 64) {
    add(tier === 1 && league.confed === 'UEFA' ? 'golden-shoe' : 'continent-top-scorer', 'continent', 0.7);
  }

  // ---- World ----
  if (score >= rng.gauss(0.95, 0.05) && (bigClub || intl.won) && p.reputation >= 84) {
    add('ballon-dor', 'world', 0.7);
    add('the-best', 'world', 0.55);
  }
  if (p.age <= 21 && score >= rng.gauss(0.82, 0.05) && p.reputation >= 66) add('world-best-young', 'world', 0.55);
  if (g.keeper && worldContext && out.rating >= 7.8 && score >= 0.7) add('world-best-keeper', 'world', 0.55);
  if (g.defender && worldContext && out.rating >= 7.7 && score >= 0.72) add('world-best-defender', 'world', 0.5);
  if (g.midfield && worldContext && out.rating >= 7.7 && score >= 0.75) add('world-best-midfielder', 'world', 0.5);
  if (g.forwardWorld && worldContext && out.rating >= 7.7 && out.goals >= goalBar) add('world-best-forward', 'world', 0.5);

  // ---- Tournament ----
  if (intl.finalist) {
    if (score >= rng.gauss(0.7, 0.06)) add('tournament-golden-ball', 'tournament', 0.5);
    if (isAttacker(p.position)) add('tournament-golden-boot', 'tournament', 0.4);
  }

  return titles;
}

export { isAttacker, isMidfielder };
