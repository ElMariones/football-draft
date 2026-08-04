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

  // Every individual award carries the division it was won in, so a league MVP
  // is a *Premier League* MVP forever — including after the club is relegated.
  const add = (key: string, scope: TitleScope, prob: number) => {
    if (rng.chance(prob)) {
      titles.push({
        key, kind: 'individual', scope, age: p.age,
        clubId: club.id, leagueId: club.leagueId,
      });
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
  if (p.age <= 21 && score >= rng.gauss(0.82, 0.05) && p.reputation >= 66) add('world-best-young', 'world', 0.55);
  if (g.keeper && worldContext && out.rating >= 7.8 && score >= 0.7) add('world-best-keeper', 'world', 0.55);
  if (g.defender && worldContext && out.rating >= 7.7 && score >= 0.72) add('world-best-defender', 'world', 0.5);
  if (g.midfield && worldContext && out.rating >= 7.7 && score >= 0.75) add('world-best-midfielder', 'world', 0.5);
  if (g.forwardWorld && worldContext && out.rating >= 7.7 && out.goals >= goalBar) add('world-best-forward', 'world', 0.5);

  // ---- Tournament ----
  // The Golden Ball is a World Cup award, not something handed out at every
  // continental championship. The equivalent for a club season is the
  // Champions League player of the season, so that is what a European winner
  // competes for instead.
  if (intl.finalist && intl.played === 'world') {
    if (score >= rng.gauss(0.7, 0.06)) add('world-cup-golden-ball', 'tournament', 0.5);
    if (isAttacker(p.position)) add('world-cup-golden-boot', 'tournament', 0.4);
  }
  if (clubT.titles.some(t => t.key === 'champions') && score >= rng.gauss(0.68, 0.06)) {
    add('ucl-mvp', 'continent', 0.5);
  }

  // ---- Ballon d'Or ----
  // This used to be a stack of hard gates — score >= 1.12 AND rating >= 8.4 AND
  // reputation >= 88 AND a Champions League. The score ceiling for a season
  // without an international title was about 1.05, so the first gate alone shut
  // the award off almost entirely: you could be a 95-overall league MVP and top
  // scorer for a decade and never come close.
  //
  // It is now a contest instead. Your season is scored, the rest of the planet's
  // best season that year is drawn from a distribution, and the better one wins.
  // Sweeping the individual awards above is exactly the evidence that should
  // carry it, so those count directly.
  const honours = titles.filter(t => [
    'league-mvp', 'league-top-scorer', 'league-top-assist', 'best-player-continent',
    'golden-shoe', 'continent-top-scorer', 'ucl-mvp',
    'world-best-forward', 'world-best-midfielder', 'world-best-defender', 'world-best-keeper',
    'league-best-forward', 'league-best-midfielder', 'league-best-defender', 'league-best-keeper',
  ].includes(t.key)).length;

  let ballon = 0;
  // A freak rating alone must not carry it — ratings run high, so cap what one
  // hot season can contribute and let *being* the best player do the rest.
  ballon += Math.min(1.6, (out.rating - 7.2) * 0.9);
  ballon += (out.effOverall - 82) * 0.09;      // 95 overall is worth far more than 88
  ballon += (p.reputation - 70) * 0.012;       // how big the name is
  ballon += honours * 0.2;                     // the cabinet agrees
  if (wonLeague) ballon += 0.25;
  if (bigClub) ballon += 0.5;                  // a Champions League still decides most of them
  if (intl.won) ballon += 0.45;
  else if (intl.finalist && intl.played === 'world') ballon += 0.2;
  if (!majorTrophy) ballon -= 0.6;             // winning nothing is a real handicap, not a veto
  if (tier >= 3) ballon -= 0.8;                // nobody wins it from the third tier of world football
  if (g.defender || g.keeper) ballon -= 0.4;   // as the voters have always been
  // Without this a player who once reaches the top never comes off it: the field
  // is redrawn every year and he clears it every year, so careers were ending
  // with twelve. A reigning winner has to be beaten by a rival's breakout season
  // eventually, and the voters get restless.
  ballon -= Math.min(1.2, (p.ballonWins ?? 0) * 0.3);

  // the best season anyone else on earth had
  // Calibrated against 100 simulated careers: ~35% of careers win at least one,
  // a generational player wins 3-6 spread across his peak, and a merely very
  // good one wins none.
  const field = rng.gauss(4.0, 0.65);
  const ballonCase = out.apps >= 20 && p.reputation >= 72 && ballon >= field;
  if (ballonCase) {
    titles.push({
      key: 'ballon-dor', kind: 'individual', scope: 'world', age: p.age,
      clubId: club.id, leagueId: club.leagueId,
    });
    add('the-best', 'world', 0.72);
  } else if (out.apps >= 20 && p.reputation >= 72 && ballon >= field - 0.35) {
    // pipped to the Ballon d'Or but still the pick of a different jury
    add('the-best', 'world', 0.3);
  }

  return titles;
}

export { isAttacker, isMidfielder };
