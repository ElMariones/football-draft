'use client';

import { create } from 'zustand';
import { EraKey, Formation } from '@/data/types';
import { getTeam } from '@/data';
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
      phase: complete ? 'roster-complete' : 'idle',
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

    set({
      xi,
      pickIndex: xi.length,
      pickHistory: history,
      currentSpin: null,
      selectedPlayerIdx: null,
      phase: 'roster-complete',
    });
    console.log('[FootballDraft] Auto-filled XI for debug', xi);
  },

  startSeason: (defaultTeamName = 'Drafted Team') => {
    const { xi, formation, teamName, mode } = get();
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
