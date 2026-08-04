'use client';

import { create } from 'zustand';
import type { Position } from '@/data/types';
import type {
  CareerPlayer, CareerEvent, ClubOffer, SeasonRecord, SeasonDecision, Title, Foot,
} from '@/data/career/types';
import { NATIONS, getNation } from '@/data/career/nations';
import { getClub } from '@/data/career/clubs';
import { getLeague } from '@/data/career/leagues';
import { makeRng, Rng, randomSeed, seedFromText, clamp } from '@/lib/career/rng';
import { CAREER, declineByAge } from '@/lib/career/config';
import {
  createPlayer, simulateSeason, applyProgression, SeasonOutput,
} from '@/lib/career/engine';
import { rollClubTitles, isBigTitle } from '@/lib/career/titles';
import {
  rollNationalTeam, intlNews, resultLabel, roundOdds, resultAfter,
  KO_ROUNDS, type PendingRun, type NtResult,
} from '@/lib/career/international';
import { rollAwards } from '@/lib/career/awards';
import {
  generateYouthOffers, generateLoanOffers, generateTransferOffers,
  fillForcedSlots, roleBiasFor,
} from '@/lib/career/offers';
import { buildEventDeck, selectEvent, applyEffects } from '@/lib/career/events';
import { transferHeadline } from '@/lib/career/flavor';
import { titleLabel, type Lang } from '@/lib/career/i18n';
import { offerArchetypes, getArchetype, type Archetype } from '@/lib/career/archetypes';
import { addAttrs, gainAttrs, overallFrom } from '@/lib/career/attributes';
import { randomFace, type FaceGenes } from '@/lib/career/face';
import { dealPreseason, getCard, type PreseasonCard } from '@/lib/career/preseason';
import {
  createMoment, resolveMoment, shouldFireMoment, staminaAfterSeason,
  type Moment, type MomentResult, type MomentStakes,
} from '@/lib/career/moments';
import {
  addIdol, applyExit, creditTitle, seasonIdolGain, legacyOf, legacyScore, idolAt,
} from '@/lib/career/idolatry';
import { areRivals, mainRival } from '@/data/career/rivals';
import {
  seasonWage, getItem, canAfford, wageMultiplierOf, injuryResistOf,
} from '@/lib/career/shop';
import {
  evaluate as evalAchievements, loadUnlocked, saveUnlocked,
  type Achievement, type Unlocked,
} from '@/lib/career/achievements';
import { pickCelebration } from '@/components/career/Celebration';
import { rollLeagueMoves, moveNews, resetLeagues } from '@/lib/career/promotion';
import type { MiniGameSpec, MiniStake } from '@/components/career/MiniGame';

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
  /** set once a forced move is accepted — the window is closed, no going back */
  forcedLocked: boolean;
  // ---- Legend update ----
  cards: PreseasonCard[];
  cardChosen: string | null;
  /** what the resolved event actually changed, for on-screen feedback */
  eventDeltas: { label: string; delta: number }[];
  /**
   * Which branch of the event was taken and which outcome came up, by index.
   * Stored on the season record so next summer's report can tell you how the
   * decision you agonised over actually turned out — by id, never as frozen
   * localized copy.
   */
  decision?: SeasonDecision;
}

interface Forced {
  slots: ClubOffer[];
  rerollsLeft: number;
  desperation: number;
}

interface Wizard {
  step: 1 | 2 | 3;
  /** raw text from the seed box — blank means "roll one for me" */
  seedInput: string;
  nationCode: string;
  /** previewed in the creation screen and carried into the career */
  face: FaceGenes | null;
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
  /** a major honour waiting to be celebrated full-screen */
  celebrating: Title | null;
  /** an interactive minigame blocking the offseason */
  miniGame: MiniGameSpec | null;
  /** a knockout run in progress — each round decided by the player, not the dice */
  ntRun: NtRunState | null;

  // actions
  chooseArchetype(id: string): void;
  chooseCard(id: string): void;
  pickMoment(optionId: string): void;
  dismissMoment(): void;
  buyItem(id: string): void;
  checkAchievements(): void;
  dismissAchievement(id: string): void;
  dismissCelebration(): void;
  resolveMiniGame(won: boolean): void;
  setLang(l: Lang): void;
  startCareer(): void;
  exitToLanding(): void;
  setSeedInput(v: string): void;
  setNation(code: string): void;
  rerollFace(): void;
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
  step: 1, seedInput: '', nationCode: '', face: null, surname: '', number: 10, foot: 'right', position: null,
};


interface NtRunState extends PendingRun {
  /**
   * Which knockout rounds you are actually on the pitch for, as round indices.
   * Playing all four was too much: a World Cup meant four modals back to back,
   * every other year. One or two now, weighted to the later rounds, and every
   * other round is resolved by the same odds without stopping the game — so
   * sometimes it is only the semi and the final, and sometimes you go out in the
   * quarters and never see a minigame at all.
   */
  playedRounds: number[];
  /** which knockout round is being played, 0 = last 16 */
  idx: number;
  /** index into stages[] of the season record to patch when the run ends */
  stageIdx: number;
  caps: number;
  goals: number;
  age: number;
}

const ROUND_LABEL: Record<string, [string, string]> = {
  r16: ['Round of 16', 'Octavos de final'],
  qf: ['Quarter-final', 'Cuartos de final'],
  sf: ['Semi-final', 'Semifinal'],
  final: ['The final', 'La final'],
};

/**
 * Build the minigame for one knockout round. The odds come from the nation and
 * from you; the minigame's difficulty is then set so that *playing it* is worth
 * about those odds. Nothing is decided in advance — win it and you are through.
 */
function tournamentMini(run: PendingRun, idx: number, rng: Rng, lang: Lang): MiniGameSpec {
  const p = roundOdds(run.quality, idx);
  const roll = rng.next();
  const kind: MiniGameSpec['kind'] =
    roll < 0.3 ? 'skill' : roll < 0.55 ? 'penalty' : roll < 0.8 ? 'memory' : 'luck';

  // shirts/picks chosen so picks/shirts lands near the target odds
  const shirts = p >= 0.6 ? 3 : p >= 0.35 ? 4 : 5;
  const picks = clamp(1, shirts - 1, Math.round(p * shirts));

  return {
    kind,
    stake: 'tournament',
    knockout: true,
    luckIndex: rng.int(shirts),
    shirts,
    picks,
    // the keeper covers more of the goal the harder the tie is
    saves: (() => {
      const n = clamp(1, 5, Math.round(6 * (1 - p)));
      const pool = [0, 1, 2, 3, 4, 5];
      const out: number[] = [];
      for (let i = 0; i < n; i++) out.push(...pool.splice(rng.int(pool.length), 1));
      return out;
    })(),
    // a longer run to remember when the tie is harder
    sequence: Array.from({ length: clamp(3, 8, Math.round(8 - p * 5)) }, () => rng.int(4)),
    target: 18 + rng.int(64),
    width: clamp(7, 46, 6 + p * 44),
    label: titleLabel(run.key, lang),
    round: ROUND_LABEL[KO_ROUNDS[idx]][lang === 'es' ? 1 : 0],
  };
}



/** One or two rounds to actually play, weighted towards the ones that matter. */
function pickPlayedRounds(rng: Rng): number[] {
  const count = rng.chance(0.35) ? 2 : 1;
  const weight = [1, 2, 3, 4]; // r16, qf, sf, final
  const picked = new Set<number>();
  let guard = 0;
  while (picked.size < count && guard++ < 40) {
    const total = weight.reduce((a, b) => a + b, 0);
    let r = rng.next() * total;
    for (let i = 0; i < weight.length; i++) {
      r -= weight[i];
      if (r <= 0) { picked.add(i); break; }
    }
  }
  return [...picked].sort((a, b) => a - b);
}

/**
 * Walk the knockout forward from `fromIdx`, simulating every round the player is
 * not on the pitch for, and stop at the first one they are. Returns either the
 * round to hand to the player, or the result if the run ended on the way there.
 */
function walkNtRun(
  run: { quality: number; playedRounds: number[] }, fromIdx: number, rng: Rng,
): { playAt: number; caps: number; goals: number }
  | { done: NtResult; caps: number; goals: number } {
  let idx = fromIdx;
  let caps = 0;
  let goals = 0;
  while (idx < KO_ROUNDS.length) {
    if (run.playedRounds.includes(idx)) return { playAt: idx, caps, goals };
    // simulated round: you played it, you just did not decide it
    caps += 1;
    if (rng.chance(0.3)) goals += 1;
    if (!rng.chance(roundOdds(run.quality, idx))) {
      return { done: resultAfter(idx, false), caps, goals };
    }
    idx += 1;
  }
  return { done: 'champion', caps, goals };
}

/** The rng is created per career; this just keeps the call sites readable. */
function rng0(s: { rng: Rng | null }): Rng {
  return s.rng!;
}

/**
 * Close out a knockout run. The season record and the international history
 * were already written when the season was committed — with the run still
 * unresolved — so both are patched here with what actually happened, and the
 * trophy is only awarded now, once it has been won on the pitch.
 */
function finishNtRun(
  set: (partial: Partial<CareerState>) => void,
  get: () => CareerState,
  run: NtRunState,
  result: NtResult,
  player: CareerPlayer,
  won: boolean,
) {
  const s = get();
  const es = s.lang === 'es';
  const champion = result === 'champion';

  if (champion) {
    player.flags[run.kind === 'world' ? 'wonWorldCup' : 'wonContinental'] = true;
  }

  // patch the international history entry for this year
  const hist = [...(player.ntHistory ?? [])];
  const last = hist[hist.length - 1];
  if (last?.tournament) {
    hist[hist.length - 1] = {
      ...last,
      caps: last.caps + run.caps,
      goals: last.goals + run.goals,
      tournament: {
        ...last.tournament,
        result,
        caps: last.tournament.caps + run.caps,
        goals: last.tournament.goals + run.goals,
      },
    };
  }
  player.ntHistory = hist;

  const title: Title | null = champion
    ? {
        key: run.key, kind: 'national', scope: 'national',
        age: run.age, nationCode: player.ntNationCode,
      }
    : null;

  // patch the season record so the timeline shows the trophy on the right year
  const stages = [...s.stages];
  const rec = stages[run.stageIdx];
  const roundName = (run.idx >= 0 ? resultLabel(result, s.lang) : '');
  const line = champion
    ? (es ? `🏆 ¡Campeones! Ganaste ${titleLabel(run.key, s.lang)} con tu selección.`
          : `🏆 Champions! You won the ${titleLabel(run.key, s.lang)} with your country.`)
    : (es ? `🌍 Eliminados en ${roundName.toLowerCase()}. Se acabó el torneo.`
          : `🌍 Knocked out at the ${roundName.toLowerCase()}. The tournament is over.`);

  if (rec) {
    stages[run.stageIdx] = {
      ...rec,
      titles: title ? [...rec.titles, title] : rec.titles,
      news: [...(rec.news ?? []), line],
    };
  }

  if (won) { player.morale = clamp(5, 100, player.morale + 16); player.reputation = clamp(0, 100, player.reputation + 12); }
  else { player.morale = clamp(5, 100, player.morale - 9); }

  set({
    player,
    stages,
    lastSeason: stages[run.stageIdx] ?? s.lastSeason,
    trophies: title ? [...s.trophies, title] : s.trophies,
    celebrating: title ?? s.celebrating,
    miniGame: null,
    ntRun: null,
    seasonNews: [...s.seasonNews, line],
  });
  get().checkAchievements();
}

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
  celebrating: null,
  miniGame: null,
  ntRun: null,

  dismissCelebration() { set({ celebrating: null }); },

  // Minigames pay out immediately: a passed fitness test wipes the injury, a
  // finished wonder goal is worth reputation and the terraces, a won derby is
  // idolatry you cannot buy.
  resolveMiniGame(won) {
    const s = get();
    const g = s.miniGame;
    if (!s.player || !g) { set({ miniGame: null }); return; }
    const p = { ...s.player };
    const es = s.lang === 'es';
    let line = '';
    if (g.stake === 'injury') {
      if (won) { p.injuryGamesNext = Math.max(0, p.injuryGamesNext - 8); p.fitness = clamp(30, 99, p.fitness + 10);
        line = es ? '🩹 Pasaste el test físico y volviste antes de lo previsto.' : '🩹 You passed the fitness test and came back early.'; }
      else { p.injuryGamesNext += 4; p.morale = clamp(5, 100, p.morale - 6);
        line = es ? '🩹 No pasaste el test. Cuatro partidos más afuera.' : '🩹 You failed the test. Four more games out.'; }
    } else if (g.stake === 'wonder-goal') {
      if (won) { p.reputation = clamp(0, 100, p.reputation + 8); p.form = clamp(15, 99, p.form + 10); addIdol(p, p.clubId, 5);
        line = es ? '🚀 Golazo. Da la vuelta al mundo en una hora.' : '🚀 A wonder goal. Around the world within the hour.'; }
      else { p.form = clamp(15, 99, p.form - 4);
        line = es ? '🚀 La mandaste a la tribuna. Se ríen una semana.' : '🚀 You put it in the stands. A week of jokes.'; }
    } else if (g.stake === 'big-save') {
      if (won) { p.reputation = clamp(0, 100, p.reputation + 8); p.form = clamp(15, 99, p.form + 10); addIdol(p, p.clubId, 5);
        line = es ? '🧤 Atajada imposible. El punto lo salvaste tú.' : '🧤 An impossible save. You won that point on your own.'; }
      else { p.form = clamp(15, 99, p.form - 4);
        line = es ? '🧤 Se te fue entre las manos. Vas a verla toda la semana.' : '🧤 It went straight through your hands. You will see it all week.'; }
    } else if (g.stake === 'tournament' && s.ntRun) {
      // This is the whole point of the rework: the tie is decided here, not in
      // advance. Win and the run continues into the next round; lose and the
      // tournament is over at exactly this stage.
      const run = s.ntRun;
      const scored = won && rng0(s).chance(0.45);
      const caps = run.caps + 1;
      const goals = run.goals + (scored ? 1 : 0);
      p.ntCaps += 1;
      if (scored) p.ntGoals += 1;

      const roundName = g.round ?? '';
      const throughToFinal = won && run.idx < KO_ROUNDS.length - 1;

      if (throughToFinal) {
        p.morale = clamp(5, 100, p.morale + 8);
        p.reputation = clamp(0, 100, p.reputation + 4);
        line = es
          ? `🌍 Ganaste ${roundName.toLowerCase()} con tu selección. Seguís vivos.`
          : `🌍 You won the ${roundName.toLowerCase()} for your country. Still alive.`;

        // Walk on to the next round you are actually on the pitch for, playing
        // out anything in between rather than stopping the game for it.
        const walk = walkNtRun(run, run.idx + 1, s.rng!);
        p.ntCaps += walk.caps;
        p.ntGoals += walk.goals;
        const capsNow = caps + walk.caps;
        const goalsNow = goals + walk.goals;

        if ('playAt' in walk) {
          set({
            player: p,
            miniGame: tournamentMini(run, walk.playAt, s.rng!, s.lang),
            ntRun: { ...run, idx: walk.playAt, caps: capsNow, goals: goalsNow },
            seasonNews: [...s.seasonNews, line],
          });
          get().checkAchievements();
          return;
        }
        set({ player: p, seasonNews: [...s.seasonNews, line] });
        finishNtRun(
          set, get, { ...run, caps: capsNow, goals: goalsNow },
          walk.done, p, walk.done === 'champion',
        );
        return;
      }

      // the run is over, one way or the other
      const result = resultAfter(run.idx, won);
      finishNtRun(set, get, { ...run, caps, goals }, result, p, won);
      return;
    } else {
      if (won) { addIdol(p, p.clubId, 9); p.morale = clamp(5, 100, p.morale + 10); p.form = clamp(15, 99, p.form + 8);
        line = es ? '⚔️ Ganaste el clásico. La ciudad es tuya.' : '⚔️ You won the derby. The city is yours.'; }
      else { addIdol(p, p.clubId, -3); p.morale = clamp(5, 100, p.morale - 8);
        line = es ? '⚔️ Perdiste el clásico. Una semana sin salir.' : '⚔️ You lost the derby. A week indoors.'; }
    }
    set({ player: p, miniGame: null, seasonNews: [...s.seasonNews, line] });
    get().checkAchievements();
  },

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
    // Cap the queue. A good season pops several at once and a whole career pops
    // around two dozen; uncapped they stack faster than they can time out and
    // bury the screen — clearing the backlog at the end of a career took 46 clicks.
    set({ unlocked, achievementQueue: [...s.achievementQueue, ...fresh].slice(-6) });
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

  setSeedInput(v) { set(s => ({ wizard: { ...s.wizard, seedInput: v.slice(0, 24) } })); },
  setNation(code) {
    // the face follows the flag: pick a country and you get a plausible one
    const rng = makeRng(randomSeed());
    set(s => ({ wizard: { ...s.wizard, nationCode: code, face: randomFace(code, rng) } }));
  },
  rerollFace() {
    const s = get();
    if (!s.wizard.nationCode) return;
    const rng = makeRng(randomSeed());
    set({ wizard: { ...s.wizard, face: randomFace(s.wizard.nationCode, rng) } });
  },
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
    // A typed seed builds the same world every time, so a run can be shared or
    // retried. Blank rolls a fresh one. Anything is accepted as a seed — words
    // included — by hashing it, so "messi" is a valid world.
    const typed = wizard.seedInput.trim();
    const seedSource: 'random' | 'custom' = typed ? 'custom' : 'random';
    const seed = typed ? seedFromText(typed) : randomSeed();
    const rng = makeRng(seed);
    const player = createPlayer({
      nationCode: wizard.nationCode,
      surname: (wizard.surname || 'PLAYER').toUpperCase().slice(0, 14),
      number: clamp(1, 99, wizard.number || 10),
      foot: wizard.foot,
      position: wizard.position,
      seed,
      seedSource,
      rng,
    });
    if (wizard.face) player.face = wizard.face;
    // ~30% chance of dual nationality → enables the switch event
    if (rng.chance(0.3)) {
      const others = NATIONS.filter(n => n.code !== player.nationCode);
      player.secondNationCode = rng.pick(others).code;
    }
    const deck = buildEventDeck(lang);
    resetLeagues();   // promotions from a previous career must not carry over
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
        chosenClubId: null, chosenVerb: null, chosenRole: 'starter', forcedLocked: false,
        cards: [], cardChosen: null, eventDeltas: [],
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
    // deep-copy the parts applyEffects mutates in place, or the "before"
    // snapshot below would already contain the changes
    const player: CareerPlayer = {
      ...s.player,
      attrs: { ...s.player.attrs },
      flags: { ...s.player.flags },
      ovrTemp: [...s.player.ovrTemp],
      idolatry: { ...s.player.idolatry },
    };
    const es = s.lang === 'es';
    const snap = (p: CareerPlayer) => ({
      [es ? 'Media' : 'Overall']: Math.round(p.overall),
      [es ? 'Técnica' : 'Technique']: Math.round(p.attrs.tec),
      [es ? 'Velocidad' : 'Pace']: Math.round(p.attrs.pac),
      [es ? 'Físico' : 'Physical']: Math.round(p.attrs.phy),
      [es ? 'Visión' : 'Vision']: Math.round(p.attrs.vis),
      [es ? 'Liderazgo' : 'Leadership']: Math.round(p.attrs.lea),
      [es ? 'Ánimo' : 'Morale']: Math.round(p.morale),
      [es ? 'Forma' : 'Form']: Math.round(p.form),
      [es ? 'Estado' : 'Fitness']: Math.round(p.fitness),
      [es ? 'Resistencia' : 'Stamina']: Math.round(p.stamina ?? 0),
      [es ? 'Fama' : 'Fame']: Math.round(p.reputation),
      [es ? 'Disciplina' : 'Discipline']: Math.round(p.discipline),
    });
    const before = snap(player);
    const res = applyEffects(player, outcome.effects, s.rng);
    const after = snap(player);
    const eventDeltas = Object.keys(after)
      .map(k => ({ label: k, delta: after[k] - before[k] }))
      .filter(d => d.delta !== 0);
    // money and games missed are not in the snapshot but are worth showing
    const moneyDelta = (player.money ?? 0) - (s.player.money ?? 0);
    if (moneyDelta) eventDeltas.push({ label: es ? '€ Dinero' : '€ Money', delta: moneyDelta });
    const gamesOut = player.injuryGamesNext - s.player.injuryGamesNext;
    if (gamesOut) eventDeltas.push({ label: es ? 'Partidos fuera' : 'Games out', delta: gamesOut });
    const trophies = res.titles.length ? [...s.trophies, ...res.titles] : s.trophies;
    const firedEventById = { ...s.firedEventById, [os.event.id]: s.year };

    // A transfer event has to actually transfer you. These used to hand over the
    // money and take the idolatry while leaving you at the same club, so "fly
    // out and sign" signed you for nobody. The destination is injected into the
    // offer grid and locked exactly like a forced move, so the board shows where
    // you are going and the other offers cannot quietly undo it.
    let nextOffseason: Offseason = {
      ...os, eventResolved: true, eventBadges: [outcome.badge],
      eventOptionChosen: optionIndex, eventDeltas,
      decision: {
        eventId: os.event.id,
        optionIndex,
        outcomeIndex: Math.max(0, opt.outcomes.indexOf(outcome)),
      },
    };
    if (res.moveTo) {
      const dest = getClub(res.moveTo.clubId);
      if (dest) {
        // No idolatry bookkeeping here on purpose: playSeason already applies
        // the exit cost, the traitor brand and the news line when the chosen
        // club differs from the current one. Doing it here too charged twice.
        const offer: ClubOffer = {
          clubId: dest.id, verb: 'sign', role: res.moveTo.role,
        };
        nextOffseason = {
          ...nextOffseason,
          offers: os.offers.some(o => o.clubId === dest.id && o.verb === 'sign')
            ? os.offers
            : [...os.offers, offer],
          canStay: false,
          chosenClubId: dest.id,
          chosenVerb: 'sign',
          chosenRole: res.moveTo.role,
          forcedLocked: true,
        };
        eventDeltas.push({
          label: es ? `→ ${dest.name}` : `→ ${dest.name}`,
          delta: 0,
        });
      }
    }

    // event may end a career (retirement injury etc.)
    set({
      player, trophies, firedEventById,
      offseason: nextOffseason,
    });
    if (res.retire) {
      set({ phase: 'summary', player });
    }
  },

  chooseOffer(index) {
    const s = get();
    const os = s.offseason;
    // once you have forced a move the window is shut — the other cards are
    // shown greyed out, and clicking one must not quietly undo the transfer
    if (!os || os.forcedLocked) return;
    const offer = os.offers[index];
    if (!offer) return;
    set({ offseason: { ...os, chosenClubId: offer.clubId, chosenVerb: offer.verb, chosenRole: offer.role } });
  },
  stay() {
    const s = get();
    const os = s.offseason;
    if (!os || os.forcedLocked || !s.player?.clubId) return;
    set({ offseason: { ...os, chosenClubId: s.player.clubId, chosenVerb: 'stay', chosenRole: 'starter' } });
  },
  clearChoice() {
    const s = get();
    if (!s.offseason || s.offseason.forcedLocked) return;
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
    // The forced club was never in the offer grid, so accepting it used to leave
    // the board showing nothing selected — and every other offer still live, one
    // click away from silently overwriting the move you just forced. Put the club
    // into the grid, select it there, and close the window.
    const offers = s.offseason.offers.some(o => o.clubId === offer.clubId && o.verb === 'sign')
      ? s.offseason.offers
      : [...s.offseason.offers, { ...offer, locked: undefined }];
    set({
      player,
      offseason: {
        ...s.offseason,
        offers,
        canStay: false,
        chosenClubId: offer.clubId,
        chosenVerb: 'sign',
        chosenRole: offer.role,
        forcedLocked: true,
      },
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
    // Read now, not later: clubs are mutable and `rollLeagueMoves` below moves
    // them between divisions, so after the shuffle `club.leagueId` may name a
    // division this season was never played in.
    const playedLeagueId = club.leagueId;

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
    // Full international resolution: selection, squad role, caps, goals,
    // qualification and how far the country went.
    const nt = rollNationalTeam(player, {
      apps: out.apps, goals: out.goals, assists: out.assists,
      rating: out.rating, effOverall: out.effOverall,
    }, seasonYear, rng);
    player.ntHistory = [...(player.ntHistory ?? []), nt.season];
    const intl = {
      titles: nt.wonKey
        ? [{ key: nt.wonKey, kind: 'national' as const, scope: 'national' as const,
             age: player.age, nationCode: player.ntNationCode }]
        : [],
      played: nt.season.tournament ? nt.season.tournament.kind : null,
      finalist: nt.finalist,
      won: !!nt.wonKey,
    };
    if (nt.season.tournament) {
      const tt = nt.season.tournament;
      news.push(intlNews(tt, player.ntNationCode, nt.season, s.lang));
    }
    const bigTitles =
      clubT.titles.filter(t => isBigTitle(t.key)).length +
      intl.titles.filter(t => isBigTitle(t.key)).length;
    applyProgression(player, club, out, bigTitles, rng);
    const awards = rollAwards(player, club, out, clubT, intl, rng);
    // each one you win makes the next one harder — see the fatigue term in awards.ts
    player.ballonWins = (player.ballonWins ?? 0)
      + awards.filter(a => a.key === 'ballon-dor').length;
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

    // an agent and a boot deal are worth real money, every season, forever
    player.money = (player.money ?? 0)
      + Math.round(seasonWage(player.value, club.strength, out.apps) * wageMultiplierOf(player));

    // Divisions shuffle once the season is done, so the offers drawn next are
    // against the new table — including your own club going up or down.
    const moves = rollLeagueMoves(rng);
    news.push(...moveNews(moves, player.clubId, playedLeagueId, s.lang));

    // A minigame fires off the back of what actually happened this season: a
    // layoff to recover from, a chance worth burying, or a derby to win.
    let mini: MiniGameSpec | null = null;
    let pendingRun: PendingRun | null = null;

    // A knockout run with your country outranks anything at club level, and it
    // is not decided in advance: the run is set up here and each round is won or
    // lost at the minigame in resolveMiniGame.
    let ntRunState: NtRunState | null = null;
    let autoFinish: { result: NtResult; caps: number; goals: number } | null = null;
    if (nt.pendingRun) {
      pendingRun = nt.pendingRun;
      const playedRounds = pickPlayedRounds(rng);
      const walk = walkNtRun({ quality: pendingRun.quality, playedRounds }, 0, rng);
      const base: NtRunState = {
        ...pendingRun, playedRounds, idx: 0, stageIdx: 0,
        caps: walk.caps, goals: walk.goals, age: seasonAge,
      };
      if ('playAt' in walk) {
        base.idx = walk.playAt;
        mini = tournamentMini(pendingRun, walk.playAt, rng, s.lang);
        ntRunState = base;
      } else {
        // knocked out (or all the way through) before reaching a round you were
        // on the pitch for — no modal at all, just a result
        ntRunState = base;
        autoFinish = { result: walk.done, caps: walk.caps, goals: walk.goals };
      }
    }
    const stakes: MiniStake[] = [];
    if (mini) stakes.length = 0;
    if (player.injuryGamesNext > 0) stakes.push('injury');
    if (out.derbyGames > 0) stakes.push('derby');
    if (out.goals >= 8) stakes.push('wonder-goal');
    // A keeper cannot reach the goals gate — his 0 goals are now a hard 0 —
    // so his one-chance-to-decide-a-game night is measured in clean sheets.
    if (player.position === 'GK' && out.cleanSheets >= 8) stakes.push('big-save');
    // Club minigames used to fire on 40% of seasons, which meant the derby came
    // round nearly every year. They are a special occasion, so: a cooldown after
    // each one, and a lower rate on top of that.
    if (!mini && stakes.length && (player.miniCooldown ?? 0) <= 0 && rng.chance(0.35)) {
      const stake = stakes[rng.int(stakes.length)];
      // The derby was a pure three-shirt guess, so a 95-overall striker and a
      // 62-overall reserve had exactly the same 33% of winning it. Now it is a
      // test of the player: the shot-timing game most of the time, the winger's
      // run occasionally, and never a blind coin flip.
      const kindRoll = rng.next();
      const kind = stake === 'injury'
        ? 'memory'
        : stake === 'derby'
          ? (kindRoll < 0.7 ? 'skill' : 'memory')
          // a keeper either times the dive or reads the run onto it
          : stake === 'big-save'
            ? (kindRoll < 0.55 ? 'skill' : 'memory')
            : 'skill';
      // How good you are is what opens the window. A derby is still the tightest
      // night of the season, but being the best player on the pitch shows up.
      const quality = (player.overall - 70) * 0.42 + (player.attrs.tec - 70) * 0.18;
      const width = clamp(10, 32, 20 - (stake === 'derby' ? 5 : 0) + quality);
      mini = {
        kind, stake,
        luckIndex: rng.int(3),
        picks: 1,
        // sharper players read the run off fewer touches
        sequence: Array.from(
          { length: player.attrs.vis >= 84 ? 3 : player.attrs.vis >= 72 ? 4 : 5 },
          () => rng.int(4),
        ),
        target: 18 + rng.int(64),
        width,
      };
    }
    // Only club minigames spend the cooldown. Sharing it with the international
    // ones meant tournament nights ate the budget and the derby stopped showing
    // up at all — they are different occasions and should not compete.
    player.miniCooldown = (mini && mini.stake !== 'tournament')
      ? 2
      : Math.max(0, (player.miniCooldown ?? 0) - 1);
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
      comps: clubT.comps,
      availableGames: out.availableGames,
      decision: os.decision,
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

    set({
      player, stages, trophies, lastSeason: record, year, seasonNews: news,
      // the biggest honour of the season stops the game for a moment
      celebrating: pickCelebration(allTitles),
      miniGame: mini,
      ntRun: ntRunState ? { ...ntRunState, stageIdx: stages.length - 1 } : null,
    });

    // A run that ended without ever needing the player is closed out here, now
    // that the season record it patches actually exists.
    if (ntRunState && autoFinish) {
      finishNtRun(
        set, get,
        { ...ntRunState, stageIdx: stages.length - 1, caps: autoFinish.caps, goals: autoFinish.goals },
        autoFinish.result,
        { ...player },
        autoFinish.result === 'champion',
      );
    }
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
      player: null, year: CAREER.startYear, stages: [], trophies: [], lastSeason: null, ntRun: null,
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
      forcedLocked: false,
      cards: dealPreseason(player, rng, CAREER.preseasonCards),
      cardChosen: null,
      eventDeltas: [],
    },
  });
}
