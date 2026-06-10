import { Language } from './i18n';
import { pickOne } from './random';

// Made-up team names for the landing page dice roll — 100 per language.
// All fit the 40-char team name limit.

const EN_NAMES: string[] = [
  'Thunder Wanderers', 'Golden Boot Galaxy', 'Crossbar Kings', 'Nutmeg Nomads',
  'Counter Press FC', 'Velvet Volley', 'Iron Curtain United', 'Rocket Rovers',
  'Midfield Maestros', 'The Offside Trap', 'Panenka Pirates', 'Tiki-Taka Titans',
  'Stoppage Time FC', 'Top Bins United', 'The False Nines', 'Worldie Wanderers',
  'Cannonball City', 'Dynamo Drizzle', 'Hat-Trick Heroes', 'The Sweeper Keepers',
  'Rabona Rangers', 'Slide Tackle Social', 'Bicycle Kick Brigade', 'Clean Sheet Crew',
  'The Dugout Dreamers', 'Volley Vultures', 'Gegenpress Giants', 'Net Busters FC',
  'Howler Hunters', 'The Crossfield Kings', 'Extra Time Eagles', 'Penalty Spot Pioneers',
  'Curva Casuals', 'The Trequartistas', 'Galactic Gaffer XI', 'Touchline Tacticians',
  'The Long Ballers', 'Park Bench Athletic', 'Sunday Roast Rovers', 'Fergie Time FC',
  'The Wing Wizards', 'Back Post Bandits', 'Half Volley Heroes', 'The Box-to-Boxers',
  'Diving Header Dynamo', 'Squeaky Bum United', 'The Mixer Merchants', 'Route One Royals',
  'Cult Hero Collective', 'The Magic Sponge', 'Onion Bag United', 'Toe Poke Town',
  'The Late Winners', 'Goal Machine City', 'Keepy-Uppy Kings', 'The Screamer Society',
  'Last Ditch Defenders', 'Big Game Bottlers', 'The Underdog Uprising', 'Comeback Kings XI',
  'The Inverted Wingers', 'Pressing Matters FC', 'The Deep Block', 'Caviar Pass Casuals',
  'Five-a-Side Phantoms', 'The Wonder Strike', 'Bottom Corner Boys', 'Aggregate Athletic',
  'The Replay Rebels', 'Crunching Tackle Town', 'The Step Over Squad', 'Marauding Fullbacks',
  'The Target Men', 'Set Piece Sorcerers', 'Whistle Blowers FC', 'The Twelfth Man XI',
  'Loft and Hope United', 'Glory Hunters Anonymous', 'The Tunnel Bust-Up', 'Champagne Football Club',
  'The Grass Cutters', 'Knee Slide Nation', 'Corner Flag Crusaders', 'The Yo-Yo Club',
  'Banana Shot Borough', 'The Six Pointers', 'Tactical Foul Town', 'Heavy Touch Heroes',
  'The Net Rattlers', 'Injury Time Invaders', 'The Front Three', 'Pitch Invaders FC',
  'Golazo Government', 'The Shin Pad Society', 'Overhead Kick Outfit', 'The Title Racers',
  'Mud Bath Marauders', 'Floodlight Phantoms', 'The Cup Upsets', 'Trophy Cabinet FC',
];

const ES_NAMES: string[] = [
  'Real Escuadra CF', 'Atlético Vaselina', 'Deportivo La Rabona', 'Furia del Tiki-Taka',
  'Los Galácticos de Barrio', 'Racing de la Chilena', 'Unión Palo y Dentro', 'Sporting Sombrero',
  'Club Atlético Golazo', 'Los Magos del Balón', 'CD Tridente Letal', 'Real Contragolpe',
  'La Volea Celestial', 'Atlético Tacón y Gol', 'Los Príncipes del Área', 'Deportivo Caño Puro',
  'UD Tiempo de Descuento', 'Real Doble Pivote', 'Los Cazadores de Títulos', 'CF Delantero Centro',
  'Hércules del Larguero', 'Atlético Media Punta', 'Los Lobos del Vestuario', 'Real Pizarra Mágica',
  'CD Pase de la Muerte', 'Sporting Tijereta', 'Racing del Olímpico', 'Los Búhos del Mediocampo',
  'Unión Cerrojo y Contra', 'Atlético Pressing Total', 'Real Jugón CF', 'Los Reyes del Córner',
  'Deportivo Telaraña', 'CF Tarjetón Amarillo', 'La Banda del Costado', 'Atlético Remontada',
  'Real Hat-Trick', 'Los Killers del Área Chica', 'CD Falso Nueve', 'Unión Toque y Pared',
  'Sporting Gambeta', 'Los Titanes del Travesaño', 'Racing Bota de Oro', 'Atlético Cantera Eterna',
  'Real Fútbol Champán', 'FC Ojo al VAR', 'CD Penalti Picado', 'Deportivo Vuelta Olímpica',
  'Las Fieras del Derbi', 'UD Portería a Cero', 'Atlético Zurda Mágica', 'Real Túnel y Gol',
  'Los Velocistas de la Banda', 'CF Muralla Defensiva', 'Sporting Escorpión', 'Los Artistas del Empate',
  'CD Prórroga Infinita', 'Unión Grada Animada', 'Atlético Saque de Honor', 'Real Triplete Soñado',
  'Los Capitanes del Brazalete', 'Deportivo Doble Sesión', 'Racing de la Bicicleta', 'CD Cabezazo Imperial',
  'Los Guardianes del Arco', 'UD Mediapunta Total', 'Atlético Fuera de Juego', 'Real Vestuario Unido',
  'Los Magos de la Asistencia', 'CF Golaveraje Positivo', 'Sporting Cucharita', 'Los Bombarderos del Área',
  'CD Lateral Profundo', 'Unión Juego de Toque', 'Atlético Última Jugada', 'Real Campo Embarrado',
  'Los Históricos de Regional', 'Deportivo Pretemporada', 'Racing Tercera Equipación', 'CD Tribuna Norte',
  'Los Ultras del Buen Fútbol', 'UD Césped Artificial', 'Atlético Bota Vieja', 'Real Filigrana CF',
  'Los Duques del Despeje', 'CF Trivela Total', 'Sporting Palomita', 'Los Reyes del Caño',
  'CD Ascenso Soñado', 'Unión Pase Filtrado', 'Atlético Pichichi Eterno', 'Real Cerrojazo',
  'Los Mariscales del Área', 'Deportivo Talento Fugaz', 'Racing del Minuto 93', 'La Sociedad del Golazo',
  'Los Ingenieros del 4-4-2', 'UD Banquillo de Oro', 'Atlético Patadón y Arriba', 'Real Olé Olé FC',
];

export const TEAM_NAME_IDEAS: Record<Language, string[]> = {
  en: EN_NAMES,
  es: ES_NAMES,
};

// Random made-up team name in the given language, never repeating `exclude`.
export function randomTeamName(language: Language, exclude?: string): string {
  const list = TEAM_NAME_IDEAS[language] ?? EN_NAMES;
  const candidates = exclude ? list.filter(n => n !== exclude) : list;
  return pickOne(candidates);
}
