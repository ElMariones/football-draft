// The shop. Wages are otherwise a number that does nothing; here they convert
// into career. Staff are permanent multipliers on how you train and recover;
// vanity buys nothing but the story you tell at the end (and the terraces
// notice when a kid from the barrio buys his parents a house).
import type { Attrs, CareerPlayer } from '@/data/career/types';
import type { Lang } from './i18n';

export type ShopKind = 'staff' | 'medical' | 'brand' | 'vanity';

/** Order the tabs appear in, and what each one is for. */
export const SHOP_KINDS: ShopKind[] = ['staff', 'medical', 'brand', 'vanity'];
export const KIND_LABEL: Record<ShopKind, { en: string; es: string }> = {
  staff: { en: 'Backroom', es: 'Cuerpo técnico' },
  medical: { en: 'Body', es: 'Cuerpo' },
  brand: { en: 'Brand', es: 'Marca' },
  vanity: { en: 'Life', es: 'Vida' },
};
export const KIND_BLURB: Record<ShopKind, { en: string; es: string }> = {
  staff: {
    en: 'People who make you better at football. Permanent.',
    es: 'Gente que te hace mejor jugador. Permanente.',
  },
  medical: {
    en: 'Stay on the pitch. Fitness, stamina, and fewer weeks lost.',
    es: 'Seguir en la cancha. Estado, resistencia y menos semanas perdidas.',
  },
  brand: {
    en: 'Fame is leverage: bigger clubs notice, and your country picks you sooner.',
    es: 'La fama es palanca: los clubes grandes te miran y tu selección te llama antes.',
  },
  vanity: {
    en: 'Buys nothing but the story you tell at the end.',
    es: 'No compra nada salvo la historia que cuentas al final.',
  },
};

export interface ShopItem {
  id: string;
  kind: ShopKind;
  emoji: string;
  en: string; es: string;
  price: number;
  attrs?: Partial<Attrs>;
  fitness?: number;
  stamina?: number;
  morale?: number;
  reputation?: number;
  idol?: number;
  /** permanent cut to how long injuries keep you out, 0-1 */
  injuryResist?: number;
  /** permanent bonus to the yearly wage, as a multiplier above 1 */
  wageBoost?: number;
  /** one line explaining what it actually does, shown on the card */
  effEn?: string; effEs?: string;
  /** only offered once your name is worth something */
  minReputation?: number;
  /** narrative line for the summary */
  legacyEn?: string; legacyEs?: string;
}

export const SHOP: ShopItem[] = [
  // ---- backroom: permanent attribute gains ----
  { id: 'trainer', kind: 'staff', emoji: '🏋️', en: 'Personal trainer', es: 'Preparador físico',
    price: 400_000, attrs: { pac: 3, phy: 2 },
    effEn: 'Faster and stronger, for good.', effEs: 'Más rápido y más fuerte, para siempre.' },
  { id: 'analyst', kind: 'staff', emoji: '📊', en: 'Data analyst', es: 'Analista de datos',
    price: 700_000, attrs: { vis: 4 },
    effEn: 'You see the pass a beat earlier.', effEs: 'Ves el pase un tiempo antes.' },
  { id: 'shooting-coach', kind: 'staff', emoji: '🎯', en: 'Shooting coach', es: 'Entrenador de definición',
    price: 900_000, attrs: { tec: 4 },
    effEn: 'Technique, drilled every morning.', effEs: 'Técnica, entrenada cada mañana.' },
  { id: 'mentor', kind: 'staff', emoji: '🧠', en: 'Veteran mentor', es: 'Mentor veterano',
    price: 1_200_000, attrs: { lea: 4 }, morale: 8,
    effEn: 'Someone who has been through it all.', effEs: 'Alguien que ya pasó por todo.' },
  { id: 'set-piece-coach', kind: 'staff', emoji: '⚽', en: 'Set-piece coach', es: 'Entrenador de pelota parada',
    price: 1_600_000, attrs: { tec: 3, vis: 3 },
    effEn: 'Free kicks stop being a lottery.', effEs: 'Los tiros libres dejan de ser lotería.' },
  { id: 'psych', kind: 'staff', emoji: '🧘', en: 'Sports psychologist', es: 'Psicólogo deportivo',
    price: 2_000_000, attrs: { lea: 3 }, morale: 15,
    effEn: 'Bad runs stop spiralling.', effEs: 'Las malas rachas dejan de hundirte.' },
  { id: 'private-coach', kind: 'staff', emoji: '🎓', en: 'Private coach', es: 'Entrenador privado',
    price: 4_500_000, attrs: { tec: 3, pac: 3, phy: 3, vis: 3 },
    effEn: 'Every part of your game, at once.', effEs: 'Todo tu juego, a la vez.' },

  // ---- body: availability, which is the quiet career-maker ----
  { id: 'chef', kind: 'medical', emoji: '🧑‍🍳', en: 'Personal chef', es: 'Cocinero personal',
    price: 200_000, fitness: 6, stamina: 8,
    effEn: 'You finish seasons the way you start them.', effEs: 'Terminas las temporadas como las empiezas.' },
  { id: 'physio', kind: 'medical', emoji: '💆', en: 'Private physio', es: 'Kinesiólogo propio',
    price: 500_000, attrs: { phy: 3 }, stamina: 10, injuryResist: 0.15,
    effEn: 'Knocks heal in days, not weeks.', effEs: 'Los golpes se curan en días, no semanas.' },
  { id: 'sleep-lab', kind: 'medical', emoji: '🛌', en: 'Sleep lab', es: 'Laboratorio del sueño',
    price: 1_500_000, fitness: 10, stamina: 12, attrs: { phy: 2 },
    effEn: 'Recovery while you do nothing.', effEs: 'Recuperación mientras no haces nada.' },
  { id: 'cryo', kind: 'medical', emoji: '🧊', en: 'Cryotherapy chamber', es: 'Cámara de crioterapia',
    price: 3_000_000, stamina: 14, injuryResist: 0.2,
    effEn: 'Three games a week stops hurting.', effEs: 'Tres partidos por semana dejan de doler.' },
  { id: 'surgeon', kind: 'medical', emoji: '🩺', en: 'Surgeon on retainer', es: 'Cirujano de cabecera',
    price: 6_000_000, injuryResist: 0.35, fitness: 8,
    effEn: 'The best hands in the world, on call.', effEs: 'Las mejores manos del mundo, a tu disposición.' },

  // ---- brand: fame compounds into moves and call-ups ----
  { id: 'agent', kind: 'brand', emoji: '🤝', en: 'A serious agent', es: 'Un representante serio',
    price: 800_000, reputation: 8, wageBoost: 0.15,
    effEn: 'Better contracts, and the phone rings more.', effEs: 'Mejores contratos, y el teléfono suena más.' },
  { id: 'boot-deal', kind: 'brand', emoji: '👟', en: 'Boot sponsorship', es: 'Contrato de botines',
    price: 1_500_000, reputation: 10, wageBoost: 0.25, minReputation: 50,
    effEn: 'Your name on a boot in every shop window.', effEs: 'Tu nombre en un botín en cada vidriera.' },
  { id: 'pr', kind: 'brand', emoji: '📣', en: 'PR team', es: 'Equipo de prensa',
    price: 2_500_000, reputation: 12, morale: 6, minReputation: 60,
    effEn: 'The bad weeks never reach the papers.', effEs: 'Las malas semanas no llegan a los diarios.' },
  { id: 'docu', kind: 'brand', emoji: '🎬', en: 'Documentary crew', es: 'Documental sobre ti',
    price: 5_000_000, reputation: 18, minReputation: 72,
    effEn: 'Everyone thinks they know you now.', effEs: 'Ahora todos creen que te conocen.',
    legacyEn: 'a documentary people still quote', legacyEs: 'un documental que todavía citan' },

  // ---- life: pure story, plus what the terraces make of it ----
  { id: 'car', kind: 'vanity', emoji: '🏎️', en: 'Sports car', es: 'Auto deportivo',
    price: 400_000, reputation: 3,
    legacyEn: 'a car the whole neighbourhood came out to see',
    legacyEs: 'un auto que salió a ver todo el barrio' },
  { id: 'family-house', kind: 'vanity', emoji: '🏠', en: "Your parents' house", es: 'La casa de tus viejos',
    price: 900_000, morale: 12, idol: 4,
    legacyEn: "your parents' house, bought and paid for",
    legacyEs: 'la casa de tus viejos, comprada y escriturada' },
  { id: 'pitch', kind: 'vanity', emoji: '🥅', en: 'A pitch for your old club', es: 'Una cancha para el club del barrio',
    price: 2_200_000, idol: 10, reputation: 5,
    legacyEn: 'a floodlit pitch at the club that raised you',
    legacyEs: 'una cancha con luces en el club que te crió' },
  { id: 'academy', kind: 'vanity', emoji: '🏫', en: 'A youth academy', es: 'Una escuelita de fútbol',
    price: 6_000_000, idol: 18, reputation: 8, morale: 8,
    legacyEn: 'an academy with three hundred kids in it',
    legacyEs: 'una escuelita con trescientos pibes adentro' },
  { id: 'mansion', kind: 'vanity', emoji: '🏰', en: 'Mansion', es: 'Mansión',
    price: 7_000_000, reputation: 6,
    legacyEn: 'a house with more rooms than you can use',
    legacyEs: 'una casa con más cuartos de los que puedes usar' },
  { id: 'foundation', kind: 'vanity', emoji: '💙', en: 'Your own foundation', es: 'Tu propia fundación',
    price: 12_000_000, idol: 25, reputation: 12,
    legacyEn: 'a foundation that outlived your career',
    legacyEs: 'una fundación que sobrevivió a tu carrera' },
  { id: 'jet', kind: 'vanity', emoji: '✈️', en: 'Private jet', es: 'Jet privado',
    price: 22_000_000, reputation: 10,
    legacyEn: 'a jet with your number on the tail',
    legacyEs: 'un jet con tu número en la cola' },
  { id: 'island', kind: 'vanity', emoji: '🏝️', en: 'An island', es: 'Una isla',
    price: 60_000_000, reputation: 15, morale: 10,
    legacyEn: 'an island nobody can pronounce',
    legacyEs: 'una isla que nadie sabe pronunciar' },

];

export function getItem(id: string): ShopItem | null {
  return SHOP.find(i => i.id === id) ?? null;
}
export function itemName(i: ShopItem, lang: Lang): string {
  return lang === 'es' ? i.es : i.en;
}
export function owns(p: CareerPlayer, id: string): boolean {
  return (p.owned ?? []).includes(id);
}
/** Some brand deals only exist once your name is worth something. */
export function isUnlocked(p: CareerPlayer, i: ShopItem): boolean {
  return i.minReputation === undefined || p.reputation >= i.minReputation;
}
export function canAfford(p: CareerPlayer, i: ShopItem): boolean {
  return (p.money ?? 0) >= i.price && !owns(p, i.id) && isUnlocked(p, i);
}

/** Total injury reduction bought, 0-1. */
export function injuryResistOf(p: CareerPlayer): number {
  let r = 0;
  for (const id of p.owned ?? []) r += getItem(id)?.injuryResist ?? 0;
  return Math.min(0.7, r);
}
/** Wage multiplier bought, >= 1. */
export function wageMultiplierOf(p: CareerPlayer): number {
  let m = 1;
  for (const id of p.owned ?? []) m += getItem(id)?.wageBoost ?? 0;
  return m;
}

/** Yearly wage, driven by value and league standing. Feeds the shop. */
export function seasonWage(value: number, clubStrength: number, apps: number): number {
  const base = value * 0.11;
  const standing = 0.6 + clubStrength / 140;
  const played = 0.4 + Math.min(1, apps / 30) * 0.6;
  return Math.round((base * standing * played) / 10_000) * 10_000;
}

/** Vanity lines for the end-of-career epilogue. */
export function patrimony(p: CareerPlayer, lang: Lang): string[] {
  return (p.owned ?? [])
    .map(getItem)
    .filter((i): i is ShopItem => !!i && i.kind === 'vanity')
    .map(i => (lang === 'es' ? i.legacyEs : i.legacyEn) ?? '')
    .filter(Boolean);
}
