// Personal records for career mode, kept in localStorage.
//
// Career mode has no server leaderboard, so a finished run used to print a score
// once and vanish. These are the local boards it goes onto — and there are two
// of them, deliberately.
//
// A typed seed can be replayed until the world cooperates: reroll the same seed,
// keep the wonderkid, learn where the events fall. A rolled seed you get once.
// Those are not the same achievement, so they are not the same board. Ranked
// means the seed was rolled for you.
export type SeedSource = 'random' | 'custom' | 'daily';

export interface CareerRecord {
  surname: string;
  position: string;
  nationCode: string;
  score: number;
  peakOverall: number;
  seasons: number;
  trophies: number;
  seed: number;
  seedSource: SeedSource;
  /** ISO date the run finished */
  at: string;
}

export interface Records {
  random: CareerRecord[];
  custom: CareerRecord[];
  /** the seed of the day — everyone's is the same, so it gets its own board */
  daily: CareerRecord[];
}

const KEY = 'career:records';
const KEEP = 10;

const empty = (): Records => ({ random: [], custom: [], daily: [] });

export function loadRecords(): Records {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as Partial<Records>;
    return {
      random: Array.isArray(parsed.random) ? parsed.random : [],
      custom: Array.isArray(parsed.custom) ? parsed.custom : [],
      daily: Array.isArray(parsed.daily) ? parsed.daily : [],
    };
  } catch {
    return empty();
  }
}

/** Which of the three boards a seed belongs to. */
function boardOf(src: SeedSource): keyof Records {
  return src === 'custom' ? 'custom' : src === 'daily' ? 'daily' : 'random';
}

/** File a finished career onto the board its seed belongs to. */
export function saveRecord(r: CareerRecord): Records {
  const all = loadRecords();
  const board = boardOf(r.seedSource);
  all[board] = [...all[board], r]
    .sort((a, b) => b.score - a.score)
    .slice(0, KEEP);
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(all));
  } catch { /* private mode — the run just does not get filed */ }
  return all;
}

/** Where this score would place on its own board, 1-indexed; 0 if unplaced. */
export function rankOf(records: Records, r: CareerRecord): number {
  const board = records[boardOf(r.seedSource)];
  const i = board.findIndex(x => x.at === r.at && x.score === r.score);
  return i < 0 ? 0 : i + 1;
}
