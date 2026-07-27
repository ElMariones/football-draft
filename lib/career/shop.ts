// The shop. Wages are otherwise a number that does nothing; here they convert
// into career. Staff are permanent multipliers on how you train and recover;
// vanity buys nothing but the story you tell at the end (and the terraces
// notice when a kid from the barrio buys his parents a house).
import type { Attrs, CareerPlayer } from '@/data/career/types';
import type { Lang } from './i18n';

export type ShopKind = 'staff' | 'vanity';

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
  /** narrative line for the summary */
  legacyEn?: string; legacyEs?: string;
}

export const SHOP: ShopItem[] = [
  // ---- staff: real, permanent career gains ----
  { id: 'chef', kind: 'staff', emoji: '🧑‍🍳', en: 'Personal chef', es: 'Cocinero personal',
    price: 250_000, fitness: 6, stamina: 8 },
  { id: 'physio', kind: 'staff', emoji: '💆', en: 'Private physio', es: 'Kinesiólogo propio',
    price: 600_000, attrs: { phy: 3 }, stamina: 10 },
  { id: 'trainer', kind: 'staff', emoji: '🏋️', en: 'Personal trainer', es: 'Preparador físico',
    price: 900_000, attrs: { pac: 3, phy: 2 } },
  { id: 'analyst', kind: 'staff', emoji: '📊', en: 'Data analyst', es: 'Analista de datos',
    price: 1_200_000, attrs: { vis: 4 } },
  { id: 'shooting-coach', kind: 'staff', emoji: '🎯', en: 'Shooting coach', es: 'Entrenador de definición',
    price: 1_500_000, attrs: { tec: 4 } },
  { id: 'mentor', kind: 'staff', emoji: '🧠', en: 'Veteran mentor', es: 'Mentor veterano',
    price: 2_000_000, attrs: { lea: 4 }, morale: 8 },
  { id: 'sleep-lab', kind: 'staff', emoji: '🛌', en: 'Sleep lab', es: 'Laboratorio del sueño',
    price: 3_000_000, fitness: 10, stamina: 12, attrs: { phy: 2 } },

  // ---- vanity: pure story ----
  { id: 'car', kind: 'vanity', emoji: '🏎️', en: 'Sports car', es: 'Auto deportivo',
    price: 500_000, reputation: 3,
    legacyEn: 'a car the whole neighbourhood came out to see',
    legacyEs: 'un auto que salió a ver todo el barrio' },
  { id: 'family-house', kind: 'vanity', emoji: '🏠', en: "Your parents' house", es: 'La casa de tus viejos',
    price: 1_000_000, morale: 12, idol: 4,
    legacyEn: "your parents' house, bought and paid for",
    legacyEs: 'la casa de tus viejos, comprada y escriturada' },
  { id: 'pitch', kind: 'vanity', emoji: '🥅', en: 'A pitch for your old club', es: 'Una cancha para el club del barrio',
    price: 2_500_000, idol: 10, reputation: 5,
    legacyEn: 'a floodlit pitch at the club that raised you',
    legacyEs: 'una cancha con luces en el club que te crió' },
  { id: 'mansion', kind: 'vanity', emoji: '🏰', en: 'Mansion', es: 'Mansión',
    price: 8_000_000, reputation: 6,
    legacyEn: 'a house with more rooms than you can use',
    legacyEs: 'una casa con más cuartos de los que puedes usar' },
  { id: 'jet', kind: 'vanity', emoji: '✈️', en: 'Private jet', es: 'Jet privado',
    price: 25_000_000, reputation: 10,
    legacyEn: 'a jet with your number on the tail',
    legacyEs: 'un jet con tu número en la cola' },
];

export function getItem(id: string): ShopItem | null {
  return SHOP.find(i => i.id === id) ?? null;
}
export function itemName(i: ShopItem, lang: Lang): string {
  return lang === 'es' ? i.es : i.en;
}
export function canAfford(p: CareerPlayer, i: ShopItem): boolean {
  return (p.money ?? 0) >= i.price && !(p.owned ?? []).includes(i.id);
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
