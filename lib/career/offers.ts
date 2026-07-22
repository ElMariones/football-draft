import type { CareerPlayer, CareerClub, ClubOffer, OfferRole } from '@/data/career/types';
import { CLUBS, getClub } from '@/data/career/clubs';
import { getLeague } from '@/data/career/leagues';
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
  return m[tier] ?? 20;
}

function reachable(p: CareerPlayer, club: CareerClub): boolean {
  const league = getLeague(club.leagueId)!;
  if (league.nationCode === p.nationCode) return true; // home is always reachable
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
  return CLUBS.filter(c => getLeague(c.leagueId)?.nationCode === nationCode);
}

// ---- youth (first club at age 16) ------------------------------------------

export function generateYouthOffers(p: CareerPlayer, rng: Rng): ClubOffer[] {
  let pool = clubsByNation(p.nationCode).filter(c => c.strength <= 72);
  if (pool.length < 3) {
    // fallback: modest academies from lower/mid leagues anywhere
    pool = CLUBS.filter(c => c.strength >= 50 && c.strength <= 70);
  }
  const picks = pickDistinct(pool, 3, rng, 60);
  return picks.map(c => ({ clubId: c.id, verb: 'sign' as const, role: 'starter' as const }));
}

// ---- loan (early career, if stuck below club level) ------------------------

export function generateLoanOffers(p: CareerPlayer, rng: Rng): ClubOffer[] {
  const min = Math.max(48, p.overall - 20);
  const max = p.overall + 2;
  let pool = candidates(p, { min, max }).filter(c => {
    const t = getLeague(c.leagueId)!.tier;
    return t >= 3; // loan to a lower/developmental league
  });
  if (pool.length < 3) pool = CLUBS.filter(c => c.id !== p.clubId && c.strength <= p.overall + 2 && c.strength >= 50);
  const picks = pickDistinct(pool, 3, rng, p.overall - 6);
  return picks.map(c => ({ clubId: c.id, verb: 'loan' as const, role: 'starter' as const }));
}

// ---- organic transfer offers each window -----------------------------------

export function generateTransferOffers(p: CareerPlayer, rng: Rng): ClubOffer[] {
  const declining = p.age >= 32 || p.overall < p.peakOverall - 4;
  const min = declining ? p.overall - 16 : p.overall - 7;
  const max = p.overall + (declining ? 2 : 5);
  const pool = candidates(p, { min, max });
  const offers: ClubOffer[] = [];
  const targeted = pickDistinct(pool, 5, rng, p.overall + 1);
  for (const c of targeted) {
    // interest probability: closer to your level + your reputation
    const fit = 1 - Math.min(1, Math.abs(c.strength - p.overall) / 12);
    const prob = 0.25 + 0.5 * fit + (p.reputation - 45) / 200;
    if (rng.chance(prob) && offers.length < 3) {
      offers.push({ clubId: c.id, verb: 'sign', role: roleFor(p, c) });
    }
  }
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
  let pool = candidates(p, { min, max });
  if (pool.length === 0) pool = candidates(p, { min: 46, max: p.overall + 4 });

  const slots: ClubOffer[] = [];
  const bag = [...pool];
  for (let i = 0; i < count; i++) {
    // wildcard dream move
    if (rng.chance(0.05 + desperation / 600)) {
      const dream = CLUBS.filter(c => c.id !== p.clubId && c.strength >= p.overall + 5 && c.strength <= p.overall + 12 && reachable(p, c));
      if (dream.length) {
        const c = rng.pick(dream);
        slots.push({ clubId: c.id, verb: 'sign', role: 'prospect' });
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
  return role === 'starter' ? 6 : role === 'rotation' ? 0 : -6;
}

export { getClub };
