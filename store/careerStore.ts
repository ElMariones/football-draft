'use client';

import { create } from 'zustand';
import type { Position } from '@/data/types';
import type {
  CareerPlayer, CareerEvent, ClubOffer, SeasonRecord, Title, Foot,
} from '@/data/career/types';
import { NATIONS } from '@/data/career/nations';
import { getClub } from '@/data/career/clubs';
import { getLeague } from '@/data/career/leagues';
import { makeRng, Rng, randomSeed, clamp } from '@/lib/career/rng';
import { CAREER, declineByAge } from '@/lib/career/config';
import {
  createPlayer, simulateSeason, applyProgression, SeasonOutput,
} from '@/lib/career/engine';
import { rollClubTitles, rollInternational, isBigTitle } from '@/lib/career/titles';
import { rollAwards } from '@/lib/career/awards';
import {
  generateYouthOffers, generateLoanOffers, generateTransferOffers,
  fillForcedSlots, roleBiasFor,
} from '@/lib/career/offers';
import { buildEventDeck, selectEvent, applyEffects } from '@/lib/career/events';
import { transferHeadline } from '@/lib/career/flavor';
import type { Lang } from '@/lib/career/i18n';

export type CareerPhase =
  | 'landing' | 'wizard' | 'career' | 'retire-decision' | 'summary';

interface Offseason {
  event: CareerEvent | null;
  eventResolved: boolean;
  eventBadges: string[];        // outcome badges shown after resolving
  eventOptionChosen: number | null;
  offers: ClubOffer[];
  canStay: boolean;
  isYouth: boolean;
  flavor: string;
  chosenClubId: string | null;
  chosenVerb: 'sign' | 'stay' | 'loan' | null;
  chosenRole: 'starter' | 'rotation' | 'prospect';
}

interface Forced {
  slots: ClubOffer[];
  rerollsLeft: number;
  desperation: number;
}

interface Wizard {
  step: 1 | 2 | 3;
  nationCode: string;
  surname: string;
  number: number;
  foot: Foot;
  position: Position | null;
}

interface CareerState {
  lang: Lang;
  phase: CareerPhase;
  seed: number;
  rng: Rng | null;
  deck: CareerEvent[];
  firedEventById: Record<string, number>;

  player: CareerPlayer | null;
  year: number;
  stages: SeasonRecord[];
  trophies: Title[];
  lastSeason: SeasonRecord | null;

  wizard: Wizard;
  offseason: Offseason | null;
  forced: Forced | null;

  // actions
  setLang(l: Lang): void;
  startCareer(): void;
  exitToLanding(): void;
  setNation(code: string): void;
  setIdentity(p: { surname: string; number: number; foot: Foot }): void;
  setPosition(pos: Position): void;
  wizardNext(): void;
  wizardBack(): void;
  confirmIdentity(): void;

  resolveEvent(optionIndex: number): void;
  chooseOffer(index: number): void;
  stay(): void;
  clearChoice(): void;

  openForced(): void;
  closeForced(): void;
  forcedToggleLock(i: number): void;
  forcedReroll(): void;
  forcedAccept(i: number): void;

  playSeason(): void;
  retireDecision(oneMore: boolean): void;
  reset(): void;
}

const emptyWizard: Wizard = {
  step: 1, nationCode: '', surname: '', number: 10, foot: 'right', position: null,
};

function currentClubStrength(p: CareerPlayer): number {
  const c = p.clubId ? getClub(p.clubId) : null;
  return c ? c.strength : 999;
}

export const useCareerStore = create<CareerState>((set, get) => ({
  lang: 'es',
  phase: 'landing',
  seed: 0,
  rng: null,
  deck: [],
  firedEventById: {},
  player: null,
  year: CAREER.startYear,
  stages: [],
  trophies: [],
  lastSeason: null,
  wizard: { ...emptyWizard },
  offseason: null,
  forced: null,

  setLang(l) {
    if (l === get().lang) return;
    set({ lang: l, deck: get().player ? buildEventDeck(l) : [] });
  },

  startCareer() {
    set({ phase: 'wizard', wizard: { ...emptyWizard } });
  },
  exitToLanding() {
    get().reset();
  },

  setNation(code) { set(s => ({ wizard: { ...s.wizard, nationCode: code } })); },
  setIdentity(p) { set(s => ({ wizard: { ...s.wizard, ...p } })); },
  setPosition(pos) { set(s => ({ wizard: { ...s.wizard, position: pos } })); },
  wizardNext() { set(s => ({ wizard: { ...s.wizard, step: Math.min(3, s.wizard.step + 1) as 1 | 2 | 3 } })); },
  wizardBack() {
    const s = get();
    if (s.wizard.step === 1) { s.reset(); return; }
    set({ wizard: { ...s.wizard, step: (s.wizard.step - 1) as 1 | 2 | 3 } });
  },

  confirmIdentity() {
    const { wizard, lang } = get();
    if (!wizard.nationCode || !wizard.position) return;
    const seed = randomSeed();
    const rng = makeRng(seed);
    const player = createPlayer({
      nationCode: wizard.nationCode,
      surname: (wizard.surname || 'PLAYER').toUpperCase().slice(0, 14),
      number: clamp(1, 99, wizard.number || 10),
      foot: wizard.foot,
      position: wizard.position,
      seed,
      rng,
    });
    // ~30% chance of dual nationality → enables the switch event
    if (rng.chance(0.3)) {
      const others = NATIONS.filter(n => n.code !== player.nationCode);
      player.secondNationCode = rng.pick(others).code;
    }
    const deck = buildEventDeck(lang);
    const youthOffers = generateYouthOffers(player, rng);
    set({
      phase: 'career', seed, rng, player, deck, firedEventById: {},
      year: CAREER.startYear, stages: [], trophies: [], lastSeason: null,
      forced: null,
      offseason: {
        event: null, eventResolved: true, eventBadges: [], eventOptionChosen: null,
        offers: youthOffers,
        canStay: false, isYouth: true,
        flavor: transferHeadline(player, youthOffers, { youth: true, loan: false }, lang, rng),
        chosenClubId: null, chosenVerb: null, chosenRole: 'starter',
      },
    });
  },

  resolveEvent(optionIndex) {
    const s = get();
    const os = s.offseason;
    if (!os || !os.event || os.eventResolved || !s.rng || !s.player) return;
    const opt = os.event.options[optionIndex];
    const outcome = s.rng.weighted(opt.outcomes, o => o.weight);
    const player = { ...s.player };
    const res = applyEffects(player, outcome.effects, s.rng);
    const trophies = res.titles.length ? [...s.trophies, ...res.titles] : s.trophies;
    const firedEventById = { ...s.firedEventById, [os.event.id]: s.year };
    // event may end a career (retirement injury etc.)
    set({
      player, trophies, firedEventById,
      offseason: { ...os, eventResolved: true, eventBadges: [outcome.badge], eventOptionChosen: optionIndex },
    });
    if (res.retire) {
      set({ phase: 'summary', player });
    }
  },

  chooseOffer(index) {
    const s = get();
    const os = s.offseason;
    if (!os) return;
    const offer = os.offers[index];
    if (!offer) return;
    set({ offseason: { ...os, chosenClubId: offer.clubId, chosenVerb: offer.verb, chosenRole: offer.role } });
  },
  stay() {
    const s = get();
    const os = s.offseason;
    if (!os || !s.player?.clubId) return;
    set({ offseason: { ...os, chosenClubId: s.player.clubId, chosenVerb: 'stay', chosenRole: 'starter' } });
  },
  clearChoice() {
    const s = get();
    if (!s.offseason) return;
    set({ offseason: { ...s.offseason, chosenClubId: null, chosenVerb: null } });
  },

  openForced() {
    const s = get();
    if (!s.player || !s.rng) return;
    const slots = fillForcedSlots(s.player, s.rng, 0, 3);
    set({ forced: { slots, rerollsLeft: CAREER.transfer.baseRerolls, desperation: 0 } });
  },
  closeForced() { set({ forced: null }); },
  forcedToggleLock(i) {
    const s = get();
    if (!s.forced) return;
    const slots = s.forced.slots.map((sl, idx) => idx === i ? { ...sl, locked: !sl.locked } : sl);
    set({ forced: { ...s.forced, slots } });
  },
  forcedReroll() {
    const s = get();
    if (!s.forced || !s.player || !s.rng || s.forced.rerollsLeft <= 0) return;
    const desperation = clamp(0, 100, s.forced.desperation + CAREER.transfer.desperationPerReroll);
    const keep = s.forced.slots.filter(sl => sl.locked);
    const needed = s.forced.slots.length - keep.length;
    const fresh = fillForcedSlots(s.player, s.rng, desperation, needed);
    // preserve slot positions: fill unlocked slots with fresh
    let fi = 0;
    const slots = s.forced.slots.map(sl => (sl.locked ? sl : fresh[fi++] ?? sl));
    set({ forced: { slots, rerollsLeft: s.forced.rerollsLeft - 1, desperation } });
  },
  forcedAccept(i) {
    const s = get();
    if (!s.forced || !s.offseason || !s.player) return;
    const offer = s.forced.slots[i];
    if (!offer) return;
    // forcing a move costs loyalty + a little morale
    const player = { ...s.player };
    player.loyalty = clamp(0, 100, player.loyalty - 18);
    player.morale = clamp(5, 100, player.morale - 5);
    player.flags = { ...player.flags, forcedMove: true };
    set({
      player,
      offseason: { ...s.offseason, chosenClubId: offer.clubId, chosenVerb: 'sign', chosenRole: offer.role },
      forced: null,
    });
  },

  playSeason() {
    const s = get();
    const os = s.offseason;
    if (!os || !os.eventResolved || !os.chosenClubId || !s.rng || !s.player) return;
    const rng = s.rng;
    const player = { ...s.player, ovrTemp: [...s.player.ovrTemp], flags: { ...s.player.flags }, clubsPlayed: [...s.player.clubsPlayed] };
    const club = getClub(os.chosenClubId)!;
    const seasonAge = player.age;
    const seasonYear = s.year;

    // apply the transfer choice
    const parentClub = player.clubId;
    if (os.chosenVerb === 'loan') {
      player.loanFromClubId = parentClub;
      player.clubId = club.id;
    } else if (os.chosenVerb === 'sign') {
      player.clubId = club.id;
      player.contractYears = os.isYouth ? 3 : 4;
      if (!os.isYouth) player.loyalty = clamp(0, 100, player.loyalty * 0.5 + 25);
      player.loanFromClubId = null;
    } else {
      // stay
      player.clubId = club.id;
    }
    player.roleBias += roleBiasFor(os.chosenRole);
    if (!player.clubsPlayed.includes(club.id)) player.clubsPlayed.push(club.id);

    // simulate
    const out: SeasonOutput = simulateSeason(player, club, rng);
    const clubT = rollClubTitles(player, club, out, rng);
    const intl = rollInternational(player, out, seasonYear, rng);
    const bigTitles =
      clubT.titles.filter(t => isBigTitle(t.key)).length +
      intl.titles.filter(t => isBigTitle(t.key)).length;
    applyProgression(player, club, out, bigTitles, rng);
    const awards = rollAwards(player, club, out, clubT, intl, rng);
    const allTitles: Title[] = [...clubT.titles, ...intl.titles, ...awards];

    // returning from a loan: go back to the parent club
    if (os.chosenVerb === 'loan' && parentClub) {
      player.clubId = parentClub;
      player.loanFromClubId = null;
    }

    const record: SeasonRecord = {
      year: seasonYear, age: seasonAge, clubId: club.id,
      overallAtSeason: Math.round(out.effOverall),
      apps: out.apps, goals: out.goals, assists: out.assists, cleanSheets: out.cleanSheets,
      rating: Math.round(out.rating * 10) / 10,
      onLoan: os.chosenVerb === 'loan',
      titles: allTitles,
      eventId: os.event?.id,
    };

    player.age += 1;
    const trophies = [...s.trophies, ...allTitles];
    const stages = [...s.stages, record];
    const year = seasonYear + 1;

    // retirement check
    let retire = false;
    if (player.age >= CAREER.hardRetire) retire = true;
    else if (player.age >= CAREER.retireFrom) {
      const dec = declineByAge(player.age);
      const chance = clamp(0, 0.9,
        (player.age - CAREER.retireFrom) * 0.15 + dec * 0.08 +
        (player.morale < 40 ? 0.15 : 0) + (player.overall < 68 ? 0.15 : 0));
      if (rng.chance(chance)) retire = true;
    }

    set({ player, stages, trophies, lastSeason: record, year });

    if (player.age >= CAREER.hardRetire) {
      set({ phase: 'summary' });
      return;
    }
    if (retire) {
      set({ phase: 'retire-decision' });
      return;
    }
    setupOffseason(set, get);
  },

  retireDecision(oneMore) {
    if (!oneMore) { set({ phase: 'summary' }); return; }
    const s = get();
    if (s.player) {
      const player = { ...s.player, morale: clamp(5, 100, s.player.morale + 6) };
      set({ player });
    }
    setupOffseason(set, get);
  },

  reset() {
    set({
      phase: 'landing', seed: 0, rng: null, deck: [], firedEventById: {},
      player: null, year: CAREER.startYear, stages: [], trophies: [], lastSeason: null,
      wizard: { ...emptyWizard }, offseason: null, forced: null,
    });
  },
}));

// Build the next offseason (event + transfer offers) for the current player.
function setupOffseason(
  set: (partial: Partial<CareerState>) => void,
  get: () => CareerState,
) {
  const s = get();
  if (!s.player || !s.rng) return;
  const player = s.player;
  const rng = s.rng;

  const event = selectEvent(player, s.deck, rng, s.firedEventById, s.year);

  const strengthGap = currentClubStrength(player) - player.overall;
  const loanPhase = player.age <= 19 && strengthGap >= 3;
  const offers = loanPhase
    ? generateLoanOffers(player, rng)
    : generateTransferOffers(player, rng);

  // clear transient flags consumed by the market
  if (player.flags.wantsHome || player.flags.bosman) {
    player.flags = { ...player.flags };
    delete player.flags.wantsHome;
    delete player.flags.bosman;
  }

  set({
    phase: 'career',
    player: { ...player },
    forced: null,
    offseason: {
      event,
      eventResolved: !event,
      eventBadges: [],
      eventOptionChosen: null,
      offers,
      canStay: !!player.clubId,
      isYouth: false,
      flavor: transferHeadline(player, offers, { youth: false, loan: loanPhase }, s.lang, rng),
      chosenClubId: null,
      chosenVerb: null,
      chosenRole: 'starter',
    },
  });
}
