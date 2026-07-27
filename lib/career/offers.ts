import type { CareerPlayer, CareerClub, ClubOffer, OfferRole } from '@/data/career/types';
import { CLUBS, getClub } from '@/data/career/clubs';
import { getLeague, LEAGUES } from '@/data/career/leagues';
import { getNation } from '@/data/career/nations';
import { Rng } from './rng';

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
  const moneyMove = (p.age >= 30 || p.reputation >= 70)
    ? CLUBS.filter(c => (c.leagueId === 'saudi-league' || c.leagueId === 'mls') && inBand(c))
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
