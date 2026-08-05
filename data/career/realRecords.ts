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
// fact. A few entries carry only one of the two marks for that reason.

export interface RealRecord {
  goals?: { holder: string; n: number };
  apps?: { holder: string; n: number };
}

/** One club, laid out as `[scorer, goals, ever-present, appearances]`. */
const R = (scorer: string, goals: number, ever: string, apps: number): RealRecord =>
  ({ goals: { holder: scorer, n: goals }, apps: { holder: ever, n: apps } });

/** Keyed by the club id used in data/career/clubs.ts. */
export const CLUB_RECORDS: Record<string, RealRecord> = {
  // ---- England ----
  'man-utd': R('ROONEY', 253, 'GIGGS', 963),
  liverpool: R('IAN RUSH', 346, 'CALLAGHAN', 857),
  arsenal: R('HENRY', 228, "O'LEARY", 722),
  chelsea: R('LAMPARD', 211, 'RON HARRIS', 795),
  'man-city': R('AGÜERO', 260, 'ALAN OAKES', 680),
  tottenham: R('KANE', 280, 'PERRYMAN', 866),

  // ---- Spain ----
  'real-madrid': R('CRISTIANO RONALDO', 450, 'RAÚL', 741),
  barcelona: R('MESSI', 672, 'MESSI', 778),
  atletico: R('ARAGONÉS', 173, 'ADELARDO', 553),
  sevilla: R('CAMPANAL', 214, 'JESÚS NAVAS', 705),
  valencia: R('MUNDO', 269, 'FERNANDO GÓMEZ', 553),

  // ---- Germany ----
  // Thomas Müller passed Sepp Maier's 709 in 2025, so the appearance record is
  // his rather than the 709 that most lists still carry.
  bayern: R('GERD MÜLLER', 566, 'THOMAS MÜLLER', 756),
  dortmund: R('PREISSLER', 177, 'ZORC', 572),

  // ---- Italy ----
  juventus: R('DEL PIERO', 290, 'DEL PIERO', 705),
  milan: R('NORDAHL', 221, 'MALDINI', 902),
  inter: R('MEAZZA', 284, 'ZANETTI', 858),
  roma: R('TOTTI', 307, 'TOTTI', 786),
  napoli: R('MERTENS', 148, 'BRUSCOLOTTI', 511),
  lazio: R('PIOLA', 159, 'STEFAN RADU', 427),

  // ---- France ----
  psg: R('MBAPPÉ', 256, 'PILORGET', 435),
  marseille: R('GUNNAR ANDERSSON', 194, 'ROGER SCOTTI', 453),

  // ---- Portugal ----
  benfica: R('EUSÉBIO', 473, 'NENÉ', 575),
  porto: R('FERNANDO GOMES', 355, 'JOÃO PINTO', 587),
  sporting: R('PEYROTEO', 544, 'HILÁRIO', 475),

  // ---- Netherlands ----
  ajax: R('VAN REENEN', 273, 'SJAAK SWART', 603),
  psv: R('VAN DER KUIJLEN', 311, 'VAN DER KUIJLEN', 528),

  // ---- Scotland ----
  celtic: R('McGRORY', 522, 'McNEILL', 822),
  rangers: R('McCOIST', 355, 'JOHN GREIG', 755),

  // ---- Turkey ----
  galatasaray: R('HAKAN ŞÜKÜR', 288, 'BÜLENT KORKMAZ', 671),
  fenerbahce: R('ZEKİ RIZA SPOREL', 470, 'MÜJDAT YETKİNER', 570),

  // ---- Argentina ----
  boca: R('PALERMO', 236, 'ROBERTO MOUZO', 426),
  river: R('LABRUNA', 317, 'AMADEO CARRIZO', 551),
  independiente: R('ARSENIO ERICO', 295, 'BOCHINI', 714),
  'racing-club': R('OHACO', 244, 'IVÁN PILLUD', 460),

  // ---- Brazil ----
  flamengo: R('ZICO', 509, 'JÚNIOR', 876),
  palmeiras: R('HEITOR', 327, 'ADEMIR DA GUIA', 902),
  'sao-paulo': R('SERGINHO CHULAPA', 242, 'ROGÉRIO CENI', 1237),
  corinthians: R('CLÁUDIO', 306, 'WLADIMIR', 806),
  cruzeiro: R('TOSTÃO', 249, 'FÁBIO', 976),
  gremio: R('ALCINDO', 636, 'EURICO LARA', 621),
  internacional: R('CARLITOS', 326, 'VALDOMIRO', 803),
};

/** Keyed by nation code. Caps and goals are independent — often different men. */
export const NATION_RECORDS: Record<string, RealRecord> = {
  // ---- Europe ----
  PT: R('CRISTIANO RONALDO', 145, 'CRISTIANO RONALDO', 221),
  ES: R('DAVID VILLA', 59, 'SERGIO RAMOS', 180),
  DE: R('KLOSE', 71, 'MATTHÄUS', 150),
  IT: R('RIVA', 35, 'BUFFON', 176),
  EN: R('KANE', 73, 'SHILTON', 125),
  FR: R('GIROUD', 57, 'LLORIS', 145),
  NL: R('VAN PERSIE', 50, 'SNEIJDER', 134),
  BE: R('LUKAKU', 89, 'VERTONGHEN', 157),
  HR: R('ŠUKER', 45, 'MODRIĆ', 191),
  CH: R('ALEXANDER FREI', 42, 'XHAKA', 140),
  DK: R('TOMASSON', 52, 'ERIKSEN', 146),
  SE: R('IBRAHIMOVIĆ', 62, 'ANDERS SVENSSON', 148),
  PL: R('LEWANDOWSKI', 86, 'LEWANDOWSKI', 162),
  CZ: R('KOLLER', 55, 'ČECH', 124),
  RS: R('MITROVIĆ', 62, 'IVANOVIĆ', 105),
  TR: R('ŞÜKÜR', 51, 'RÜŞTÜ', 120),
  GR: { apps: { holder: 'KARAGOUNIS', n: 139 } },
  NO: { goals: { holder: 'HAALAND', n: 62 } },

  // ---- South America ----
  AR: R('MESSI', 112, 'MESSI', 193),
  BR: R('NEYMAR', 79, 'CAFU', 142),
  UY: R('SUÁREZ', 69, 'GODÍN', 161),
  CL: R('ALEXIS', 52, 'ALEXIS', 170),
  CO: R('FALCAO', 36, 'OSPINA', 128),
  PE: R('GUERRERO', 40, 'ROBERTO PALACIOS', 128),
  PY: R('SANTA CRUZ', 32, 'PAULO DA SILVA', 150),

  // ---- North & Central America ----
  MX: R('HERNÁNDEZ', 52, 'GUARDADO', 182),
  US: R('DEMPSEY', 57, 'COBI JONES', 164),

  // ---- Asia & Oceania ----
  JP: R('KAMAMOTO', 75, 'ENDŌ', 152),
  KR: R('CHA BUM-KUN', 58, 'HONG MYUNG-BO', 136),
  SA: R('MAJED ABDULLAH', 72, 'AL-DEAYEA', 173),
  AU: { goals: { holder: 'CAHILL', n: 50 } },

  // ---- Africa ----
  NG: R('YEKINI', 37, 'AHMED MUSA', 111),
  CM: R("ETO'O", 56, 'RIGOBERT SONG', 137),
  MA: R('AHMED FARAS', 36, 'NAYBET', 115),
  EG: R('SALAH', 68, 'AHMED HASSAN', 184),
  GH: { goals: { holder: 'GYAN', n: 51 } },
  SN: { goals: { holder: 'MANÉ', n: 55 } },
};
