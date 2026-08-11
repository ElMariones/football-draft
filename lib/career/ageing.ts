// How this particular body ages.
//
// Decline used to be one table every career shared, so every player fell apart
// on exactly the same schedule. Real careers are not like that: two players of
// the same ability, born the same year, can be a starter in a Champions League
// midfield at 38 and finished at 32. That difference is most of what makes a
// long career interesting, and it was not in the game at all.
//
// Every career now rolls a longevity, once, from its own seed. It shapes four
// things that used to be fixed: when the decline starts, how steeply it falls,
// how long a manager keeps picking you, and when you start thinking about
// stopping. It is not visible as a number — you find out the way a player finds
// out, by getting to thirty-three and noticing whether you can still go.
import type { Attrs, CareerPlayer } from '@/data/career/types';
import { Rng, clamp } from './rng';
import type { Lang } from './i18n';

export interface AgeingProfile {
  /**
   * 0 = gone at thirty-one, 1 = still going at forty.
   *
   * One number, because the things it drives are not independent: a body that
   * holds its pace also holds its place in the team and keeps its owner
   * interested for longer.
   */
  longevity: number;
  /** the last age before decline starts to bite */
  peakEnd: number;
  /** multiplier on how hard it bites once it does */
  rate: number;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Roll one.
 *
 * Deliberately a wide distribution with fat tails rather than everybody
 * clustering on average: the point is that some careers really do end at
 * thirty-two and some really do run to forty, and both should turn up often
 * enough to be worth playing for.
 */
export function rollAgeing(rng: Rng): AgeingProfile {
  const longevity = clamp(0, 1, rng.gauss(0.5, 0.26));
  return {
    longevity,
    peakEnd: Math.round(lerp(26, 33, longevity)),
    rate: lerp(1.75, 0.5, longevity),
  };
}

/** A career from before ageing profiles existed still has to age somehow. */
export const DEFAULT_AGEING: AgeingProfile = { longevity: 0.5, peakEnd: 29, rate: 1.1 };

export const ageingOf = (p: CareerPlayer): AgeingProfile => p.ageing ?? DEFAULT_AGEING;

/**
 * Overall points lost to age this season.
 *
 * The curve is the old one, re-anchored on when *this* player's peak ends and
 * scaled by how hard his decline bites. A late-peaking, slow-declining career
 * is barely touched at thirty-four; an early one is well past it by then.
 */
export function declineAt(a: AgeingProfile, age: number): number {
  const past = age - a.peakEnd;
  if (past <= 0) return 0;
  // quadratic-ish, so it accelerates rather than falling off a cliff
  return clamp(0, 9, (past * 0.55 + past * past * 0.055) * a.rate);
}

/**
 * How much age is helping or hurting your case for a starting place.
 *
 * The young end is the same for everybody — a seventeen-year-old is a
 * seventeen-year-old. The old end is where the profile shows: a manager keeps
 * picking a body that still moves.
 */
export function minutesBiasAt(a: AgeingProfile, age: number): number {
  if (age <= 16) return -13;
  const young: Record<number, number> = { 17: -8, 18: -5, 19: -2 };
  if (young[age] !== undefined) return young[age];
  const past = age - a.peakEnd - 2;
  if (past <= 0) return 0;
  return -clamp(0, 15, (past * 1.1 + past * past * 0.16) * a.rate);
}

/**
 * Which attributes go, and how fast.
 *
 * Pace first, then physique, then touch — in that order, because that is the
 * order it happens in. Vision and leadership are the last things to leave and
 * leadership actually grows, which is why a thirty-six-year-old can still be
 * worth a place without being able to run.
 */
export function decayAt(a: AgeingProfile, age: number): Partial<Attrs> {
  const past = age - a.peakEnd;
  if (past <= 0) return {};
  const s = Math.min(4.5, past * 0.62) * a.rate;
  return {
    pac: -s * 1.35,
    phy: -s * 0.95,
    tec: -s * 0.38,
    vis: -s * 0.08,
    lea: +0.3,
  };
}

/** The first age at which retiring is even on the table for this career. */
export function retireFromAge(a: AgeingProfile): number {
  return Math.round(lerp(31, 37, a.longevity));
}

/** The age nobody gets past, whatever their legs say. */
export function hardRetireAge(a: AgeingProfile): number {
  return Math.round(lerp(36, 42, a.longevity));
}

/**
 * Chance of hanging them up at the end of this season.
 *
 * Driven by the profile rather than a flat curve, and by whether anybody is
 * still picking you — a man playing every week rarely stops, and a man who
 * managed nine appearances usually does.
 */
export function retireChance(
  a: AgeingProfile, p: CareerPlayer, apps: number,
): number {
  const from = retireFromAge(a);
  if (p.age < from) return 0;
  const past = p.age - from;
  return clamp(0, 0.92,
    past * 0.16
    + declineAt(a, p.age) * 0.045
    + (apps < 12 ? 0.28 : apps < 22 ? 0.1 : 0)
    + (p.morale < 40 ? 0.14 : 0)
    + (p.overall < 66 ? 0.14 : 0));
}

// ---- copy ------------------------------------------------------------------

/**
 * What the body is telling you, once it starts telling you anything.
 *
 * Shown only from thirty on: before that it would just be a spoiler for a roll
 * the player has no way to act on yet.
 */
export function bodyNote(a: AgeingProfile, age: number, lang: Lang): string | null {
  const es = lang === 'es';
  if (age < 30) return null;
  const past = age - a.peakEnd;

  if (past <= -1) {
    return es
      ? 'Todavía no has notado nada. Algunos cuerpos avisan tarde.'
      : 'You have not felt anything yet. Some bodies give late warning.';
  }
  if (past <= 1) {
    return es
      ? 'Los lunes cuestan un poco más que antes. Nada serio todavía.'
      : 'Mondays cost a little more than they did. Nothing serious yet.';
  }
  if (a.rate <= 0.85) {
    return es
      ? 'Te cuidas, y el cuerpo te lo devuelve. Los que empezaron contigo ya no juegan.'
      : 'You look after it and it pays you back. The ones who started with you have stopped.';
  }
  if (a.rate >= 1.35) {
    return es
      ? 'Se te fue de golpe. Un invierno estabas bien y al siguiente no llegabas.'
      : 'It went all at once. One winter you were fine and the next you were not getting there.';
  }
  return es
    ? 'Vas perdiendo un paso por temporada. Se juega distinto, y se puede.'
    : 'A yard a season, roughly. You play differently, and it works.';
}
