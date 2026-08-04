// The seed of the day.
//
// One world, everyone, resets at midnight UTC. The board that comes with it is
// the only one where two players are comparing the same career: same club
// offers, same events, same wonderkid roll — so the difference between two rows
// is entirely the decisions taken.
//
// Nothing about it is stored. The day's seed is a pure function of the date, so
// the client and the server derive the same number independently and the server
// can reject a run claiming to be today's without trusting the client at all.
import { seedFromText } from './rng';

export type SeedSource = 'random' | 'custom' | 'daily';

/** UTC calendar day, `YYYY-MM-DD`. The reset is the same instant worldwide. */
export function dayKey(at: Date = new Date()): string {
  return at.toISOString().slice(0, 10);
}

/**
 * The seed for a given day.
 *
 * Namespaced so it can never collide with a seed a player typed by hand — a
 * custom run must not be able to masquerade as a daily one, and the daily board
 * is the only one where that would matter.
 */
export function dailySeed(key: string = dayKey()): number {
  return seedFromText(`fcd-daily-${key}`);
}

/** Whether a submitted (seed, day) pair really is that day's world. */
export function isDailySeed(seed: number, key: string): boolean {
  return dailySeed(key) === seed;
}

/** `YYYY-MM-DD` and nothing else — the value reaches the database. */
export function isDayKey(v: unknown): v is string {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

/**
 * How long today's board has left. Used for the countdown; recomputed on the
 * client so a page left open overnight does not keep claiming yesterday.
 */
export function msUntilReset(now: Date = new Date()): number {
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.max(0, next - now.getTime());
}

export function resetCountdown(ms: number, lang: 'en' | 'es'): string {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return lang === 'es' ? `${h}h ${m}m` : `${h}h ${m}m`;
}
