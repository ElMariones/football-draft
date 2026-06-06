// Uniformly-distributed random source. Prefers crypto.getRandomValues when
// available (browsers + modern Node) for higher-quality entropy than the
// implementation-specific Math.random.
export function rand(): number {
  if (typeof globalThis !== 'undefined' && (globalThis as any).crypto?.getRandomValues) {
    const arr = new Uint32Array(1);
    (globalThis as any).crypto.getRandomValues(arr);
    return arr[0] / 0x100000000;
  }
  return Math.random();
}

// Returns an integer in [0, max).
export function randInt(max: number): number {
  if (max <= 0) return 0;
  return Math.floor(rand() * max);
}

// In-place Fisher-Yates shuffle. Returns the same array.
export function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

// Returns a uniformly random element from a non-empty array.
export function pickOne<T>(arr: T[]): T {
  return arr[randInt(arr.length)];
}
