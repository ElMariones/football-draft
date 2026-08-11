import type { CareerPlayer, CareerClub, ClubOffer, OfferRole } from '@/data/career/types';
import { CLUBS, getClub } from '@/data/career/clubs';
import { getLeague, LEAGUES } from '@/data/career/leagues';
import { getNation } from '@/data/career/nations';
import type { Lang } from './i18n';
import { Rng, clamp } from './rng';
import { idolAt } from './idolatry';

function roleFor(p: CareerPlayer, club: CareerClub): OfferRole {
  if (club.strength <= p.overall - 1) return 'starter';
  if (club.strength <= p.overall + 4) return 'rotation';
  return 'prospect';
}

// Minimum reputation to attract offers from a league of a given tier — this is
// what unlocks Europe as you grow (and lets you always go home).
function reputationGate(tier: number): number {
  const m: Record<number, number> = { 1: 55, 2: 45, 3: 30, 4: 24, 5: 12 };
  return m[tier] ?? 10;
}

// A few nations have no domestic league of their own in the dataset; they map
// onto the league their players realistically come through.
const NATION_LEAGUE_ALIAS: Record<string, string[]> = {
  CA: ['mls'],
};

function homeLeagueIds(nationCode: string): string[] {
  const own = LEAGUES.filter(l => l.nationCode === nationCode).map(l => l.id);
  return own.length ? own : (NATION_LEAGUE_ALIAS[nationCode] ?? []);
}

function isHomeClub(p: CareerPlayer, c: CareerClub): boolean {
  return homeLeagueIds(p.nationCode).includes(c.leagueId);
}

function reachable(p: CareerPlayer, club: CareerClub): boolean {
  const league = getLeague(club.leagueId)!;
  if (isHomeClub(p, club)) return true;           // home is always reachable
  if (league.tier === 1 && p.overall < 71) return false;
  return p.reputation >= reputationGate(league.tier);
}

function candidates(p: CareerPlayer, opts: { min: number; max: number }): CareerClub[] {
  return CLUBS.filter(c =>
    c.id !== p.clubId &&
    c.strength >= opts.min &&
    c.strength <= opts.max &&
    reachable(p, c),
  );
}

// weighted so clubs near (and just below) the player's level are most likely.
function pickDistinct(pool: CareerClub[], n: number, rng: Rng, targetStrength: number): CareerClub[] {
  const out: CareerClub[] = [];
  const bag = [...pool];
  while (out.length < n && bag.length) {
    const chosen = rng.weighted(bag, c => 1 / (1 + Math.abs(c.strength - targetStrength)) + 0.05);
    out.push(chosen);
    bag.splice(bag.indexOf(chosen), 1);
  }
  return out;
}

function clubsByNation(nationCode: string): CareerClub[] {
  const ids = homeLeagueIds(nationCode);
  return CLUBS.filter(c => ids.includes(c.leagueId));
}

// ---- will they keep you? ---------------------------------------------------

export type RenewalReason = 'automatic' | 'legend' | 'declined';

export interface Renewal {
  renews: boolean;
  /** the terms — a veteran is not offered the shirt he used to have */
  role: OfferRole;
  reason: RenewalReason;
}

/**
 * Whether your club offers you another year, and on what terms.
 *
 * Staying was previously unconditional and always as a starter, which is how a
 * thirty-nine-year-old ended up first choice at Paris Saint-Germain. A big club
 * does arithmetic every summer, and the older you are the less sentiment enters
 * into it.
 *
 * What buys you time is being *theirs*. An idol gets offered year-by-year deals
 * with the minutes shrinking each time — which is exactly what happens to the
 * ones who are allowed to finish where they belong. Everyone else is thanked
 * and released.
 */
export function renewalFor(p: CareerPlayer, club: CareerClub): Renewal {
  const idol = idolAt(p, club.id);
  // negative means you are below the level the club plays at
  const gap = p.overall - club.strength;
  const big = club.strength >= 80;

  // Before the mid-thirties this is not a conversation anybody has.
  if (p.age < 33) {
    return {
      renews: true,
      role: gap >= -10 ? 'starter' : gap >= -14 ? 'rotation' : 'squad',
      reason: 'automatic',
    };
  }

  // From thirty-three, the bar rises every year, and it rises faster the bigger
  // the club. Standing at the club offsets it — that is the whole currency a
  // veteran has left.
  const over = p.age - 32;
  const bar = (big ? 1.7 : 1.0) * over - (idol / 100) * (big ? 10 : 14);

  if (gap >= bar + 2) return { renews: true, role: 'starter', reason: 'automatic' };
  if (gap >= bar - 3) {
    return { renews: true, role: 'rotation', reason: idol >= 60 ? 'legend' : 'automatic' };
  }
  // The farewell year: they will not drop you, but you are not playing much.
  if (idol >= 65 && gap >= bar - 9) return { renews: true, role: 'squad', reason: 'legend' };
  return { renews: false, role: 'squad', reason: 'declined' };
}

/** What the offseason card says about it. */
export function renewalNote(r: Renewal, clubName: string, lang: Lang): string {
  const es = lang === 'es';
  if (!r.renews) {
    return es
      ? `El ${clubName} no te renueva. Hay que buscar equipo.`
      : `${clubName} are not renewing. You need a club.`;
  }
  if (r.reason === 'legend') {
    return r.role === 'squad'
      ? (es
        ? `El ${clubName} te ofrece un año más por lo que eres, no por lo que juegas.`
        : `${clubName} offer another year for what you are, not for what you still do.`)
      : (es
        ? `El ${clubName} renueva un año más, con menos minutos.`
        : `${clubName} renew for one more year, with fewer minutes.`);
  }
  if (r.role === 'rotation') {
    return es ? 'Renovación, pero ya no eres fijo.' : 'Renewed, but you are not first choice any more.';
  }
  if (r.role === 'squad') {
    return es ? 'Renovación de suplente.' : 'Renewed as a squad player.';
  }
  return '';
}

// ---- youth (first club at age 16) ------------------------------------------

export function generateYouthOffers(p: CareerPlayer, rng: Rng): ClubOffer[] {
  // You come through at home. If your country has fewer than three credible
  // academies we *top up* from your own region rather than replacing them —
  // a Senegalese kid should still see Senegalese clubs first.
  const home = clubsByNation(p.nationCode).filter(c => c.strength <= 74);
  const picks = pickDistinct(home, 3, rng, 60);

  if (picks.length < 3) {
    const confed = getNation(p.nationCode)?.confed;
    const taken = new Set(picks.map(c => c.id));
    const region = CLUBS.filter(c =>
      !taken.has(c.id) && getLeague(c.leagueId)?.confed === confed &&
      c.strength >= 48 && c.strength <= 70);
    picks.push(...pickDistinct(region, 3 - picks.length, rng, 58));
  }
  if (picks.length < 3) {
    const taken = new Set(picks.map(c => c.id));
    const any = CLUBS.filter(c => !taken.has(c.id) && c.strength >= 48 && c.strength <= 68);
    picks.push(...pickDistinct(any, 3 - picks.length, rng, 58));
  }
  return picks.map(c => ({ clubId: c.id, verb: 'sign' as const, role: 'starter' as const }));
}

// ---- loan (early career, if stuck below club level) ------------------------

export function generateLoanOffers(p: CareerPlayer, rng: Rng): ClubOffer[] {
  const min = Math.max(46, p.overall - 20);
  const max = p.overall + 2;
  const parent = p.clubId ? getClub(p.clubId) : null;
  const parentLeague = parent ? getLeague(parent.leagueId) : null;

  // Clubs loan players out *near home*: your own country first, then your own
  // continent. A Bundesliga teenager goes to Austria or Switzerland, not Peru.
  const near = (c: CareerClub) => {
    const l = getLeague(c.leagueId);
    if (!l) return false;
    return isHomeClub(p, c) || l.confed === parentLeague?.confed;
  };
  let pool = CLUBS.filter(c =>
    c.id !== p.clubId && c.strength >= min && c.strength <= max &&
    (getLeague(c.leagueId)?.tier ?? 9) >= 3 && near(c));

  if (pool.length < 3) {
    pool = CLUBS.filter(c => c.id !== p.clubId && c.strength >= min && c.strength <= max && near(c));
  }
  if (pool.length < 3) {
    pool = CLUBS.filter(c => c.id !== p.clubId && c.strength <= p.overall + 2 && c.strength >= 48);
  }
  const picks = pickDistinct(pool, 3, rng, p.overall - 6);
  return picks.map(c => ({ clubId: c.id, verb: 'loan' as const, role: 'starter' as const }));
}

// ---- organic transfer offers each window -----------------------------------

/**
 * Offers are composed from football-realistic buckets, never a worldwide pool.
 * The rule that keeps it sane: a club only comes for you if there is a real
 * reason — you already play in their league, you are one of their countrymen,
 * they are a plausible next step in your region, or they are an elite side
 * that shops globally. Anything else appears only as a flagged wildcard.
 */
export function generateTransferOffers(p: CareerPlayer, rng: Rng): ClubOffer[] {
  const declining = p.age >= 32 || p.overall < p.peakOverall - 4;
  const min = declining ? p.overall - 16 : p.overall - 7;
  const max = p.overall + (declining ? 2 : 5);
  const target = p.overall + 1;

  const current = p.clubId ? getClub(p.clubId) : null;
  const currentLeague = current ? getLeague(current.leagueId) : null;
  const currentTier = currentLeague?.tier ?? 6;
  const currentConfed = currentLeague?.confed;
  const homeConfed = getNation(p.nationCode)?.confed;

  const inBand = (c: CareerClub) =>
    c.id !== p.clubId && c.strength >= min && c.strength <= max && reachable(p, c);

  // 1. the league you already play in — the most common real move
  const sameLeague = CLUBS.filter(c => c.leagueId === current?.leagueId && inBand(c));

  // 2. home: your own country always keeps a door open
  const homeCountry = clubsByNation(p.nationCode).filter(inBand);

  // 3. your current region at a comparable level (a Dutch-based player hears
  //    from Belgium, Portugal or Germany — not from Argentina)
  const sameRegion = CLUBS.filter(c => {
    const l = getLeague(c.leagueId);
    return l && l.confed === currentConfed && Math.abs(l.tier - currentTier) <= 2 && inBand(c);
  });

  // 4. the step up. From South America and Africa that means Europe; inside
  //    Europe it means a stronger league. Gated on reputation so it is earned.
  const stepUp = CLUBS.filter(c => {
    const l = getLeague(c.leagueId);
    if (!l || !inBand(c)) return false;
    if (l.tier >= currentTier) return false;
    if (l.confed === 'UEFA') return p.reputation >= reputationGate(l.tier);
    return l.confed === currentConfed;
  });

  // 5. elite clubs shop worldwide — but only for genuinely elite players
  const eliteEligible = p.overall >= 77 && p.reputation >= 52;
  const elite = eliteEligible
    ? CLUBS.filter(c =>
        c.id !== p.clubId && reachable(p, c) &&
        (getLeague(c.leagueId)?.tier ?? 9) <= 1 &&
        c.strength >= p.overall - 4 && c.strength <= p.overall + 9)
    : [];

  // 6. the late-career money move — realistic only when older or already famous
  // The late-career money move. Saudi and MLS are the obvious two, and a South
  // American going home is the same move by another name — so his own continent
  // counts as a destination rather than a step down.
  const moneyLeagues = ['saudi-league', 'mls'];
  const moneyMove = (p.age >= 30 || p.reputation >= 70)
    ? CLUBS.filter(c => {
        const l = getLeague(c.leagueId);
        if (!l || !inBand(c)) return false;
        if (moneyLeagues.includes(c.leagueId)) return true;
        // going back to the continent you came from, late on
        return p.age >= 33 && l.confed === homeConfed && l.confed !== 'UEFA';
      })
    : [];

  // 7. The road home. In your last years the clubs that made you come calling
  //    again — the one that gave you your debut above all. They will take you
  //    well past your best, because what they are signing is the story, not the
  //    legs. Clubs you betrayed for a rival never phone.
  const veteran = p.age >= 31 || declining;
  const formerIds = [...new Set([p.debutClubId, ...(p.clubsPlayed ?? [])])];
  const homecoming = veteran
    ? formerIds
        .filter((id): id is string => !!id && id !== p.clubId && !p.traitorAt?.[id])
        .map(id => getClub(id))
        .filter((c): c is CareerClub => !!c && c.strength <= p.overall + 8)
    : [];

  const chosen = new Set<string>([p.clubId ?? '']);
  const offers: ClubOffer[] = [];
  const take = (pool: CareerClub[], flags: { wildcard?: boolean; homecoming?: boolean } = {}) => {
    const avail = pool.filter(c => !chosen.has(c.id));
    if (!avail.length) return false;
    // A homecoming leans hard toward the club that debuted you.
    const c = rng.weighted(avail, x =>
      (flags.homecoming && x.id === p.debutClubId ? 3 : 0)
      + 1 / (1 + Math.abs(x.strength - target)) + 0.05);
    chosen.add(c.id);
    offers.push({
      clubId: c.id, verb: 'sign',
      // the old club always offers you a place in the team, not a bench seat
      role: flags.homecoming ? 'starter' : roleFor(p, c),
      wildcard: flags.wildcard || undefined,
      homecoming: flags.homecoming || undefined,
    });
    return true;
  };

  // ---- the last years ----
  // Past the mid-thirties the market is a different market. Europe's good
  // leagues stop calling and what is left is the money, the way home, and the
  // clubs that already love you. Ordering the slots this way is the difference
  // between a realistic wind-down and a 38-year-old being offered Bayern.
  if (p.age >= 34) {
    // the money leagues, which is where most of these careers actually go
    if (moneyMove.length) take(moneyMove);
    // home: your own country will always find you a shirt
    take(homeCountry) || take(sameRegion);
    // and the clubs that made you
    if (homecoming.length) take(homecoming, { homecoming: true });
    // whatever is left at your level, wherever that now is
    if (offers.length < 3) take(sameLeague) || take(sameRegion) || take(homeCountry);
    if (!offers.length) take(candidates(p, { min: min - 10, max }));
    return offers;
  }

  // Slot 1 — where you already are.
  take(sameLeague) || take(sameRegion);
  // Slot 2 — home, or failing that your region.
  take(homeCountry) || take(sameRegion) || take(sameLeague);
  // Slot 3 — ambition: elite, a step up, or the money.
  if (elite.length && (p.overall >= 82 || rng.chance(0.7))) take(elite);
  else if (stepUp.length && rng.chance(0.75)) take(stepUp);
  else if (moneyMove.length && rng.chance(0.5)) take(moneyMove);
  else if (!take(sameRegion)) take(homeCountry);

  // Slot 4 — the way back. Common once you are past it, and near-certain in the
  // very last years, so the career gets the chance to end where it started.
  if (homecoming.length) {
    const chance = p.age >= 34 ? 0.85 : p.age >= 32 ? 0.6 : 0.35;
    if (rng.chance(chance)) take(homecoming, { homecoming: true });
  }

  // The wildcard: roughly one window in twelve somebody completely unexpected
  // calls. Rare and explicitly flagged, so it reads as a story beat rather than
  // the engine losing the plot.
  if (rng.chance(0.08)) {
    const exotic = CLUBS.filter(c => {
      const l = getLeague(c.leagueId);
      return !!l && l.confed !== currentConfed && l.confed !== homeConfed &&
        c.id !== p.clubId && c.strength >= p.overall - 6 && c.strength <= p.overall + 10;
    });
    if (exotic.length) take(exotic, { wildcard: true });
  }

  // Never leave the player with nothing.
  if (!offers.length) take(candidates(p, { min: min - 6, max }));

  return offers;
}

// ---- forced-transfer board (reroll + desperation) --------------------------

export function fillForcedSlots(
  p: CareerPlayer, rng: Rng, desperation: number, count: number,
): ClubOffer[] {
  // desperation lowers the ceiling and biases roles down; a small wildcard
  // chance surfaces a dream club to keep the gamble alive.
  const drop = Math.round(desperation / 10);
  const min = Math.max(46, p.overall - 8 - drop);
  const max = p.overall + 4 - Math.round(desperation / 20);

  // When you are the one knocking on doors, the realistic listeners are your
  // own region, your own country, and the elite leagues that scout everywhere.
  const currentLeague = p.clubId ? getLeague(getClub(p.clubId)?.leagueId ?? '') : null;
  const plausible = (c: CareerClub) => {
    const l = getLeague(c.leagueId);
    if (!l) return false;
    return isHomeClub(p, c) || l.confed === currentLeague?.confed || l.tier <= 2;
  };

  let pool = candidates(p, { min, max }).filter(plausible);
  if (pool.length === 0) pool = candidates(p, { min, max });
  if (pool.length === 0) pool = candidates(p, { min: 46, max: p.overall + 4 });

  const slots: ClubOffer[] = [];
  const bag = [...pool];
  for (let i = 0; i < count; i++) {
    // wildcard dream move
    if (rng.chance(0.05 + desperation / 600)) {
      const dream = CLUBS.filter(c => c.id !== p.clubId && c.strength >= p.overall + 5 && c.strength <= p.overall + 12 && reachable(p, c));
      if (dream.length) {
        const c = rng.pick(dream);
        slots.push({ clubId: c.id, verb: 'sign', role: 'prospect', wildcard: true });
        continue;
      }
    }
    if (!bag.length) { bag.push(...pool); }
    if (!bag.length) break;
    const c = rng.weighted(bag, x => 1 / (1 + Math.abs(x.strength - (p.overall - 1))) + 0.05);
    bag.splice(bag.indexOf(c), 1);
    slots.push({ clubId: c.id, verb: 'sign', role: roleFor(p, c) });
  }
  return slots;
}

export function roleBiasFor(role: OfferRole): number {
  return role === 'starter' ? 9 : role === 'rotation' ? 0 : -8;
}

export { getClub };
