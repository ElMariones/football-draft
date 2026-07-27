// Attribute system. Overall is no longer a free-floating number: it is a
// position-weighted blend of five attributes. This is what gives the archetype
// pick, the preseason cards and the shop something real to push on — every
// upgrade moves a visible number that feeds back into the season pipeline.
import type { Position } from '@/data/types';
import type { Attrs } from '@/data/career/types';
import { clamp } from './rng';

export const ATTR_KEYS = ['tec', 'pac', 'phy', 'vis', 'lea'] as const;
export type AttrKey = (typeof ATTR_KEYS)[number];

// Attributes are deliberately universal so they read sensibly in every role:
//   tec — technique: finishing for forwards, distribution/handling for a keeper
//   pac — pace
//   phy — physical: strength, stamina base, injury resistance
//   vis — vision: passing, reading the game
//   lea — leadership: mentality, clutch, captaincy
export const ATTR_LABEL: Record<AttrKey, { en: string; es: string }> = {
  tec: { en: 'Technique', es: 'Técnica' },
  pac: { en: 'Pace', es: 'Velocidad' },
  phy: { en: 'Physical', es: 'Físico' },
  vis: { en: 'Vision', es: 'Visión' },
  lea: { en: 'Leadership', es: 'Liderazgo' },
};

type W = Record<AttrKey, number>;
const w = (tec: number, pac: number, phy: number, vis: number, lea: number): W =>
  ({ tec, pac, phy, vis, lea });

// Each position reads the same five attributes through a different lens.
const WEIGHTS: Partial<Record<Position, W>> = {
  ST:  w(0.40, 0.25, 0.20, 0.10, 0.05),
  CF:  w(0.38, 0.20, 0.18, 0.19, 0.05),
  RW:  w(0.32, 0.35, 0.10, 0.18, 0.05),
  LW:  w(0.32, 0.35, 0.10, 0.18, 0.05),
  CAM: w(0.30, 0.12, 0.10, 0.43, 0.05),
  RM:  w(0.26, 0.32, 0.14, 0.23, 0.05),
  LM:  w(0.26, 0.32, 0.14, 0.23, 0.05),
  CM:  w(0.22, 0.12, 0.20, 0.36, 0.10),
  CDM: w(0.12, 0.10, 0.35, 0.28, 0.15),
  RB:  w(0.15, 0.32, 0.28, 0.18, 0.07),
  LB:  w(0.15, 0.32, 0.28, 0.18, 0.07),
  RWB: w(0.17, 0.34, 0.24, 0.18, 0.07),
  LWB: w(0.17, 0.34, 0.24, 0.18, 0.07),
  CB:  w(0.10, 0.18, 0.45, 0.12, 0.15),
  GK:  w(0.40, 0.05, 0.30, 0.15, 0.10),
};

export function weightsFor(pos: Position): W {
  return WEIGHTS[pos] ?? w(0.25, 0.2, 0.2, 0.25, 0.1);
}

/** Composite overall from attributes, weighted by position. */
export function overallFrom(attrs: Attrs, pos: Position): number {
  const k = weightsFor(pos);
  const raw =
    attrs.tec * k.tec + attrs.pac * k.pac + attrs.phy * k.phy +
    attrs.vis * k.vis + attrs.lea * k.lea;
  return clamp(35, 99, Math.round(raw));
}

/** Add deltas, clamped per attribute. Returns a new object. */
export function addAttrs(base: Attrs, delta: Partial<Attrs>): Attrs {
  const out = { ...base };
  for (const k of ATTR_KEYS) {
    if (delta[k]) out[k] = clamp(20, 99, out[k] + (delta[k] as number));
  }
  return out;
}

/**
 * Starting attributes for a position. Built so the composite overall lands in
 * the intended debut band, then shaped so every position has a believable
 * profile (a keeper is not fast, a winger is not a tank).
 */
export function startingAttrs(pos: Position, base: number): Attrs {
  const k = weightsFor(pos);
  // Start everyone flat at `base`, then tilt ±8 toward the position's identity:
  // attributes the role leans on start higher, the irrelevant ones lower.
  const attrs: Attrs = { tec: base, pac: base, phy: base, vis: base, lea: base };
  for (const key of ATTR_KEYS) {
    const tilt = (k[key] - 0.2) * 40; // weight 0.2 is neutral
    attrs[key] = clamp(20, 99, Math.round(base + tilt));
  }
  return attrs;
}

/**
 * A specialist may sit above his overall ceiling — a winger can have 90 pace on
 * an 82 potential — but he must not run away from it. Every source of attribute
 * gain (growth, preseason cards, the shop) funnels through `gainAttrs` so a
 * 20-season drip of +3 cards can't end with 99s on an 83-potential player.
 */
export function attrCap(potential: number): number {
  return clamp(60, 99, Math.round(potential) + 8);
}

export function gainAttrs(base: Attrs, delta: Partial<Attrs>, potential: number): Attrs {
  const cap = attrCap(potential);
  const out = addAttrs(base, delta);
  for (const k of ATTR_KEYS) {
    // never claw back what a player already has — just stop it climbing
    out[k] = Math.min(out[k], Math.max(base[k], cap));
  }
  return out;
}

/**
 * Move overall by exactly `delta` by shifting the underlying attributes.
 *
 * Anything that claims to grant "+5 OVR" has to go through here. Writing
 * `p.overall` directly does nothing lasting, because overall is recomputed from
 * the attributes at the end of every season — the boost silently evaporated the
 * next time any other stat changed. Since the position weights sum to 1, adding
 * `delta` to every attribute moves the weighted mean by exactly `delta`.
 */
export function applyOverallDelta(base: Attrs, delta: number): Attrs {
  const out = { ...base };
  for (const k of ATTR_KEYS) out[k] = clamp(20, 99, out[k] + delta);
  return out;
}

/** Ageing: attributes decay at different rates (pace goes first, vision lasts). */
export function ageDecay(age: number): Partial<Attrs> {
  if (age <= 29) return {};
  const s = Math.min(4, (age - 29) * 0.6); // ramps with age
  return {
    pac: -s * 1.3,
    phy: -s * 0.9,
    tec: -s * 0.4,
    vis: -s * 0.1,
    lea: +0.3, // you get smarter as you slow down
  };
}

/** Highest attribute — used for nicknames and the summary profile. */
export function topAttr(attrs: Attrs): AttrKey {
  return ATTR_KEYS.reduce((best, k) => (attrs[k] > attrs[best] ? k : best), 'tec' as AttrKey);
}
