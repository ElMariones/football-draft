import type { Position } from '@/data/types';
import type { CareerPlayer, CareerClub, Foot } from '@/data/career/types';
import { getClub, clubsInLeague } from '@/data/career/clubs';
import { getLeague } from '@/data/career/leagues';
import { Rng, clamp, logistic, smoothstep } from './rng';
import {
  CAREER, developmentByAge, declineByAge, leagueGamesByTier, CONTINENTAL_GAMES,
  ageMinutesBias, goalRate, assistRate, isKeeperOrDef, leagueEase, leaguePremium,
  ageValueMul, valueBase,
} from './config';

export interface SeasonOutput {
  apps: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  rating: number;
  minutesFactor: number;
  inContinental: boolean;
  effOverall: number;
}

// ---- creation --------------------------------------------------------------

export interface CreateOpts {
  nationCode: string;
  surname: string;
  number: number;
  foot: Foot;
  position: Position;
  seed: number;
  rng: Rng;
}

export function createPlayer(o: CreateOpts): CareerPlayer {
  const { rng } = o;
  const [omin, omax] = CAREER.startOverallRange;
  const overall = Math.round(rng.range(omin, omax + 1));
  const [pmin, pmax] = CAREER.potentialRange;
  const potential = clamp(overall + 12, 99, Math.round(rng.gauss((pmin + pmax) / 2, 6)));
  const p: CareerPlayer = {
    nationCode: o.nationCode,
    ntNationCode: o.nationCode,
    ntCapped: false,
    surname: o.surname || 'PLAYER',
    number: o.number || 10,
    foot: o.foot,
    position: o.position,
    age: CAREER.startAge,
    overall,
    potential,
    value: 0,
    form: 55,
    morale: 72,
    fitness: 88,
    injuryProneness: Math.round(rng.range(8, 22)),
    loyalty: 60,
    reputation: Math.max(10, overall - 32),
    discipline: Math.round(rng.range(50, 80)),
    consistency: Math.round(rng.range(45, 75)),
    roleBias: 0,
    injuryGamesNext: 0,
    ovrTemp: [],
    peakOverall: overall,
    peakValue: 0,
    clubId: null,
    loanFromClubId: null,
    contractYears: 0,
    retired: false,
    apps: 0,
    goals: 0,
    assists: 0,
    cleanSheets: 0,
    ntCaps: 0,
    ntGoals: 0,
    flags: {},
    clubsPlayed: [],
  };
  p.value = computeValue(p, 4);
  p.peakValue = p.value;
  return p;
}

// ---- league helpers --------------------------------------------------------

const leagueMaxCache = new Map<string, number>();
export function leagueMaxStrength(leagueId: string): number {
  if (leagueMaxCache.has(leagueId)) return leagueMaxCache.get(leagueId)!;
  const clubs = clubsInLeague(leagueId);
  const max = clubs.reduce((m, c) => Math.max(m, c.strength), 0);
  leagueMaxCache.set(leagueId, max);
  return max;
}

export function qualifiesContinental(club: CareerClub): boolean {
  const max = leagueMaxStrength(club.leagueId);
  return club.strength >= max - 5;
}

function effectiveOverall(p: CareerPlayer): number {
  let ovr = p.overall;
  for (const t of p.ovrTemp) ovr += t.delta;
  return clamp(35, 99, ovr);
}

// ---- season simulation -----------------------------------------------------

export function simulateSeason(p: CareerPlayer, club: CareerClub, rng: Rng): SeasonOutput {
  const league = getLeague(club.leagueId)!;
  const tier = league.tier;
  const effOverall = effectiveOverall(p);

  const starterLevel = club.strength - 2;
  const roleScore =
    (effOverall - starterLevel) +
    ageMinutesBias(p.age) +
    (p.morale - 50) / 12 +
    (p.fitness - 70) / 15 +
    p.roleBias;
  const minutesFactor = clamp(0.08, 1, logistic(roleScore, 0.3));

  const inContinental = qualifiesContinental(club);
  const availableGames = leagueGamesByTier(tier) + (inContinental ? CONTINENTAL_GAMES : 0);
  const gamesMissed = p.injuryGamesNext;
  const apps = clamp(0, availableGames, Math.round(availableGames * minutesFactor) - gamesMissed);

  const ease = leagueEase(tier);
  const formMul = 0.7 + p.form / 167;
  const noiseScale = 1 - p.consistency / 220;

  const gRate = goalRate(p.position) * Math.pow(effOverall / 72, 1.4) * ease * formMul;
  let goals = Math.round(gRate * apps + rng.gauss(0, apps * 0.06 * noiseScale + 0.5));
  goals = clamp(0, apps, goals);

  const aRate = assistRate(p.position) * Math.pow(effOverall / 74, 1.1) * (0.6 + club.strength / 160) * formMul;
  let assists = Math.round(aRate * apps + rng.gauss(0, apps * 0.05 * noiseScale + 0.4));
  assists = clamp(0, apps, assists);

  let cleanSheets = 0;
  if (isKeeperOrDef(p.position)) {
    const csRate = clamp(0.05, 0.6, (club.strength - 52) / 70) * (2 - ease * 0.9);
    cleanSheets = clamp(0, apps, Math.round(apps * csRate * 0.5));
  }

  // Season rating (0-10).
  const per = (x: number) => x / Math.max(1, apps);
  let outputScore: number;
  if (p.position === 'GK' || p.position === 'CB') {
    outputScore = per(cleanSheets) / 0.4 + (effOverall - 60) / 45;
  } else if (isKeeperOrDef(p.position)) {
    outputScore = per(cleanSheets) / 0.4 + per(assists) / 0.25 + (effOverall - 60) / 55;
  } else if (p.position === 'CM' || p.position === 'CDM' || p.position === 'RM' || p.position === 'LM') {
    outputScore = per(goals) / 0.3 + per(assists) / 0.35;
  } else {
    outputScore = per(goals) / 0.55 + per(assists) / 0.35;
  }
  const rating = clamp(5.0, 9.7, 6.0 + outputScore * 1.35 + (effOverall - 72) / 45 + (apps < 10 ? -0.4 : 0));

  return { apps, goals, assists, cleanSheets, rating, minutesFactor, inContinental, effOverall };
}

// ---- progression (mutates player) ------------------------------------------

export function applyProgression(
  p: CareerPlayer, club: CareerClub, out: SeasonOutput, bigTitles: number, rng: Rng,
) {
  const league = getLeague(club.leagueId)!;
  const tier = league.tier;

  // cumulative stats
  p.apps += out.apps;
  p.goals += out.goals;
  p.assists += out.assists;
  p.cleanSheets += out.cleanSheets;

  // Breakout: strong seasons raise the hidden ceiling, so sustained excellence
  // (goals, ratings, titles) keeps you improving instead of stalling at a low
  // random potential. This is what rewards "I played and scored constantly" —
  // but it's scaled by league quality (goals in a weak league count less) and
  // gets harder the closer you already are to world class.
  const ease = leagueEase(tier);
  const goalThreshold = isKeeperOrDef(p.position) ? Math.round(3 * ease) : Math.round(16 * ease);
  // Reaching world class requires performing in a strong league — each tier
  // caps how high your ceiling can be pushed by breakouts.
  const tierCeiling = tier <= 1 ? 97 : tier <= 2 ? 93 : tier <= 3 ? 88 : tier <= 4 ? 84 : 79;
  const headroom = clamp(0.15, 1, (94 - p.potential) / 18 + 0.15);
  const rawBreak =
    Math.max(0, out.rating - 7.3) * 1.1 +
    bigTitles * 0.7 +
    (out.goals >= goalThreshold ? 0.8 : 0);
  if (rawBreak > 0 && p.age <= 30 && out.apps >= 10) {
    const raised = Math.min(p.potential + rawBreak * headroom, tierCeiling);
    p.potential = Math.max(p.potential, raised); // never lowered by playing down
  }

  // growth vs potential, shaped by age + minutes. Growth cannot push you past
  // your ceiling — performance just gets you there faster.
  const gap = Math.max(0, p.potential - p.overall);
  const dev = developmentByAge(p.age);
  const playFactor = smoothstep(6, 30, out.apps);
  const moraleMod = 0.6 + p.morale / 125;
  const devGrowth = CAREER.growthK * dev * playFactor * (gap / 18) * moraleMod;
  const perfGrowth = Math.max(0, out.rating - 6.8) * playFactor * 0.5 * (gap > 0 ? 1 : 0);
  const growth = devGrowth + perfGrowth + (p.form - 50) / 220 + 0.5 * bigTitles;
  const decline = declineByAge(p.age);
  const grown = Math.min(p.potential, p.overall + Math.max(0, growth));
  p.overall = clamp(40, 99, grown - decline);
  p.peakOverall = Math.max(p.peakOverall, Math.round(p.overall));

  // form follows the season rating
  p.form = clamp(20, 99, p.form * 0.4 + (50 + (out.rating - 6.3) * 12) * 0.6);

  // morale from minutes + trophies
  const startShare = out.apps / Math.max(1, leagueGamesByTier(tier));
  p.morale = clamp(10, 100, p.morale + (startShare < 0.35 ? -5 : 3) + bigTitles * 5 + (out.rating > 7.5 ? 3 : 0));

  // fitness resets each offseason
  p.fitness = clamp(45, 99, 92 - p.injuryProneness * 0.3);

  // reputation grows with big minutes in strong leagues + titles
  const tierBoost = tier <= 1 ? 1.6 : tier <= 2 ? 1.2 : tier <= 3 ? 1.0 : 0.8;
  const repGain = (out.apps > 12 ? 2 : 0) * tierBoost + bigTitles * 5 + (out.rating - 6.5) * 1.5;
  p.reputation = clamp(0, 100, Math.max(p.reputation + repGain, p.overall - 30));

  // temporary OVR modifiers age out
  p.ovrTemp = p.ovrTemp
    .map(t => ({ ...t, years: t.years - 1 }))
    .filter(t => t.years > 0);

  // decays / consumption
  p.roleBias *= 0.45;
  p.injuryProneness = clamp(6, 100, p.injuryProneness - 1);
  p.injuryGamesNext = 0;
  p.contractYears = Math.max(0, p.contractYears - 1);

  // value + peak
  p.value = computeValue(p, tier);
  p.peakValue = Math.max(p.peakValue, p.value);
}

export function computeValue(p: CareerPlayer, tier: number): number {
  const base = valueBase(p.overall);
  let ageMul = ageValueMul(p.age);
  if (p.age <= 23) ageMul *= 0.85 + Math.max(0, p.potential - p.overall) / 50;
  const formMul = 0.85 + 0.3 * (p.form / 100);
  const leaMul = leaguePremium(tier);
  const raw = Math.min(260_000_000, base * ageMul * formMul * leaMul);
  // round to a clean-ish figure
  if (raw >= 1_000_000) return Math.round(raw / 100_000) * 100_000;
  if (raw >= 100_000) return Math.round(raw / 10_000) * 10_000;
  return Math.round(raw / 1000) * 1000;
}
