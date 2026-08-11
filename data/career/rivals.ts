// Who hates whom.
//
// This drives derby goals (worth 10x a normal goal for idolatry), the betrayal
// rule — signing directly for a rival caps your idolatry at the old club
// forever — and which fixtures the rivalry system treats as an occasion.
//
// The named fixtures live in derbies.ts and are folded in below, so a derby
// cannot have a name here and no rivalry, or the other way round. This list is
// for the pairs that are genuinely rivals but whose fixture has no famous name.

import { NAMED_DERBIES, derbiesFor } from './derbies';

type Pair = [string, string];

export const DERBIES: Pair[] = [
  // England
  ['liverpool', 'everton'],
  ['man-utd', 'man-city'],
  ['man-utd', 'liverpool'],
  ['arsenal', 'tottenham'],
  ['arsenal', 'chelsea'],
  ['chelsea', 'tottenham'],
  ['west-ham', 'tottenham'],
  ['newcastle', 'sunderland'],

  // Spain
  ['real-madrid', 'barcelona'],
  ['real-madrid', 'atletico'],
  ['sevilla', 'betis'],
  ['athletic', 'real-sociedad'],
  ['valencia', 'villarreal'],

  // Germany
  ['dortmund', 'leipzig'],
  ['bayern', 'dortmund'],
  ['frankfurt', 'leverkusen'],

  // Italy
  ['inter', 'milan'],
  ['roma', 'lazio'],
  ['juventus', 'inter'],
  ['juventus', 'milan'],
  ['napoli', 'roma'],
  ['fiorentina', 'juventus'],

  // France
  ['psg', 'marseille'],
  ['lyon', 'marseille'],
  ['nice', 'monaco'],
  ['lille', 'lyon'],

  // Portugal / Netherlands
  ['benfica', 'porto'],
  ['benfica', 'sporting'],
  ['porto', 'braga'],
  ['ajax', 'feyenoord'],
  ['ajax', 'psv'],

  // Argentina
  ['river', 'boca'],
  ['racing-club', 'independiente'],
  ['san-lorenzo', 'huracan'],
  ['velez', 'river'],
  ['talleres', 'belgrano'],

  // Brazil
  ['flamengo', 'fluminense'],
  ['palmeiras', 'corinthians'],
  ['flamengo', 'palmeiras'],
  ['gremio', 'internacional'],

  // Mexico / USA / Chile / Saudi
  ['america', 'cruz-azul'],
  ['monterrey', 'tigres'],
  ['lafc', 'galaxy'],
  ['colo-colo', 'u-chile'],
  ['al-hilal', 'al-nassr'],
];

const RIVAL_MAP: Record<string, Set<string>> = {};
const add = (a: string, b: string) => {
  (RIVAL_MAP[a] ||= new Set()).add(b);
  (RIVAL_MAP[b] ||= new Set()).add(a);
};
for (const [a, b] of DERBIES) add(a, b);
for (const d of NAMED_DERBIES) add(d.a, d.b);

export function areRivals(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b || a === b) return false;
  return RIVAL_MAP[a]?.has(b) ?? false;
}

export function rivalsOf(clubId: string): string[] {
  return [...(RIVAL_MAP[clubId] ?? [])];
}

/**
 * The headline rival.
 *
 * The biggest *named* fixture wins, so Barcelona's rival is Real Madrid rather
 * than whichever pair happened to be declared first. Falls back to any rival at
 * all for clubs whose grudges have no famous name.
 */
export function mainRival(clubId: string): string | null {
  const named = derbiesFor(clubId)[0];
  if (named) return named.a === clubId ? named.b : named.a;
  return rivalsOf(clubId)[0] ?? null;
}
