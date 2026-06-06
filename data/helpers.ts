import { Formation, Player, TeamEra } from './types';
import { FORMATION_LAYOUTS } from './formations';

// Produces a placeholder XI matching a formation's positions.
// Use this in team files where you don't have real player data yet —
// then replace with a full `players: [...]` literal when you fill it in.
export function tbdPlayers(formation: Formation, baseOverall = 75): Player[] {
  const slots = FORMATION_LAYOUTS[formation];
  return slots.map((slot, i) => ({
    name: `TBD ${slot.position}${countDuplicates(slots, slot.position, i)}`,
    position: slot.position,
    overall: baseOverall,
  }));
}

function countDuplicates(slots: { position: string }[], pos: string, idx: number): string {
  const count = slots.filter((s, i) => s.position === pos && i <= idx).length;
  const total = slots.filter(s => s.position === pos).length;
  return total > 1 ? ` ${count}` : '';
}

// Shorthand for a placeholder era.
// Example: `'90-95': eraTBD('4-4-2', 78, 'Pre-Wenger side')`
export function eraTBD(
  formation: Formation,
  baseOverall: number = 75,
  notes?: string,
): TeamEra {
  return { formation, notes, players: tbdPlayers(formation, baseOverall) };
}

// Resolves the average overall for a team era (used by the simulation).
export function avgOverall(era: TeamEra): number {
  if (!era.players.length) return 70;
  return era.players.reduce((sum, p) => sum + p.overall, 0) / era.players.length;
}
