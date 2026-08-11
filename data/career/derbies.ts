// The derbies, by name.
//
// `rivals.ts` knows which clubs hate each other. This knows what the fixture is
// actually called and how big it is, which is the difference between "the derby
// against Barcelona" and El Clásico. A game the whole world stops for and a
// local grudge in the Argentine second division are both derbies, and the
// season should not describe them the same way.
//
// `heat` 1-10 is the size of the occasion: it scales the reputation and
// idolatry a derby is worth, how often a derby event fires, and how hard the
// press push you in the week before it.

export interface Derby {
  a: string;
  b: string;
  /** what the fixture is called, in each language */
  en: string;
  es: string;
  /** 1-10, how big a night it is */
  heat: number;
  /** two clubs from the same city — the sharpest kind */
  city?: boolean;
}

const D = (a: string, b: string, en: string, es: string, heat: number, city = false): Derby =>
  ({ a, b, en, es, heat, city });

export const NAMED_DERBIES: Derby[] = [
  // ---- the ones the whole world watches ----
  D('real-madrid', 'barcelona', 'El Clásico', 'El Clásico', 10),
  D('boca', 'river', 'El Superclásico', 'El Superclásico', 10, true),
  D('celtic', 'rangers', 'The Old Firm', 'El Old Firm', 10, true),
  D('galatasaray', 'fenerbahce', 'The Intercontinental Derby', 'El Derbi Intercontinental', 10, true),

  // ---- England ----
  D('man-utd', 'liverpool', 'The North West Derby', 'El Derbi del Noroeste', 9),
  D('man-utd', 'man-city', 'The Manchester Derby', 'El Derbi de Mánchester', 9, true),
  D('arsenal', 'tottenham', 'The North London Derby', 'El Derbi del Norte de Londres', 9, true),
  D('liverpool', 'everton', 'The Merseyside Derby', 'El Derbi de Merseyside', 8, true),
  D('chelsea', 'tottenham', 'The London Derby', 'El Derbi de Londres', 7, true),
  D('arsenal', 'chelsea', 'The London Derby', 'El Derbi de Londres', 7, true),
  D('west-ham', 'tottenham', 'The East–North London Derby', 'El Derbi del Este de Londres', 6, true),
  D('newcastle', 'sunderland', 'The Tyne–Wear Derby', 'El Derbi Tyne-Wear', 8),

  // ---- Spain ----
  D('real-madrid', 'atletico', 'El Derbi Madrileño', 'El Derbi Madrileño', 8, true),
  D('sevilla', 'betis', 'El Gran Derbi', 'El Gran Derbi', 9, true),
  D('athletic', 'real-sociedad', 'El Derbi Vasco', 'El Derbi Vasco', 8),
  D('valencia', 'villarreal', 'El Derbi de la Comunitat', 'El Derbi de la Comunitat', 6),

  // ---- Italy ----
  D('inter', 'milan', 'The Derby della Madonnina', 'El Derbi de la Madonnina', 9, true),
  D('roma', 'lazio', 'The Derby della Capitale', 'El Derbi de la Capital', 9, true),
  D('juventus', 'inter', "The Derby d'Italia", 'El Derbi de Italia', 9),
  D('juventus', 'milan', 'Juventus–Milan', 'Juventus-Milan', 8),
  D('napoli', 'roma', 'The Derby del Sole', 'El Derbi del Sol', 7),
  D('fiorentina', 'juventus', 'Fiorentina–Juventus', 'Fiorentina-Juventus', 7),

  // ---- Germany ----
  D('bayern', 'dortmund', 'Der Klassiker', 'Der Klassiker', 9),
  D('dortmund', 'leipzig', 'Dortmund–Leipzig', 'Dortmund-Leipzig', 6),
  D('frankfurt', 'leverkusen', 'Frankfurt–Leverkusen', 'Frankfurt-Leverkusen', 5),

  // ---- France ----
  D('psg', 'marseille', 'Le Classique', 'Le Classique', 9),
  D('lyon', 'marseille', 'The Choc des Olympiques', 'El Choc des Olympiques', 7),
  D('nice', 'monaco', 'The Côte d’Azur Derby', 'El Derbi de la Costa Azul', 6),
  D('lille', 'lyon', 'Lille–Lyon', 'Lille-Lyon', 5),

  // ---- Portugal / Netherlands / Belgium ----
  D('benfica', 'porto', 'O Clássico', 'O Clássico', 9),
  D('benfica', 'sporting', 'O Derby de Lisboa', 'El Derbi de Lisboa', 8, true),
  D('porto', 'braga', 'Porto–Braga', 'Porto-Braga', 5),
  D('ajax', 'feyenoord', 'De Klassieker', 'De Klassieker', 9),
  D('ajax', 'psv', 'Ajax–PSV', 'Ajax-PSV', 7),
  D('club-brugge', 'anderlecht', 'The Belgian Classic', 'El Clásico Belga', 7),

  // ---- Argentina ----
  D('racing-club', 'independiente', 'El Clásico de Avellaneda', 'El Clásico de Avellaneda', 8, true),
  D('san-lorenzo', 'huracan', 'El Clásico de Boedo', 'El Clásico de Boedo', 7, true),
  D('velez', 'river', 'Vélez–River', 'Vélez-River', 5),
  D('talleres', 'belgrano', 'El Clásico Cordobés', 'El Clásico Cordobés', 6, true),

  // ---- Brazil ----
  D('flamengo', 'fluminense', 'O Fla–Flu', 'El Fla-Flu', 9, true),
  D('palmeiras', 'corinthians', 'O Derby Paulista', 'El Derbi Paulista', 9, true),
  D('flamengo', 'palmeiras', 'Flamengo–Palmeiras', 'Flamengo-Palmeiras', 7),
  D('gremio', 'internacional', 'O Gre–Nal', 'El Gre-Nal', 9, true),

  // ---- the rest of Europe ----
  // Without these, thirty-two of the game's leagues had no derby at all and a
  // career outside the big five never played one.
  D('olympiacos', 'panathinaikos', 'The Derby of the Eternal Enemies', 'El Derbi de los Eternos Enemigos', 10, true),
  D('olympiacos', 'aek', 'Olympiacos–AEK', 'Olympiacos-AEK', 7),
  D('paok', 'aek', 'PAOK–AEK', 'PAOK-AEK', 7),
  D('crvena-zvezda', 'partizan', 'The Eternal Derby', 'El Derbi Eterno', 10, true),
  D('sparta-praha', 'slavia-praha', 'The Prague Derby', 'El Derbi de Praga', 9, true),
  D('dinamo-zagreb', 'hajduk', 'The Eternal Derby', 'El Derbi Eterno', 9),
  D('shakhtar', 'dynamo-kyiv', 'The Ukrainian Classic', 'El Clásico Ucraniano', 9),
  D('spartak', 'cska-moscow', 'The Moscow Derby', 'El Derbi de Moscú', 9, true),
  D('zenit', 'spartak', 'Zenit–Spartak', 'Zenit-Spartak', 8),
  D('copenhagen', 'brondby', 'The New Firm', 'El New Firm', 9, true),
  D('aik', 'djurgarden', 'Tvillingderbyt', 'El Derbi de los Gemelos', 8, true),
  D('malmo', 'aik', 'Malmö–AIK', 'Malmö-AIK', 6),
  D('rosenborg', 'molde', 'Rosenborg–Molde', 'Rosenborg-Molde', 6),
  D('bodo-glimt', 'rosenborg', 'Bodø/Glimt–Rosenborg', 'Bodø/Glimt-Rosenborg', 5),
  D('legia', 'lech-poznan', 'The Derby of Poland', 'El Derbi de Polonia', 8),
  D('rapid-wien', 'austria-wien', 'The Vienna Derby', 'El Derbi de Viena', 8, true),
  D('salzburg', 'rapid-wien', 'Salzburg–Rapid', 'Salzburgo-Rapid', 6),
  D('young-boys', 'basel', 'The Swiss Klassiker', 'El Klassiker Suizo', 7),
  D('basel', 'zurich', 'Basel–Zürich', 'Basilea-Zúrich', 5),
  D('shamrock', 'bohemians', 'The Dublin Derby', 'El Derbi de Dublín', 7, true),
  D('feyenoord', 'psv', 'De Topper', 'De Topper', 7),
  D('crystal-palace', 'brighton', 'The M23 Derby', 'El Derbi de la M23', 6),
  D('leeds', 'sheffield-utd', 'The Yorkshire Derby', 'El Derbi de Yorkshire', 6),
  D('sunderland', 'middlesbrough', 'The Tees–Wear Derby', 'El Derbi Tees-Wear', 6),
  D('sporting-gijon', 'oviedo', 'El Derbi Asturiano', 'El Derbi Asturiano', 8),
  D('racing', 'oviedo', 'Racing–Oviedo', 'Racing-Oviedo', 5),
  D('ferro', 'quilmes', 'Ferro–Quilmes', 'Ferro-Quilmes', 4),

  // ---- the rest of the world ----
  D('al-ahly', 'zamalek', 'The Cairo Derby', 'El Derbi de El Cairo', 10, true),
  D('raja', 'wydad', 'The Casablanca Derby', 'El Derbi de Casablanca', 10, true),
  D('asante-kotoko', 'hearts-of-oak', 'The Super Clash', 'El Super Clash', 9),
  D('asec-mimosas', 'africa-sports', "The Abidjan Derby", 'El Derbi de Abiyán', 8, true),
  D('cr-belouizdad', 'js-kabylie', 'CRB–JSK', 'CRB-JSK', 7),
  D('enyimba', 'rivers-utd', 'Enyimba–Rivers', 'Enyimba-Rivers', 5),
  D('teungueth', 'jaraaf', 'Teungueth–Jaraaf', 'Teungueth-Jaraaf', 5),
  D('coton-sport', 'canon-yaounde', 'Coton Sport–Canon', 'Coton Sport-Canon', 5),
  D('alianza-lima', 'universitario', 'El Clásico peruano', 'El Clásico Peruano', 9, true),
  D('sporting-cristal', 'alianza-lima', 'Cristal–Alianza', 'Cristal-Alianza', 6),
  D('olimpia', 'cerro-porteno', 'El Superclásico paraguayo', 'El Superclásico Paraguayo', 9, true),
  D('libertad', 'olimpia', 'Libertad–Olimpia', 'Libertad-Olimpia', 6),
  D('atletico-nacional', 'millonarios', 'El Clásico colombiano', 'El Clásico Colombiano', 8),
  D('america-cali', 'millonarios', 'América–Millonarios', 'América-Millonarios', 6),
  D('atletico-nacional', 'junior', 'Nacional–Junior', 'Nacional-Junior', 6),
  D('barcelona-sc', 'ldu-quito', 'El Clásico del Ecuador', 'El Clásico del Ecuador', 7),
  D('saprissa', 'alajuelense', 'El Clásico Nacional', 'El Clásico Nacional', 9),
  D('kawasaki', 'marinos', 'The Kanagawa Derby', 'El Derbi de Kanagawa', 6),
  D('urawa', 'kawasaki', 'Urawa–Kawasaki', 'Urawa-Kawasaki', 5),
  D('jeonbuk', 'ulsan', 'The Hyundai Derby', 'El Derbi Hyundai', 7),
  D('sydney-fc', 'melbourne-victory', 'The Big Blue', 'El Big Blue', 7),


  D('america', 'cruz-azul', 'El Clásico Joven', 'El Clásico Joven', 7, true),
  D('monterrey', 'tigres', 'El Clásico Regiomontano', 'El Clásico Regiomontano', 8, true),
  D('lafc', 'galaxy', 'El Tráfico', 'El Tráfico', 7, true),
  D('colo-colo', 'u-chile', 'El Superclásico chileno', 'El Superclásico', 8, true),
  D('al-hilal', 'al-nassr', 'The Riyadh Derby', 'El Derbi de Riad', 8, true),
  D('penarol', 'nacional-uy', 'El Clásico uruguayo', 'El Clásico', 9, true),
];

const key = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

const BY_PAIR = new Map<string, Derby>();
for (const d of NAMED_DERBIES) BY_PAIR.set(key(d.a, d.b), d);

/** The named fixture between two clubs, if it has a name. */
export function derbyBetween(a: string | null | undefined, b: string | null | undefined): Derby | null {
  if (!a || !b) return null;
  return BY_PAIR.get(key(a, b)) ?? null;
}

/** A stable id for a fixture, whichever way round it is asked for. */
export const derbyKey = key;

/** Every named derby this club plays in, biggest first. */
export function derbiesFor(clubId: string): Derby[] {
  return NAMED_DERBIES
    .filter(d => d.a === clubId || d.b === clubId)
    .sort((x, y) => y.heat - x.heat);
}

/** How big this club's biggest derby is, 0 if it has none. */
export function topHeat(clubId: string): number {
  return derbiesFor(clubId)[0]?.heat ?? 0;
}

export const derbyName = (d: Derby, lang: 'en' | 'es') => (lang === 'es' ? d.es : d.en);
