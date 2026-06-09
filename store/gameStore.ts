'use client';

import { create } from 'zustand';
import { EraKey, Formation } from '@/data/types';
import { getTeam } from '@/data';
import { ManagerEntry, buildManagerPool } from '@/data/managers';
import { pickOne, shuffle } from '@/lib/random';
import { Language, detectLanguage } from '@/lib/i18n';
import { SeasonResult, buildFantasySnapshot, simulateSeasonForSnapshot } from '@/lib/simulation';
import {
  DIFFICULTIES,
  Difficulty,
  DraftSlot,
  DraftedPlayer,
  buildEmptyXI,
  DEFAULT_FORMATION,
  canFill,
  countDrafted,
  eligibleSlotIndices,
  xiComplete,
  Mode,
  MODES,
} from '@/lib/draft';
import {
  randomDraft,
  rerollEraKeepTeam,
  rerollTeamKeepEra,
} from '@/lib/randomizer';
import { simulateCLSeason, CLResult } from '@/lib/championsLeague';

export type Phase =
  | 'idle'
  | 'spinning'
  | 'reveal'
  | 'placing'
  | 'manager-spin'      // XI complete — waiting for the final manager spin
  | 'manager-spinning'  // manager reel is animating
  | 'roster-complete'
  | 'simulating'
  | 'finished'
  | 'analysis'
  | 'press-conference';

const TOTAL_PICKS = 11;

interface CurrentSpin {
  teamId: string;
  era: EraKey;
}

interface Rerolls {
  team: number;
  era: number;
}

interface GameState {
  phase: Phase;
  language: Language;
  mode: Mode;
  difficulty: Difficulty;
  hardcore: boolean;
  formation: Formation;
  teamName: string;
  xi: DraftSlot[];
  pickIndex: number;
  pickHistory: number[];       // slot indices in pick order (for undo)
  currentSpin: CurrentSpin | null;
  selectedPlayerIdx: number | null;
  pickRerolls: Rerolls;
  globalRerolls: Rerolls;
  rerolling: 'team' | 'era' | null;
  manager: ManagerEntry | null;          // drafted via the final manager spin
  managerSpinTarget: ManagerEntry | null;
  managerWheel: ManagerEntry[] | null;   // reel candidates (includes the target)
  season: SeasonResult | null;
  clResult: CLResult | null;
  aiAnalysis: string | null;
  pressSummary: string | null;
  apiKeyPresent: boolean;
  simulationError: string | null;
  savedSeasonId: string | null;

  setLanguage: (l: Language) => void;
  setMode: (m: Mode) => void;
  setDifficulty: (d: Difficulty) => void;
  setHardcore: (h: boolean) => void;
  setFormation: (f: Formation) => void;
  setTeamName: (n: string) => void;
  setPhase: (p: Phase) => void;
  startSpin: () => void;
  finishSpin: () => void;
  startManagerSpin: () => void;
  finishManagerSpin: () => void;
  rerollManager: () => void;
  managerRerollAvailable: () => boolean;
  rerollTeam: () => void;
  rerollEra: () => void;
  rerollTeamAvailable: () => boolean;
  rerollEraAvailable: () => boolean;
  clearRerollAnim: () => void;
  selectPlayer: (idx: number) => void;
  cancelSelection: () => void;
  assignToSlot: (slotIdx: number) => void;
  undoLastPick: () => void;
  autoFillXI: () => void;
  startSeason: (defaultTeamName?: string) => void;
  setSeason: (s: SeasonResult) => void;
  setAnalysis: (a: string) => void;
  setPressSummary: (s: string) => void;
  setApiKeyPresent: (b: boolean) => void;
  setSavedSeasonId: (id: string | null) => void;
  reset: () => void;
}

function freshPickRerolls(diff: Difficulty): Rerolls {
  const cfg = DIFFICULTIES[diff];
  return cfg.perPick ? { ...cfg.perPick } : { team: 0, era: 0 };
}

function freshGlobalRerolls(diff: Difficulty): Rerolls {
  const cfg = DIFFICULTIES[diff];
  return cfg.global ? { ...cfg.global } : { team: 0, era: 0 };
}

export const useGameStore = create<GameState>((set, get) => ({
  phase: 'idle',
  language: detectLanguage(),
  mode: 'pl',
  difficulty: 'normal',
  hardcore: false,
  formation: DEFAULT_FORMATION,
  teamName: '',
  xi: buildEmptyXI(DEFAULT_FORMATION),
  pickIndex: 0,
  pickHistory: [],
  currentSpin: null,
  selectedPlayerIdx: null,
  pickRerolls: freshPickRerolls('normal'),
  globalRerolls: freshGlobalRerolls('normal'),
  rerolling: null,
  manager: null,
  managerSpinTarget: null,
  managerWheel: null,
  season: null,
  clResult: null,
  aiAnalysis: null,
  pressSummary: null,
  apiKeyPresent: false,
  simulationError: null,
  savedSeasonId: null,

  setSavedSeasonId: savedSeasonId => set({ savedSeasonId }),

  setLanguage: language => {
    localStorage.setItem('football-draft-lang', language);
    set({ language });
  },

  setHardcore: hardcore => set({ hardcore }),

  setMode: mode => {
    // Only allow before drafting starts. Changing mode resets the XI.
    if (get().pickIndex > 0) return;
    set({ mode, xi: buildEmptyXI(get().formation) });
  },

  setDifficulty: difficulty => {
    set({
      difficulty,
      pickRerolls: freshPickRerolls(difficulty),
      globalRerolls: freshGlobalRerolls(difficulty),
    });
  },

  setFormation: formation => {
    if (get().pickIndex > 0) return;
    set({ formation, xi: buildEmptyXI(formation) });
  },

  setTeamName: teamName => set({ teamName }),

  setPhase: phase => set({ phase }),

  startSpin: () => {
    const pool = MODES[get().mode].pool;
    const { team, era } = randomDraft(pool);
    set({
      phase: 'spinning',
      currentSpin: { teamId: team.id, era },
      selectedPlayerIdx: null,
      pickRerolls: freshPickRerolls(get().difficulty),
    });
  },

  finishSpin: () => set({ phase: 'reveal' }),

  // Final spin of the draft: a manager drawn from all the bosses who coached
  // the mode's clubs across the eras. The reel shows a sample of candidates.
  startManagerSpin: () => {
    const pool = buildManagerPool(MODES[get().mode].pool);
    if (pool.length === 0) return;
    const target = pickOne(pool);
    const others = shuffle(pool.filter(m => m.name !== target.name)).slice(0, 13);
    const wheel = shuffle([...others, target]);
    set({
      phase: 'manager-spinning',
      managerSpinTarget: target,
      managerWheel: wheel,
      // Per-pick difficulties refresh their reroll budget for the manager
      // spin, exactly like every player pick does.
      pickRerolls: freshPickRerolls(get().difficulty),
    });
  },

  finishManagerSpin: () => {
    const target = get().managerSpinTarget;
    if (!target) return;
    set({ manager: target, phase: 'roster-complete' });
  },

  // Leftover rerolls (team + era combined, per the mode's difficulty) can be
  // spent on re-spinning the manager.
  managerRerollAvailable: () => {
    const { difficulty, pickRerolls, globalRerolls } = get();
    const cfg = DIFFICULTIES[difficulty];
    const budget = cfg.perPick ? pickRerolls : cfg.global ? globalRerolls : { team: 0, era: 0 };
    return budget.team + budget.era > 0;
  },

  rerollManager: () => {
    const { manager, mode, difficulty, pickRerolls, globalRerolls } = get();
    if (!get().managerRerollAvailable()) return;
    const pool = buildManagerPool(MODES[mode].pool).filter(m => m.name !== manager?.name);
    if (pool.length === 0) return;
    const target = pickOne(pool);
    const others = shuffle(pool.filter(m => m.name !== target.name)).slice(0, 13);
    const wheel = shuffle([...others, target]);
    const cfg = DIFFICULTIES[difficulty];
    const consume = (r: Rerolls): Rerolls =>
      r.team > 0 ? { ...r, team: r.team - 1 } : { ...r, era: r.era - 1 };
    set({
      phase: 'manager-spinning',
      managerSpinTarget: target,
      managerWheel: wheel,
      manager: null,
      pickRerolls: cfg.perPick ? consume(pickRerolls) : pickRerolls,
      globalRerolls: cfg.global ? consume(globalRerolls) : globalRerolls,
    });
  },

  rerollTeamAvailable: () => {
    const { difficulty, pickRerolls, globalRerolls } = get();
    const cfg = DIFFICULTIES[difficulty];
    if (cfg.perPick) return pickRerolls.team > 0;
    if (cfg.global) return globalRerolls.team > 0;
    return false;
  },

  rerollEraAvailable: () => {
    const { difficulty, pickRerolls, globalRerolls } = get();
    const cfg = DIFFICULTIES[difficulty];
    if (cfg.perPick) return pickRerolls.era > 0;
    if (cfg.global) return globalRerolls.era > 0;
    return false;
  },

  clearRerollAnim: () => set({ rerolling: null }),

  rerollTeam: () => {
    const { currentSpin, difficulty, pickRerolls, globalRerolls, mode } = get();
    if (!currentSpin) return;
    if (!get().rerollTeamAvailable()) return;
    const next = rerollTeamKeepEra(MODES[mode].pool, currentSpin.teamId, currentSpin.era);
    const cfg = DIFFICULTIES[difficulty];
    set({
      currentSpin: { teamId: next.team.id, era: next.era },
      // Cancel any in-progress player selection.
      selectedPlayerIdx: null,
      phase: 'reveal',
      rerolling: 'team',
      pickRerolls: cfg.perPick
        ? { ...pickRerolls, team: pickRerolls.team - 1 }
        : pickRerolls,
      globalRerolls: cfg.global
        ? { ...globalRerolls, team: globalRerolls.team - 1 }
        : globalRerolls,
    });
    // Auto-clear the animation cue.
    setTimeout(() => {
      if (get().rerolling === 'team') set({ rerolling: null });
    }, 700);
  },

  rerollEra: () => {
    const { currentSpin, difficulty, pickRerolls, globalRerolls } = get();
    if (!currentSpin) return;
    if (!get().rerollEraAvailable()) return;
    const next = rerollEraKeepTeam(currentSpin.teamId, currentSpin.era);
    const cfg = DIFFICULTIES[difficulty];
    set({
      currentSpin: { teamId: next.team.id, era: next.era },
      selectedPlayerIdx: null,
      phase: 'reveal',
      rerolling: 'era',
      pickRerolls: cfg.perPick
        ? { ...pickRerolls, era: pickRerolls.era - 1 }
        : pickRerolls,
      globalRerolls: cfg.global
        ? { ...globalRerolls, era: globalRerolls.era - 1 }
        : globalRerolls,
    });
    setTimeout(() => {
      if (get().rerolling === 'era') set({ rerolling: null });
    }, 700);
  },

  selectPlayer: idx => {
    const { currentSpin, xi } = get();
    if (!currentSpin) return;
    const team = getTeam(currentSpin.teamId);
    if (!team) return;
    const player = team.eras[currentSpin.era]?.players[idx];
    if (!player) return;
    const slots = eligibleSlotIndices(xi, player.position);
    if (slots.length === 0) return;
    set({ selectedPlayerIdx: idx, phase: 'placing' });
  },

  cancelSelection: () => {
    set({ selectedPlayerIdx: null, phase: 'reveal' });
  },

  assignToSlot: slotIdx => {
    const { xi, currentSpin, selectedPlayerIdx, pickIndex, pickHistory } = get();
    if (selectedPlayerIdx == null || !currentSpin) return;
    const team = getTeam(currentSpin.teamId);
    if (!team) return;
    const era = team.eras[currentSpin.era];
    if (!era) return;
    const player = era.players[selectedPlayerIdx];
    if (!player) return;
    const slot = xi[slotIdx];
    if (!slot || slot.player) return;
    if (!canFill(player.position, slot.position)) return;

    const drafted: DraftedPlayer = {
      player,
      sourceTeamId: team.id,
      sourceTeamName: team.name,
      sourceEra: currentSpin.era,
    };
    const newXI = xi.map((s, i) => (i === slotIdx ? { ...s, player: drafted } : s));
    const complete = xiComplete(newXI);

    set({
      xi: newXI,
      selectedPlayerIdx: null,
      pickIndex: pickIndex + 1,
      pickHistory: [...pickHistory, slotIdx],
      currentSpin: null,
      phase: complete ? 'manager-spin' : 'idle',
      pickRerolls: complete ? get().pickRerolls : freshPickRerolls(get().difficulty),
    });
  },

  undoLastPick: () => {
    const { xi, pickIndex, pickHistory } = get();
    if (pickIndex === 0 || pickHistory.length === 0) return;
    const lastSlotIdx = pickHistory[pickHistory.length - 1];
    const newXI = xi.map((s, i) => (i === lastSlotIdx ? { ...s, player: null } : s));
    set({
      xi: newXI,
      pickIndex: pickIndex - 1,
      pickHistory: pickHistory.slice(0, -1),
      phase: 'idle',
      currentSpin: null,
      selectedPlayerIdx: null,
      pickRerolls: freshPickRerolls(get().difficulty),
      // Stepping back into the draft voids the manager spin.
      manager: null,
      managerSpinTarget: null,
      managerWheel: null,
    });
  },

  // Debug helper: fills the XI by randomly walking teams.
  // Triggered by the "Auto-Fill XI" button on the landing screen.
  autoFillXI: () => {
    const { formation, mode } = get();
    const xi = buildEmptyXI(formation);
    const history: number[] = [];
    const pool = MODES[mode].pool;

    for (let slotIdx = 0; slotIdx < xi.length; slotIdx++) {
      const slot = xi[slotIdx];
      const teams = [...pool].sort(() => Math.random() - 0.5);
      let placed = false;
      for (const team of teams) {
        const eraKeys = Object.keys(team.eras);
        for (const eraKey of eraKeys.sort(() => Math.random() - 0.5)) {
          const era = team.eras[eraKey as keyof typeof team.eras];
          if (!era) continue;
          const cand = era.players.find(p => canFill(p.position, slot.position));
          if (cand) {
            xi[slotIdx] = {
              ...slot,
              player: {
                player: cand,
                sourceTeamId: team.id,
                sourceTeamName: team.name,
                sourceEra: eraKey as any,
              },
            };
            history.push(slotIdx);
            placed = true;
            break;
          }
        }
        if (placed) break;
      }
    }

    const managerPool = buildManagerPool(pool);
    set({
      xi,
      pickIndex: xi.length,
      pickHistory: history,
      currentSpin: null,
      selectedPlayerIdx: null,
      manager: managerPool.length ? pickOne(managerPool) : null,
      phase: 'roster-complete',
    });
    console.log('[FootballDraft] Auto-filled XI for debug', xi);
  },

  startSeason: (defaultTeamName = 'Drafted Team') => {
    const { xi, formation, teamName, mode, manager } = get();
    console.log('[FootballDraft] startSeason mode=', mode, 'complete?', xiComplete(xi));
    if (!xiComplete(xi)) return;
    try {
      const name = teamName.trim() || defaultTeamName;
      const initials = name
        .split(/\s+/)
        .map(w => w[0])
        .filter(Boolean)
        .slice(0, 3)
        .join('')
        .toUpperCase() || 'XI';
      const snapshot = buildFantasySnapshot(xi, {
        formation,
        name,
        shortName: initials,
        manager: manager?.name,
        managerRating: manager?.overall,
        managerSource: manager ? `${manager.teamName} ${manager.era}` : undefined,
        colors:
          mode === 'cl'
            ? { primary: '#3DA9FC', secondary: '#0a0a0f' }
            : mode === 'll'
            ? { primary: '#C8102E', secondary: '#FFFFFF' }
            : undefined,
      });
      if (mode === 'cl') {
        const clResult = simulateCLSeason(snapshot);
        console.log('[FootballDraft] CL simulated', {
          stage: clResult.playerStage,
          champion: clResult.champion.name,
        });
        set({ clResult, season: null, phase: 'simulating', simulationError: null });
      } else {
        const season = simulateSeasonForSnapshot(snapshot, MODES[mode].pool);
        console.log('[FootballDraft] PL simulated', {
          fixtures: season.fixtures.length,
          finalPosition: season.finalPosition,
        });
        set({ season, clResult: null, phase: 'simulating', simulationError: null });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[FootballDraft] Season simulation failed:', err);
      set({ simulationError: msg });
    }
  },

  setSeason: season => set({ season, phase: 'finished' }),
  setAnalysis: aiAnalysis => set({ aiAnalysis, phase: 'analysis' }),
  setPressSummary: pressSummary => set({ pressSummary, phase: 'press-conference' }),
  setApiKeyPresent: apiKeyPresent => set({ apiKeyPresent }),

  reset: () => {
    const { difficulty, formation } = get();
    set({
      phase: 'idle',
      xi: buildEmptyXI(formation),
      pickIndex: 0,
      pickHistory: [],
      currentSpin: null,
      selectedPlayerIdx: null,
      pickRerolls: freshPickRerolls(difficulty),
      globalRerolls: freshGlobalRerolls(difficulty),
      rerolling: null,
      manager: null,
      managerSpinTarget: null,
      managerWheel: null,
      season: null,
      clResult: null,
      aiAnalysis: null,
      pressSummary: null,
      simulationError: null,
      savedSeasonId: null,
    });
  },
}));

export { TOTAL_PICKS };
