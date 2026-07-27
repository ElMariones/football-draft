// Idolatry — how much a club's terraces love you.
//
// This is the scoring spine of the career. Stats alone don't make a legend:
// idolatry is per-club, it is *slow*, it punishes chasing money, and it hard-
// caps until you actually win something at that club. The final "legacy" is
// your best single-club number, so a nomadic 300-goal career loses to a
// one-club player who won a league and stayed.
import type { CareerPlayer, Attrs, IdolLevel } from '@/data/career/types';
import { getClub } from '@/data/career/clubs';
import { getLeague } from '@/data/career/leagues';
import { areRivals } from '@/data/career/rivals';
import { clamp } from './rng';

export const IDOL = {
  // per season at the club
  season: 1.35,
  seasonVeteran: 1.8,        // once you've been there this many years
  veteranFrom: 5,

  perGoal: 0.15,
  perAssist: 0.09,
  perDerbyGoal: 1.5,         // a derby goal is worth ten league goals
  perCleanSheet: 0.10,

  titleLeague: 6,
  titleCup: 4,
  titleContinental: 10,
  titleWorld: 7,
  award: 3,                  // individual award while at the club
  clutchMoment: 6,           // won a decisive moment

  // ceilings
  capNoTitle: 80,            // you cannot be an idol without winning there
  capTitle: 100,
  capTraitor: 49,            // crossing to a rival brands you forever

  // diminishing returns: past this, gains are heavily damped
  grindFrom: 85,
  grindFactor: 0.17,

  foreignFactor: 0.7,        // glory abroad counts less back home

  // exits
  leaveNormal: -8,
  leaveEarly: -12,           // walking out on the club that raised you
  leaveToRival: -30,
  refuseBigMove: 3,          // turning down money for the badge
} as const;

export const IDOL_LEVELS: { min: number; key: IdolLevel; en: string; es: string; emoji: string }[] = [
  { min: 95, key: 'legend',    en: 'Legend',    es: 'Leyenda',   emoji: '🗿' },
  { min: 75, key: 'idol',      en: 'Idol',      es: 'Ídolo',     emoji: '⭐' },
  { min: 50, key: 'reference', en: 'Reference', es: 'Referente', emoji: '💙' },
  { min: 25, key: 'beloved',   en: 'Beloved',   es: 'Querido',   emoji: '👏' },
  { min: 0,  key: 'one-more',  en: 'One more',  es: 'Uno más',   emoji: '▫️' },
];

export function idolLevel(value: number) {
  const v = clamp(0, 100, value || 0);
  return IDOL_LEVELS.find(l => v >= l.min)!;
}

export function idolAt(p: CareerPlayer, clubId: string): number {
  return p.idolatry?.[clubId] ?? 0;
}

/** The ceiling for this club right now — titles raise it, betrayal sinks it. */
export function idolCap(p: CareerPlayer, clubId: string): number {
  if (p.traitorAt?.[clubId]) return IDOL.capTraitor;
  const wonHere = p.titlesByClub?.[clubId] ? p.titlesByClub[clubId] > 0 : false;
  return wonHere ? IDOL.capTitle : IDOL.capNoTitle;
}

/**
 * Apply a change to a club's idolatry, respecting the foreign discount, the
 * grind curve near the top, and the club's current ceiling.
 */
export function addIdol(p: CareerPlayer, clubId: string | null, amount: number): number {
  if (!clubId || !amount) return 0;
  if (p.loanFromClubId && clubId === p.clubId) return 0; // loans don't build a legacy

  const before = idolAt(p, clubId);
  let delta = amount;

  if (delta > 0) {
    const club = getClub(clubId);
    const league = club ? getLeague(club.leagueId) : null;
    // "Home" is the country you were raised in — glory elsewhere travels worse.
    if (league && league.nationCode !== p.nationCode) delta *= IDOL.foreignFactor;
  }

  let next = before + delta;
  // Past the grind threshold each extra point costs a lot more.
  if (delta > 0 && next > IDOL.grindFrom) {
    const easy = Math.min(delta, Math.max(0, IDOL.grindFrom - before));
    next = before + easy + (delta - easy) * IDOL.grindFactor;
  }

  const capped = clamp(0, idolCap(p, clubId), next);
  p.idolatry = { ...p.idolatry, [clubId]: capped };
  return capped - before;
}

/** Register a title so the club's ceiling lifts from 80 → 100. */
export function creditTitle(p: CareerPlayer, clubId: string | null, n = 1) {
  if (!clubId) return;
  p.titlesByClub = { ...p.titlesByClub, [clubId]: (p.titlesByClub?.[clubId] ?? 0) + n };
  // Re-apply the (now higher) ceiling to what you already earned.
  const cur = idolAt(p, clubId);
  p.idolatry = { ...p.idolatry, [clubId]: clamp(0, idolCap(p, clubId), cur) };
}

/** Leaving a club. Crossing to a direct rival is the one unforgivable move. */
export function applyExit(
  p: CareerPlayer, fromClubId: string, toClubId: string,
): { delta: number; traitor: boolean } {
  const traitor = areRivals(fromClubId, toClubId);
  const isCradle = fromClubId === p.debutClubId;
  const yearsHere = p.stayStreak ?? 0;

  let amount: number = IDOL.leaveNormal;
  if (traitor) amount = IDOL.leaveToRival;
  else if (isCradle && yearsHere < 4) amount = IDOL.leaveEarly;

  if (traitor) {
    p.traitorAt = { ...p.traitorAt, [fromClubId]: true };
    p.flags = { ...p.flags, traitor: true };
  }
  const delta = addIdol(p, fromClubId, amount);
  // The cap change from betrayal applies retroactively.
  if (traitor) {
    p.idolatry = { ...p.idolatry, [fromClubId]: Math.min(idolAt(p, fromClubId), IDOL.capTraitor) };
  }
  return { delta, traitor };
}

export interface SeasonIdolInput {
  goals: number;
  assists: number;
  derbyGoals: number;
  cleanSheets: number;
  titles: { scope: string; kind: string }[];
  clutchWon: number;
}

/** The end-of-season idolatry tick for the club you played for. */
export function seasonIdolGain(p: CareerPlayer, clubId: string, s: SeasonIdolInput): number {
  const veteran = (p.stayStreak ?? 0) >= IDOL.veteranFrom;
  let n = veteran ? IDOL.seasonVeteran : IDOL.season;

  n += s.goals * IDOL.perGoal;
  n += s.assists * IDOL.perAssist;
  n += s.derbyGoals * IDOL.perDerbyGoal;
  n += s.cleanSheets * IDOL.perCleanSheet;
  n += s.clutchWon * IDOL.clutchMoment;

  for (const t of s.titles) {
    if (t.kind === 'individual') { n += IDOL.award; continue; }
    if (t.kind === 'national') continue;         // country glory ≠ club glory
    if (t.scope === 'continent') n += IDOL.titleContinental;
    else if (t.scope === 'world') n += IDOL.titleWorld;
    else if (t.scope === 'league') n += IDOL.titleLeague;
    else n += IDOL.titleCup;
  }
  return addIdol(p, clubId, n);
}

export interface LegacyResult {
  clubId: string;
  value: number;
  level: ReturnType<typeof idolLevel>;
}

/** Your defining club — the best single-club idolatry number. */
export function legacyOf(p: CareerPlayer): LegacyResult | null {
  let best: { clubId: string; value: number } | null = null;
  for (const [clubId, value] of Object.entries(p.idolatry ?? {})) {
    if (!best || value > best.value) best = { clubId, value };
  }
  if (!best) return null;
  return { ...best, level: idolLevel(best.value) };
}

/**
 * Leaderboard score. Idolatry dominates by design, with modest credit for the
 * raw career so two Legends are separated by what they actually did.
 */
export function legacyScore(p: CareerPlayer): number {
  const leg = legacyOf(p);
  const idol = leg?.value ?? 0;
  const clubTitles = Object.values(p.titlesByClub ?? {}).reduce((a, b) => a + b, 0);
  return Math.round(
    idol * 1000 +
    clubTitles * 120 +
    p.goals * 3 +
    p.assists * 2 +
    (p.derbyGoals ?? 0) * 25 +
    p.ntCaps * 2,
  );
}

/** How the derby-goal multiplier is surfaced in the UI. */
export function isDerby(aClubId: string | null, bClubId: string | null): boolean {
  return !!aClubId && !!bClubId && areRivals(aClubId, bClubId);
}

/** Attribute-driven clutch rating, used to seed moment odds. */
export function clutchRating(attrs: Attrs): number {
  return clamp(0, 100, attrs.lea * 0.6 + attrs.tec * 0.4);
}
