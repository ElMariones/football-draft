import type { CareerClub } from './types';
import { CLUBS_EXTRA } from './clubs-extra';

// Tiered club pool. `strength` gates offers, drives sim output and title odds.
// Crests are generated from colors + short tag (no trademarked assets).
const C = (
  id: string, name: string, short: string, leagueId: string, strength: number,
  primary: string, secondary: string,
): CareerClub => ({ id, name, short, leagueId, strength, colors: { primary, secondary } });

const CLUBS_CORE: CareerClub[] = [
  // ---- Premier League (tier 1) ----
  C('man-city', 'Manchester City', 'MCI', 'premier-league', 90, '#6CABDD', '#1C2C5B'),
  C('liverpool', 'Liverpool', 'LIV', 'premier-league', 88, '#C8102E', '#00B2A9'),
  C('arsenal', 'Arsenal', 'ARS', 'premier-league', 87, '#EF0107', '#FFFFFF'),
  C('man-utd', 'Manchester United', 'MUN', 'premier-league', 84, '#DA291C', '#FBE122'),
  C('chelsea', 'Chelsea', 'CHE', 'premier-league', 84, '#034694', '#FFFFFF'),
  C('tottenham', 'Tottenham', 'TOT', 'premier-league', 82, '#132257', '#FFFFFF'),
  C('newcastle', 'Newcastle', 'NEW', 'premier-league', 80, '#241F20', '#FFFFFF'),
  C('aston-villa', 'Aston Villa', 'AVL', 'premier-league', 80, '#95BFE5', '#670E36'),
  C('west-ham', 'West Ham', 'WHU', 'premier-league', 76, '#7A263A', '#1BB1E7'),
  C('brighton', 'Brighton', 'BHA', 'premier-league', 76, '#0057B8', '#FFFFFF'),
  C('everton', 'Everton', 'EVE', 'premier-league', 73, '#003399', '#FFFFFF'),
  C('wolves', 'Wolves', 'WOL', 'premier-league', 73, '#FDB913', '#231F20'),

  // ---- LaLiga (tier 1) ----
  C('real-madrid', 'Real Madrid', 'RMA', 'laliga', 90, '#FEBE10', '#00529F'),
  C('barcelona', 'Barcelona', 'BAR', 'laliga', 88, '#A50044', '#004D98'),
  C('atletico', 'Atlético Madrid', 'ATM', 'laliga', 84, '#CB3524', '#FFFFFF'),
  C('sevilla', 'Sevilla', 'SEV', 'laliga', 78, '#D31A2B', '#FFFFFF'),
  C('real-sociedad', 'Real Sociedad', 'RSO', 'laliga', 77, '#0067B1', '#FFFFFF'),
  C('villarreal', 'Villarreal', 'VIL', 'laliga', 77, '#FFE667', '#005187'),
  C('betis', 'Real Betis', 'BET', 'laliga', 75, '#00954C', '#FFFFFF'),
  C('athletic', 'Athletic Club', 'ATH', 'laliga', 76, '#EE2523', '#FFFFFF'),
  C('valencia', 'Valencia', 'VAL', 'laliga', 73, '#FFFFFF', '#F18E00'),
  C('getafe', 'Getafe', 'GET', 'laliga', 68, '#005999', '#FFFFFF'),

  // ---- Bundesliga (tier 1) ----
  C('bayern', 'Bayern Munich', 'BAY', 'bundesliga', 89, '#DC052D', '#FFFFFF'),
  C('leverkusen', 'Bayer Leverkusen', 'LEV', 'bundesliga', 84, '#E32219', '#000000'),
  C('dortmund', 'Borussia Dortmund', 'BVB', 'bundesliga', 83, '#FDE100', '#000000'),
  C('leipzig', 'RB Leipzig', 'RBL', 'bundesliga', 81, '#DD0741', '#001F47'),
  C('frankfurt', 'Eintracht Frankfurt', 'SGE', 'bundesliga', 76, '#E1000F', '#000000'),
  C('freiburg', 'SC Freiburg', 'SCF', 'bundesliga', 73, '#000000', '#E1000F'),
  C('wolfsburg', 'Wolfsburg', 'WOB', 'bundesliga', 72, '#65B32E', '#FFFFFF'),

  // ---- Serie A (tier 1) ----
  C('inter', 'Inter', 'INT', 'serie-a', 86, '#010E80', '#000000'),
  C('juventus', 'Juventus', 'JUV', 'serie-a', 84, '#000000', '#FFFFFF'),
  C('milan', 'AC Milan', 'MIL', 'serie-a', 83, '#FB090B', '#000000'),
  C('napoli', 'Napoli', 'NAP', 'serie-a', 83, '#12A0D7', '#FFFFFF'),
  C('roma', 'Roma', 'ROM', 'serie-a', 79, '#8E1F2F', '#F0BC42'),
  C('lazio', 'Lazio', 'LAZ', 'serie-a', 77, '#87D8F7', '#FFFFFF'),
  C('atalanta', 'Atalanta', 'ATA', 'serie-a', 80, '#1E71B8', '#000000'),
  C('fiorentina', 'Fiorentina', 'FIO', 'serie-a', 74, '#592C82', '#FFFFFF'),

  // ---- Ligue 1 (tier 1) ----
  C('psg', 'Paris Saint-Germain', 'PSG', 'ligue-1', 88, '#004170', '#DA291C'),
  C('monaco', 'Monaco', 'MON', 'ligue-1', 79, '#E51B22', '#FFFFFF'),
  C('marseille', 'Marseille', 'OM', 'ligue-1', 78, '#2FAEE0', '#FFFFFF'),
  C('lyon', 'Lyon', 'LYO', 'ligue-1', 76, '#FFFFFF', '#003DA5'),
  C('lille', 'Lille', 'LIL', 'ligue-1', 75, '#E01E13', '#FFFFFF'),
  C('nice', 'Nice', 'NIC', 'ligue-1', 73, '#000000', '#E4022E'),

  // ---- Primeira Liga (tier 2) ----
  C('benfica', 'Benfica', 'BEN', 'primeira-liga', 80, '#E30613', '#FFFFFF'),
  C('porto', 'Porto', 'POR', 'primeira-liga', 79, '#00429F', '#FFFFFF'),
  C('sporting', 'Sporting CP', 'SCP', 'primeira-liga', 79, '#008057', '#FFFFFF'),
  C('braga', 'Braga', 'BRA', 'primeira-liga', 72, '#E4001B', '#FFFFFF'),

  // ---- Eredivisie (tier 2) ----
  C('ajax', 'Ajax', 'AJA', 'eredivisie', 78, '#D2122E', '#FFFFFF'),
  C('psv', 'PSV', 'PSV', 'eredivisie', 78, '#EE2E24', '#FFFFFF'),
  C('feyenoord', 'Feyenoord', 'FEY', 'eredivisie', 77, '#E30613', '#FFFFFF'),
  C('az', 'AZ Alkmaar', 'AZ', 'eredivisie', 70, '#EE2E24', '#FFFFFF'),

  // ---- Championship (tier 3) ----
  C('leeds', 'Leeds', 'LEE', 'championship', 70, '#FFFFFF', '#1D428A'),
  C('leicester', 'Leicester', 'LEI', 'championship', 71, '#003090', '#FDBE11'),
  C('southampton', 'Southampton', 'SOU', 'championship', 68, '#D71920', '#FFFFFF'),
  C('norwich', 'Norwich', 'NOR', 'championship', 65, '#00A650', '#FFF200'),
  C('watford', 'Watford', 'WAT', 'championship', 64, '#FBEE23', '#ED2127'),

  // ---- LaLiga 2 (tier 3) ----
  C('sporting-gijon', 'Sporting Gijón', 'SPG', 'laliga2', 63, '#E30613', '#FFFFFF'),
  C('albacete', 'Albacete', 'ALB', 'laliga2', 60, '#FFFFFF', '#0B2C6F'),
  C('oviedo', 'Real Oviedo', 'OVI', 'laliga2', 62, '#0B5CA8', '#FFFFFF'),
  C('racing', 'Racing Santander', 'RAC', 'laliga2', 62, '#008000', '#FFFFFF'),

  // ---- Liga Argentina (tier 3) ----
  C('river', 'River Plate', 'RIV', 'liga-argentina', 74, '#FFFFFF', '#E4002B'),
  C('boca', 'Boca Juniors', 'BOC', 'liga-argentina', 74, '#0A2896', '#F2B01E'),
  C('racing-club', 'Racing Club', 'RCB', 'liga-argentina', 70, '#6CACE4', '#FFFFFF'),
  C('independiente', 'Independiente', 'IND', 'liga-argentina', 68, '#E30613', '#FFFFFF'),
  C('san-lorenzo', 'San Lorenzo', 'SLO', 'liga-argentina', 67, '#0A2896', '#E4002B'),
  C('talleres', 'Talleres', 'TAL', 'liga-argentina', 66, '#FFFFFF', '#003DA5'),
  C('defensa', 'Defensa y Justicia', 'DYJ', 'liga-argentina', 64, '#F2C500', '#0B5C2E'),
  C('velez', 'Vélez Sarsfield', 'VEL', 'liga-argentina', 67, '#FFFFFF', '#003DA5'),

  // ---- Brasileirão (tier 3) ----
  C('flamengo', 'Flamengo', 'FLA', 'brasileirao', 76, '#C52613', '#000000'),
  C('palmeiras', 'Palmeiras', 'PAL', 'brasileirao', 76, '#006437', '#FFFFFF'),
  C('gremio', 'Grêmio', 'GRE', 'brasileirao', 70, '#0D80BF', '#000000'),
  C('corinthians', 'Corinthians', 'COR', 'brasileirao', 71, '#000000', '#FFFFFF'),
  C('fluminense', 'Fluminense', 'FLU', 'brasileirao', 70, '#7A1F3D', '#0B5C2E'),

  // ---- Liga MX (tier 4) ----
  C('america', 'Club América', 'AME', 'liga-mx', 72, '#04246B', '#FFE100'),
  C('monterrey', 'Monterrey', 'MTY', 'liga-mx', 71, '#00348D', '#FFFFFF'),
  C('cruz-azul', 'Cruz Azul', 'CAZ', 'liga-mx', 70, '#0A2896', '#FFFFFF'),
  C('tigres', 'Tigres', 'TIG', 'liga-mx', 71, '#FFB500', '#00285E'),

  // ---- MLS (tier 4) ----
  C('inter-miami', 'Inter Miami', 'MIA', 'mls', 70, '#F7B5CD', '#000000'),
  C('lafc', 'LAFC', 'LFC', 'mls', 69, '#000000', '#C39E6D'),
  C('galaxy', 'LA Galaxy', 'LAG', 'mls', 68, '#00245D', '#FCD00A'),

  // ---- Chile (tier 4) ----
  C('colo-colo', 'Colo Colo', 'CCO', 'chile-primera', 66, '#000000', '#FFFFFF'),
  C('u-chile', 'Universidad de Chile', 'UCH', 'chile-primera', 64, '#003DA5', '#E4002B'),

  // ---- Saudi (tier 4) ----
  C('al-hilal', 'Al Hilal', 'HIL', 'saudi-league', 75, '#004AAD', '#FFFFFF'),
  C('al-nassr', 'Al Nassr', 'NAS', 'saudi-league', 73, '#FFD400', '#0B2C6F'),

  // ---- Primera Nacional (tier 5) ----
  C('ferro', 'Ferro Carril Oeste', 'FER', 'liga-argentina-2', 55, '#006B3F', '#FFFFFF'),
  C('patronato', 'Patronato', 'PAT', 'liga-argentina-2', 54, '#E30613', '#000000'),
  C('madryn', 'Deportivo Madryn', 'MAD', 'liga-argentina-2', 52, '#0B5CA8', '#FFFFFF'),
  C('chaco', 'Chaco For Ever', 'CFE', 'liga-argentina-2', 51, '#000000', '#E30613'),
];

// Core roster plus the expanded coverage (see clubs-extra.ts).
export const CLUBS: CareerClub[] = [...CLUBS_CORE, ...CLUBS_EXTRA];

// ---- promotion / relegation ------------------------------------------------
// A club's division changes over a career, so `leagueId` is mutable at runtime.
// The originals are kept so a new career starts from a clean table.
const ORIGINAL_LEAGUE: Record<string, string> = Object.fromEntries(
  CLUBS.map(c => [c.id, c.leagueId]),
);

/**
 * Bumped every time a club changes division, so anything caching per-league
 * facts can tell that its cache is stale.
 */
let generation = 0;
export const leagueGeneration = () => generation;

export function setClubLeague(clubId: string, leagueId: string) {
  generation++;
  const c = CLUBS.find(x => x.id === clubId);
  if (c) c.leagueId = leagueId;
}

export function resetLeagues() {
  generation++;
  for (const c of CLUBS) c.leagueId = ORIGINAL_LEAGUE[c.id] ?? c.leagueId;
}

const CLUB_BY_ID = new Map(CLUBS.map(c => [c.id, c]));
export function getClub(id: string): CareerClub | undefined {
  return CLUB_BY_ID.get(id);
}
export function clubsInLeague(leagueId: string): CareerClub[] {
  return CLUBS.filter(c => c.leagueId === leagueId);
}

// Real club badges from copero's media server: id -> "COUNTRY/slug" (verified).
// Clubs not listed here fall back to the generated monogram crest.
const CLUB_LOGO: Record<string, string> = {
  'man-city': 'ENG/manchester-city', liverpool: 'ENG/liverpool', arsenal: 'ENG/arsenal',
  'man-utd': 'ENG/manchester-united', chelsea: 'ENG/chelsea', tottenham: 'ENG/tottenham-hotspur',
  newcastle: 'ENG/newcastle-united', 'aston-villa': 'ENG/aston-villa', 'west-ham': 'ENG/west-ham-united',
  brighton: 'ENG/brighton', everton: 'ENG/everton', wolves: 'ENG/wolverhampton',
  'real-madrid': 'ESP/real-madrid', barcelona: 'ESP/barcelona', atletico: 'ESP/atletico-madrid',
  sevilla: 'ESP/sevilla', 'real-sociedad': 'ESP/real-sociedad', villarreal: 'ESP/villarreal',
  betis: 'ESP/real-betis', athletic: 'ESP/athletic-club', valencia: 'ESP/valencia', getafe: 'ESP/getafe',
  bayern: 'GER/fc-bayern-munchen', leverkusen: 'GER/bayer-04-leverkusen', dortmund: 'GER/borussia-dortmund',
  leipzig: 'GER/rb-leipzig', frankfurt: 'GER/eintracht-frankfurt', freiburg: 'GER/sc-freiburg', wolfsburg: 'GER/vfl-wolfsburg',
  inter: 'ITA/inter', juventus: 'ITA/juventus', milan: 'ITA/milan', napoli: 'ITA/napoli',
  roma: 'ITA/roma', lazio: 'ITA/lazio', atalanta: 'ITA/atalanta', fiorentina: 'ITA/fiorentina',
  psg: 'FRA/paris-saint-germain', monaco: 'FRA/as-monaco', marseille: 'FRA/olympique-de-marseille',
  lyon: 'FRA/olympique-lyonnais', lille: 'FRA/lille', nice: 'FRA/nice',
  benfica: 'PRT/benfica', porto: 'PRT/fc-porto', braga: 'PRT/sporting-braga',
  leeds: 'ENG/leeds-united', southampton: 'ENG/southampton', norwich: 'ENG/norwich', watford: 'ENG/watford',
  'sporting-gijon': 'ESP/sporting-gijon', albacete: 'ESP/albacete', oviedo: 'ESP/real-oviedo', racing: 'ESP/racing-santander',
  river: 'ARG/river-plate', boca: 'ARG/boca-juniors', 'racing-club': 'ARG/racing-club',
  independiente: 'ARG/independiente', 'san-lorenzo': 'ARG/san-lorenzo', talleres: 'ARG/talleres',
  defensa: 'ARG/defensa-y-justicia', velez: 'ARG/velez-sarsfield',
  flamengo: 'BRA/flamengo', palmeiras: 'BRA/palmeiras', gremio: 'BRA/gremio',
  corinthians: 'BRA/corinthians', fluminense: 'BRA/fluminense',
  america: 'MEX/america', monterrey: 'MEX/monterrey', 'cruz-azul': 'MEX/cruz-azul', tigres: 'MEX/tigres-uanl',
  'colo-colo': 'CHI/colo-colo', 'u-chile': 'CHI/universidad-de-chile',
  ferro: 'ARG/ferro-carril-oeste', patronato: 'ARG/patronato', madryn: 'ARG/deportivo-madryn', chaco: 'ARG/chaco-for-ever',
};
const LOGO_BASE = 'https://media.copero.com.ar/logos/football/teams';
export function clubLogoUrl(id: string): string | null {
  const cs = CLUB_LOGO[id];
  if (!cs) return null;
  const [cc, slug] = cs.split('/');
  return `${LOGO_BASE}/${cc}/D/${slug}.svg`;
}
