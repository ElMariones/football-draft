import { FORMATION_LAYOUTS } from '@/data/formations';
import { EraKey, Formation, Player, Position, Team } from '@/data/types';
import { PL_TEAMS, CL_TEAMS } from '@/data';

// ---------- competition mode ----------

export type Mode = 'pl' | 'cl';

export interface ModeConfig {
  id: Mode;
  label: string;
  tagline: string;
  description: string;
  pool: Team[];
  primary: string;       // accent colour for theming
}

export const MODES: Record<Mode, ModeConfig> = {
  pl: {
    id: 'pl',
    label: 'Premier League',
    tagline: '20 teams · 38 games',
    description: 'Draft from any of the 20 Premier League clubs across every era. Play a full 38-game league season.',
    pool: PL_TEAMS,
    primary: '#FFD700',
  },
  cl: {
    id: 'cl',
    label: 'Champions League',
    tagline: '16 clubs · groups + knockouts',
    description: 'Draft from European royalty — the top 6 English plus Real, Barça, Bayern, Juve, Milan and more. Conquer Europe through groups and a single-leg KO bracket.',
    pool: CL_TEAMS,
    primary: '#3DA9FC',
  },
};

// ---------- difficulty ----------

export type Difficulty = 'easy' | 'normal' | 'sandbox';

export interface DifficultyConfig {
  id: Difficulty;
  label: string;
  tagline: string;
  description: string;
  perPick: { team: number; era: number } | null; // budget refreshed each pick
  global: { team: number; era: number } | null;  // budget shared across whole draft
}

export const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  easy: {
    id: 'easy',
    label: 'Easy',
    tagline: '1 + 1 per pick',
    description: 'Each pick comes with 1 team reroll and 1 era reroll. Lots of safety.',
    perPick: { team: 1, era: 1 },
    global: null,
  },
  normal: {
    id: 'normal',
    label: 'Normal',
    tagline: '3 + 3 total',
    description: 'A shared pool of 3 team rerolls and 3 era rerolls across the entire 11-pick draft. Pick your spots.',
    perPick: null,
    global: { team: 3, era: 3 },
  },
  sandbox: {
    id: 'sandbox',
    label: 'Sandbox',
    tagline: 'Unlimited',
    description: 'Spin and reroll forever. Build your dream XI with zero pressure.',
    perPick: { team: 999, era: 999 },
    global: null,
  },
};

// ---------- position compatibility ----------

// A player with position X can fill any slot whose position is in COMPAT[X].
// Keep this generous so the user is rarely stuck.
export const COMPAT: Record<Position, Position[]> = {
  GK:  ['GK'],
  CB:  ['CB', 'CDM'],
  RB:  ['RB', 'RWB', 'RM'],
  LB:  ['LB', 'LWB', 'LM'],
  RWB: ['RWB', 'RB', 'RM'],
  LWB: ['LWB', 'LB', 'LM'],
  CDM: ['CDM', 'CM', 'CB'],
  CM:  ['CM', 'CDM', 'CAM'],
  CAM: ['CAM', 'CM', 'ST', 'RM', 'LM', 'CF'],
  RM:  ['RM', 'RW', 'CAM', 'RB', 'RWB'],
  LM:  ['LM', 'LW', 'CAM', 'LB', 'LWB'],
  RW:  ['RW', 'RM', 'ST', 'RWB'],
  LW:  ['LW', 'LM', 'ST', 'LWB'],
  ST:  ['ST', 'CF', 'CAM'],
  CF:  ['CF', 'ST', 'CAM'],
};

export function canFill(playerPos: Position, slotPos: Position): boolean {
  return COMPAT[playerPos]?.includes(slotPos) ?? false;
}

// ---------- fantasy XI ----------

export interface DraftedPlayer {
  player: Player;
  sourceTeamId: string;
  sourceTeamName: string;
  sourceEra: EraKey;
}

export interface DraftSlot {
  position: Position;
  x: number;
  y: number;
  player: DraftedPlayer | null;
}

export const DEFAULT_FORMATION: Formation = '4-3-3';

export const AVAILABLE_FORMATIONS: { id: Formation; label: string; tagline: string }[] = [
  { id: '4-3-3',   label: '4-3-3',   tagline: 'Classic three-up-top' },
  { id: '4-4-2',   label: '4-4-2',   tagline: 'Two strikers, wide play' },
  { id: '4-2-3-1', label: '4-2-3-1', tagline: 'Double pivot + #10' },
  { id: '3-5-2',   label: '3-5-2',   tagline: 'Wingbacks, packed midfield' },
  { id: '4-5-1',   label: '4-5-1',   tagline: 'Compact, lone striker' },
  { id: '3-4-3',   label: '3-4-3',   tagline: 'Wide front three' },
];

export function buildEmptyXI(formation: Formation = DEFAULT_FORMATION): DraftSlot[] {
  return FORMATION_LAYOUTS[formation].map(s => ({
    position: s.position,
    x: s.x,
    y: s.y,
    player: null,
  }));
}

export function eligibleSlotIndices(
  xi: DraftSlot[],
  playerPos: Position,
): number[] {
  return xi
    .map((slot, idx) =>
      slot.player == null && canFill(playerPos, slot.position) ? idx : -1,
    )
    .filter(i => i !== -1);
}

export function poolHasAnyEligible(
  pool: Player[],
  xi: DraftSlot[],
  draftedKeys: Set<string>,
): boolean {
  return pool.some(p => {
    const key = playerKey(p);
    if (draftedKeys.has(key)) return false;
    return eligibleSlotIndices(xi, p.position).length > 0;
  });
}

export function playerKey(p: Player): string {
  // Uses name+position for uniqueness within a pool.
  return `${p.name}::${p.position}::${p.overall}`;
}

export function countDrafted(xi: DraftSlot[]): number {
  return xi.filter(s => s.player !== null).length;
}

export function xiComplete(xi: DraftSlot[]): boolean {
  return countDrafted(xi) === xi.length;
}
