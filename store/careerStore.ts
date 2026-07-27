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
import { offerArchetypes, getArchetype, type Archetype } from '@/lib/career/archetypes';
import { addAttrs, gainAttrs, overallFrom } from '@/lib/career/attributes';
import { dealPreseason, getCard, type PreseasonCard } from '@/lib/career/preseason';
import {
  createMoment, resolveMoment, shouldFireMoment, staminaAfterSeason,
  type Moment, type MomentResult, type MomentStakes,
} from '@/lib/career/moments';
import {
  addIdol, applyExit, creditTitle, seasonIdolGain, legacyOf, legacyScore, idolAt,
} from '@/lib/career/idolatry';
import { areRivals, mainRival } from '@/data/career/rivals';
import { seasonWage, getItem, canAfford } from '@/lib/career/shop';
import {
  evaluate as evalAchievements, loadUnlocked, saveUnlocked,
  type Achievement, type Unlocked,
} from '@/lib/career/achievements';

export type CareerPhase =
  | 'landing' | 'wizard' | 'archetype' | 'career' | 'moment' | 'retire-decision' | 'summary';

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
  // ---- Legend update ----
  cards: PreseasonCard[];
  cardChosen: string | null;
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

  // ---- Legend update ----
  archetypeOptions: Archetype[];
  moment: Moment | null;
  momentResult: MomentResult | null;
  /** headlines produced by the season just played */
  seasonNews: string[];
  /** persistent achievements, and the ones that just popped */
  unlocked: Unlocked;
  achievementQueue: Achievement[];

  // actions
  chooseArchetype(id: string): void;
  chooseCard(id: string): void;
  pickMoment(optionId: string): void;
  dismissMoment(): void;
  buyItem(id: string): void;
  checkAchievements(): void;
  dismissAchievement(id: string): void;
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
  archetypeOptions: [],
  moment: null,
  momentResult: null,
  seasonNews: [],
  unlocked: typeof window !== 'undefined' ? loadUnlocked() : {},
  achievementQueue: [],

  // Logros survive the career: evaluated against the run so far, persisted to
  // localStorage, and surfaced as a toast the moment they pop.
  checkAchievements() {
    const s = get();
    if (!s.player) return;
    const fresh = evalAchievements(
      { p: s.player, stages: s.stages, trophies: s.trophies }, s.unlocked);
    if (!fresh.length) return;
    const now = new Date().toISOString();
    const unlocked = { ...s.unlocked };
    for (const a of fresh) unlocked[a.id] = now;
    saveUnlocked(unlocked);
    set({ unlocked, achievementQueue: [...s.achievementQueue, ...fresh] });
  },
  dismissAchievement(id) {
    set(st => ({ achievementQueue: st.achievementQueue.filter(a => a.id !== id) }));
  },

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
    // The identity pick comes before the first club: three of the position's
    // archetypes, drawn by the seed, so you choose who you are under constraint.
    set({
      phase: 'archetype', seed, rng, player, deck, firedEventById: {},
      year: CAREER.startYear, stages: [], trophies: [], lastSeason: null,
      forced: null, offseason: null, moment: null, momentResult: null, seasonNews: [],
      archetypeOptions: offerArchetypes(player.position, rng),
    });
  },

  chooseArchetype(id) {
    const s = get();
    if (!s.player || !s.rng) return;
    const arch = getArchetype(s.player.position, id);
    if (!arch) return;
    const player = { ...s.player, attrs: gainAttrs(s.player.attrs, arch.delta, s.player.potential) };
    player.archetypeId = arch.id;
    player.overall = overallFrom(player.attrs, player.position);
    player.peakOverall = Math.max(player.peakOverall, player.overall);

    const youthOffers = generateYouthOffers(player, s.rng);
    set({
      phase: 'career', player, archetypeOptions: [],
      offseason: {
        event: null, eventResolved: true, eventBadges: [], eventOptionChosen: null,
        offers: youthOffers,
        canStay: false, isYouth: true,
        flavor: transferHeadline(player, youthOffers, { youth: true, loan: false }, s.lang, s.rng),
        chosenClubId: null, chosenVerb: null, chosenRole: 'starter',
        cards: [], cardChosen: null,
      },
    });
  },

  chooseCard(id) {
    const s = get();
    const os = s.offseason;
    if (!os || !s.player || os.cardChosen) return;
    const card = getCard(id);
    if (!card || !os.cards.some(c => c.id === id)) return;

    const p = { ...s.player };
    if (card.attrs) p.attrs = gainAttrs(p.attrs, card.attrs, p.potential);
    if (card.form) p.form = clamp(15, 99, p.form + card.form);
    if (card.fitness) p.fitness = clamp(30, 99, p.fitness + card.fitness);
    if (card.morale) p.morale = clamp(5, 100, p.morale + card.morale);
    if (card.reputation) p.reputation = clamp(0, 100, p.reputation + card.reputation);
    if (card.stamina) p.stamina = clamp(20, 100, p.stamina + card.stamina);
    if (card.minutesBias) p.roleBias += card.minutesBias;
    if (card.idol) addIdol(p, p.clubId, card.idol);
    p.overall = overallFrom(p.attrs, p.position);
    p.peakOverall = Math.max(p.peakOverall, p.overall);

    set({ player: p, offseason: { ...os, cardChosen: id } });
  },

  pickMoment(optionId) {
    const s = get();
    if (!s.moment || !s.player || s.moment.resolved) return;
    const res = resolveMoment(s.moment, optionId);
    const p = { ...s.player };
    p.reputation = clamp(0, 100, p.reputation + res.reputation);
    p.morale = clamp(5, 100, p.morale + res.morale);
    p.form = clamp(15, 99, p.form + res.form);
    if (res.won) p.clutchWon = (p.clutchWon ?? 0) + 1;
    addIdol(p, s.moment.clubId, res.idol);
    p.momentCooldown = CAREER.momentCooldown;
    set({
      player: p, moment: res.moment, momentResult: res,
      seasonNews: [...s.seasonNews, s.lang === 'es' ? res.newsEs : res.newsEn],
    });
    get().checkAchievements();
  },

  dismissMoment() {
    set({ moment: null, momentResult: null, phase: 'career' });
  },

  buyItem(id) {
    const s = get();
    const item = getItem(id);
    if (!s.player || !item || !canAfford(s.player, item)) return;
    const p = { ...s.player };
    p.money -= item.price;
    p.owned = [...(p.owned ?? []), item.id];
    if (item.attrs) p.attrs = gainAttrs(p.attrs, item.attrs, p.potential);
    if (item.fitness) p.fitness = clamp(30, 99, p.fitness + item.fitness);
    if (item.stamina) p.stamina = clamp(20, 100, p.stamina + item.stamina);
    if (item.morale) p.morale = clamp(5, 100, p.morale + item.morale);
    if (item.reputation) p.reputation = clamp(0, 100, p.reputation + item.reputation);
    if (item.idol) addIdol(p, p.clubId, item.idol);
    p.overall = overallFrom(p.attrs, p.position);
    p.peakOverall = Math.max(p.peakOverall, p.overall);
    set({ player: p });
    get().checkAchievements();
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
    const news: string[] = [];
    if (os.chosenVerb === 'loan') {
      player.loanFromClubId = parentClub;
      player.clubId = club.id;
      player.stayStreak = 0;
    } else if (os.chosenVerb === 'sign') {
      // Leaving costs you at the club you're walking out on — and crossing to a
      // direct rival brands you a traitor there forever (idolatry caps at 49).
      if (parentClub && parentClub !== club.id) {
        const wasRival = areRivals(parentClub, club.id);
        applyExit(player, parentClub, club.id);
        const oldName = getClub(parentClub)?.name ?? '';
        news.push(
          wasRival
            ? (s.lang === 'es'
                ? `🗡️ Firmaste para el clásico rival. En ${oldName} no te lo perdonan más.`
                : `🗡️ You signed for the arch rival. ${oldName} will never forgive you.`)
            : (s.lang === 'es'
                ? `✈️ Dejas ${oldName}. La gente lo va a sentir.`
                : `✈️ You leave ${oldName}. The terraces will feel it.`),
        );
      }
      player.clubId = club.id;
      player.contractYears = os.isYouth ? 3 : 4;
      if (!os.isYouth) player.loyalty = clamp(0, 100, player.loyalty * 0.5 + 25);
      player.loanFromClubId = null;
      player.stayStreak = 1;
      if (!player.debutClubId) player.debutClubId = club.id;
    } else {
      // stay — loyalty compounds, and after five years the terraces adopt you
      player.clubId = club.id;
      player.stayStreak = (player.stayStreak ?? 0) + 1;
      if (!player.debutClubId) player.debutClubId = club.id;
    }
    player.roleBias += roleBiasFor(os.chosenRole);
    // Signing (or staying) locks in the role the club promised. Loans always
    // come with a starting berth — that is the point of going out on loan.
    player.rolePromise = os.chosenVerb === 'loan' ? 'starter' : os.chosenRole;
    player.rolePromiseYears = os.chosenVerb === 'stay' ? 1 : 2;
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

    // ---- Legend update: idolatry, derbies, wages, stamina ----
    player.derbyGoals = (player.derbyGoals ?? 0) + out.derbyGoals;

    // Club silverware lifts this club's idolatry ceiling from 80 to 100.
    const clubSilver = clubT.titles.filter(t => t.kind === 'club').length;
    if (clubSilver > 0) creditTitle(player, club.id, clubSilver);

    const idolGain = os.chosenVerb === 'loan' ? 0 : seasonIdolGain(player, club.id, {
      goals: out.goals,
      assists: out.assists,
      derbyGoals: out.derbyGoals,
      cleanSheets: out.cleanSheets,
      titles: allTitles.map(t => ({ scope: t.scope, kind: t.kind })),
      clutchWon: 0, // moments credit themselves the instant they resolve
    });
    if (out.derbyGoals > 0) {
      news.push(s.lang === 'es'
        ? `🔥 ${out.derbyGoals} gol${out.derbyGoals > 1 ? 'es' : ''} en el clásico. Eso no se olvida.`
        : `🔥 ${out.derbyGoals} derby goal${out.derbyGoals > 1 ? 's' : ''}. That is never forgotten.`);
    }

    player.money = (player.money ?? 0) + seasonWage(player.value, club.strength, out.apps);
    player.stamina = staminaAfterSeason(player, out.apps);
    player.momentCooldown = Math.max(0, (player.momentCooldown ?? 0) - 1);

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
      derbyGoals: out.derbyGoals,
      idolGain: Math.round(idolGain * 10) / 10,
      idolAfter: Math.round(idolAt(player, club.id) * 10) / 10,
      news,
      cardId: os.cardChosen ?? undefined,
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

    set({ player, stages, trophies, lastSeason: record, year, seasonNews: news });
    get().checkAchievements();

    if (player.age >= CAREER.hardRetire) {
      set({ phase: 'summary' });
      return;
    }
    if (retire) {
      set({ phase: 'retire-decision' });
      return;
    }
    setupOffseason(set, get);

    // A clutch moment interrupts the offseason: the season you just played
    // earned you a final, a derby, or a microphone. These are rare on purpose.
    const kind = shouldFireMoment(player, {
      bigTitleShot: bigTitles > 0 || out.inContinental,
      playedDerby: out.derbyGames > 0,
    }, rng);
    if (kind) {
      const stakes: MomentStakes =
        clubT.titles.some(t => t.scope === 'continent') ? 'continental'
          : intl.titles.length ? 'national'
            : out.derbyGames > 0 && rng.chance(0.5) ? 'derby'
              : bigTitles > 0 ? 'cup' : 'league';
      const rivalClub = stakes === 'derby' ? getClub(mainRival(club.id) ?? '') : null;
      set({
        phase: 'moment',
        moment: createMoment(player, {
          kind, stakes, clubId: club.id,
          rivalName: rivalClub?.name,
          year: seasonYear,
        }, rng),
        momentResult: null,
      });
    }
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
      archetypeOptions: [], moment: null, momentResult: null, seasonNews: [],
      achievementQueue: [],
      // note: `unlocked` is deliberately NOT reset — logros persist across runs
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
      cards: dealPreseason(player, rng, CAREER.preseasonCards),
      cardChosen: null,
    },
  });
}
