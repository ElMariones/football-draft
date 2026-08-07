// The deal.
//
// Every player holds at most one boot deal at a time, and it behaves like a
// contract rather than a purchase: it has a length, it pays every season, it
// gets better or worse depending on how the football is going, and when it runs
// out somebody either renews it or they don't.
//
// The whole system hangs off one number — `marketability` — which is what the
// brands actually see. It is deliberately not the same thing as `overall`: a
// 90-rated centre-back in the Argentine league is a wonderful footballer and a
// mediocre advertisement, and an 84-rated forward at Real Madrid who has just
// won a Ballon d'Or is the opposite. Everything gates off it, so nobody offers a
// tour of Japan to a squad player at Chaco For Ever.
import type {
  CareerPlayer, Title, DealTier, SponsorState, SponsorSpell,
} from '@/data/career/types';
import { getClub } from '@/data/career/clubs';
import { getLeague } from '@/data/career/leagues';
import { getNation } from '@/data/career/nations';
import {
  BOOT_BRANDS, LIFESTYLE_BRANDS, getBrand, TIER_RANK,
  type Brand, type BrandTier,
} from '@/data/career/brands';
import { Rng, clamp } from './rng';
import type { Lang } from './i18n';

// `DealTier`, `SponsorState` and `SponsorSpell` live in data/career/types.ts
// with the rest of the player's state; re-exported here so callers can take
// everything about the deal from one place.
export type { DealTier, SponsorState, SponsorSpell };

export const DEAL_RANK: Record<DealTier, number> = {
  kit: 0, squad: 1, silo: 2, signature: 3, global: 4,
};

export const DEAL_LABEL: Record<DealTier, [string, string]> = {
  kit: ['Boots only', 'Solo botas'],
  squad: ['Squad deal', 'Contrato de plantilla'],
  silo: ['Silo athlete', 'Atleta de gama'],
  signature: ['Signature boot', 'Bota propia'],
  global: ['Global face', 'Imagen global'],
};

export const DEAL_BLURB: Record<DealTier, [string, string]> = {
  kit: ['They send you boots. That is the entire arrangement.',
        'Te mandan botas. Ese es todo el acuerdo.'],
  squad: ['A retainer, two shoots a year, and your name on a list somewhere.',
          'Un fijo, dos sesiones al año y tu nombre en una lista.'],
  silo: ['You are the face of one of their boot lines. Catalogue, posters, the lot.',
         'Eres la cara de una de sus gamas. Catálogo, carteles, todo.'],
  signature: ['Your own boot, with your name on the box.',
              'Tu propia bota, con tu nombre en la caja.'],
  global: ['You are what the brand looks like. There is no rung above this one.',
           'Eres el aspecto de la marca. No hay escalón por encima.'],
};


export interface BootOffer {
  brandId: string;
  tier: DealTier;
  annual: number;
  years: number;
  /** a renewal from the brand you are already with */
  renewal: boolean;
  /** short reason this offer exists, shown on the card */
  hookEn: string;
  hookEs: string;
}

// ---- what the brands see -----------------------------------------------------

const BIG_KEYS = new Set([
  'league', 'champions', 'libertadores', 'world-cup', 'euro', 'copa-america',
  'asian-cup', 'afcon', 'gold-cup',
]);
const RECORD_KEYS = new Set([
  'club-top-scorer', 'club-most-apps', 'nation-top-scorer', 'nation-most-caps',
]);

/**
 * How sellable you are, 0-100.
 *
 * Ability is only about half of it. Where you play, who watches that league,
 * whether anybody outside your country has heard of you, and whether you have
 * won the one award that non-football people have heard of all matter as much
 * as the football does — which is exactly why a brand system is worth having.
 */
export function marketability(p: CareerPlayer, trophies: Title[]): number {
  const club = p.clubId ? getClub(p.clubId) : null;
  const league = club ? getLeague(club.leagueId) : null;
  const nation = getNation(p.ntNationCode);

  const big = trophies.filter(t => BIG_KEYS.has(t.key)).length;
  const records = trophies.filter(t => RECORD_KEYS.has(t.key)).length;
  const ballon = p.ballonWins ?? 0;

  // A shop window matters more than almost anything else. The tier-1 leagues are
  // televised everywhere; a tier-4 league is televised in one country.
  const stage = league
    ? (league.tier === 1 ? 13 : league.tier === 2 ? 6 : league.tier === 3 ? -2 : -9)
    : -12;
  const shirt = club ? clamp(-4, 9, (club.strength - 74) * 0.55) : -4;

  // Attackers sell boots. This is not editorial, it is what the market does.
  const posLift = p.position === 'ST' || p.position === 'LW' || p.position === 'RW'
    || p.position === 'CAM' ? 5
    : p.position === 'GK' ? -4 : 0;

  const raw =
    (p.overall - 64) * 1.15
    + p.reputation * 0.22
    + stage + shirt + posLift
    + Math.min(14, ballon * 5)
    + Math.min(9, big * 1.1)
    + Math.min(5, records * 1.7)
    + Math.min(5, (p.ntCaps ?? 0) * 0.045)
    + clamp(-3, 3, ((nation?.strength ?? 60) - 68) * 0.1);

  // Everything above the knee is compressed hard. Without this the terms simply
  // add up and any good career pins at 100, which makes every gate meaningless
  // and hands a global campaign to a solid international. The top of this scale
  // has to stay expensive: 90 should mean the best-known footballer alive.
  return Math.round(clamp(0, 100, raw <= KNEE ? raw : KNEE + (raw - KNEE) * 0.5));
}

const KNEE = 82;

/** The biggest brand tier that would return your agent's call. */
export function reachableTier(m: number): BrandTier {
  if (m >= 84) return 'global';
  if (m >= 66) return 'major';
  if (m >= 44) return 'mid';
  return 'value';
}

/** The best rung a brand of this size would put you on. */
export function dealTierFor(brand: Brand, m: number): DealTier {
  const rank = TIER_RANK[brand.tier];
  // The top rung is deliberately almost unreachable. There are two or three of
  // these in the world at any one time and there should be two or three here.
  if (brand.tier === 'global' && m >= 92) return 'global';
  // A mid-size brand will hand a signature boot to somebody the big two would
  // not — it is the only way they ever get one. It costs them everything.
  if (m >= 76 && rank >= 3) return 'signature';
  if (m >= 84 && rank === 2) return 'signature';
  if (m >= 54) return 'silo';
  if (m >= 28) return 'squad';
  return 'kit';
}

const ANNUAL: Record<DealTier, [number, number]> = {
  kit: [0, 0],
  squad: [120_000, 450_000],
  silo: [700_000, 2_200_000],
  signature: [2_800_000, 7_000_000],
  global: [8_000_000, 15_000_000],
};

/** What a brand of this size pays for that rung. */
export function offerMoney(brand: Brand, tier: DealTier, m: number, rng: Rng): number {
  const [lo, hi] = ANNUAL[tier];
  if (hi === 0) return 0;
  // How far into the band you are is your marketability inside the rung, and
  // bigger brands simply pay more for the same rung.
  const within = clamp(0, 1, (m - 30) / 65);
  const tierBump = 0.78 + TIER_RANK[brand.tier] * 0.09;
  const noise = 0.88 + rng.next() * 0.28;
  const v = (lo + (hi - lo) * within) * tierBump * noise;
  return Math.round(v / 10_000) * 10_000;
}

function yearsFor(brand: Brand, tier: DealTier, rng: Rng): number {
  if (tier === 'kit') return 2 + rng.int(2);
  const base = TIER_RANK[brand.tier] >= 3 ? 4 : 3;
  return base + rng.int(2);
}

// ---- offers ------------------------------------------------------------------

const L = (lang: Lang, en: string, es: string) => (lang === 'es' ? es : en);

function hookFor(brand: Brand, tier: DealTier, renewal: boolean): [string, string] {
  if (renewal) {
    return ['They want to keep you, and they have improved it.',
            'Quieren seguir contigo, y lo han mejorado.'];
  }
  switch (tier) {
    case 'global': return ['They want to build the whole brand around you.',
                           'Quieren construir la marca entera alrededor de ti.'];
    case 'signature': return ['They are offering you a boot with your name on it.',
                              'Te ofrecen una bota con tu nombre.'];
    case 'silo': return ['You would be the face of one of their lines.',
                         'Serías la cara de una de sus gamas.'];
    case 'squad': return ['A modest retainer and a couple of shoots a year.',
                          'Un fijo modesto y un par de sesiones al año.'];
    default: return [brand.tier === 'value'
      ? 'Free boots, every season, in your size.'
      : 'Free boots and a foot in the door.',
      brand.tier === 'value'
        ? 'Botas gratis, cada temporada, de tu número.'
        : 'Botas gratis y un pie dentro.'];
  }
}

/**
 * Who is bidding.
 *
 * Brands whose reach is far above you do not appear at all — that is the whole
 * point of the gate. Brands one rung below you appear more often, because they
 * are the ones who have to chase, and they are the ones who overpay.
 */
export function generateBootOffers(
  p: CareerPlayer, trophies: Title[], rng: Rng,
  opts: { renewFrom?: SponsorState; m?: number } = {},
): BootOffer[] {
  const m = opts.m ?? marketability(p, trophies);
  const ceiling = TIER_RANK[reachableTier(m)];
  const nationHome = p.nationCode;

  const pool = BOOT_BRANDS.filter(b => {
    const r = TIER_RANK[b.tier];
    if (r > ceiling) return false;
    // Nobody two full rungs below your level bothers any more — a global face
    // is not fielding calls from Lotto.
    if (ceiling - r >= 3) return false;
    return true;
  });

  // Brands at your own level are the ones who actually come for you; the ones
  // below appear as the outsider who has to overpay, and get rarer the further
  // below they are. Weighting them *up* meant the pool filled with value brands
  // at every level and the big two signed almost nobody.
  //
  // A brand from your own country is the exception, and comes for you a rung
  // earlier than it otherwise would. Joma really does sign Spaniards nobody
  // else has called.
  const weighted = pool.map(b => {
    const gap = ceiling - TIER_RANK[b.tier];
    return {
      b,
      w: (b.home === nationHome ? 1.9 : 1)
        * (gap === 0 ? 2.4 : gap === 1 ? 1 : 0.35)
        * (opts.renewFrom?.brandId === b.id ? 0 : 1),
    };
  });

  const picked: Brand[] = [];
  const bag = [...weighted];
  const want = Math.min(3, bag.length);
  while (picked.length < want && bag.length) {
    const total = bag.reduce((a, x) => a + x.w, 0);
    if (total <= 0) break;
    let r = rng.next() * total;
    let idx = 0;
    for (; idx < bag.length; idx++) { r -= bag[idx].w; if (r <= 0) break; }
    picked.push(bag[Math.min(idx, bag.length - 1)].b);
    bag.splice(Math.min(idx, bag.length - 1), 1);
  }

  const offers: BootOffer[] = [];

  // The renewal goes first, and it is priced off standing: a brand that has
  // enjoyed having you pays over the odds to keep you.
  if (opts.renewFrom) {
    const cur = getBrand(opts.renewFrom.brandId);
    if (cur) {
      const tier = dealTierFor(cur, m);
      const loyal = 0.9 + (opts.renewFrom.standing / 100) * 0.45;
      const [hookEn, hookEs] = hookFor(cur, tier, true);
      offers.push({
        brandId: cur.id, tier, renewal: true,
        annual: Math.round(offerMoney(cur, tier, m, rng) * loyal / 10_000) * 10_000,
        years: yearsFor(cur, tier, rng),
        hookEn, hookEs,
      });
    }
  }

  for (const b of picked) {
    const tier = dealTierFor(b, m);
    const [hookEn, hookEs] = hookFor(b, tier, false);
    // A brand below your ceiling has to beat the market to get you.
    const chase = TIER_RANK[b.tier] < ceiling ? 1.1 : 1;
    offers.push({
      brandId: b.id, tier, renewal: false,
      annual: Math.round(offerMoney(b, tier, m, rng) * chase / 10_000) * 10_000,
      years: yearsFor(b, tier, rng),
      hookEn, hookEs,
    });
  }

  return offers.sort((a, b) => b.annual - a.annual).slice(0, 4);
}

export function signDeal(o: BootOffer, year: number, prev?: SponsorState | null): SponsorState {
  return {
    brandId: o.brandId, tier: o.tier, yearsLeft: o.years, annual: o.annual,
    signedYear: year, earned: 0,
    // A renewal carries the relationship over. A new brand starts you neutral.
    standing: prev && prev.brandId === o.brandId ? prev.standing : 55,
    // Signing for the rung is not the same as the boot existing: the launch is
    // its own event, and it is the moment worth playing.
    signature: prev?.brandId === o.brandId ? prev.signature : false,
    done: prev?.brandId === o.brandId ? [...prev.done] : [],
  };
}

// ---- what a season does to it ------------------------------------------------

export interface SponsorSeason {
  apps: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  titles: number;
  bigTitles: number;
  rating: number;
}

/**
 * Standing after a season.
 *
 * A brand does not read your average rating. It notices whether you played,
 * whether you were in the pictures that got printed, and whether anybody had to
 * apologise for you.
 */
export function standingAfter(p: CareerPlayer, s: SponsorSeason, cur: number): number {
  const played = clamp(-14, 8, (s.apps - 20) * 0.7);
  const output = p.position === 'GK'
    ? clamp(0, 9, s.cleanSheets * 0.7)
    : clamp(0, 11, (s.goals + s.assists * 0.6) * 0.5);
  const silver = Math.min(12, s.titles * 3 + s.bigTitles * 3);
  const conduct = p.discipline < 40 ? -6 : p.discipline > 78 ? 2 : 0;
  // Everything drifts back toward the middle, so one good year does not buy you
  // a decade of goodwill and one bad one does not end you.
  const drift = (55 - cur) * 0.12;
  return Math.round(clamp(0, 100, cur + played + output + silver + conduct + drift));
}

/** What the deal actually pays this season, guarantee plus performance. */
export function sponsorIncome(sp: SponsorState): number {
  if (sp.annual <= 0) return 0;
  const perf = 0.85 + (sp.standing / 100) * 0.4;
  return Math.round((sp.annual * perf) / 10_000) * 10_000;
}

/** What your marketability has to be for a brand to keep you on this rung. */
const RUNG_NEEDS: Record<DealTier, number> = {
  kit: 0, squad: 18, silo: 42, signature: 62, global: 78,
};

/**
 * Would they walk away at the end of this deal?
 *
 * Two ways to lose a boot deal, and either is enough on its own: they stop
 * enjoying having you, or you stop being the player they signed. The second is
 * the one that ends most of them — nobody keeps paying signature money to
 * somebody the market now prices as a squad player.
 */
export function wouldDrop(sp: SponsorState, m: number): boolean {
  if (sp.standing < 25) return true;
  return sp.standing < 45 && m < RUNG_NEEDS[sp.tier] - 8;
}

// ---- lifestyle ---------------------------------------------------------------

/** Lifestyle brands that would plausibly call someone at this level. */
export function lifestyleFor(p: CareerPlayer, m: number, held: string[]): Brand[] {
  return LIFESTYLE_BRANDS.filter(b => {
    if (held.includes(b.id)) return false;
    const r = TIER_RANK[b.tier];
    if (r === 4) return m >= 78;
    if (r === 3) return m >= 62;
    // The small ones are local: a phone company or a crisp brand at home will
    // take a player nobody outside his own country has heard of.
    return m >= 34 || b.home === p.nationCode;
  });
}

export const LIFESTYLE_ANNUAL: Record<BrandTier, [number, number]> = {
  global: [2_400_000, 7_000_000],
  major: [900_000, 2_600_000],
  mid: [180_000, 800_000],
  value: [60_000, 220_000],
};

export function lifestyleMoney(b: Brand, m: number, rng: Rng): number {
  const [lo, hi] = LIFESTYLE_ANNUAL[b.tier];
  const within = clamp(0, 1, (m - 35) / 60);
  const v = (lo + (hi - lo) * within) * (0.88 + rng.next() * 0.26);
  return Math.round(v / 10_000) * 10_000;
}

// ---- copy --------------------------------------------------------------------

export const dealLabel = (t: DealTier, lang: Lang) => DEAL_LABEL[t][lang === 'es' ? 1 : 0];
export const dealBlurb = (t: DealTier, lang: Lang) => DEAL_BLURB[t][lang === 'es' ? 1 : 0];

export function offerHook(o: BootOffer, lang: Lang) {
  return lang === 'es' ? o.hookEs : o.hookEn;
}

/** "€6.2M a year · 4 years", or just the length when there is no fee at all. */
export function offerSummary(o: BootOffer, lang: Lang): string {
  const es = lang === 'es';
  const years = es
    ? `${o.years} año${o.years === 1 ? '' : 's'}`
    : `${o.years} year${o.years === 1 ? '' : 's'}`;
  // "no fee a year" is not a sentence. A boots-only deal has no annual to quote.
  if (o.annual <= 0) return `${L(lang, 'No fee', 'Sin fijo')} · ${years}`;
  return es
    ? `${fmtMoney(o.annual)} al año · ${years}`
    : `${fmtMoney(o.annual)} a year · ${years}`;
}

export function fmtMoney(n: number): string {
  const a = Math.abs(n);
  const s = a >= 1_000_000 ? `€${(a / 1_000_000).toFixed(1)}M`
    : a >= 1_000 ? `€${Math.round(a / 1000)}K` : `€${a}`;
  return n < 0 ? `−${s}` : s;
}

/**
 * What a brand sees in a sixteen-year-old.
 *
 * Nobody signs a teenager for what he is today. Scouts sign the gap between
 * what he is and what the club thinks he becomes, which is why a wonderkid gets
 * a call from somebody real before he has played a professional match and a
 * good-but-ordinary academy player gets a box of boots and a handshake.
 */
export function youthMarketability(p: CareerPlayer): number {
  const upside = Math.max(0, p.potential - p.overall);
  return Math.round(clamp(0, 100,
    (p.overall - 56) * 1.1 + upside * 0.85 + (p.wonderkid ? 14 : 0)
    + clamp(-2, 4, ((getNation(p.nationCode)?.strength ?? 60) - 68) * 0.1)));
}

/** How the market describes you, for the panel. */
export function marketLabel(m: number, lang: Lang): string {
  const es = lang === 'es';
  if (m >= 88) return es ? 'Icono global' : 'Global icon';
  if (m >= 76) return es ? 'Estrella internacional' : 'International star';
  if (m >= 62) return es ? 'Nombre conocido' : 'Household name';
  if (m >= 46) return es ? 'Titular reconocible' : 'Recognisable starter';
  if (m >= 30) return es ? 'Profesional' : 'Working professional';
  return es ? 'Desconocido' : 'Unknown';
}
