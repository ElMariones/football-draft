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
 * The point at which an attribute stops coming easily.
 *
 * A specialist may sit above his overall ceiling — a winger can have 90 pace on
 * an 82 potential — but he must not run away from it.
 */
export function attrCap(potential: number): number {
  return clamp(60, 99, Math.round(potential) + 8);
}

/** What a point of gain is worth once an attribute is already past its cap. */
const OVER_CAP_RATE = 0.25;
/** And the most it can ever be pushed past it, however many cards you spend. */
const OVER_CAP_ROOM = 4;

/**
 * Add to one attribute, with a *soft* ceiling.
 *
 * This used to be a wall: anything at the cap took `Math.min(...)` and the gain
 * vanished. A card that said "+4 Pace" moved a 93 to a 93, which reads as the
 * game being broken — and it is not far off, because the reward was spent and
 * nothing came back.
 *
 * Now the cap slows growth instead of stopping it. Everything up to the cap
 * lands in full; past it, four points of card buy one point of attribute. The
 * anti-inflation intent survives — twenty seasons of +3 cards no longer end in
 * 99s on an 83-potential player — and the number always moves.
 */
export function softGain(current: number, gain: number, cap: number): number {
  if (gain <= 0) return clamp(20, 99, current + gain);
  let v = current;
  let left = gain;
  if (v < cap) {
    const room = Math.min(left, cap - v);
    v += room;
    left -= room;
  }
  if (left > 0) v = Math.min(cap + OVER_CAP_ROOM, v + left * OVER_CAP_RATE);
  return clamp(20, 99, v);
}

export function gainAttrs(base: Attrs, delta: Partial<Attrs>, potential: number): Attrs {
  const cap = attrCap(potential);
  const out = { ...base };
  for (const k of ATTR_KEYS) {
    const d = delta[k];
    if (!d) continue;
    out[k] = softGain(out[k], d, cap);
  }
  return out;
}

/**
 * Overall, from the attributes, with a soft ceiling at your potential.
 *
 * Two things had to be true at once and previously neither was.
 *
 * First, one definition. `applyProgression` clamped overall to `potential`
 * while the card, shop and archetype paths did not, so a preseason card raised
 * you to 89 and the end of the season quietly put you back to 85. From the
 * outside that is indistinguishable from the number being stuck.
 *
 * Second, gains have to land. A hard clamp at `potential` means that once you
 * reach your ceiling *nothing* moves the number again — every card, every shop
 * item and every event for the rest of the career is visibly wasted.
 *
 * So potential is now a soft ceiling on overall: everything up to it counts in
 * full, and beyond it each point of attribute is worth a fraction of a point of
 * overall. You can exceed your natural ceiling by investing in it, the number
 * always responds, and it cannot run away — attributes are separately capped,
 * so there is a hard maximum this can reach.
 */
export function softCapOverall(raw: number, potential: number): number {
  if (raw <= potential) return raw;
  return clamp(35, 99, Math.round(potential + (raw - potential) * 0.45));
}

export function recomputeOverall(p: {
  attrs: Attrs; position: Position; potential: number; overall: number; peakOverall: number;
}): void {
  p.overall = softCapOverall(overallFrom(p.attrs, p.position), p.potential);
  p.peakOverall = Math.max(p.peakOverall, Math.round(p.overall));
}

/**
 * The single way anything grants a player attributes.
 *
 * Every source — archetype, preseason card, shop item, event, seasonal growth —
 * goes through here, so they all obey the same ceiling and all leave `overall`
 * in the same state. Events used to call `addAttrs` directly and skip the cap
 * entirely, which is why an event could take a 93 to 99 while a card could not
 * move it at all.
 */
export function grantAttrs(
  p: { attrs: Attrs; position: Position; potential: number; overall: number; peakOverall: number },
  delta: Partial<Attrs>,
): void {
  p.attrs = gainAttrs(p.attrs, delta, p.potential);
  recomputeOverall(p);
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
export function applyOverallDelta(base: Attrs, delta: number, potential: number): Attrs {
  const cap = attrCap(potential);
  const out = { ...base };
  // Since the position weights sum to 1, adding `delta` to every attribute
  // moves the weighted mean by `delta` — until the soft ceiling starts taking
  // its cut, which is the point of the ceiling.
  for (const k of ATTR_KEYS) out[k] = softGain(out[k], delta, cap);
  return out;
}


/** Highest attribute — used for nicknames and the summary profile. */
export function topAttr(attrs: Attrs): AttrKey {
  return ATTR_KEYS.reduce((best, k) => (attrs[k] > attrs[best] ? k : best), 'tec' as AttrKey);
}
