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

/** Full name of a position, for the creation screen. */
const POSITION_FULL: Record<string, [string, string]> = {
  GK: ['Goalkeeper', 'Portero'],
  CB: ['Centre-back', 'Defensa central'],
  LB: ['Left-back', 'Lateral izquierdo'],
  RB: ['Right-back', 'Lateral derecho'],
  LWB: ['Left wing-back', 'Carrilero izquierdo'],
  RWB: ['Right wing-back', 'Carrilero derecho'],
  CDM: ['Defensive midfielder', 'Mediocentro defensivo'],
  CM: ['Central midfielder', 'Mediocentro'],
  CAM: ['Attacking midfielder', 'Mediapunta'],
  LM: ['Left midfielder', 'Interior izquierdo'],
  RM: ['Right midfielder', 'Interior derecho'],
  LW: ['Left winger', 'Extremo izquierdo'],
  RW: ['Right winger', 'Extremo derecho'],
  CF: ['Second striker', 'Segundo delantero'],
  ST: ['Striker', 'Delantero centro'],
};

/** One line on what the job actually is, so the choice is informed. */
const POSITION_BLURB: Record<string, [string, string]> = {
  GK: ['Clean sheets are your goals. Nothing else counts the same.',
       'Las vallas invictas son tus goles. Nada más cuenta igual.'],
  CB: ['You are judged on what does not happen.',
       'Te juzgan por lo que no pasa.'],
  LB: ['Defend a wing, then attack it. Ninety minutes, both ways.',
       'Defiendes una banda y luego la atacas. Noventa minutos, ida y vuelta.'],
  RB: ['Defend a wing, then attack it. Ninety minutes, both ways.',
       'Defiendes una banda y luego la atacas. Noventa minutos, ida y vuelta.'],
  LWB: ['More winger than defender, and the legs to prove it.',
        'Más extremo que defensor, y las piernas para demostrarlo.'],
  RWB: ['More winger than defender, and the legs to prove it.',
        'Más extremo que defensor, y las piernas para demostrarlo.'],
  CDM: ['The screen. Break it up, give it to someone better.',
        'El filtro. Cortas y se la das a alguien mejor.'],
  CM: ['Everything goes through you, in both directions.',
       'Todo pasa por ti, en las dos direcciones.'],
  CAM: ['The last pass is yours. So is the blame.',
        'El último pase es tuyo. La culpa también.'],
  LM: ['Up and down the left, all game.',
       'Subir y bajar por la izquierda, todo el partido.'],
  RM: ['Up and down the right, all game.',
       'Subir y bajar por la derecha, todo el partido.'],
  LW: ['One-on-one, every time. Beat him and the game opens.',
       'Uno contra uno, siempre. Lo pasas y se abre el partido.'],
  RW: ['One-on-one, every time. Beat him and the game opens.',
       'Uno contra uno, siempre. Lo pasas y se abre el partido.'],
  CF: ['Between the lines, where nobody wants to mark you.',
       'Entre líneas, donde nadie quiere marcarte.'],
  ST: ['You are remembered for goals. Only goals.',
       'Te recuerdan por los goles. Solo por los goles.'],
};

export function positionFull(pos: string, lang: 'en' | 'es'): string {
  const p = POSITION_FULL[pos];
  return p ? p[lang === 'es' ? 1 : 0] : pos;
}
export function positionBlurb(pos: string, lang: 'en' | 'es'): string {
  const p = POSITION_BLURB[pos];
  return p ? p[lang === 'es' ? 1 : 0] : '';
}
