// The brands.
//
// A career is not only what you win. From about the age of seventeen there is a
// second negotiation running alongside the football one, and for most players it
// eventually pays better than the football does. This is that negotiation.
//
// Two families. Boot brands are the spine: you always hold exactly one deal (or
// none), it renews or it doesn't, and everything from a signature boot to being
// dropped hangs off it. Lifestyle brands are the ones that arrive once your name
// is worth something on its own — a watch house, a car marque, an airline — and
// you can hold several at once.
//
// The marks in components/career/BrandMark.tsx are ORIGINAL artwork drawn from
// each brand's colours and initial, in the same spirit as the club crests: the
// names are real, the logo artwork is not a reproduction of anybody's
// trademark.

export type BrandFamily = 'boot' | 'lifestyle';

/**
 * How big the brand is, which decides who they are willing to talk to. This is
 * about their reach as a sponsor rather than their revenue: Reebok is a famous
 * name that no longer wins bidding wars for the best player in the world, and
 * the ladder should say so.
 */
export type BrandTier = 'global' | 'major' | 'mid' | 'value';

export type LifestyleCat =
  | 'watch' | 'car' | 'fragrance' | 'airline' | 'game' | 'drink'
  | 'grooming' | 'fashion' | 'eyewear' | 'telecom' | 'bank' | 'snack' | 'audio';

/** Which original mark is drawn for this brand. See BrandMark.tsx. */
export type Glyph =
  | 'wedge' | 'bars' | 'chevron' | 'orbit' | 'blade' | 'grid' | 'wave'
  | 'star' | 'shard' | 'ring' | 'bolt' | 'diamond' | 'flame' | 'arch'
  | 'crown' | 'pulse';

export interface Brand {
  id: string;
  name: string;
  family: BrandFamily;
  tier: BrandTier;
  cat?: LifestyleCat;
  /** nation code they are identified with, for regional flavour */
  home: string;
  primary: string;
  secondary: string;
  glyph: Glyph;
  /** short line used in the panel and in offer copy */
  lineEn: string;
  lineEs: string;
}

const B = (
  id: string, name: string, family: BrandFamily, tier: BrandTier, home: string,
  primary: string, secondary: string, glyph: Glyph,
  lineEn: string, lineEs: string, cat?: LifestyleCat,
): Brand => ({ id, name, family, tier, home, primary, secondary, glyph, lineEn, lineEs, cat });

export const BRANDS: Brand[] = [
  // ---- boots: global ----
  B('nike', 'Nike', 'boot', 'global', 'US', '#111111', '#F5F5F5', 'wedge',
    'They do not sign many. The ones they sign, they build everything around.',
    'No firman a muchos. A los que firman, los convierten en el centro de todo.'),
  B('adidas', 'adidas', 'boot', 'global', 'DE', '#0B0B0B', '#FFFFFF', 'bars',
    'The oldest boot company in the game, and the one every federation deals with.',
    'La marca de botas más antigua del fútbol, y con la que trata cada federación.'),

  // ---- boots: major ----
  B('puma', 'Puma', 'boot', 'major', 'DE', '#D4021D', '#FFFFFF', 'blade',
    'Fewer names than the big two, and they spend everything on the ones they have.',
    'Menos nombres que los dos grandes, y gastan todo en los que tienen.'),
  B('new-balance', 'New Balance', 'boot', 'major', 'US', '#C8102E', '#0B2C6F', 'grid',
    'Came late and bought their way in. They pay above the odds and they know it.',
    'Llegaron tarde y compraron su sitio. Pagan por encima del mercado y lo saben.'),
  B('under-armour', 'Under Armour', 'boot', 'major', 'US', '#1D1D1D', '#E31837', 'chevron',
    'A training-first brand that wants a footballer badly enough to overpay.',
    'Una marca de entrenamiento que quiere un futbolista lo bastante como para pagar de más.'),

  // ---- boots: mid ----
  B('reebok', 'Reebok', 'boot', 'mid', 'EN', '#E4002B', '#002D62', 'star',
    'A giant name in a quieter decade, still capable of one enormous cheque.',
    'Un nombre gigante en una década más tranquila, capaz todavía de un cheque enorme.'),
  B('umbro', 'Umbro', 'boot', 'mid', 'EN', '#003DA5', '#FFFFFF', 'diamond',
    'Football and nothing else, since before most of these brands existed.',
    'Fútbol y nada más, desde antes de que existieran casi todas estas marcas.'),
  B('mizuno', 'Mizuno', 'boot', 'mid', 'JP', '#0B1F8F', '#FFFFFF', 'wave',
    'Made in Osaka, worn by people who care more about the leather than the ad.',
    'Hechas en Osaka, las usa gente a la que le importa más el cuero que el anuncio.'),
  B('asics', 'ASICS', 'boot', 'mid', 'JP', '#0B2265', '#E4002B', 'pulse',
    'Runners first. Their football boots are a quiet, stubborn side project.',
    'Primero corredores. Sus botas de fútbol son un proyecto paralelo y terco.'),
  B('diadora', 'Diadora', 'boot', 'mid', 'IT', '#0C4DA2', '#FFFFFF', 'arch',
    'Montebelluna leather and eighty years of Italian number tens.',
    'Cuero de Montebelluna y ochenta años de números diez italianos.'),
  B('kappa', 'Kappa', 'boot', 'mid', 'IT', '#000000', '#E20613', 'ring',
    'Half a sportswear company and half a fashion label, depending who is asking.',
    'Mitad empresa deportiva y mitad marca de moda, según quién pregunte.'),

  // ---- boots: value ----
  B('joma', 'Joma', 'boot', 'value', 'ES', '#E30613', '#000000', 'shard',
    'From Portillo de Toledo. They kit out half of Spain and never overspend.',
    'De Portillo de Toledo. Visten a media España y nunca gastan de más.'),
  B('kelme', 'Kelme', 'boot', 'value', 'ES', '#0B9444', '#FFFFFF', 'orbit',
    'Elche, and a paw print that half of South America grew up in.',
    'Elche, y una huella con la que creció medio Sudamérica.'),
  B('lotto', 'Lotto', 'boot', 'value', 'IT', '#0057A8', '#FFD100', 'bolt',
    'Trevigiano, sensible, and on more feet in the lower leagues than anyone.',
    'Trevisana, sensata, y en más pies de las categorías bajas que ninguna.'),
  B('hummel', 'Hummel', 'boot', 'value', 'DK', '#1A1A1A', '#FFFFFF', 'chevron',
    'Danish, opinionated, and more interested in what a club stands for.',
    'Danesa, con opiniones, y más interesada en lo que representa un club.'),
  B('le-coq', 'Le Coq Sportif', 'boot', 'value', 'FR', '#0B4EA2', '#E4002B', 'crown',
    'A hundred years old and permanently halfway through a comeback.',
    'Cien años de historia y permanentemente a medio regreso.'),

  // ---- lifestyle ----
  B('rolex', 'Rolex', 'lifestyle', 'global', 'CH', '#0B5A3C', '#D4AF37', 'crown',
    'They do not sponsor. They give you a watch and call it a partnership.',
    'No patrocinan. Te dan un reloj y lo llaman una colaboración.', 'watch'),
  B('tag-heuer', 'TAG Heuer', 'lifestyle', 'major', 'CH', '#0B1F3B', '#C0C0C0', 'ring',
    'Timing sport since before it was televised, and never letting you forget.',
    'Cronometrando deporte desde antes de la televisión, y no dejan que lo olvides.', 'watch'),
  B('hublot', 'Hublot', 'lifestyle', 'major', 'CH', '#111111', '#D4AF37', 'diamond',
    'Enormous, expensive and completely unmissable on a wrist.',
    'Enorme, caro y absolutamente imposible de no ver en una muñeca.', 'watch'),
  B('audi', 'Audi', 'lifestyle', 'global', 'DE', '#1A1A1A', '#BB0A30', 'orbit',
    'Every player at the club gets one every year. That is the whole deal.',
    'Cada jugador del club recibe uno cada año. Ese es todo el acuerdo.', 'car'),
  B('bmw', 'BMW', 'lifestyle', 'global', 'DE', '#0066B1', '#FFFFFF', 'grid',
    'They want you driving it to training where the cameras are.',
    'Quieren verte llegar en él al entrenamiento, donde están las cámaras.', 'car'),
  B('emirates', 'Emirates', 'lifestyle', 'global', 'SA', '#D71921', '#FFFFFF', 'arch',
    'On the front of half the shirts in Europe, and now they want a face.',
    'En el pecho de media Europa, y ahora quieren una cara.', 'airline'),
  B('ea-sports', 'EA Sports', 'lifestyle', 'global', 'US', '#FF4B00', '#0B0B0B', 'bolt',
    'One cover. Every shop window, every console, every bedroom, for a year.',
    'Una portada. Cada escaparate, cada consola, cada habitación, durante un año.', 'game'),
  B('red-bull', 'Red Bull', 'lifestyle', 'major', 'DE', '#001489', '#DB0A40', 'wave',
    'They do not want an advert. They want you in their films.',
    'No quieren un anuncio. Te quieren en sus películas.', 'drink'),
  B('gatorade', 'Gatorade', 'lifestyle', 'major', 'US', '#F47B20', '#0B2265', 'bolt',
    'A bottle on the bench with your name pointing at the camera.',
    'Una botella en el banquillo con tu nombre apuntando a la cámara.', 'drink'),
  B('armani', 'Armani', 'lifestyle', 'global', 'IT', '#0B0B0B', '#B99B6B', 'blade',
    'A suit, a fragrance and a photograph in black and white.',
    'Un traje, un perfume y una fotografía en blanco y negro.', 'fragrance'),
  B('dior', 'Dior', 'lifestyle', 'global', 'FR', '#0B0B0B', '#E8D9B5', 'star',
    'Thirty seconds of you saying nothing at all, shot by somebody famous.',
    'Treinta segundos de ti sin decir nada, rodados por alguien famoso.', 'fragrance'),
  B('gillette', 'Gillette', 'lifestyle', 'major', 'US', '#0B4EA2', '#FFFFFF', 'blade',
    'Enormous money for looking pleased about your own jaw.',
    'Dinero enorme por parecer contento con tu propia mandíbula.', 'grooming'),
  B('ray-ban', 'Ray-Ban', 'lifestyle', 'mid', 'IT', '#1A1A1A', '#C79A3B', 'shard',
    'Two shoots a year and more sunglasses than any human needs.',
    'Dos sesiones al año y más gafas de las que necesita un ser humano.', 'eyewear'),
  B('beats', 'Beats', 'lifestyle', 'major', 'US', '#E1002A', '#000000', 'pulse',
    'Headphones on, off the coach, into the tunnel, on camera. Every week.',
    'Cascos puestos, bajando del autobús, hacia el túnel, en cámara. Cada semana.', 'audio'),
  B('movistar', 'Movistar', 'lifestyle', 'mid', 'ES', '#019DF4', '#0B2739', 'ring',
    'A phone company in your own country that wants the local boy.',
    'Una telefónica de tu propio país que quiere al chico de casa.', 'telecom'),
  B('santander', 'Santander', 'lifestyle', 'mid', 'ES', '#EC0000', '#FFFFFF', 'flame',
    'A bank. It is very boring and it pays extremely well.',
    'Un banco. Es aburridísimo y paga extremadamente bien.', 'bank'),
  B('lays', "Lay's", 'lifestyle', 'mid', 'US', '#FFC72C', '#E4002B', 'wave',
    'Crisps. Your face on a bag, in every supermarket you ever shopped in.',
    'Patatas fritas. Tu cara en una bolsa, en cada supermercado donde compraste.', 'snack'),
];

const BY_ID = new Map(BRANDS.map(b => [b.id, b]));
export const getBrand = (id: string): Brand | undefined => BY_ID.get(id);

export const BOOT_BRANDS = BRANDS.filter(b => b.family === 'boot');
export const LIFESTYLE_BRANDS = BRANDS.filter(b => b.family === 'lifestyle');

/** Rank of a tier, high is bigger. Used for gating and for offer sizing. */
export const TIER_RANK: Record<BrandTier, number> = {
  global: 4, major: 3, mid: 2, value: 1,
};

export const CAT_LABEL: Record<LifestyleCat, [string, string]> = {
  watch: ['Watches', 'Relojes'],
  car: ['Cars', 'Coches'],
  fragrance: ['Fragrance', 'Perfume'],
  airline: ['Airline', 'Aerolínea'],
  game: ['Games', 'Videojuegos'],
  drink: ['Drinks', 'Bebidas'],
  grooming: ['Grooming', 'Cuidado personal'],
  fashion: ['Fashion', 'Moda'],
  eyewear: ['Eyewear', 'Gafas'],
  telecom: ['Telecoms', 'Telefonía'],
  bank: ['Banking', 'Banca'],
  snack: ['Snacks', 'Aperitivos'],
  audio: ['Audio', 'Audio'],
};
