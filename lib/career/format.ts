import type { Position } from '@/data/types';

export function formatValue(v: number): string {
  if (v >= 1_000_000) {
    const m = v / 1_000_000;
    return `€${m >= 10 ? Math.round(m) : m.toFixed(1)}M`;
  }
  if (v >= 1_000) return `€${Math.round(v / 1000)}K`;
  return `€${Math.round(v)}`;
}

// On-pitch Spanish/English abbreviations, matching the reference game.
export const POSITION_ABBR: Record<Position, { es: string; en: string }> = {
  GK: { es: 'POR', en: 'GK' },
  CB: { es: 'DFC', en: 'CB' },
  LB: { es: 'LI', en: 'LB' },
  RB: { es: 'LD', en: 'RB' },
  LWB: { es: 'CAI', en: 'LWB' },
  RWB: { es: 'CAD', en: 'RWB' },
  CDM: { es: 'MCD', en: 'CDM' },
  CM: { es: 'MC', en: 'CM' },
  CAM: { es: 'MCO', en: 'CAM' },
  LM: { es: 'MI', en: 'LM' },
  RM: { es: 'MD', en: 'RM' },
  LW: { es: 'EI', en: 'LW' },
  RW: { es: 'ED', en: 'RW' },
  CF: { es: 'SD', en: 'CF' },
  ST: { es: 'DC', en: 'ST' },
};

export function positionAbbr(pos: Position, lang: 'en' | 'es'): string {
  return POSITION_ABBR[pos]?.[lang] ?? pos;
}

// Ordered position list for the creation pitch (mirrors the reference layout).
export const PITCH_POSITIONS: Position[] = [
  'ST', 'LW', 'RW', 'CAM', 'LM', 'RM', 'CM', 'CDM', 'LB', 'RB', 'CB', 'GK',
];

// OVR badge color tier.
export function ovrTier(ovr: number): 'low' | 'mid' | 'high' | 'elite' {
  if (ovr < 65) return 'low';
  if (ovr < 75) return 'mid';
  if (ovr < 85) return 'high';
  return 'elite';
}
