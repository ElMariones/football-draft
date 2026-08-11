// Who gets into Europe, and into what.
//
// This used to be one line: `club.strength >= leagueMax - 5`. Which meant the
// table was irrelevant — you could win the league and be told the following
// season that "last season's finish earned no continental place", because the
// finish was never consulted. Nothing in the game read the league position it
// had already carefully simulated.
//
// A place is now what it is in real football: earned by where you finished, in
// the division you finished it in, against the number of places that division
// actually gets. Win a league that sends four clubs to the elite competition
// and you are in the elite competition. Finish seventh in it and you are not.
import type { CareerClub, CareerPlayer, Confederation } from '@/data/career/types';
import { getLeague } from '@/data/career/leagues';
import { clubsInLeague } from '@/data/career/clubs';
import type { Lang } from './i18n';

/** The two rungs of continental football: the big one, and the other one. */
export type ContinentalTier = 'elite' | 'secondary';

export interface Allocation {
  /** places in the confederation's premier competition */
  elite: number;
  /** places in the second-tier competition, taken after the elite ones */
  secondary: number;
}

/**
 * How many places each division gets.
 *
 * Roughly the real allocations. The important property is not the exact number
 * but that it is a *number of places*, so finishing above it means something
 * and finishing below it means something else.
 */
const ALLOCATION: Record<string, Allocation> = {
  // ---- UEFA, elite ----
  'premier-league': { elite: 4, secondary: 2 },
  laliga: { elite: 4, secondary: 2 },
  bundesliga: { elite: 4, secondary: 2 },
  'serie-a': { elite: 4, secondary: 2 },
  'ligue-1': { elite: 3, secondary: 2 },

  // ---- UEFA, strong ----
  'primeira-liga': { elite: 2, secondary: 2 },
  eredivisie: { elite: 2, secondary: 2 },
  'belgium-pro': { elite: 1, secondary: 2 },
  'super-lig': { elite: 1, secondary: 2 },
  'scottish-prem': { elite: 1, secondary: 2 },

  // ---- UEFA, mid ----
  'swiss-super': { elite: 1, secondary: 2 },
  'austria-bl': { elite: 1, secondary: 2 },
  'greece-sl': { elite: 1, secondary: 2 },
  'ukraine-pl': { elite: 1, secondary: 2 },
  'russia-pl': { elite: 1, secondary: 2 },
  'denmark-sl': { elite: 1, secondary: 2 },

  // ---- UEFA, developing ----
  eliteserien: { elite: 1, secondary: 1 },
  allsvenskan: { elite: 1, secondary: 1 },
  ekstraklasa: { elite: 1, secondary: 1 },
  'czech-liga': { elite: 1, secondary: 1 },
  'croatia-hnl': { elite: 1, secondary: 1 },
  'serbia-sl': { elite: 1, secondary: 1 },
  'ireland-pd': { elite: 1, secondary: 1 },

  // ---- CONMEBOL ----
  'liga-argentina': { elite: 4, secondary: 4 },
  brasileirao: { elite: 4, secondary: 4 },
  'chile-primera': { elite: 2, secondary: 3 },
  'colombia-a': { elite: 2, secondary: 3 },
  'uruguay-pd': { elite: 2, secondary: 3 },
  'peru-liga1': { elite: 2, secondary: 2 },
  'ecuador-ligapro': { elite: 2, secondary: 2 },
  'paraguay-dp': { elite: 2, secondary: 2 },

  // ---- CONCACAF / AFC / CAF ----
  'liga-mx': { elite: 3, secondary: 0 },
  mls: { elite: 3, secondary: 0 },
  'costa-rica-pd': { elite: 2, secondary: 0 },
  'saudi-league': { elite: 3, secondary: 1 },
  'j1-league': { elite: 2, secondary: 1 },
  'k-league': { elite: 2, secondary: 1 },
  'a-league': { elite: 1, secondary: 1 },
  'egypt-pl': { elite: 2, secondary: 1 },
  botola: { elite: 2, secondary: 1 },
  'nigeria-npfl': { elite: 1, secondary: 1 },
  'algeria-l1': { elite: 1, secondary: 1 },
  'senegal-l1': { elite: 1, secondary: 1 },
  'ghana-pl': { elite: 1, secondary: 1 },
  'ivory-l1': { elite: 1, secondary: 1 },
  'cameroon-l1': { elite: 1, secondary: 1 },
};

const NONE: Allocation = { elite: 0, secondary: 0 };

/** Second divisions send nobody to Europe. Neither does anything unlisted. */
export function allocationFor(leagueId: string): Allocation {
  return ALLOCATION[leagueId] ?? NONE;
}

export const hasContinental = (leagueId: string) => {
  const a = allocationFor(leagueId);
  return a.elite + a.secondary > 0;
};

/** The trophy key for a confederation's competition at a given rung. */
export function continentalKeyFor(confed: Confederation, tier: ContinentalTier): string {
  switch (confed) {
    case 'UEFA': return tier === 'elite' ? 'champions' : 'europa';
    case 'CONMEBOL': return tier === 'elite' ? 'libertadores' : 'sudamericana';
    case 'CONCACAF': return 'concacaf-cup';
    case 'AFC': return 'afc-cl';
    case 'CAF': return 'caf-cl';
  }
}

// ---- earning a place -------------------------------------------------------

export interface Finish {
  leagueId: string;
  position: number;
  teams: number;
  /** you won the domestic cup, which is a place in its own right */
  wonCup: boolean;
  /** you are the reigning continental champion at one of the two rungs */
  holdsTitle: ContinentalTier | null;
}

/**
 * What last season's finish is worth.
 *
 * Order matters and mirrors the real rules: holding the trophy gets you in
 * whatever you did in the league, winning the second competition promotes you
 * to the first, then league places are handed out from the top, and the cup
 * winner takes a secondary place if the table did not already give him one.
 */
export function placeFromFinish(f: Finish): ContinentalTier | null {
  const alloc = allocationFor(f.leagueId);
  if (alloc.elite + alloc.secondary === 0) return null;

  // Champions defend, and the second competition is a door into the first.
  if (f.holdsTitle) return 'elite';

  if (alloc.elite > 0 && f.position <= alloc.elite) return 'elite';
  if (f.position <= alloc.elite + alloc.secondary) {
    return alloc.secondary > 0 ? 'secondary' : null;
  }
  if (f.wonCup) return alloc.secondary > 0 ? 'secondary' : 'elite';
  return null;
}

/**
 * What a club we did not simulate is probably in.
 *
 * Only one league table is ever played out — the player's. When he signs for
 * somebody else in the summer, that club's finish never happened, so its place
 * is estimated from where it sits in its own division. This is the old
 * strength-based rule, kept for exactly the case it is correct for.
 */
export function estimatePlace(club: CareerClub): ContinentalTier | null {
  const alloc = allocationFor(club.leagueId);
  if (alloc.elite + alloc.secondary === 0) return null;
  const peers = clubsInLeague(club.leagueId);
  // How many clubs in this division are stronger than this one — a decent
  // stand-in for where it would have finished.
  const rank = peers.filter(c => c.strength > club.strength).length + 1;
  return placeFromFinish({
    leagueId: club.leagueId, position: rank, teams: peers.length,
    wonCup: false, holdsTitle: null,
  });
}

/**
 * The place this club actually holds for the coming season.
 *
 * A place belongs to a club, not to a player: if he earned one and then left,
 * he does not take it with him, and the club he joins has whatever it earned.
 */
export function continentalEntry(p: CareerPlayer, club: CareerClub): ContinentalTier | null {
  if (p.contPlace && p.contPlace.clubId === club.id) return p.contPlace.tier;
  return estimatePlace(club);
}

// ---- copy ------------------------------------------------------------------

/**
 * Why there are no European nights this year, in terms of the actual table.
 *
 * Derived from the season records rather than from current player state, so a
 * report re-read ten seasons later still explains the right year.
 */
export function noPlaceReason(
  leagueId: string, prevLeagueId: string | null,
  prevPosition: number | null, sameClub: boolean, lang: Lang,
): string {
  const es = lang === 'es';
  const alloc = allocationFor(leagueId);
  const league = getLeague(leagueId);
  const name = league ? (es ? league.es : league.en) : '';

  if (alloc.elite + alloc.secondary === 0) {
    return es
      ? `${name} no reparte plazas continentales. Los miércoles quedaron libres.`
      : `${name} sends nobody to Europe. Wednesdays were free.`;
  }

  // The place was earned in whatever division was played *last* season, which
  // is not always this one. A promoted champion finished first — comparing that
  // to this division's cut-off produces "you finished 1st and the places ran to
  // 6th", which is nonsense.
  const prevAlloc = prevLeagueId ? allocationFor(prevLeagueId) : null;
  const prevLeague = prevLeagueId ? getLeague(prevLeagueId) : null;
  if (sameClub && prevAlloc && prevAlloc.elite + prevAlloc.secondary === 0) {
    const pn = prevLeague ? (es ? prevLeague.es : prevLeague.en) : '';
    return es
      ? `El año anterior estabas en ${pn}, que no da plazas continentales. Los miércoles quedaron libres.`
      : `You were in ${pn} last season, and it sends nobody to Europe. Wednesdays were free.`;
  }

  const cut = (prevAlloc ?? alloc).elite + (prevAlloc ?? alloc).secondary;
  if (sameClub && prevPosition != null && prevPosition > cut) {
    return es
      ? `Acabaste ${prevPosition}º el año anterior y las plazas llegaban hasta el ${cut}º. Los miércoles quedaron libres.`
      : `You finished ${prevPosition}${ord(prevPosition)} the season before and the places ran to ${cut}${ord(cut)}. Wednesdays were free.`;
  }
  return es
    ? 'El club no se había clasificado el año anterior. Los miércoles quedaron libres.'
    : 'The club had not qualified the season before. Wednesdays were free.';
}

/** English ordinal suffix — "4th", "1st", "22nd". */
function ord(n: number): string {
  const a = n % 100;
  if (a >= 11 && a <= 13) return 'th';
  return ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
}

const TIER_LABEL: Record<ContinentalTier, [string, string]> = {
  elite: ['the elite competition', 'la competición principal'],
  secondary: ['the second competition', 'la segunda competición'],
};
export const tierLabel = (t: ContinentalTier, lang: Lang) => TIER_LABEL[t][lang === 'es' ? 1 : 0];
