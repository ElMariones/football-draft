// Preseason cards. Every offseason the dice deal three upgrades and you keep
// one. It's the steady drip of agency between seasons: small, permanent, and
// always a trade-off (raw attributes vs. form vs. fitness vs. the terraces).
import type { Attrs, CareerPlayer } from '@/data/career/types';
import type { Rng } from './rng';
import type { Lang } from './i18n';

export type CardRarity = 'common' | 'rare' | 'epic';

export interface PreseasonCard {
  id: string;
  en: string; es: string;
  descEn: string; descEs: string;
  rarity: CardRarity;
  attrs?: Partial<Attrs>;
  form?: number;
  fitness?: number;
  morale?: number;
  reputation?: number;
  stamina?: number;
  idol?: number;            // endears you to the current club
  minutesBias?: number;
  when?: (p: CareerPlayer) => boolean;
}

// Weight by rarity when dealing a hand.
const RARITY_W: Record<CardRarity, number> = { common: 1, rare: 0.34, epic: 0.1 };

const CARDS: PreseasonCard[] = [
  // ---- common: single-attribute gym work ----
  { id: 'gym-legs', en: 'New legs in the gym', es: 'Piernas nuevas en el gimnasio',
    descEn: 'Double sessions. You come back flying.', descEs: 'Doble turno: vuelves volando.',
    rarity: 'common', attrs: { pac: 3 } },
  { id: 'gym-bull', en: 'Bull mode', es: 'Modo toro en el gimnasio',
    descEn: 'Collisions in training until nobody can knock you down.',
    descEs: 'Choques en el gimnasio hasta que no te bajan ni con grúa.',
    rarity: 'common', attrs: { phy: 3 } },
  { id: 'finishing-drills', en: 'Finishing drills', es: 'Definición hasta que oscurece',
    descEn: 'You stay after training with a bag of balls.',
    descEs: 'Te quedas después de la práctica con una bolsa de pelotas.',
    rarity: 'common', attrs: { tec: 3 } },
  { id: 'video-room', en: 'Video room', es: 'Sala de video',
    descEn: 'You start seeing the pass two moves early.',
    descEs: 'Empiezas a ver el pase dos jugadas antes.',
    rarity: 'common', attrs: { vis: 3 } },
  { id: 'dressing-voice', en: 'A voice in the dressing room', es: 'La voz del vestuario',
    descEn: 'One day you spoke up and nobody argued.',
    descEs: 'Un día hablaste tú y nadie te lo discutió.',
    rarity: 'common', attrs: { lea: 3 } },
  { id: 'nutritionist', en: 'Nutritionist', es: 'Nutricionista',
    descEn: 'You arrive at preseason in the best shape of your life.',
    descEs: 'Llegas a la pretemporada en tu mejor forma.',
    rarity: 'common', fitness: 8, stamina: 6 },
  { id: 'preseason-tour', en: 'Preseason tour', es: 'Gira de pretemporada',
    descEn: 'Friendlies abroad, goals against tired defences, confidence up.',
    descEs: 'Amistosos fuera de casa, goles a defensas cansadas, confianza arriba.',
    rarity: 'common', form: 10, reputation: 2 },
  { id: 'club-work', en: 'Extra club work', es: 'Trabajo extra en el club',
    descEn: 'First in, last out. The staff notices.',
    descEs: 'Primero en llegar, último en irse. El cuerpo técnico lo nota.',
    rarity: 'common', minutesBias: 5, morale: 3 },

  // ---- rare: two-attribute or identity cards ----
  { id: 'street-return', en: 'Back to the street pitch', es: 'Vuelta al barrio',
    descEn: 'You go home and play on concrete with the kids. Something clicks.',
    descEs: 'Vuelves al barrio y juegas en la calle con los chicos. Algo se enciende.',
    rarity: 'rare', attrs: { tec: 4, vis: 2 }, idol: 2, morale: 5 },
  { id: 'personal-trainer', en: 'Personal trainer', es: 'Preparador personal',
    descEn: 'You hire your own staff. Expensive and worth it.',
    descEs: 'Contratas tu propio preparador. Caro y vale la pena.',
    rarity: 'rare', attrs: { pac: 3, phy: 3 }, fitness: 5 },
  { id: 'captain-armband', en: 'The armband', es: 'La cinta de capitán',
    descEn: 'The manager hands you the armband before a ball is kicked.',
    descEs: 'El técnico te da la cinta antes de que empiece nada.',
    rarity: 'rare', attrs: { lea: 5 }, idol: 3, when: p => p.age >= 22 },
  { id: 'set-pieces', en: 'Set-piece specialist', es: 'Especialista en pelota parada',
    descEn: 'Free kicks are yours now. So are the penalties.',
    descEs: 'Los tiros libres son tuyos. Los penales también.',
    rarity: 'rare', attrs: { tec: 4, lea: 2 } },
  { id: 'sports-psych', en: 'Sports psychologist', es: 'Psicólogo deportivo',
    descEn: 'You stop shrinking in the big games.',
    descEs: 'Dejas de achicarte en los partidos grandes.',
    rarity: 'rare', attrs: { lea: 4 }, morale: 8 },
  { id: 'derby-promise', en: 'A promise to the terraces', es: 'Promesa a la grada',
    descEn: 'You promise the fans the derby. They will hold you to it.',
    descEs: 'Le prometes el clásico a la gente. Te lo van a cobrar.',
    rarity: 'rare', idol: 4, form: 6 },

  // ---- epic: run-defining ----
  { id: 'magic-season', en: 'Everything clicks', es: 'Temporada mágica',
    descEn: 'One of those years where the ball simply obeys you.',
    descEs: 'Uno de esos años en que la pelota te obedece.',
    rarity: 'epic', attrs: { tec: 4, pac: 3, vis: 3 }, form: 14 },
  { id: 'iron-body', en: 'Iron body', es: 'Cuerpo de hierro',
    descEn: 'A full year without a single physical problem.',
    descEs: 'Un año entero sin un solo problema físico.',
    rarity: 'epic', attrs: { phy: 5 }, fitness: 12, stamina: 12 },
  { id: 'born-leader', en: 'Born leader', es: 'Líder nato',
    descEn: 'The club is yours now — the badge, the room, the terraces.',
    descEs: 'El club es tuyo: el escudo, el vestuario, la grada.',
    rarity: 'epic', attrs: { lea: 6, vis: 2 }, idol: 6, when: p => p.age >= 24 },
];

/** Deal a hand of preseason cards for this offseason. */
export function dealPreseason(p: CareerPlayer, rng: Rng, n = 3): PreseasonCard[] {
  const pool = CARDS.filter(c => !c.when || c.when(p));
  const hand: PreseasonCard[] = [];
  const rest = [...pool];
  for (let i = 0; i < n && rest.length; i++) {
    const pick = rng.weighted(rest, c => RARITY_W[c.rarity]);
    hand.push(pick);
    rest.splice(rest.indexOf(pick), 1);
  }
  return hand;
}

export function getCard(id: string): PreseasonCard | null {
  return CARDS.find(c => c.id === id) ?? null;
}

export function cardName(c: PreseasonCard, lang: Lang): string {
  return lang === 'es' ? c.es : c.en;
}
export function cardDesc(c: PreseasonCard, lang: Lang): string {
  return lang === 'es' ? c.descEs : c.descEn;
}

/** Short "+3 Pace" style chips for the card face. */
export function cardChips(c: PreseasonCard, lang: Lang): string[] {
  const es = lang === 'es';
  const out: string[] = [];
  const A: Record<string, [string, string]> = {
    tec: ['Technique', 'Técnica'], pac: ['Pace', 'Velocidad'], phy: ['Physical', 'Físico'],
    vis: ['Vision', 'Visión'], lea: ['Leadership', 'Liderazgo'],
  };
  for (const [k, v] of Object.entries(c.attrs ?? {})) {
    if (v) out.push(`+${v} ${es ? A[k][1] : A[k][0]}`);
  }
  if (c.form) out.push(`+${c.form} ${es ? 'Forma' : 'Form'}`);
  if (c.fitness) out.push(`+${c.fitness} ${es ? 'Estado' : 'Fitness'}`);
  if (c.stamina) out.push(`+${c.stamina} ${es ? 'Resistencia' : 'Stamina'}`);
  if (c.morale) out.push(`+${c.morale} ${es ? 'Ánimo' : 'Morale'}`);
  if (c.reputation) out.push(`+${c.reputation} ${es ? 'Fama' : 'Fame'}`);
  if (c.idol) out.push(`+${c.idol} ${es ? 'Idolatría' : 'Idolatry'}`);
  if (c.minutesBias) out.push(`+${c.minutesBias} ${es ? 'Minutos' : 'Minutes'}`);
  return out;
}
