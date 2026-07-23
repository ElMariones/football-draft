// Central tuning for the career engine. All the "feel" knobs live here.
import type { Position } from '@/data/types';
import { clamp } from './rng';

export const CAREER = {
  startAge: 16,
  startYear: 2024,
  retireFrom: 34,
  hardRetire: 41,
  startOverallRange: [46, 55] as const,
  potentialRange: [72, 96] as const,
  growthK: 2.4,
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

// Goal output is steeply gated by overall — calibrated to the reference game,
// where a striker scores ~0.02 goals/game at OVR 50, ~0.24 at 67, ~0.6 at 85.
// goalsPerGame(striker) = 0.78 * ((overall-45)/45)^1.7
export function ovrGoalFactor(overall: number): number {
  return Math.pow(Math.max(0, overall - 45) / 45, 1.7);
}
export function ovrAssistFactor(overall: number): number {
  return Math.pow(Math.max(0, overall - 45) / 45, 1.35);
}
// Position weighting relative to a striker (=1.0).
export function goalPosFactor(pos: Position): number {
  const m: Partial<Record<Position, number>> = {
    ST: 1.0, CF: 0.88, RW: 0.62, LW: 0.62, CAM: 0.5, RM: 0.34, LM: 0.34,
    CM: 0.18, CDM: 0.08, RB: 0.06, LB: 0.06, RWB: 0.09, LWB: 0.09, CB: 0.05, GK: 0,
  };
  return m[pos] ?? 0.15;
}
export function assistPosFactor(pos: Position): number {
  const m: Partial<Record<Position, number>> = {
    CAM: 1.0, RW: 0.85, LW: 0.85, RM: 0.8, LM: 0.8, CM: 0.65, CF: 0.6,
    ST: 0.5, CDM: 0.35, RB: 0.5, LB: 0.5, RWB: 0.6, LWB: 0.6, CB: 0.12, GK: 0.05,
  };
  return m[pos] ?? 0.4;
}
export const GOAL_BASE = 0.78;
export const ASSIST_BASE = 0.5;
export function isKeeperOrDef(pos: Position): boolean {
  return pos === 'GK' || pos === 'CB' || pos === 'LB' || pos === 'RB' || pos === 'RWB' || pos === 'LWB';
}
export function isAttacker(pos: Position): boolean {
  return pos === 'ST' || pos === 'CF' || pos === 'RW' || pos === 'LW' || pos === 'CAM';
}
export function isMidfielder(pos: Position): boolean {
  return pos === 'CDM' || pos === 'CM' || pos === 'CAM' || pos === 'RM' || pos === 'LM';
}

// Weaker leagues inflate output only MILDLY — the reference game does not let a
// lower-division striker rack up goals, so this stays close to 1.0.
export function leagueGoalMod(tier: number): number {
  const m: Record<number, number> = { 1: 0.9, 2: 0.95, 3: 1.0, 4: 1.05, 5: 1.1, 6: 1.15 };
  return m[tier] ?? 1.05;
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

// Anchored to the reference game: OVR 50 ≈ €100K after age/league factors,
// OVR 67 ≈ €2.3M. Lower and less steep at the bottom than before.
export function valueBase(overall: number): number {
  return 42000 * Math.pow(1.135, clamp(0, 55, overall - 42));
}
