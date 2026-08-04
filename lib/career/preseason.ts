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
    rarity: 'common', attrs: { tec: 3 }, when: p => p.position !== 'GK' },
  // The same card, for the one player on the pitch it made no sense for.
  { id: 'handling-drills', en: 'Handling until dark', es: 'Manos hasta que oscurece',
    descEn: 'You stay after training and let them shoot at you until you cannot feel your fingers.',
    descEs: 'Te quedas después de la práctica y dejas que te disparen hasta no sentir los dedos.',
    rarity: 'common', attrs: { tec: 3 }, when: p => p.position === 'GK' },
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
  // ---- Legend update: 20 more upgrades -------------------------------------
  { id: 'sprint-coach', en: 'Sprint coach', es: 'Entrenador de velocidad',
    descEn: 'Blocks, starts, first three steps. Over and over.',
    descEs: 'Salidas, arranques, los primeros tres pasos. Una y otra vez.',
    rarity: 'common', attrs: { pac: 4 } },
  { id: 'weight-room', en: 'Winter in the weight room', es: 'Invierno en el gimnasio',
    descEn: 'You come back a different size.', descEs: 'Vuelves con otro cuerpo.',
    rarity: 'common', attrs: { phy: 4 } },
  { id: 'wall-drills', en: 'A wall and a ball', es: 'Una pared y un balón',
    descEn: 'Two thousand touches a day against a concrete wall.',
    descEs: 'Dos mil toques por día contra una pared de cemento.',
    rarity: 'common', attrs: { tec: 4 } },
  { id: 'chess-club', en: 'You take up chess', es: 'Te da por el ajedrez',
    descEn: 'You start seeing the game three passes ahead.',
    descEs: 'Empiezas a ver el partido tres pases antes.',
    rarity: 'common', attrs: { vis: 4 } },
  { id: 'public-speaking', en: 'Public speaking course', es: 'Curso de oratoria',
    descEn: 'You learn to hold a room. The dressing room notices.',
    descEs: 'Aprendes a sostener una sala. El vestuario lo nota.',
    rarity: 'common', attrs: { lea: 4 } },
  { id: 'altitude-camp', en: 'Altitude camp', es: 'Concentración en altura',
    descEn: 'Three weeks where the air is thin. Your lungs change.',
    descEs: 'Tres semanas donde el aire falta. Tus pulmones cambian.',
    rarity: 'common', stamina: 14, attrs: { phy: 1 } },
  { id: 'ice-baths', en: 'Ice baths and sleep', es: 'Hielo y descanso',
    descEn: 'Boring, brutal, and it works.', descEs: 'Aburrido, brutal, y funciona.',
    rarity: 'common', fitness: 10, stamina: 6 },
  { id: 'youth-friendlies', en: 'Playing with the kids', es: 'Jugar con los juveniles',
    descEn: 'You dominate the reserve games and your confidence returns.',
    descEs: 'Dominas los partidos de reserva y vuelve la confianza.',
    rarity: 'common', form: 12 },
  { id: 'new-boots', en: 'Boots that finally fit', es: 'Botas que por fin te quedan',
    descEn: 'A small thing that changes your whole touch.',
    descEs: 'Una pequeña cosa que te cambia el toque entero.',
    rarity: 'common', attrs: { tec: 2, pac: 2 } },
  { id: 'diet-overhaul', en: 'The diet changes', es: 'Cambio de dieta',
    descEn: 'You arrive four kilos lighter and a second quicker.',
    descEs: 'Llegas cuatro kilos más liviano y un segundo más rápido.',
    rarity: 'common', attrs: { pac: 3 }, fitness: 6 },
  { id: 'derby-study', en: 'Studying the derby', es: 'Estudiar el clásico',
    descEn: 'You spend the summer watching one opponent only.',
    descEs: 'Te pasas el verano mirando a un solo rival.',
    rarity: 'rare', attrs: { vis: 3, lea: 2 }, idol: 3 },
  { id: 'weak-foot', en: 'The weak foot', es: 'El pie malo',
    descEn: 'A whole preseason using only the wrong one.',
    descEs: 'Una pretemporada entera usando solo el que no es.',
    rarity: 'rare', attrs: { tec: 5 } },
  { id: 'boxing-gym', en: 'Boxing in the mornings', es: 'Boxeo por las mañanas',
    descEn: 'Balance, core, and nobody shoves you off the ball again.',
    descEs: 'Equilibrio, core, y no te sacan más de la pelota.',
    rarity: 'rare', attrs: { phy: 4, lea: 2 } },
  { id: 'veteran-roommate', en: 'Rooming with the veteran', es: 'Compartir cuarto con el veterano',
    descEn: 'Forty years old, two Champions Leagues, and he talks all night.',
    descEs: 'Cuarenta años, dos Champions, y habla toda la noche.',
    rarity: 'rare', attrs: { lea: 4, vis: 2 }, morale: 5 },
  { id: 'sponsor-camp', en: 'A brand training camp', es: 'Campus de una marca',
    descEn: 'Cameras everywhere, but the coaching is genuinely elite.',
    descEs: 'Cámaras por todos lados, pero los entrenadores son de elite.',
    rarity: 'rare', attrs: { tec: 3, pac: 2 }, reputation: 5 },
  { id: 'analyst-sessions', en: 'One-to-one video sessions', es: 'Sesiones de video uno a uno',
    descEn: 'Every one of your bad decisions, frozen and explained.',
    descEs: 'Cada mala decisión tuya, congelada y explicada.',
    rarity: 'rare', attrs: { vis: 5 }, form: 4 },
  { id: 'captaincy-course', en: 'They groom you to lead', es: 'Te preparan para liderar',
    descEn: 'The club decides the next captain is you.',
    descEs: 'El club decide que el próximo capitán eres tú.',
    rarity: 'rare', attrs: { lea: 5 }, idol: 4, when: p => p.age >= 25 },
  { id: 'complete-preseason', en: 'The perfect preseason', es: 'La pretemporada perfecta',
    descEn: 'Not one session missed. Everything sharp.',
    descEs: 'Sin faltar a una sola sesión. Todo afilado.',
    rarity: 'epic', attrs: { tec: 3, pac: 3, phy: 3, vis: 3, lea: 3 } },
  { id: 'street-legend', en: 'The street tournament', es: 'El torneo del barrio',
    descEn: 'You win the summer tournament back home. The whole neighbourhood saw it.',
    descEs: 'Ganas el torneo de verano en tu barrio. Lo vio el barrio entero.',
    rarity: 'epic', attrs: { tec: 4, vis: 3 }, idol: 8, morale: 8 },
  { id: 'second-wind', en: 'A second wind', es: 'Un segundo aire',
    descEn: 'At an age where most fade, something clicks back into place.',
    descEs: 'A una edad donde la mayoría baja, algo se vuelve a encender.',
    rarity: 'epic', attrs: { pac: 4, phy: 4 }, stamina: 16, when: p => p.age >= 31 },
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
