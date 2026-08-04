// Seeded RNG for the career simulator. A career is driven by a single seed so
// runs are reproducible (and could later be verified server-side). Uses
// mulberry32 — tiny, fast, good enough for a game.

export interface Rng {
  seed: number;
  next(): number; // [0,1)
  int(maxExclusive: number): number;
  range(min: number, max: number): number; // float in [min,max)
  gauss(mean: number, sd: number): number;
  chance(p: number): boolean;
  pick<T>(arr: T[]): T;
  weighted<T>(arr: T[], weightOf: (x: T) => number): T;
}

export function makeRng(seed: number): Rng {
  let state = seed >>> 0 || 1;

  function next(): number {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  const rng: Rng = {
    get seed() {
      return state;
    },
    next,
    int(maxExclusive: number) {
      if (maxExclusive <= 0) return 0;
      return Math.floor(next() * maxExclusive);
    },
    range(min: number, max: number) {
      return min + next() * (max - min);
    },
    gauss(mean: number, sd: number) {
      // Box–Muller
      const u = 1 - next();
      const v = next();
      const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
      return mean + z * sd;
    },
    chance(p: number) {
      return next() < p;
    },
    pick<T>(arr: T[]): T {
      return arr[Math.floor(next() * arr.length)];
    },
    weighted<T>(arr: T[], weightOf: (x: T) => number): T {
      let total = 0;
      for (const x of arr) total += Math.max(0, weightOf(x));
      if (total <= 0) return arr[Math.floor(next() * arr.length)];
      let r = next() * total;
      for (const x of arr) {
        r -= Math.max(0, weightOf(x));
        if (r <= 0) return x;
      }
      return arr[arr.length - 1];
    },
  };
  return rng;
}

export const logistic = (x: number, k = 1) => 1 / (1 + Math.exp(-k * x));
export const clamp = (min: number, max: number, v: number) =>
  Math.max(min, Math.min(max, v));
// smooth 0..1 ramp between edge0 and edge1
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp(0, 1, (x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}
/**
 * A rolled seed: an unsigned 32-bit number, 1 .. 4294967295.
 *
 * Never 0. `makeRng` maps 0 to 1 anyway, so a zero seed would quietly produce
 * the same world as seed 1 while being stored and displayed as a different
 * number — and `seedFromText` already excludes it for the same reason.
 */
export function randomSeed(): number {
  if (typeof globalThis !== 'undefined' && (globalThis as any).crypto?.getRandomValues) {
    const arr = new Uint32Array(1);
    (globalThis as any).crypto.getRandomValues(arr);
    return (arr[0] >>> 0) || 1;
  }
  return (Math.floor(Math.random() * 0xffffffff) >>> 0) || 1;
}

/**
 * Turn any text into a seed, so a player can type a word rather than a number
 * and still land in a reproducible world. FNV-1a: short, stable across
 * platforms, and never returns 0 (mulberry32 treats 0 as 1 anyway).
 */
export function seedFromText(text: string): number {
  const t = text.trim();
  // a plain number is used as itself, so shared numeric seeds read back exactly
  if (/^\d{1,10}$/.test(t)) {
    const n = Number(t) >>> 0;
    if (n !== 0) return n;
  }
  let h = 0x811c9dc5;
  for (let i = 0; i < t.length; i++) {
    h ^= t.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) || 1;
}
