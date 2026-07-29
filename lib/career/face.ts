// Procedural player faces.
//
// A face is a small bag of genes rolled at creation and then rendered at any
// age. Nationality biases the roll — a Norwegian is unlikely to come out with
// black hair and dark skin, a Senegalese unlikely to come out blonde — but every
// palette keeps some spread, because national squads are not monocultures and
// the player can re-roll anyway.
//
// Ageing is applied at render time, not baked into the genes: the same face
// grows a beard in its twenties, then lines and grey in its thirties.
import type { Rng } from './rng';

export interface FaceGenes {
  skin: number;        // index into SKIN
  hairColor: number;   // index into HAIR
  hairStyle: number;   // index into HAIR_STYLES
  eyeColor: number;    // index into EYES
  faceShape: number;   // 0-3
  brow: number;        // 0-2
  nose: number;        // 0-2
  mouth: number;       // 0-2
  ears: number;        // 0-2
  /** the beard he will grow once old enough; 0 means he never really does */
  beard: number;       // index into BEARDS
  freckles: boolean;
  /** how early he greys, 0-1 */
  greyEarly: number;
}

export const SKIN = [
  '#F6D9C0', '#F0C9A8', '#E5B18C', '#D6996F', '#C08457',
  '#A66A42', '#8A5232', '#6B3D24', '#4E2C1A',
];
export const HAIR = [
  '#1B1512', '#2E211A', '#4A3020', '#6B4423', '#8B5A2B',
  '#B37A3E', '#D2A24C', '#E8C87A', '#A83B20', '#7A2E1E',
];
export const EYES = ['#4A3524', '#6B4A2A', '#8A6B3A', '#3D6B5A', '#4A7FA5', '#6FA3C7', '#5A5A5A'];

export const HAIR_STYLES = [
  'short', 'buzz', 'curly', 'afro', 'long', 'quiff', 'receding', 'bald', 'topknot', 'mid',
] as const;
export const BEARDS = ['none', 'stubble', 'goatee', 'full', 'moustache', 'chinstrap'] as const;

// ---- phenotype regions -----------------------------------------------------

type Weights = { skin: [number, number][]; hair: [number, number][]; eyes: [number, number][] };
const W = (skin: [number, number][], hair: [number, number][], eyes: [number, number][]): Weights =>
  ({ skin, hair, eyes });

/** [index, weight] pairs — indices into SKIN / HAIR / EYES. */
const REGIONS: Record<string, Weights> = {
  nordic: W([[0, 5], [1, 4], [2, 1]], [[5, 3], [6, 4], [7, 3], [4, 2], [3, 1], [9, 1]], [[4, 4], [5, 3], [3, 2], [0, 1]]),
  westEuro: W([[0, 3], [1, 5], [2, 3], [3, 1]], [[2, 3], [3, 5], [4, 3], [6, 2], [0, 2]], [[0, 3], [1, 3], [4, 2], [3, 2]]),
  medit: W([[1, 2], [2, 5], [3, 4], [4, 2]], [[0, 5], [1, 5], [2, 3], [3, 1]], [[0, 5], [1, 4], [2, 2]]),
  slavic: W([[0, 4], [1, 4], [2, 2]], [[3, 4], [4, 3], [5, 2], [2, 3], [6, 1]], [[4, 3], [5, 2], [0, 2], [3, 2]]),
  latin: W([[1, 3], [2, 4], [3, 4], [4, 3], [5, 2], [6, 1]], [[0, 5], [1, 5], [2, 3], [3, 2]], [[0, 5], [1, 4], [2, 2], [4, 1]]),
  arab: W([[3, 3], [4, 5], [5, 4], [6, 2]], [[0, 6], [1, 4], [2, 1]], [[0, 5], [1, 4], [6, 1]]),
  africa: W([[6, 3], [7, 5], [8, 4], [5, 2]], [[0, 8], [1, 2]], [[0, 6], [1, 3]]),
  eastAsia: W([[1, 4], [2, 4], [3, 2]], [[0, 8], [1, 2]], [[0, 6], [1, 2], [6, 1]]),
  oceania: W([[0, 4], [1, 4], [2, 2], [5, 1], [7, 1]], [[2, 3], [3, 4], [4, 3], [6, 2], [0, 2]], [[4, 3], [0, 3], [3, 2]]),
};

const NATION_REGION: Record<string, keyof typeof REGIONS> = {
  NO: 'nordic', SE: 'nordic', DK: 'nordic', IE: 'nordic', IS: 'nordic',
  EN: 'westEuro', SC: 'westEuro', DE: 'westEuro', NL: 'westEuro', BE: 'westEuro',
  FR: 'westEuro', AT: 'westEuro', CH: 'westEuro',
  ES: 'medit', IT: 'medit', PT: 'medit', GR: 'medit', HR: 'medit', RS: 'medit', TR: 'medit',
  PL: 'slavic', CZ: 'slavic', RU: 'slavic', UA: 'slavic',
  AR: 'latin', UY: 'latin', BR: 'latin', CL: 'latin', CO: 'latin', MX: 'latin',
  PE: 'latin', EC: 'latin', PY: 'latin', CR: 'latin', US: 'latin', CA: 'westEuro',
  SA: 'arab', EG: 'arab', MA: 'arab', DZ: 'arab',
  NG: 'africa', SN: 'africa', GH: 'africa', CI: 'africa', CM: 'africa',
  JP: 'eastAsia', KR: 'eastAsia',
  AU: 'oceania',
};

function pickWeighted(pairs: [number, number][], rng: Rng): number {
  const total = pairs.reduce((s, [, w]) => s + w, 0);
  let r = rng.next() * total;
  for (const [idx, w] of pairs) { r -= w; if (r <= 0) return idx; }
  return pairs[pairs.length - 1][0];
}

/** Roll a face for a nationality. */
export function randomFace(nationCode: string, rng: Rng): FaceGenes {
  const region = REGIONS[NATION_REGION[nationCode] ?? 'westEuro'];
  const skin = pickWeighted(region.skin, rng);
  // very dark skin essentially never pairs with blonde hair
  let hairColor = pickWeighted(region.hair, rng);
  if (skin >= 6 && hairColor >= 5) hairColor = rng.int(2);
  return {
    skin,
    hairColor,
    hairStyle: rng.int(HAIR_STYLES.length),
    eyeColor: pickWeighted(region.eyes, rng),
    faceShape: rng.int(4),
    brow: rng.int(3),
    nose: rng.int(3),
    mouth: rng.int(3),
    ears: rng.int(3),
    beard: rng.int(BEARDS.length),
    freckles: skin <= 2 && rng.chance(0.18),
    greyEarly: rng.next(),
  };
}

// ---- ageing ----------------------------------------------------------------

export interface FaceAge {
  /** 0-1: how much beard is actually showing */
  beardGrowth: number;
  /** 0-1: wrinkle intensity */
  wrinkles: number;
  /** 0-1: how grey the hair is */
  grey: number;
  /** hairline recession for styles that allow it */
  balding: number;
}

/**
 * Faces age. A 16-year-old is smooth and clean-shaven; facial hair fills in
 * through the twenties; lines and grey arrive in the thirties, earlier for some.
 */
export function ageFace(genes: FaceGenes, age: number): FaceAge {
  const beardGrowth = genes.beard === 0 ? 0
    : Math.max(0, Math.min(1, (age - 17) / 6));          // nothing at 16-17, full by ~23
  const wrinkles = Math.max(0, Math.min(1, (age - 28) / 12));
  const greyStart = 30 + genes.greyEarly * 8;            // 30-38
  const grey = Math.max(0, Math.min(1, (age - greyStart) / 10));
  const balding = Math.max(0, Math.min(1, (age - 27) / 14)) * (genes.greyEarly > 0.55 ? 1 : 0.25);
  return { beardGrowth, wrinkles, grey, balding };
}

/** Blend a hair colour toward grey. */
export function greyed(hex: string, amount: number): string {
  if (amount <= 0) return hex;
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  const t = Math.min(1, amount);
  const mix = (c: number) => Math.round(c + (200 - c) * t);
  return `#${[mix(r), mix(g), mix(b)].map(v => v.toString(16).padStart(2, '0')).join('')}`;
}

/** Darken a hex by a factor, for shading. */
export function shade(hex: string, f: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  const m = (c: number) => Math.max(0, Math.min(255, Math.round(c * f)));
  return `#${[m(r), m(g), m(b)].map(v => v.toString(16).padStart(2, '0')).join('')}`;
}
