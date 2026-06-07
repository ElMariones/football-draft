const DEFAULT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const DEFAULT_MAX = 10;

interface Entry {
  timestamps: number[];
}

const store = new Map<string, Entry>();

let lastCleanup = Date.now();
function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < 10 * 60 * 1000) return;
  lastCleanup = now;
  const cutoff = now - DEFAULT_WINDOW_MS;
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter(t => t > cutoff);
    if (entry.timestamps.length === 0) store.delete(key);
  }
}

export function checkRateLimit(
  key: string,
  max: number = DEFAULT_MAX,
  windowMs: number = DEFAULT_WINDOW_MS,
): { allowed: boolean; remaining: number; resetIn: number } {
  cleanup();
  const now = Date.now();
  const cutoff = now - windowMs;

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  entry.timestamps = entry.timestamps.filter(t => t > cutoff);

  if (entry.timestamps.length >= max) {
    const oldest = entry.timestamps[0];
    const resetIn = Math.ceil((oldest + windowMs - now) / 1000);
    return { allowed: false, remaining: 0, resetIn };
  }

  entry.timestamps.push(now);
  return { allowed: true, remaining: max - entry.timestamps.length, resetIn: 0 };
}
