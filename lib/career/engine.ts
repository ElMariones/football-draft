import type { Position } from '@/data/types';
import type { CareerPlayer, CareerClub, Foot } from '@/data/career/types';
import { getClub, clubsInLeague } from '@/data/career/clubs';
import { getLeague } from '@/data/career/leagues';
import { rivalsOf } from '@/data/career/rivals';
import { Rng, clamp, logistic, smoothstep } from './rng';
import { startingAttrs, overallFrom, addAttrs, gainAttrs, ageDecay, ATTR_KEYS, weightsFor } from './attributes';
import { randomFace } from './face';
import {
  CAREER, developmentByAge, declineByAge, leagueGamesByTier, CONTINENTAL_GAMES,
  ageMinutesBias, isKeeperOrDef, leaguePremium, ageValueMul, valueBase,
  GOAL_BASE, ASSIST_BASE, goalPosFactor, assistPosFactor, ovrGoalFactor, ovrAssistFactor,
  leagueGoalMod,
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
  /** goals scored in derbies — worth 10x to the terraces */
  derbyGoals: number;
  /** derby fixtures played this season */
  derbyGames: number;
  /**
   * Fixtures the club had this season, league plus continental. Reported from
   * here rather than recomputed later: the offseason shuffle moves clubs
   * between divisions, so by the time the season record is written the club may
   * already sit in a division it did not play in.
   */
  availableGames: number;
}

// ---- creation --------------------------------------------------------------

export interface CreateOpts {
  nationCode: string;
  surname: string;
  number: number;
  foot: Foot;
  position: Position;
  seed: number;
  seedSource?: 'random' | 'custom' | 'daily';
  dayKey?: string;
  rng: Rng;
}

export function createPlayer(o: CreateOpts): CareerPlayer {
  const { rng } = o;
  const [omin, omax] = CAREER.startOverallRange;
  const base = Math.round(rng.range(omin, omax + 1));

  // 1-in-100 generational talent. Rolled before anything else so the banner can
  // be shown on the very first screen, exactly like the reference game.
  const wonderkid = rng.chance(CAREER.wonderkidChance);
  let attrs = startingAttrs(o.position, base);
  if (wonderkid) attrs = addAttrs(attrs, { tec: 8, pac: 8, phy: 8, vis: 8, lea: 8 });

  const overall = overallFrom(attrs, o.position);

  // Potential is the one thing a career cannot argue with, so it has to carry
  // real variance. Previously it was `clamp(overall + 12, ...)`, which quietly
  // floored every low roll back up — nobody was ever dealt a modest ceiling.
  // Now most players land in the 72-84 band, a minority push into the low 90s,
  // and a genuine world-beater is rare.
  const roll = rng.next();
  const band =
    roll < 0.45 ? rng.range(70, 80)        // journeyman
      : roll < 0.78 ? rng.range(80, 87)    // good pro
        : roll < 0.95 ? rng.range(87, 92)  // star
          : rng.range(92, 97);             // generational
  const potential = clamp(overall + 4, 97, Math.round(band) + (wonderkid ? 5 : 0));
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

    // ---- Legend update ----
    attrs,
    archetypeId: null,
    wonderkid,
    careerSeed: o.seed,
    seedSource: o.seedSource ?? 'random',
    dayKey: o.dayKey,
    idolatry: {},
    traitorAt: {},
    titlesByClub: {},
    debutClubId: null,
    stayStreak: 0,
    derbyGoals: 0,
    stamina: 70,
    money: 0,
    momentCooldown: 0,
    miniCooldown: 0,
    ballonWins: 0,
    clutchWon: 0,
    owned: [],
    face: randomFace(o.nationCode, rng),
    ntHistory: [],
    basePotential: potential,
    rolePromise: null,
    rolePromiseYears: 0,
    sponsor: null,
    sponsorHistory: [],
    endorsements: [],
    brandCooldown: 0,
  };
  p.value = computeValue(p, 4);
  p.peakValue = p.value;
  return p;
}

/** Derby games available in a season — only rivals in the same league. */
export function derbyGamesFor(club: CareerClub): number {
  const inLeague = rivalsOf(club.id).filter(r => getClub(r)?.leagueId === club.leagueId);
  return Math.min(6, inLeague.length * 2);
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
  let minutesFactor = clamp(0.08, 1, logistic(roleScore, 0.3));

  // The club promised you a role when you signed; for as long as that promise
  // binds, the manager honours it. Without this floor a "guaranteed starter"
  // deal at a strong club still produced eleven appearances, which makes the
  // whole role choice a lie.
  if (p.rolePromise && p.rolePromiseYears > 0) {
    const floor = p.rolePromise === 'starter' ? 0.72
      : p.rolePromise === 'rotation' ? 0.42
        : 0.16;
    minutesFactor = Math.max(minutesFactor, floor);
  }

  // Stamina gates how much of the season you are actually available for: a
  // drained player cannot hold a starting place through a long campaign.
  const staminaFactor = clamp(0.7, 1, 0.7 + (p.stamina ?? 70) / 333);
  minutesFactor = clamp(0.05, 1, minutesFactor * staminaFactor);

  const inContinental = qualifiesContinental(club);
  const availableGames = leagueGamesByTier(tier) + (inContinental ? CONTINENTAL_GAMES : 0);
  // Low stamina also means more knocks — extra games missed on top of injuries.
  const fatigueGames = p.stamina < 45 ? Math.round((45 - p.stamina) / 7) : 0;
  const gamesMissed = p.injuryGamesNext + fatigueGames;
  const apps = clamp(0, availableGames, Math.round(availableGames * minutesFactor) - gamesMissed);

  const formMul = 0.85 + p.form / 300;              // mild ~0.85–1.18
  const noiseScale = 1 - p.consistency / 220;

  const gRate = GOAL_BASE * goalPosFactor(p.position) * ovrGoalFactor(effOverall) * leagueGoalMod(tier) * formMul;
  // The noise only applies to players who can actually score. A goalkeeper's
  // rate is exactly zero, so the old unconditional gaussian — clamped at zero,
  // and therefore one-sided — handed roughly a third of keepers one to three
  // league goals a season out of nothing at all.
  let goals = Math.round(gRate * apps + (gRate > 0 ? rng.gauss(0, apps * 0.05 * noiseScale + 0.3) : 0));
  goals = clamp(0, apps, goals);

  const aRate = ASSIST_BASE * assistPosFactor(p.position) * ovrAssistFactor(effOverall) * (0.7 + club.strength / 220) * formMul;
  let assists = Math.round(aRate * apps + rng.gauss(0, apps * 0.04 * noiseScale + 0.3));
  assists = clamp(0, apps, assists);

  let cleanSheets = 0;
  if (isKeeperOrDef(p.position)) {
    const csRate = clamp(0.05, 0.6, (club.strength - 52) / 70);
    cleanSheets = clamp(0, apps, Math.round(apps * csRate * 0.55));
  }

  // Season rating (0-10). Divisors are tuned to the new (lower) goal scale so
  // ratings still span ~5.5–9.5.
  const per = (x: number) => x / Math.max(1, apps);
  let outputScore: number;
  if (p.position === 'GK' || p.position === 'CB') {
    outputScore = per(cleanSheets) / 0.4 + (effOverall - 60) / 45;
  } else if (isKeeperOrDef(p.position)) {
    outputScore = per(cleanSheets) / 0.4 + per(assists) / 0.2 + (effOverall - 60) / 55;
  } else if (p.position === 'CM' || p.position === 'CDM' || p.position === 'RM' || p.position === 'LM') {
    outputScore = per(goals) / 0.18 + per(assists) / 0.28;
  } else {
    outputScore = per(goals) / 0.35 + per(assists) / 0.3;
  }
  const rating = clamp(5.0, 9.7, 6.0 + outputScore * 1.35 + (effOverall - 72) / 45 + (apps < 10 ? -0.4 : 0));

  // Derby goals. Big-game players (leadership) turn up on the day; the rate is
  // your normal scoring rate nudged by clutch, over the derby fixtures you were
  // fit for. These are worth 10x to idolatry, so they matter far beyond the tally.
  const derbyGames = Math.round(derbyGamesFor(club) * minutesFactor);
  let derbyGoals = 0;
  if (derbyGames > 0 && goals > 0) {
    const perGame = goals / Math.max(1, apps);
    const clutchMul = 0.75 + (p.attrs.lea / 100) * 0.7;
    const expected = perGame * derbyGames * clutchMul;
    derbyGoals = clamp(0, derbyGames * 3, Math.round(expected + rng.gauss(0, 0.4)));
    derbyGoals = Math.min(derbyGoals, goals);
  }

  return {
    apps, goals, assists, cleanSheets, rating, minutesFactor, inContinental, effOverall,
    derbyGoals, derbyGames, availableGames,
  };
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
  const goalThreshold = isKeeperOrDef(p.position) ? 2 : 10;
  // Reaching world class requires performing in a strong league — each tier
  // caps how high your ceiling can be pushed by breakouts.
  const tierCeiling = tier <= 1 ? 95 : tier <= 2 ? 90 : tier <= 3 ? 86 : tier <= 4 ? 82 : 78;
  // A career may out-perform its ceiling by a few points at most. Without this
  // budget every good season ratcheted potential upward, so 78% of careers ended
  // at 90+ and nobody was ever ordinary.
  const breakoutBudget = (p.basePotential ?? p.potential) + CAREER.maxBreakout;
  const headroom = clamp(0.1, 1, (breakoutBudget - p.potential) / 6);
  const rawBreak =
    Math.max(0, out.rating - 7.8) * 0.7 +
    bigTitles * 0.35 +
    (out.goals >= goalThreshold ? 0.35 : 0);
  // late bloomers exist, but the window closes at the usual peak
  if (rawBreak > 0 && p.age <= 26 && out.apps >= 15) {
    const raised = Math.min(p.potential + rawBreak * headroom, tierCeiling, breakoutBudget);
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

  // Growth is distributed *into attributes*, weighted toward what the position
  // actually uses — a striker's good year shows up as finishing and pace, a
  // holding midfielder's as physique and vision. Overall is then recomputed
  // from the attributes and never written directly, so the card the player
  // stares at is always the honest sum of their five numbers.
  // Growth is capped by the headroom left under the ceiling, and the per-
  // attribute shares are normalised so the weighted sum equals exactly that
  // much overall. Without this the dominant attribute races away (a 20-year-old
  // ending on 93 technique while his overall sat at 74) because `overall` was
  // clamped to potential but the attributes feeding it never were.
  const ceilingRoom = Math.max(0, p.potential - overallFrom(p.attrs, p.position));
  const effective = Math.min(growth, ceilingRoom);
  if (effective > 0) {
    const k = weightsFor(p.position);
    const share: Record<string, number> = {};
    let weighted = 0;
    for (const key of ATTR_KEYS) {
      share[key] = k[key] * 0.7 + 0.06 + rng.range(-0.015, 0.035);
      weighted += k[key] * share[key];
    }
    const scale = weighted > 0 ? effective / weighted : 0;
    const delta: Record<string, number> = {};
    for (const key of ATTR_KEYS) delta[key] = share[key] * scale;
    p.attrs = gainAttrs(p.attrs, delta, p.potential);
  }
  // Ageing bites the attributes themselves, scaled by the existing curve.
  const decline = declineByAge(p.age);
  if (decline > 0) {
    const dec = ageDecay(p.age);
    const scaled: Record<string, number> = {};
    for (const [key, v] of Object.entries(dec)) scaled[key] = (v as number) * 1.15;
    // the curve hands veterans a little leadership back each year — cap it too,
    // or a 40-year-old drifts to 99 leadership on an 82 ceiling
    p.attrs = gainAttrs(p.attrs, scaled, p.potential);
  }
  p.overall = clamp(40, 99, Math.min(p.potential, overallFrom(p.attrs, p.position)));
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
  // the promise covers the season just played, then lapses
  if (p.rolePromiseYears > 0) p.rolePromiseYears -= 1;
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
  if (p.age <= 23) ageMul *= 0.9 + Math.max(0, p.potential - p.overall) / 90; // gentler wonderkid premium
  const formMul = 0.85 + 0.3 * (p.form / 100);
  const leaMul = leaguePremium(tier);
  const raw = Math.min(260_000_000, base * ageMul * formMul * leaMul);
  // round to a clean-ish figure
  if (raw >= 1_000_000) return Math.round(raw / 100_000) * 100_000;
  if (raw >= 100_000) return Math.round(raw / 10_000) * 10_000;
  return Math.round(raw / 1000) * 1000;
}
