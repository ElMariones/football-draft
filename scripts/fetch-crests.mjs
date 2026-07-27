// Resolves real club crests from Wikipedia and writes data/career/crest-urls.ts.
//
// Wikipedia's search endpoint rate-limits anonymous scripts hard (429), so this
// uses the batched `pageimages` query instead: 40 titles per request, ~7
// requests for the whole roster. Ambiguous club names get an explicit title
// (there are several "Nacional" and two "Liverpool").
import fs from 'node:fs';

const UA = 'FootballDraft/1.0 (career-mode crest lookup)';
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Club id -> exact Wikipedia article title, where the plain name is wrong or
// ambiguous. Everything else falls through to the club's own name.
const TITLE = {
  'man-city': 'Manchester City F.C.', 'man-utd': 'Manchester United F.C.',
  arsenal: 'Arsenal F.C.', chelsea: 'Chelsea F.C.', liverpool: 'Liverpool F.C.',
  tottenham: 'Tottenham Hotspur F.C.', newcastle: 'Newcastle United F.C.',
  'aston-villa': 'Aston Villa F.C.', 'west-ham': 'West Ham United F.C.',
  brighton: 'Brighton & Hove Albion F.C.', everton: 'Everton F.C.',
  wolves: 'Wolverhampton Wanderers F.C.', 'crystal-palace': 'Crystal Palace F.C.',
  fulham: 'Fulham F.C.', nottingham: 'Nottingham Forest F.C.', bournemouth: 'AFC Bournemouth',
  leeds: 'Leeds United F.C.', leicester: 'Leicester City F.C.', southampton: 'Southampton F.C.',
  norwich: 'Norwich City F.C.', watford: 'Watford F.C.', sunderland: 'Sunderland A.F.C.',
  'sheffield-utd': 'Sheffield United F.C.', 'west-brom': 'West Bromwich Albion F.C.',
  middlesbrough: 'Middlesbrough F.C.',
  'real-madrid': 'Real Madrid CF', barcelona: 'FC Barcelona', atletico: 'Atlético Madrid',
  sevilla: 'Sevilla FC', 'real-sociedad': 'Real Sociedad', villarreal: 'Villarreal CF',
  betis: 'Real Betis', athletic: 'Athletic Bilbao', valencia: 'Valencia CF', getafe: 'Getafe CF',
  celta: 'RC Celta de Vigo', osasuna: 'CA Osasuna', rayo: 'Rayo Vallecano', mallorca: 'RCD Mallorca',
  'sporting-gijon': 'Sporting de Gijón', albacete: 'Albacete Balompié', oviedo: 'Real Oviedo',
  racing: 'Racing de Santander', zaragoza: 'Real Zaragoza', eibar: 'SD Eibar',
  bayern: 'FC Bayern Munich', leverkusen: 'Bayer 04 Leverkusen', dortmund: 'Borussia Dortmund',
  leipzig: 'RB Leipzig', frankfurt: 'Eintracht Frankfurt', freiburg: 'SC Freiburg',
  wolfsburg: 'VfL Wolfsburg', stuttgart: 'VfB Stuttgart', gladbach: 'Borussia Mönchengladbach',
  'union-berlin': '1. FC Union Berlin', hoffenheim: 'TSG 1899 Hoffenheim',
  werder: 'SV Werder Bremen', mainz: '1. FSV Mainz 05',
  inter: 'Inter Milan', juventus: 'Juventus FC', milan: 'AC Milan', napoli: 'SSC Napoli',
  roma: 'AS Roma', lazio: 'SS Lazio', atalanta: 'Atalanta BC', fiorentina: 'ACF Fiorentina',
  bologna: 'Bologna FC 1909', torino: 'Torino FC', udinese: 'Udinese Calcio',
  sassuolo: 'U.S. Sassuolo Calcio',
  psg: 'Paris Saint-Germain FC', monaco: 'AS Monaco FC', marseille: 'Olympique de Marseille',
  lyon: 'Olympique Lyonnais', lille: 'Lille OSC', nice: 'OGC Nice', rennes: 'Stade Rennais F.C.',
  lens: 'RC Lens', strasbourg: 'RC Strasbourg Alsace', nantes: 'FC Nantes',
  benfica: 'S.L. Benfica', porto: 'FC Porto', sporting: 'Sporting CP', braga: 'S.C. Braga',
  'vitoria-sc': 'Vitória S.C.', boavista: 'Boavista F.C.', famalicao: 'F.C. Famalicão',
  ajax: 'AFC Ajax', psv: 'PSV Eindhoven', feyenoord: 'Feyenoord', az: 'AZ Alkmaar',
  twente: 'FC Twente', utrecht: 'FC Utrecht', heerenveen: 'SC Heerenveen',
  'sparta-rotterdam': 'Sparta Rotterdam',
  river: 'Club Atlético River Plate', boca: 'Boca Juniors',
  'racing-club': 'Racing Club de Avellaneda', independiente: 'Club Atlético Independiente',
  'san-lorenzo': 'San Lorenzo de Almagro', talleres: 'Talleres de Córdoba',
  defensa: 'Defensa y Justicia', velez: 'Club Atlético Vélez Sarsfield',
  estudiantes: 'Estudiantes de La Plata', lanus: 'Club Atlético Lanús',
  huracan: 'Club Atlético Huracán', belgrano: 'Club Atlético Belgrano',
  newells: "Newell's Old Boys", 'rosario-central': 'Rosario Central',
  ferro: 'Ferro Carril Oeste', patronato: 'Club Atlético Patronato',
  madryn: 'Deportivo Madryn', chaco: 'Chaco For Ever', 'san-martin': 'San Martín de Tucumán',
  quilmes: 'Quilmes Atlético Club',
  flamengo: 'CR Flamengo', palmeiras: 'Palmeiras', gremio: 'Grêmio FBPA',
  corinthians: 'Sport Club Corinthians Paulista', fluminense: 'Fluminense FC',
  internacional: 'Sport Club Internacional', 'atletico-mg': 'Clube Atlético Mineiro',
  'sao-paulo': 'São Paulo FC', botafogo: 'Botafogo de Futebol e Regatas',
  cruzeiro: 'Cruzeiro Esporte Clube',
  america: 'Club América', monterrey: 'C.F. Monterrey', 'cruz-azul': 'Cruz Azul',
  tigres: 'Tigres UANL', chivas: 'C.D. Guadalajara', pumas: 'Club Universidad Nacional',
  toluca: 'Deportivo Toluca F.C.',
  'inter-miami': 'Inter Miami CF', lafc: 'Los Angeles FC', galaxy: 'LA Galaxy',
  'atlanta-utd': 'Atlanta United FC', seattle: 'Seattle Sounders FC', 'miami-fusion': 'Austin FC',
  'colo-colo': 'Colo-Colo', 'u-chile': 'Universidad de Chile',
  'u-catolica': 'Club Deportivo Universidad Católica', cobreloa: 'Cobreloa',
  'al-hilal': 'Al-Hilal SFC', 'al-nassr': 'Al-Nassr FC', 'al-ittihad': 'Ittihad Club',
  'al-ahli-sa': 'Al-Ahli Saudi FC',
  'club-brugge': 'Club Brugge KV', anderlecht: 'R.S.C. Anderlecht', genk: 'K.R.C. Genk',
  gent: 'K.A.A. Gent', standard: 'Standard Liège', antwerp: 'Royal Antwerp F.C.',
  galatasaray: 'Galatasaray S.K. (football)', fenerbahce: 'Fenerbahçe S.K. (football)',
  besiktas: 'Beşiktaş J.K.', trabzonspor: 'Trabzonspor', basaksehir: 'İstanbul Başakşehir F.K.',
  celtic: 'Celtic F.C.', rangers: 'Rangers F.C.', hearts: 'Heart of Midlothian F.C.',
  aberdeen: 'Aberdeen F.C.', hibernian: 'Hibernian F.C.',
  'young-boys': 'BSC Young Boys', basel: 'FC Basel', zurich: 'FC Zürich', servette: 'Servette FC',
  salzburg: 'FC Red Bull Salzburg', 'sturm-graz': 'SK Sturm Graz', 'rapid-wien': 'SK Rapid Wien',
  'austria-wien': 'FK Austria Wien',
  olympiacos: 'Olympiacos F.C.', panathinaikos: 'Panathinaikos F.C.', aek: 'AEK Athens F.C.',
  paok: 'PAOK FC',
  shakhtar: 'FC Shakhtar Donetsk', 'dynamo-kyiv': 'FC Dynamo Kyiv', dnipro: 'SC Dnipro-1',
  zenit: 'FC Zenit Saint Petersburg', spartak: 'FC Spartak Moscow', 'cska-moscow': 'PFC CSKA Moscow',
  krasnodar: 'FC Krasnodar',
  copenhagen: 'F.C. Copenhagen', midtjylland: 'FC Midtjylland', brondby: 'Brøndby IF',
  'bodo-glimt': 'FK Bodø/Glimt', rosenborg: 'Rosenborg BK', molde: 'Molde FK',
  malmo: 'Malmö FF', aik: 'AIK Fotboll', djurgarden: 'Djurgårdens IF Fotboll',
  legia: 'Legia Warsaw', 'lech-poznan': 'Lech Poznań', rakow: 'Raków Częstochowa',
  'slavia-praha': 'SK Slavia Prague', 'sparta-praha': 'AC Sparta Prague',
  'viktoria-plzen': 'FC Viktoria Plzeň',
  'dinamo-zagreb': 'GNK Dinamo Zagreb', hajduk: 'HNK Hajduk Split', rijeka: 'HNK Rijeka',
  'crvena-zvezda': 'Red Star Belgrade', partizan: 'FK Partizan', vojvodina: 'FK Vojvodina',
  shamrock: 'Shamrock Rovers F.C.', bohemians: 'Bohemian F.C.', 'derry-city': 'Derry City F.C.',
  'atletico-nacional': 'Atlético Nacional', millonarios: 'Millonarios F.C.',
  'america-cali': 'América de Cali', junior: 'Atlético Junior',
  penarol: 'Peñarol', 'nacional-uy': 'Club Nacional de Football',
  defensor: 'Defensor Sporting', 'liverpool-uy': 'Liverpool F.C. (Montevideo)',
  'alianza-lima': 'Alianza Lima', universitario: 'Universitario de Deportes',
  'sporting-cristal': 'Sporting Cristal',
  'barcelona-sc': 'Barcelona S.C.', 'ldu-quito': 'L.D.U. Quito',
  'independiente-dv': 'Independiente del Valle',
  olimpia: 'Club Olimpia', 'cerro-porteno': 'Cerro Porteño', libertad: 'Club Libertad',
  saprissa: 'Deportivo Saprissa', alajuelense: 'L.D. Alajuelense',
  kawasaki: 'Kawasaki Frontale', urawa: 'Urawa Red Diamonds', marinos: 'Yokohama F. Marinos',
  'vissel-kobe': 'Vissel Kobe', jeonbuk: 'Jeonbuk Hyundai Motors', ulsan: 'Ulsan HD FC',
  'fc-seoul': 'FC Seoul', 'sydney-fc': 'Sydney FC', 'melbourne-victory': 'Melbourne Victory FC',
  'al-ahly': 'Al Ahly SC', zamalek: 'Zamalek SC', pyramids: 'Pyramids FC',
  raja: 'Raja CA', wydad: 'Wydad AC', 'rs-berkane': 'RS Berkane',
  enyimba: 'Enyimba F.C.', 'rivers-utd': 'Rivers United F.C.',
  'cr-belouizdad': 'CR Belouizdad', 'js-kabylie': 'JS Kabylie',
  teungueth: 'Teungueth FC', jaraaf: 'ASC Jaraaf',
  'asante-kotoko': 'Asante Kotoko SC', 'hearts-of-oak': 'Accra Hearts of Oak S.C.',
  'asec-mimosas': 'ASEC Mimosas', 'africa-sports': "Africa Sports d'Abidjan",
  'coton-sport': 'Coton Sport FC de Garoua', 'canon-yaounde': 'Canon Yaoundé',
};

async function batchImages(titles) {
  const url = 'https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1'
    + '&prop=pageimages&pilicense=any&piprop=original|thumbnail&pithumbsize=256&titles='
    + encodeURIComponent(titles.join('|'));
  for (let attempt = 0; attempt < 5; attempt++) {
    const r = await fetch(url, { headers: { 'user-agent': UA, accept: 'application/json' } });
    if (r.status === 429) { await sleep(5000 * (attempt + 1)); continue; }
    if (!r.ok) return null;
    return r.json();
  }
  return null;
}

const read = f => fs.readFileSync(f, 'utf8');
const clubs = [];
for (const f of ['data/career/clubs.ts', 'data/career/clubs-extra.ts']) {
  for (const m of read(f).matchAll(/C\('([a-z0-9-]+)',\s*'([^']+)'/g)) {
    clubs.push({ id: m[1], name: m[2].replace(/\\'/g, "'") });
  }
}
const byTitle = new Map();
for (const c of clubs) byTitle.set(TITLE[c.id] ?? c.name, c.id);
const titles = [...byTitle.keys()];
console.error(`resolving ${clubs.length} clubs via ${Math.ceil(titles.length / 40)} batched requests…`);

const out = {};
for (let i = 0; i < titles.length; i += 40) {
  const chunk = titles.slice(i, i + 40);
  const j = await batchImages(chunk);
  const pages = j?.query?.pages ?? {};
  // redirects/normalisation rewrite titles, so map results back to what we asked
  const norm = new Map();
  for (const n of j?.query?.normalized ?? []) norm.set(n.to, n.from);
  for (const r of j?.query?.redirects ?? []) norm.set(r.to, norm.get(r.from) ?? r.from);
  for (const pid of Object.keys(pages)) {
    const pg = pages[pid];
    const img = pg?.original?.source || pg?.thumbnail?.source;
    if (!img) continue;
    const asked = norm.get(pg.title) ?? pg.title;
    const id = byTitle.get(asked) ?? byTitle.get(pg.title);
    if (id) out[id] = img;
  }
  console.error(`  ${Math.min(i + 40, titles.length)}/${titles.length} -> ${Object.keys(out).length} found`);
  await sleep(1200);
}

const missed = clubs.filter(c => !out[c.id]).map(c => c.id);
console.error(`resolved ${Object.keys(out).length}/${clubs.length}; missing: ${missed.join(',') || 'none'}`);
fs.writeFileSync('data/career/crest-urls.ts',
  `// Auto-generated by scripts/fetch-crests.mjs — real club crests resolved from
// Wikipedia. Hotlinked from upload.wikimedia.org: many club crests are
// non-free/fair-use, so we reference them rather than redistribute the files.
// Any club missing here falls back to the generated crest in crests.tsx.
export const CREST_URL: Record<string, string> = ${JSON.stringify(out, null, 2)};
`);
console.error('wrote data/career/crest-urls.ts');
