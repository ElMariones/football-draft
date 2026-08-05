// Real record books, for the clubs and countries that have famous ones.
//
// A generated record is fine for Getafe. It is not fine for Real Madrid: every
// player knows roughly what that number is, and inventing one makes the whole
// book feel fake. So the well-known ones are the real ones, and everything else
// still falls back to the formula in lib/career/recordbook.ts.
//
// SNAPSHOT, AUGUST 2026. These move — Ronaldo and Messi were both still adding
// to theirs while this was written. Only entries that were actually verified
// against a source are here; where the figure was uncertain it was deliberately
// left out so the formula generates one rather than the game asserting a wrong
// fact.

export interface RealRecord {
  goals?: { holder: string; n: number };
  apps?: { holder: string; n: number };
}

/** Keyed by the club id used in data/career/clubs.ts. */
export const CLUB_RECORDS: Record<string, RealRecord> = {
  'real-madrid': {
    goals: { holder: 'CRISTIANO RONALDO', n: 450 },
    apps: { holder: 'RAÚL', n: 741 },
  },
  barcelona: {
    goals: { holder: 'MESSI', n: 672 },
    apps: { holder: 'MESSI', n: 778 },
  },
  'man-utd': {
    goals: { holder: 'ROONEY', n: 253 },
    apps: { holder: 'GIGGS', n: 963 },
  },
  liverpool: {
    goals: { holder: 'IAN RUSH', n: 346 },
    apps: { holder: 'CALLAGHAN', n: 857 },
  },
  bayern: {
    goals: { holder: 'GERD MÜLLER', n: 566 },
    apps: { holder: 'THOMAS MÜLLER', n: 756 },
  },
  juventus: {
    goals: { holder: 'DEL PIERO', n: 290 },
    apps: { holder: 'DEL PIERO', n: 705 },
  },
  milan: {
    goals: { holder: 'NORDAHL', n: 221 },
    apps: { holder: 'MALDINI', n: 902 },
  },
  arsenal: {
    goals: { holder: 'HENRY', n: 228 },
    apps: { holder: "O'LEARY", n: 722 },
  },
  chelsea: {
    goals: { holder: 'LAMPARD', n: 211 },
    apps: { holder: 'RON HARRIS', n: 795 },
  },
};

/** Keyed by nation code. Caps and goals are independent — often different men. */
export const NATION_RECORDS: Record<string, RealRecord> = {
  PT: { apps: { holder: 'CRISTIANO RONALDO', n: 233 }, goals: { holder: 'CRISTIANO RONALDO', n: 146 } },
  AR: { apps: { holder: 'MESSI', n: 207 }, goals: { holder: 'MESSI', n: 125 } },
  ES: { apps: { holder: 'SERGIO RAMOS', n: 180 }, goals: { holder: 'DAVID VILLA', n: 59 } },
  BR: { apps: { holder: 'CAFU', n: 142 }, goals: { holder: 'PELÉ', n: 77 } },
  DE: { apps: { holder: 'MATTHÄUS', n: 150 }, goals: { holder: 'KLOSE', n: 71 } },
  IT: { apps: { holder: 'BUFFON', n: 176 } },
  EN: { apps: { holder: 'SHILTON', n: 125 }, goals: { holder: 'KANE', n: 85 } },
  FR: { apps: { holder: 'LLORIS', n: 145 }, goals: { holder: 'MBAPPÉ', n: 66 } },
  BE: { apps: { holder: 'WITSEL', n: 140 }, goals: { holder: 'LUKAKU', n: 93 } },
  HR: { apps: { holder: 'MODRIĆ', n: 202 } },
  MX: { apps: { holder: 'GUARDADO', n: 180 }, goals: { holder: 'HERNÁNDEZ', n: 52 } },
  US: { apps: { holder: 'COBI JONES', n: 164 }, goals: { holder: 'DONOVAN', n: 57 } },
  JP: { apps: { holder: 'ENDŌ', n: 152 }, goals: { holder: 'KAMAMOTO', n: 75 } },
  KR: { apps: { holder: 'LEE WOON-JAE', n: 132 }, goals: { holder: 'SON', n: 56 } },
  UY: { apps: { holder: 'GODÍN', n: 161 }, goals: { holder: 'SUÁREZ', n: 69 } },
  CL: { apps: { holder: 'ALEXIS', n: 168 }, goals: { holder: 'ALEXIS', n: 51 } },
  CO: { apps: { holder: 'JAMES', n: 130 } },
  EG: { apps: { holder: 'AHMED HASSAN', n: 184 }, goals: { holder: 'SALAH', n: 68 } },
  SE: { apps: { holder: 'IBRAHIMOVIĆ', n: 122 }, goals: { holder: 'IBRAHIMOVIĆ', n: 62 } },
  DK: { apps: { holder: 'ERIKSEN', n: 151 }, goals: { holder: 'POUL NIELSEN', n: 52 } },
  PL: { apps: { holder: 'LEWANDOWSKI', n: 166 }, goals: { holder: 'LEWANDOWSKI', n: 89 } },
  GR: { apps: { holder: 'KARAGOUNIS', n: 139 } },
  SA: { apps: { holder: 'AL-DEAYEA', n: 173 }, goals: { holder: 'MAJED ABDULLAH', n: 72 } },
  NO: { goals: { holder: 'HAALAND', n: 62 } },
  TR: { goals: { holder: 'ŞÜKÜR', n: 51 } },
  AU: { goals: { holder: 'CAHILL', n: 50 } },
  GH: { goals: { holder: 'GYAN', n: 51 } },
  SN: { goals: { holder: 'MANÉ', n: 55 } },
};
