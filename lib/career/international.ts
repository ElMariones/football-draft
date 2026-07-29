// The national team.
//
// Playing for your country should feel completely different depending on which
// country it is. A New Zealander who is a decent professional walks into the
// squad and plays every qualifier; an Englishman at the same level never gets a
// call and is told, honestly, who is ahead of him. Both should also know how
// close they are.
//
// This module owns: selection, squad role, caps and goals per year, tournament
// qualification, and how far the nation went — plus a readable reason whenever
// the answer is no.
import type { CareerPlayer, CareerClub } from '@/data/career/types';
import { getNation } from '@/data/career/nations';
import { getClub } from '@/data/career/clubs';
import { getLeague } from '@/data/career/leagues';
import { isAttacker, isKeeperOrDef } from './config';
import { Rng, clamp, logistic } from './rng';
import type { Lang } from './i18n';

export type NtRole = 'star' | 'starter' | 'squad' | 'fringe';
export type NtResult =
  | 'not-qualified' | 'group' | 'r16' | 'qf' | 'sf' | 'runner-up' | 'champion';
export type NtMissReason = 'level' | 'minutes' | 'competition' | 'age' | 'form';

export interface NtTournament {
  kind: 'world' | 'continental';
  key: string;            // world-cup / euro / copa-america / ...
  qualified: boolean;
  result: NtResult;
  caps: number;
  goals: number;
}

export interface NtSeason {
  year: number;
  age: number;
  calledUp: boolean;
  role: NtRole | null;
  /** why you were not called up, and how close you were (0-100) */
  reason: NtMissReason | null;
  proximity: number;
  caps: number;
  goals: number;
  tournament: NtTournament | null;
}

/**
 * The level your country demands. This is the whole point of the system: a
 * 93-strength nation asks for ~78, a 50-strength nation for ~56, so the same
 * player is a regular for one and never seen by the other.
 */
export function selectionBar(nationStrength: number): number {
  return clamp(48, 84, Math.round(30 + nationStrength * 0.52));
}

/** How good a case you have made this season, in overall-equivalent points. */
export function selectionScore(
  p: CareerPlayer,
  out: { apps: number; goals: number; assists: number; rating: number; effOverall: number },
  club: CareerClub | null,
): number {
  const league = club ? getLeague(club.leagueId) : null;
  // Your rating is the argument; everything else is a modest nudge. When these
  // bonuses were large they swamped the bar entirely and every player walked
  // into every squad, which defeated the whole point of nation strength.
  const stage = league ? clamp(-4, 3, (4 - league.tier) * 1.1) : -4;
  const clubQuality = club ? clamp(-3, 2.5, (club.strength - 74) / 8) : -3;

  // output relative to what the position is expected to provide
  const per = out.apps > 0 ? out.goals / out.apps : 0;
  const outputBonus = isAttacker(p.position) ? clamp(0, 4, per * 9)
    : isKeeperOrDef(p.position) ? clamp(0, 2.5, (out.rating - 7) * 2.5)
      : clamp(0, 3, per * 6 + (out.assists / Math.max(1, out.apps)) * 7);

  const formBonus = clamp(-3, 2, (p.form - 58) / 12);
  const fameBonus = clamp(-3, 2.5, (p.reputation - 62) / 12);

  return out.effOverall + stage + clubQuality + outputBonus + formBonus + fameBonus;
}

/** Squad standing, given how far clear of the bar you are. */
export function roleFor(score: number, bar: number): NtRole | null {
  const gap = score - bar;
  if (gap >= 13) return 'star';
  if (gap >= 6) return 'starter';
  if (gap >= 0) return 'squad';
  if (gap >= -6) return 'fringe';
  return null;
}

export function missReason(
  p: CareerPlayer, out: { apps: number }, score: number, bar: number,
): NtMissReason {
  if (out.apps < 10) return 'minutes';
  if (p.age >= 34) return 'age';
  if (score < bar - 14) return 'level';
  if (p.form < 45) return 'form';
  return 'competition';
}

/** Caps available in a season, by standing. */
function capsFor(role: NtRole, rng: Rng): number {
  const band: Record<NtRole, [number, number]> = {
    star: [9, 12], starter: [7, 10], squad: [4, 7], fringe: [1, 3],
  };
  const [lo, hi] = band[role];
  return Math.round(rng.range(lo, hi + 1));
}

function goalsFor(p: CareerPlayer, role: NtRole, caps: number, rng: Rng): number {
  if (isKeeperOrDef(p.position)) return Math.max(0, Math.round(rng.gauss(caps * 0.03, 0.4)));
  const base = isAttacker(p.position) ? 0.42 : 0.16;
  const quality = clamp(0.4, 1.5, p.overall / 78);
  const share = role === 'star' ? 1.15 : role === 'starter' ? 1 : 0.6;
  return Math.max(0, Math.round(rng.gauss(caps * base * quality * share, 1.1)));
}

// ---- tournaments -----------------------------------------------------------

/** World Cup every four years, continental championship on the even years between. */
export function tournamentThisYear(year: number): 'world' | 'continental' | null {
  if (year % 4 === 2) return 'world';
  if (year % 2 === 0) return 'continental';
  return null;
}

export const CONTINENTAL_KEY: Record<string, string> = {
  UEFA: 'euro', CONMEBOL: 'copa-america', AFC: 'asian-cup',
  CAF: 'afcon', CONCACAF: 'gold-cup',
};

/**
 * Whether the country even gets there. A World Cup has far more places than a
 * continental championship has for a weak nation, but the field is global, so
 * the bar sits higher.
 */
function qualifyChance(strength: number, kind: 'world' | 'continental', confed: string): number {
  // CONMEBOL sends most of its ten teams to a World Cup; UEFA and CAF are brutal
  const room = confed === 'CONMEBOL' ? 8 : confed === 'CONCACAF' ? 6 : 0;
  const bar = kind === 'world' ? 70 - room : 64 - room;
  return clamp(0.05, 0.98, logistic((strength - bar) / 6));
}

const LADDER: NtResult[] = ['group', 'r16', 'qf', 'sf', 'runner-up', 'champion'];

/** How far they went, given the nation's level and your own contribution. */
function runResult(strength: number, playerLift: number, rng: Rng): NtResult {
  // Each round is its own coin-flip weighted by quality — a weak qualifier
  // usually goes home in the group, a giant usually reaches the quarters.
  let stage = 0;
  for (let i = 0; i < LADDER.length - 1; i++) {
    const quality = strength + playerLift - (62 + i * 6);
    const advance = clamp(0.05, 0.92, logistic(quality / 7));
    if (!rng.chance(advance)) break;
    stage++;
  }
  return LADDER[stage];
}

export interface IntlSeasonInput {
  apps: number; goals: number; assists: number; rating: number; effOverall: number;
}

export interface IntlOutcome {
  season: NtSeason;
  /** trophy key if the tournament was won */
  wonKey: string | null;
  /** reached the final (used by award logic) */
  finalist: boolean;
}

/** Resolve one season of international football. */
export function rollNationalTeam(
  p: CareerPlayer, out: IntlSeasonInput, year: number, rng: Rng,
): IntlOutcome {
  const nation = getNation(p.ntNationCode);
  const club = (p.clubId ? getClub(p.clubId) : null) ?? null;
  const empty: NtSeason = {
    year, age: p.age, calledUp: false, role: null,
    reason: 'level', proximity: 0, caps: 0, goals: 0, tournament: null,
  };
  if (!nation) return { season: empty, wonKey: null, finalist: false };

  const bar = selectionBar(nation.strength);
  const score = selectionScore(p, out, club);
  // once you are established, the manager keeps picking you a little longer
  const loyalty = p.ntCaps >= 20 ? 2.5 : p.ntCaps >= 5 ? 1 : 0;
  const effective = score + loyalty;
  const role = out.apps >= 8 ? roleFor(effective, bar) : null;
  const proximity = clamp(0, 99, Math.round(100 - Math.max(0, bar - effective) * 6));

  if (!role) {
    return {
      season: { ...empty, reason: missReason(p, out, effective, bar), proximity },
      wonKey: null, finalist: false,
    };
  }

  const caps = capsFor(role, rng);
  const goals = goalsFor(p, role, caps, rng);
  p.ntCaps += caps;
  p.ntGoals += goals;
  if (!p.ntCapped) { p.ntCapped = true; p.flags['ntDebut'] = true; }

  const season: NtSeason = {
    year, age: p.age, calledUp: true, role, reason: null, proximity: 100,
    caps, goals, tournament: null,
  };

  const kind = tournamentThisYear(year);
  if (!kind) return { season, wonKey: null, finalist: false };

  const key = kind === 'world' ? 'world-cup' : (CONTINENTAL_KEY[nation.confed] ?? 'euro');
  const qualified = rng.chance(qualifyChance(nation.strength, kind, nation.confed));
  if (!qualified) {
    season.tournament = { kind, key, qualified: false, result: 'not-qualified', caps: 0, goals: 0 };
    return { season, wonKey: null, finalist: false };
  }

  // a star carries his country a little further than the rankings suggest
  const lift = role === 'star' ? 5 : role === 'starter' ? 2 : 0;
  const result = runResult(nation.strength, lift + (out.effOverall - 78) * 0.12, rng);
  const roundsPlayed = 3 + LADDER.indexOf(result);
  const tCaps = role === 'fringe' ? Math.max(1, Math.round(roundsPlayed * 0.4)) : roundsPlayed;
  const tGoals = goalsFor(p, role, tCaps, rng);
  p.ntCaps += tCaps;
  p.ntGoals += tGoals;
  season.caps += tCaps;
  season.goals += tGoals;
  season.tournament = { kind, key, qualified: true, result, caps: tCaps, goals: tGoals };

  const won = result === 'champion';
  if (won) p.flags[kind === 'world' ? 'wonWorldCup' : 'wonContinental'] = true;
  return {
    season, wonKey: won ? key : null,
    finalist: result === 'champion' || result === 'runner-up',
  };
}

// ---- presentation ----------------------------------------------------------

export function roleLabel(role: NtRole, lang: Lang): string {
  const m: Record<NtRole, [string, string]> = {
    star: ['Star player', 'Figura'],
    starter: ['Starter', 'Titular'],
    squad: ['Squad player', 'Rotación'],
    fringe: ['Fringe', 'Alternativo'],
  };
  return m[role][lang === 'es' ? 1 : 0];
}

export function reasonLabel(r: NtMissReason, nationName: string, lang: Lang): string {
  const es = lang === 'es';
  switch (r) {
    case 'minutes':
      return es ? 'No juegas lo suficiente en tu club.' : 'You are not playing enough for your club.';
    case 'level':
      return es ? `Tu nivel todavía está lejos de ${nationName}.`
                : `Your level is still short of ${nationName}.`;
    case 'competition':
      return es ? `Hay jugadores por delante tuyo en tu puesto en ${nationName}.`
                : `There are players ahead of you in your position for ${nationName}.`;
    case 'age':
      return es ? 'El seleccionador está mirando a jugadores más jóvenes.'
                : 'The manager is looking at younger players.';
    case 'form':
      return es ? 'Vienes de una mala racha y te dejaron fuera.'
                : 'A poor run of form has left you out.';
  }
}

export function resultLabel(r: NtResult, lang: Lang): string {
  const es = lang === 'es';
  const m: Record<NtResult, [string, string]> = {
    'not-qualified': ['Did not qualify', 'No clasificó'],
    group: ['Group stage', 'Fase de grupos'],
    r16: ['Round of 16', 'Octavos de final'],
    qf: ['Quarter-finals', 'Cuartos de final'],
    sf: ['Semi-finals', 'Semifinales'],
    'runner-up': ['Runners-up', 'Subcampeón'],
    champion: ['CHAMPIONS', 'CAMPEÓN'],
  };
  return m[r][es ? 1 : 0];
}

export function resultTone(r: NtResult): 'bad' | 'ok' | 'good' | 'great' {
  if (r === 'not-qualified') return 'bad';
  if (r === 'group') return 'ok';
  if (r === 'champion' || r === 'runner-up') return 'great';
  return 'good';
}

/** A headline for the season ticker when a tournament was played. */
export function intlNews(
  t: NtTournament, nationCode: string, season: NtSeason, lang: Lang,
): string {
  const es = lang === 'es';
  const nation = getNation(nationCode);
  const name = nation ? (es ? nation.es : nation.en) : nationCode;
  const flag = nation?.flag ?? '';
  if (!t.qualified) {
    return es
      ? `${flag} ${name} no clasificó. Te quedas mirando el torneo por televisión.`
      : `${flag} ${name} did not qualify. You watch the tournament on television.`;
  }
  const where = resultLabel(t.result, lang);
  const mine = t.caps > 0
    ? (es ? ` Jugaste ${t.caps} y marcaste ${t.goals}.` : ` You played ${t.caps} and scored ${t.goals}.`)
    : '';
  if (t.result === 'champion') {
    return es ? `🏆 ${flag} ¡${name} CAMPEÓN!${mine}` : `🏆 ${flag} ${name} are CHAMPIONS!${mine}`;
  }
  return es
    ? `${flag} ${name}: ${where}.${mine}`
    : `${flag} ${name}: ${where}.${mine}`;
}
