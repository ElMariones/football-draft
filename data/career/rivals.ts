// Derbies. These drive two things: derby goals (worth 10x a normal goal for
// idolatry) and the betrayal rule — signing directly for a rival caps your
// idolatry at the old club forever.
//
// Only ids that exist in CLUBS are listed here; `areRivals` is tolerant of
// anything unknown.

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
  ['barcelona', 'espanyol'],
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
for (const [a, b] of DERBIES) {
  (RIVAL_MAP[a] ||= new Set()).add(b);
  (RIVAL_MAP[b] ||= new Set()).add(a);
}

export function areRivals(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b || a === b) return false;
  return RIVAL_MAP[a]?.has(b) ?? false;
}

export function rivalsOf(clubId: string): string[] {
  return [...(RIVAL_MAP[clubId] ?? [])];
}

/** The headline rival, used for flavor ("the derby against X"). */
export function mainRival(clubId: string): string | null {
  return rivalsOf(clubId)[0] ?? null;
}
