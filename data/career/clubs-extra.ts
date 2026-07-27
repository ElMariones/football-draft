import type { CareerClub } from './types';

// Extra clubs, kept in their own file so the original roster stays readable.
//
// Two jobs here:
//   1. give every playable nation a real domestic league to come from and go
//      back to, and
//   2. fill out the leagues that were too thin to generate sensible offers
//      (the Eredivisie had four clubs, so a player there had almost no local
//      moves and the market fell through to a worldwide pool).
const C = (
  id: string, name: string, short: string, leagueId: string, strength: number,
  primary: string, secondary: string,
): CareerClub => ({ id, name, short, leagueId, strength, colors: { primary, secondary } });

export const CLUBS_EXTRA: CareerClub[] = [
  // ---- fill out existing leagues ----
  // Premier League
  C('crystal-palace', 'Crystal Palace', 'CRY', 'premier-league', 72, '#1B458F', '#C4122E'),
  C('fulham', 'Fulham', 'FUL', 'premier-league', 72, '#FFFFFF', '#000000'),
  C('nottingham', 'Nottingham Forest', 'NFO', 'premier-league', 71, '#DD0000', '#FFFFFF'),
  C('bournemouth', 'Bournemouth', 'BOU', 'premier-league', 71, '#DA291C', '#000000'),
  // LaLiga
  C('celta', 'Celta de Vigo', 'CEL', 'laliga', 70, '#8AC3EE', '#FFFFFF'),
  C('osasuna', 'Osasuna', 'OSA', 'laliga', 69, '#0A346F', '#D91A21'),
  C('rayo', 'Rayo Vallecano', 'RAY', 'laliga', 68, '#FFFFFF', '#E53027'),
  C('mallorca', 'Mallorca', 'MLL', 'laliga', 68, '#E20613', '#000000'),
  // Bundesliga
  C('stuttgart', 'VfB Stuttgart', 'VFB', 'bundesliga', 76, '#FFFFFF', '#E32219'),
  C('gladbach', 'Borussia M.gladbach', 'BMG', 'bundesliga', 72, '#FFFFFF', '#000000'),
  C('union-berlin', 'Union Berlin', 'FCU', 'bundesliga', 71, '#EE1C25', '#FFED00'),
  C('hoffenheim', 'Hoffenheim', 'TSG', 'bundesliga', 70, '#1C63B7', '#FFFFFF'),
  C('werder', 'Werder Bremen', 'SVW', 'bundesliga', 70, '#1D9053', '#FFFFFF'),
  C('mainz', 'Mainz 05', 'M05', 'bundesliga', 69, '#C3141E', '#FFFFFF'),
  // Serie A
  C('bologna', 'Bologna', 'BOL', 'serie-a', 74, '#1A2F48', '#A21C25'),
  C('torino', 'Torino', 'TOR', 'serie-a', 71, '#8A1E03', '#FFFFFF'),
  C('udinese', 'Udinese', 'UDI', 'serie-a', 69, '#000000', '#FFFFFF'),
  C('sassuolo', 'Sassuolo', 'SAS', 'serie-a', 68, '#00A752', '#000000'),
  // Ligue 1
  C('rennes', 'Rennes', 'REN', 'ligue-1', 74, '#E23122', '#000000'),
  C('lens', 'RC Lens', 'LEN', 'ligue-1', 74, '#EFB810', '#DA291C'),
  C('strasbourg', 'Strasbourg', 'STR', 'ligue-1', 69, '#0069B4', '#FFFFFF'),
  C('nantes', 'Nantes', 'NAN', 'ligue-1', 68, '#FCD303', '#008D3F'),
  // Primeira Liga
  C('vitoria-sc', 'Vitória SC', 'VSC', 'primeira-liga', 70, '#FFFFFF', '#000000'),
  C('boavista', 'Boavista', 'BOA', 'primeira-liga', 66, '#000000', '#FFFFFF'),
  C('famalicao', 'Famalicão', 'FAM', 'primeira-liga', 65, '#FFFFFF', '#0067B1'),
  // Eredivisie
  C('twente', 'FC Twente', 'TWE', 'eredivisie', 72, '#E1001A', '#FFFFFF'),
  C('utrecht', 'FC Utrecht', 'UTR', 'eredivisie', 69, '#E1001A', '#FFFFFF'),
  C('heerenveen', 'Heerenveen', 'HEE', 'eredivisie', 66, '#005EB8', '#FFFFFF'),
  C('sparta-rotterdam', 'Sparta Rotterdam', 'SPA', 'eredivisie', 64, '#FFFFFF', '#E1001A'),
  // Championship
  C('sunderland', 'Sunderland', 'SUN', 'championship', 68, '#EB172B', '#FFFFFF'),
  C('sheffield-utd', 'Sheffield United', 'SHU', 'championship', 67, '#EE2737', '#000000'),
  C('west-brom', 'West Bromwich', 'WBA', 'championship', 66, '#122F67', '#FFFFFF'),
  C('middlesbrough', 'Middlesbrough', 'MID', 'championship', 65, '#E21C38', '#FFFFFF'),
  // LaLiga 2
  C('zaragoza', 'Real Zaragoza', 'ZAR', 'laliga2', 63, '#0B4EA2', '#FFFFFF'),
  C('eibar', 'Eibar', 'EIB', 'laliga2', 63, '#0B4EA2', '#A50044'),
  // Liga Argentina
  C('estudiantes', 'Estudiantes', 'EST', 'liga-argentina', 70, '#E4032E', '#FFFFFF'),
  C('lanus', 'Lanús', 'LAN', 'liga-argentina', 68, '#7B1B2E', '#FFFFFF'),
  C('huracan', 'Huracán', 'HUR', 'liga-argentina', 66, '#FFFFFF', '#E4032E'),
  C('belgrano', 'Belgrano', 'BEL', 'liga-argentina', 65, '#7EC0EE', '#FFFFFF'),
  C('newells', "Newell's", 'NOB', 'liga-argentina', 66, '#E4032E', '#000000'),
  C('rosario-central', 'Rosario Central', 'CAR', 'liga-argentina', 67, '#0B4EA2', '#FFD700'),
  // Brasileirão
  C('internacional', 'Internacional', 'INT', 'brasileirao', 74, '#E5050F', '#FFFFFF'),
  C('atletico-mg', 'Atlético Mineiro', 'CAM', 'brasileirao', 75, '#000000', '#FFFFFF'),
  C('sao-paulo', 'São Paulo', 'SAO', 'brasileirao', 75, '#FE0000', '#000000'),
  C('botafogo', 'Botafogo', 'BOT', 'brasileirao', 74, '#000000', '#FFFFFF'),
  C('cruzeiro', 'Cruzeiro', 'CRU', 'brasileirao', 72, '#0B4EA2', '#FFFFFF'),
  // Liga MX
  C('chivas', 'Chivas', 'CHV', 'liga-mx', 68, '#C8102E', '#0B4EA2'),
  C('pumas', 'Pumas UNAM', 'PUM', 'liga-mx', 66, '#00285E', '#DFA92E'),
  C('toluca', 'Toluca', 'TOL', 'liga-mx', 67, '#E4032E', '#FFFFFF'),
  // MLS
  C('atlanta-utd', 'Atlanta United', 'ATL', 'mls', 65, '#80000A', '#000000'),
  C('seattle', 'Seattle Sounders', 'SEA', 'mls', 66, '#5D9741', '#236192'),
  C('miami-fusion', 'Austin FC', 'AUS', 'mls', 63, '#00B140', '#000000'),
  // Chile
  C('u-catolica', 'Universidad Católica', 'UCA', 'chile-primera', 65, '#FFFFFF', '#0B4EA2'),
  C('cobreloa', 'Cobreloa', 'COB', 'chile-primera', 58, '#E87722', '#FFFFFF'),
  // Saudi
  C('al-ittihad', 'Al-Ittihad', 'ITT', 'saudi-league', 74, '#000000', '#FFD700'),
  C('al-ahli-sa', 'Al-Ahli', 'AHL', 'saudi-league', 72, '#00913A', '#FFFFFF'),
  // Primera Nacional
  C('san-martin', 'San Martín', 'SMT', 'liga-argentina-2', 56, '#0B4EA2', '#FFFFFF'),
  C('quilmes', 'Quilmes', 'QUI', 'liga-argentina-2', 55, '#FFFFFF', '#0B4EA2'),

  // ---- Belgium ----
  C('club-brugge', 'Club Brugge', 'CLB', 'belgium-pro', 76, '#0B4EA2', '#000000'),
  C('anderlecht', 'Anderlecht', 'AND', 'belgium-pro', 73, '#4B2E83', '#FFFFFF'),
  C('genk', 'KRC Genk', 'GNK', 'belgium-pro', 72, '#0B4EA2', '#FFFFFF'),
  C('gent', 'KAA Gent', 'GNT', 'belgium-pro', 70, '#0B4EA2', '#FFFFFF'),
  C('standard', 'Standard Liège', 'STL', 'belgium-pro', 68, '#E4032E', '#FFFFFF'),
  C('antwerp', 'Royal Antwerp', 'ANT', 'belgium-pro', 69, '#E4032E', '#FFFFFF'),

  // ---- Turkey ----
  C('galatasaray', 'Galatasaray', 'GAL', 'super-lig', 78, '#A90432', '#FBB800'),
  C('fenerbahce', 'Fenerbahçe', 'FEN', 'super-lig', 77, '#FFED00', '#00297A'),
  C('besiktas', 'Beşiktaş', 'BJK', 'super-lig', 74, '#000000', '#FFFFFF'),
  C('trabzonspor', 'Trabzonspor', 'TRA', 'super-lig', 71, '#7B1B2E', '#00A0E1'),
  C('basaksehir', 'Başakşehir', 'IBF', 'super-lig', 68, '#F26522', '#00274C'),

  // ---- Scotland ----
  C('celtic', 'Celtic', 'CEL', 'scottish-prem', 75, '#018749', '#FFFFFF'),
  C('rangers', 'Rangers', 'RAN', 'scottish-prem', 74, '#0B4EA2', '#FFFFFF'),
  C('hearts', 'Hearts', 'HEA', 'scottish-prem', 64, '#7B1B2E', '#FFFFFF'),
  C('aberdeen', 'Aberdeen', 'ABE', 'scottish-prem', 64, '#E4032E', '#FFFFFF'),
  C('hibernian', 'Hibernian', 'HIB', 'scottish-prem', 62, '#018749', '#FFFFFF'),

  // ---- Switzerland ----
  C('young-boys', 'Young Boys', 'YB', 'swiss-super', 70, '#FFED00', '#000000'),
  C('basel', 'FC Basel', 'BAS', 'swiss-super', 69, '#E4032E', '#0B4EA2'),
  C('zurich', 'FC Zürich', 'FCZ', 'swiss-super', 65, '#FFFFFF', '#0B4EA2'),
  C('servette', 'Servette', 'SER', 'swiss-super', 63, '#7B1B2E', '#FFFFFF'),

  // ---- Austria ----
  C('salzburg', 'RB Salzburg', 'SAL', 'austria-bl', 74, '#E4032E', '#FFFFFF'),
  C('sturm-graz', 'Sturm Graz', 'STU', 'austria-bl', 68, '#000000', '#FFFFFF'),
  C('rapid-wien', 'Rapid Wien', 'RAP', 'austria-bl', 66, '#018749', '#FFFFFF'),
  C('austria-wien', 'Austria Wien', 'AUS', 'austria-bl', 63, '#7A1B60', '#FFFFFF'),

  // ---- Greece ----
  C('olympiacos', 'Olympiacos', 'OLY', 'greece-sl', 72, '#E4032E', '#FFFFFF'),
  C('panathinaikos', 'Panathinaikos', 'PAO', 'greece-sl', 70, '#018749', '#FFFFFF'),
  C('aek', 'AEK Athens', 'AEK', 'greece-sl', 69, '#FFED00', '#000000'),
  C('paok', 'PAOK', 'PAO', 'greece-sl', 69, '#000000', '#FFFFFF'),

  // ---- Ukraine / Russia ----
  C('shakhtar', 'Shakhtar Donetsk', 'SHK', 'ukraine-pl', 73, '#F47B20', '#000000'),
  C('dynamo-kyiv', 'Dynamo Kyiv', 'DYN', 'ukraine-pl', 71, '#FFFFFF', '#0B4EA2'),
  C('dnipro', 'Dnipro-1', 'DNI', 'ukraine-pl', 64, '#0B4EA2', '#FFFFFF'),
  C('zenit', 'Zenit', 'ZEN', 'russia-pl', 73, '#0B4EA2', '#87CEEB'),
  C('spartak', 'Spartak Moscow', 'SPM', 'russia-pl', 70, '#E4032E', '#FFFFFF'),
  C('cska-moscow', 'CSKA Moscow', 'CSK', 'russia-pl', 69, '#0B4EA2', '#E4032E'),
  C('krasnodar', 'Krasnodar', 'KRA', 'russia-pl', 69, '#018749', '#000000'),

  // ---- Denmark / Nordics ----
  C('copenhagen', 'FC Copenhagen', 'FCK', 'denmark-sl', 70, '#FFFFFF', '#0B4EA2'),
  C('midtjylland', 'Midtjylland', 'FCM', 'denmark-sl', 68, '#000000', '#E4032E'),
  C('brondby', 'Brøndby', 'BRO', 'denmark-sl', 65, '#FFED00', '#0B4EA2'),
  C('bodo-glimt', 'Bodø/Glimt', 'BOD', 'eliteserien', 67, '#FFED00', '#000000'),
  C('rosenborg', 'Rosenborg', 'ROS', 'eliteserien', 62, '#FFFFFF', '#000000'),
  C('molde', 'Molde', 'MOL', 'eliteserien', 63, '#0B4EA2', '#FFFFFF'),
  C('malmo', 'Malmö FF', 'MAL', 'allsvenskan', 66, '#87CEEB', '#FFFFFF'),
  C('aik', 'AIK', 'AIK', 'allsvenskan', 62, '#000000', '#FFD700'),
  C('djurgarden', 'Djurgården', 'DIF', 'allsvenskan', 63, '#0B4EA2', '#87CEEB'),

  // ---- Poland / Czechia / Balkans ----
  C('legia', 'Legia Warsaw', 'LEG', 'ekstraklasa', 65, '#018749', '#FFFFFF'),
  C('lech-poznan', 'Lech Poznań', 'LEC', 'ekstraklasa', 64, '#0B4EA2', '#FFFFFF'),
  C('rakow', 'Raków', 'RAK', 'ekstraklasa', 63, '#E4032E', '#0B4EA2'),
  C('slavia-praha', 'Slavia Praha', 'SLA', 'czech-liga', 68, '#E4032E', '#FFFFFF'),
  C('sparta-praha', 'Sparta Praha', 'SPP', 'czech-liga', 68, '#7B1B2E', '#FFD700'),
  C('viktoria-plzen', 'Viktoria Plzeň', 'PLZ', 'czech-liga', 65, '#E4032E', '#0B4EA2'),
  C('dinamo-zagreb', 'Dinamo Zagreb', 'DZG', 'croatia-hnl', 68, '#0B4EA2', '#FFFFFF'),
  C('hajduk', 'Hajduk Split', 'HAJ', 'croatia-hnl', 64, '#FFFFFF', '#0B4EA2'),
  C('rijeka', 'Rijeka', 'RIJ', 'croatia-hnl', 62, '#FFFFFF', '#0B4EA2'),
  C('crvena-zvezda', 'Crvena Zvezda', 'CZV', 'serbia-sl', 67, '#E4032E', '#FFFFFF'),
  C('partizan', 'Partizan', 'PAR', 'serbia-sl', 64, '#000000', '#FFFFFF'),
  C('vojvodina', 'Vojvodina', 'VOJ', 'serbia-sl', 58, '#E4032E', '#FFFFFF'),

  // ---- Ireland ----
  C('shamrock', 'Shamrock Rovers', 'SHA', 'ireland-pd', 55, '#018749', '#FFFFFF'),
  C('bohemians', 'Bohemians', 'BOH', 'ireland-pd', 52, '#E4032E', '#000000'),
  C('derry-city', 'Derry City', 'DER', 'ireland-pd', 52, '#E4032E', '#FFFFFF'),

  // ---- Colombia / Uruguay / Peru / Ecuador / Paraguay ----
  C('atletico-nacional', 'Atlético Nacional', 'NAC', 'colombia-a', 69, '#018749', '#FFFFFF'),
  C('millonarios', 'Millonarios', 'MIL', 'colombia-a', 67, '#0B4EA2', '#FFFFFF'),
  C('america-cali', 'América de Cali', 'AME', 'colombia-a', 65, '#E4032E', '#FFFFFF'),
  C('junior', 'Junior', 'JUN', 'colombia-a', 65, '#E4032E', '#FFFFFF'),
  C('penarol', 'Peñarol', 'PEN', 'uruguay-pd', 68, '#FCD116', '#000000'),
  C('nacional-uy', 'Nacional', 'NAC', 'uruguay-pd', 68, '#FFFFFF', '#0B4EA2'),
  C('defensor', 'Defensor Sporting', 'DEF', 'uruguay-pd', 61, '#5B2A86', '#FFFFFF'),
  C('liverpool-uy', 'Liverpool FC', 'LIV', 'uruguay-pd', 60, '#000000', '#0B4EA2'),
  C('alianza-lima', 'Alianza Lima', 'ALI', 'peru-liga1', 61, '#0B4EA2', '#FFFFFF'),
  C('universitario', 'Universitario', 'UNI', 'peru-liga1', 61, '#FFD700', '#7B1B2E'),
  C('sporting-cristal', 'Sporting Cristal', 'CRI', 'peru-liga1', 60, '#87CEEB', '#FFFFFF'),
  C('barcelona-sc', 'Barcelona SC', 'BSC', 'ecuador-ligapro', 63, '#FFD700', '#E4032E'),
  C('ldu-quito', 'LDU Quito', 'LDU', 'ecuador-ligapro', 64, '#FFFFFF', '#000000'),
  C('independiente-dv', 'Independiente del Valle', 'IDV', 'ecuador-ligapro', 66, '#000000', '#018749'),
  C('olimpia', 'Olimpia', 'OLI', 'paraguay-dp', 63, '#FFFFFF', '#000000'),
  C('cerro-porteno', 'Cerro Porteño', 'CER', 'paraguay-dp', 63, '#E4032E', '#0B4EA2'),
  C('libertad', 'Libertad', 'LIB', 'paraguay-dp', 62, '#FFFFFF', '#000000'),

  // ---- Costa Rica ----
  C('saprissa', 'Saprissa', 'SAP', 'costa-rica-pd', 56, '#7A1B60', '#FFFFFF'),
  C('alajuelense', 'Alajuelense', 'LDA', 'costa-rica-pd', 56, '#E4032E', '#000000'),

  // ---- Japan / Korea / Australia ----
  C('kawasaki', 'Kawasaki Frontale', 'KAW', 'j1-league', 68, '#87CEEB', '#000000'),
  C('urawa', 'Urawa Reds', 'URA', 'j1-league', 67, '#E4032E', '#000000'),
  C('marinos', 'Yokohama F. Marinos', 'YFM', 'j1-league', 67, '#0B4EA2', '#FFFFFF'),
  C('vissel-kobe', 'Vissel Kobe', 'VIS', 'j1-league', 68, '#7B1B2E', '#FFFFFF'),
  C('jeonbuk', 'Jeonbuk Hyundai', 'JEO', 'k-league', 64, '#018749', '#FFFFFF'),
  C('ulsan', 'Ulsan HD', 'ULS', 'k-league', 65, '#0B4EA2', '#FFD700'),
  C('fc-seoul', 'FC Seoul', 'SEO', 'k-league', 62, '#E4032E', '#000000'),
  C('sydney-fc', 'Sydney FC', 'SYD', 'a-league', 58, '#87CEEB', '#0B4EA2'),
  C('melbourne-victory', 'Melbourne Victory', 'MVC', 'a-league', 58, '#0B4EA2', '#FFFFFF'),

  // ---- Africa ----
  C('al-ahly', 'Al Ahly', 'AHL', 'egypt-pl', 68, '#E4032E', '#FFFFFF'),
  C('zamalek', 'Zamalek', 'ZAM', 'egypt-pl', 65, '#FFFFFF', '#E4032E'),
  C('pyramids', 'Pyramids FC', 'PYR', 'egypt-pl', 62, '#0B4EA2', '#FFFFFF'),
  C('raja', 'Raja CA', 'RAJ', 'botola', 63, '#018749', '#FFFFFF'),
  C('wydad', 'Wydad AC', 'WAC', 'botola', 63, '#E4032E', '#FFFFFF'),
  C('rs-berkane', 'RS Berkane', 'RSB', 'botola', 60, '#F47B20', '#FFFFFF'),
  C('enyimba', 'Enyimba', 'ENY', 'nigeria-npfl', 55, '#018749', '#FFFFFF'),
  C('rivers-utd', 'Rivers United', 'RIV', 'nigeria-npfl', 54, '#0B4EA2', '#FFFFFF'),
  C('cr-belouizdad', 'CR Belouizdad', 'CRB', 'algeria-l1', 57, '#E4032E', '#FFFFFF'),
  C('js-kabylie', 'JS Kabylie', 'JSK', 'algeria-l1', 56, '#FFD700', '#018749'),
  C('teungueth', 'Teungueth FC', 'TFC', 'senegal-l1', 50, '#0B4EA2', '#FFFFFF'),
  C('jaraaf', 'Jaraaf', 'JAR', 'senegal-l1', 49, '#018749', '#FFFFFF'),
  C('asante-kotoko', 'Asante Kotoko', 'KOT', 'ghana-pl', 51, '#E4032E', '#FFFFFF'),
  C('hearts-of-oak', 'Hearts of Oak', 'HOO', 'ghana-pl', 50, '#7B1B2E', '#FFD700'),
  C('asec-mimosas', 'ASEC Mimosas', 'ASE', 'ivory-l1', 51, '#FFD700', '#000000'),
  C('africa-sports', 'Africa Sports', 'AFS', 'ivory-l1', 48, '#E4032E', '#FFFFFF'),
  C('coton-sport', 'Coton Sport', 'COT', 'cameroon-l1', 50, '#018749', '#FFFFFF'),
  C('canon-yaounde', 'Canon Yaoundé', 'CAN', 'cameroon-l1', 48, '#FFD700', '#018749'),
];
