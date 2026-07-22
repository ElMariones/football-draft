// Central tuning for the career engine. All the "feel" knobs live here.
import type { Position } from '@/data/types';
import { clamp } from './rng';

export const CAREER = {
  startAge: 16,
  startYear: 2024,
  retireFrom: 34,
  hardRetire: 41,
  startOverallRange: [46, 55] as const,
  potentialRange: [64, 94] as const,
  growthK: 2.15,
  eventChanceBase: 0.55,
  transfer: {
    baseRerolls: 3,
    desperationPerReroll: 22,
  },
};

// Development speed by age (multiplier on growth). Fast when young, ~0 by 29.
export function developmentByAge(age: number): number {
  const table: Record<number, number> = {
    16: 1.05, 17: 1.0, 18: 0.92, 19: 0.82, 20: 0.72, 21: 0.62, 22: 0.52,
    23: 0.42, 24: 0.33, 25: 0.25, 26: 0.17, 27: 0.1, 28: 0.05,
  };
  if (age <= 16) return table[16];
  return table[age] ?? 0;
}

// Age-related OVR decline per season (0 until ~30, ramps after).
export function declineByAge(age: number): number {
  if (age <= 29) return 0;
  const table: Record<number, number> = {
    30: 0.3, 31: 0.6, 32: 1.0, 33: 1.4, 34: 1.9, 35: 2.4, 36: 2.9, 37: 3.4,
  };
  return table[age] ?? 3.8;
}

// How many games a club plays in a season (league) by league tier.
export function leagueGamesByTier(tier: number): number {
  if (tier <= 2) return 38;
  if (tier <= 4) return 36;
  return 32;
}
export const CONTINENTAL_GAMES = 12;

// Age effect on how many minutes you get (youth eased in, veterans fade).
export function ageMinutesBias(age: number): number {
  if (age <= 16) return -13;
  const table: Record<number, number> = {
    17: -8, 18: -5, 19: -2, 32: -1, 33: -2, 34: -4, 35: -6, 36: -8, 37: -10,
  };
  return table[age] ?? (age >= 38 ? -13 : 0);
}

// Per-appearance scoring rates by position (goals).
export function goalRate(pos: Position): number {
  const m: Partial<Record<Position, number>> = {
    ST: 0.62, CF: 0.55, RW: 0.4, LW: 0.4, CAM: 0.34, RM: 0.24, LM: 0.24,
    CM: 0.13, CDM: 0.06, RB: 0.05, LB: 0.05, RWB: 0.07, LWB: 0.07, CB: 0.05, GK: 0,
  };
  return m[pos] ?? 0.1;
}
// Per-appearance assist rates by position.
export function assistRate(pos: Position): number {
  const m: Partial<Record<Position, number>> = {
    CAM: 0.3, RW: 0.24, LW: 0.24, RM: 0.22, LM: 0.22, CM: 0.17, CF: 0.18,
    ST: 0.14, CDM: 0.09, RB: 0.13, LB: 0.13, RWB: 0.15, LWB: 0.15, CB: 0.03, GK: 0.01,
  };
  return m[pos] ?? 0.12;
}
export function isKeeperOrDef(pos: Position): boolean {
  return pos === 'GK' || pos === 'CB' || pos === 'LB' || pos === 'RB' || pos === 'RWB' || pos === 'LWB';
}
export function isAttacker(pos: Position): boolean {
  return pos === 'ST' || pos === 'CF' || pos === 'RW' || pos === 'LW' || pos === 'CAM';
}
export function isMidfielder(pos: Position): boolean {
  return pos === 'CDM' || pos === 'CM' || pos === 'CAM' || pos === 'RM' || pos === 'LM';
}

// Weaker leagues inflate output; strong leagues suppress it.
export function leagueEase(tier: number): number {
  const m: Record<number, number> = { 1: 0.85, 2: 0.95, 3: 1.05, 4: 1.15, 5: 1.3, 6: 1.42 };
  return m[tier] ?? 1.1;
}
// Value premium for playing in a stronger league.
export function leaguePremium(tier: number): number {
  const m: Record<number, number> = { 1: 1.9, 2: 1.5, 3: 1.2, 4: 1.0, 5: 0.82, 6: 0.7 };
  return m[tier] ?? 1;
}

// Age multiplier on market value (bell curve, peak early-mid 20s).
export function ageValueMul(age: number): number {
  const table: Record<number, number> = {
    16: 0.75, 17: 0.95, 18: 1.25, 19: 1.55, 20: 1.9, 21: 2.2, 22: 2.4, 23: 2.5,
    24: 2.5, 25: 2.4, 26: 2.2, 27: 1.95, 28: 1.65, 29: 1.35, 30: 1.08, 31: 0.85,
    32: 0.65, 33: 0.5, 34: 0.38, 35: 0.28, 36: 0.2, 37: 0.14,
  };
  if (age <= 16) return table[16];
  return table[age] ?? 0.1;
}

export function valueBase(overall: number): number {
  return 50000 * Math.pow(1.17, clamp(0, 60, overall - 40));
}
