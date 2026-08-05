// Surnames by naming culture.
//
// The record books used one shared list of thirty names for every country in
// the game, so Colombia's all-time top scorer came out as LINDQVIST and its
// most-capped player as BAKKER. A record holder is the one piece of invented
// history the player reads closely — it has to at least be from the right
// country.
//
// Grouped by naming culture rather than by geography or by the face system's
// phenotype regions: Brazil and Mexico look similar to the face generator and
// are nothing alike here, and England and Germany share a region there too.

export type NameCulture =
  | 'spanish' | 'portuguese' | 'english' | 'french' | 'german' | 'italian'
  | 'dutch' | 'nordic' | 'slavic' | 'balkan' | 'turkish' | 'greek'
  | 'westAfrican' | 'northAfrican' | 'arab' | 'japanese' | 'korean';

const POOLS: Record<NameCulture, string[]> = {
  spanish: [
    'GONZÁLEZ', 'RODRÍGUEZ', 'MARTÍNEZ', 'GÓMEZ', 'RAMÍREZ', 'MORENO', 'CASTRO',
    'VARGAS', 'ORTEGA', 'HERRERA', 'MEDINA', 'ARANGO', 'QUINTERO', 'SUÁREZ',
    'CABRERA', 'ZAMORA', 'PEÑA', 'ACOSTA', 'ESCOBAR', 'VALDEZ',
  ],
  portuguese: [
    'SILVA', 'SANTOS', 'OLIVEIRA', 'SOUZA', 'PEREIRA', 'ALMEIDA', 'RIBEIRO',
    'CARVALHO', 'GOMES', 'BARBOSA', 'TEIXEIRA', 'MOREIRA', 'FONSECA', 'AZEVEDO',
    'MACHADO', 'NASCIMENTO', 'CARDOSO', 'PINTO', 'ANDRADE', 'FREITAS',
  ],
  english: [
    'HALL', 'WALSH', 'CLARKE', 'REID', 'MURPHY', 'BAXTER', 'HOLDEN', 'WRIGHT',
    'MCGRATH', 'ELLIOTT', 'BENNETT', 'HAYES', 'SHELDON', 'CARTWRIGHT', 'FOSTER',
    'ASHCROFT', 'LOMAX', 'BRENNAN', 'WHITAKER', 'DEVLIN',
  ],
  french: [
    'DUBOIS', 'LEFEBVRE', 'MOREAU', 'LAURENT', 'GIRARD', 'MERCIER', 'ROUSSEAU',
    'FOURNIER', 'BONNET', 'CHEVALIER', 'RENARD', 'MARCHAND', 'BARBIER',
    'DELACROIX', 'GUILLOT', 'PERRIN',
  ],
  german: [
    'MÜLLER', 'SCHNEIDER', 'FISCHER', 'WEBER', 'WAGNER', 'BECKER', 'HOFFMANN',
    'SCHÄFER', 'KOCH', 'RICHTER', 'BRANDT', 'KELLER', 'NEUMANN', 'ZIEGLER',
    'HARTMANN', 'KRÜGER',
  ],
  italian: [
    'ROSSI', 'CONTE', 'ESPÓSITO', 'RICCI', 'GRECO', 'BRUNO', 'GALLO', 'COSTA',
    'FERRARI', 'MARINO', 'LOMBARDI', 'BARBIERI', 'MANCINI', 'RIZZO', 'CATTANEO',
    'DE LUCA',
  ],
  dutch: [
    'BAKKER', 'DE VRIES', 'VAN DIJK', 'JANSEN', 'VISSER', 'SMIT', 'MEIJER',
    'BOS', 'VOS', 'PETERS', 'HENDRIKS', 'VAN LOON', 'KUIPERS', 'DEKKER',
    'VERHOEVEN', 'BROUWER',
  ],
  nordic: [
    'ANDERSEN', 'SORENSEN', 'LINDQVIST', 'NILSSON', 'HAGEN', 'BERG', 'DAHL',
    'LARSEN', 'ERIKSEN', 'MOEN', 'HOLM', 'SANDVIK', 'BJERG', 'LUND', 'ÅKESSON',
    'THORSEN',
  ],
  slavic: [
    'PETROV', 'NOVAK', 'KOWALSKI', 'ZIELIŃSKI', 'SOKOLOV', 'MELNYK', 'DVOŘÁK',
    'KUCHARSKI', 'BONDARENKO', 'PROCHÁZKA', 'LEBEDEV', 'WÓJCIK', 'SHEVCHUK',
    'MAREK', 'ORLOV', 'KOVÁŘ',
  ],
  balkan: [
    'KOVAČ', 'HORVAT', 'JANKOVIĆ', 'PETROVIĆ', 'MARKOVIĆ', 'BABIĆ', 'TOMIĆ',
    'VUKOVIĆ', 'ILIĆ', 'PAVLOVIĆ', 'RADIĆ', 'JURIĆ', 'MATIĆ', 'ZORIĆ',
  ],
  turkish: [
    'ÖZTÜRK', 'YILMAZ', 'DEMIR', 'KAYA', 'ŞAHIN', 'ÇELIK', 'ARSLAN', 'DOĞAN',
    'KILIÇ', 'AYDIN', 'ERDOĞAN', 'KOÇ', 'ÖZDEMIR', 'POLAT',
  ],
  greek: [
    'PAPADOPOULOS', 'NIKOLAIDIS', 'GEORGIOU', 'VLACHOS', 'SAMARAS', 'KARAGIANNIS',
    'ANTONIOU', 'STAVROU', 'DIMITRIOU', 'FOTIADIS', 'MAKRIS', 'ZAFEIRIS',
  ],
  westAfrican: [
    'OKONKWO', 'DIALLO', 'KAMARA', 'ABIODUN', 'MENSAH', 'ADEYEMI', 'TOURÉ',
    'BOATENG', 'OWUSU', 'NDIAYE', 'KOUAMÉ', 'ESSIEN', 'BAMBA', 'SANKARA',
    'ADEBAYO', 'CISSÉ',
  ],
  northAfrican: [
    'BENALI', 'HAMDI', 'ZIANI', 'MANSOURI', 'BOUAZIZ', 'EL AMRANI', 'FARSI',
    'GHALI', 'TOUATI', 'SAADI', 'BELKACEM', 'CHERIF',
  ],
  arab: [
    'AL-HARBI', 'AL-DOSARI', 'AL-QAHTANI', 'AL-SHEHRI', 'AL-GHAMDI', 'AL-OTAIBI',
    'AL-MUTAIRI', 'AL-ZAHRANI', 'AL-SUBAIE', 'AL-FARAJ',
  ],
  japanese: [
    'TANAKA', 'SATO', 'SUZUKI', 'WATANABE', 'NAKAMURA', 'KOBAYASHI', 'YOSHIDA',
    'YAMAMOTO', 'MATSUDA', 'ISHIKAWA', 'FUJIWARA', 'OKADA',
  ],
  korean: [
    'KIM', 'LEE', 'PARK', 'CHOI', 'JUNG', 'KANG', 'CHO', 'YOON', 'JANG', 'LIM',
  ],
};

const NATION_CULTURE: Record<string, NameCulture> = {
  // Spanish-speaking
  ES: 'spanish', AR: 'spanish', UY: 'spanish', CO: 'spanish', MX: 'spanish',
  CL: 'spanish', EC: 'spanish', PE: 'spanish', PY: 'spanish', CR: 'spanish',
  // Portuguese
  BR: 'portuguese', PT: 'portuguese',
  // English-speaking
  EN: 'english', SC: 'english', IE: 'english', US: 'english', AU: 'english',
  CA: 'english',
  FR: 'french', BE: 'french',
  DE: 'german', AT: 'german', CH: 'german',
  IT: 'italian',
  NL: 'dutch',
  SE: 'nordic', NO: 'nordic', DK: 'nordic',
  RU: 'slavic', UA: 'slavic', PL: 'slavic', CZ: 'slavic',
  HR: 'balkan', RS: 'balkan',
  TR: 'turkish',
  GR: 'greek',
  NG: 'westAfrican', GH: 'westAfrican', SN: 'westAfrican', CI: 'westAfrican',
  CM: 'westAfrican',
  MA: 'northAfrican', DZ: 'northAfrican', EG: 'northAfrican',
  SA: 'arab',
  JP: 'japanese',
  KR: 'korean',
};

export function cultureOf(nationCode: string | undefined): NameCulture {
  return (nationCode && NATION_CULTURE[nationCode]) || 'english';
}

/**
 * A surname that belongs to the country, chosen by a caller-supplied hash so a
 * record holder is the same person every time the book is opened.
 */
export function surnameFor(nationCode: string | undefined, hash: number): string {
  const pool = POOLS[cultureOf(nationCode)];
  return pool[Math.abs(hash) % pool.length];
}

/** Every surname for a country, for callers that need to draw several. */
export function surnamePool(nationCode: string | undefined): string[] {
  return POOLS[cultureOf(nationCode)];
}
