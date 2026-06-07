'use client';

import { useGameStore } from '@/store/gameStore';

// ---------- types ----------

export type Language = 'en' | 'es';

// ---------- english ----------

export const en = {
  nav: {
    tagline: 'Spin · Pick · Conquer',
    footer: 'Built for fun. All trademarks belong to their respective owners.',
  },
  landing: {
    headingPL: 'BUILD YOUR XI',
    headingCL: 'CONQUER EUROPE',
    descPL: 'Spin for a Premier League side. Pick one player. Repeat 11 times to forge your fantasy XI, then play out a full season.',
    descCL: 'Spin for a European giant. Pick one player. Repeat 11 times, then group stage and knockouts await.',
    competition: 'Competition',
    teamName: 'Team Name',
    teamNamePlaceholder: 'Drafted Team',
    formation: 'Formation',
    difficulty: 'Difficulty',
    spinPick1: 'SPIN PICK 1',
    autoFill: '⚡ Auto-fill XI (debug)',
  },
  draft: {
    yourXI: 'Your XI',
    pick: (n: number, total: number) => `Pick ${n} / ${total}`,
    spinForPlayer: (n: number) => `Spin for player #${n}`,
    undoLastPick: '← Undo Last Pick',
    spin: 'SPIN',
    drawing: 'Drawing pick…',
    reelsSpinning: 'Reels are spinning',
    team: 'Team',
    era: 'Era',
    changePlayer: '← Change Player',
    tapToPlace: (name: string) => `Tap a glowing slot on your XI to place ${name}`,
    xiLockedIn: 'XI LOCKED IN',
    lockedDescPL: '11 players, picked from across the eras. Time to find out how they fare in a 38-game season.',
    lockedDescCL: '11 players, picked from across the eras. Time to conquer Europe.',
    changeLastPick: '← Change Last Pick',
    startSeason: 'Start Season →',
    simulationError: (msg: string) => `Simulation error: ${msg}`,
    squadOrigins: 'Squad Origins',
    defaultTeamName: 'Drafted Team',
    rerollTeam: 'Reroll team',
    rerollEra: 'Reroll era',
  },
  season: {
    matchday: (n: number) => `Matchday ${n}`,
    playback: 'Season Playback',
    pause: 'Pause',
    resume: 'Resume',
    skipToEnd: 'Skip to End',
    seeFinalResults: 'See Final Results →',
    leagueTable: 'League Table',
    headers: { pos: '#', team: 'Team', played: 'P', won: 'W', drawn: 'D', gd: 'GD', pts: 'Pts' },
  },
  results: {
    finalPosition: 'FINAL POSITION',
    seasonMvp: 'SEASON MVP',
    topScorers: 'LEAGUE TOP SCORERS',
    yourSquad: (f: string) => `YOUR SQUAD · ${f}`,
    analyzing: 'Generating AI Analysis…',
    getAnalysis: 'Get AI Season Analysis',
    spinAgain: 'Spin Again',
    positionLabel: (p: number): string => {
      if (p === 1) return 'CHAMPIONS';
      if (p === 2) return 'RUNNERS-UP';
      if (p <= 4) return 'CHAMPIONS LEAGUE';
      if (p <= 7) return 'EUROPA / CONFERENCE';
      if (p <= 17) return 'MID-TABLE';
      return 'RELEGATED';
    },
    stats: { goals: 'Goals', assists: 'Assists', rating: 'Rating' },
    pills: { w: 'W', d: 'D', l: 'L', gf: 'GF', ga: 'GA', pts: 'Pts' },
  },
  cl: {
    title: 'Champions League',
    pause: 'Pause',
    resume: 'Resume',
    skipToFinal: 'Skip to Final',
    seeFinalResults: 'See Final Results →',
    groupStage: 'Group Stage',
    group: (letter: string) => `Group ${letter}`,
    groupMatchday: (md: number) => `Group Stage · Matchday ${md}`,
    roundLabel: (round: string) => ({ 'quarter-finals': 'Quarter-final', 'semi-finals': 'Semi-final', final: 'Final' }[round] ?? round),
    legTitle: (round: string, leg: 1 | 2) => round === 'final' ? 'Final' : `${{ 'quarter-finals': 'Quarter-final', 'semi-finals': 'Semi-final', final: 'Final' }[round] ?? round} · Leg ${leg}`,
    legAgg: (round: string) => `${{ 'quarter-finals': 'Quarter-final', 'semi-finals': 'Semi-final', final: 'Final' }[round] ?? round} · AGG`,
    describeStage: (kind: string, matchday?: number, round?: string, leg?: number) => {
      if (kind === 'group') return `Group Stage · Matchday ${matchday}`;
      if (round === 'final') return 'Final';
      const lbl = { 'quarter-finals': 'Quarter-final', 'semi-finals': 'Semi-final', final: 'Final' }[round ?? ''] ?? round;
      return `${lbl} · Leg ${leg}`;
    },
    knockoutBracket: 'Knockout Bracket',
    qf: 'QF',
    sf: 'SF',
    final: 'FINAL',
    tbd: 'TBD',
    agg: 'AGG',
    pens: (h: number, a: number) => `Pens ${h}-${a}`,
    pensLong: (h: number, a: number) => `pens ${h}-${a}`,
    leg1Score: (h: number, a: number) => `Leg 1: ${h}-${a}`,
  },
  clResults: {
    yourFinish: 'YOUR FINISH',
    stageLabel: (s: string) => ({ group: 'Group Stage', 'quarter-finals': 'Quarter-finals', 'semi-finals': 'Semi-finals', final: 'Final', champion: 'CHAMPIONS OF EUROPE' }[s] ?? s),
    stageBlurb: (s: string) => ({
      group: 'Crashed out before the knockouts.',
      'quarter-finals': 'A respectable European run, but not enough.',
      'semi-finals': 'One step away from the final.',
      final: 'Runners-up. So close to the trophy.',
      champion: 'Kings of Europe!',
    }[s] ?? ''),
    yourMvp: 'YOUR MVP',
    topScorers: 'TOURNAMENT TOP SCORERS',
    yourSquad: (f: string) => `YOUR SQUAD · ${f}`,
    analyzing: 'Generating AI Briefing…',
    getAnalysis: 'Get AI Campaign Analysis',
    runItBack: 'Run It Back',
    eliminatedBy: (name: string) => `Eliminated by ${name}`,
    champion: '🏆 Champion:',
    runnerUp: '🥈',
    stats: { goals: 'Goals', assists: 'Assists', rating: 'Rating' },
  },
  ai: {
    label: 'AI SEASON BRIEFING',
    verdict: 'The Verdict',
    backToStats: '← Back to Stats',
    spinAgain: 'Spin Again →',
  },
  apiKey: {
    title: 'OpenAI API Key',
    description: "Paste your key to unlock AI-powered season analysis. Your key is stored only in your browser's local storage and sent directly to our server-side proxy to call OpenAI.",
    placeholder: 'sk-...',
    clear: 'Clear',
    cancel: 'Cancel',
    saved: 'Saved ✓',
    save: 'Save',
  },
  difficulty: {
    easy:   { label: 'Easy',    tagline: '1 + 1 per pick',  description: 'Each pick comes with 1 team reroll and 1 era reroll. Lots of safety.' },
    normal: { label: 'Normal',  tagline: '3 + 3 total',     description: 'A shared pool of 3 team rerolls and 3 era rerolls across the entire 11-pick draft. Pick your spots.' },
    sandbox:{ label: 'Sandbox', tagline: 'Unlimited',       description: 'Spin and reroll forever. Build your dream XI with zero pressure.' },
  },
  mode: {
    pl: { label: 'Premier League',   tagline: '20 teams · 38 games',           description: 'Draft from any of the 20 Premier League clubs across every era. Play a full 38-game league season.' },
    cl: { label: 'Champions League', tagline: '16 clubs · groups + knockouts', description: 'Draft from European royalty — the top 6 English plus Real, Barça, Bayern, Juve, Milan and more. Conquer Europe through groups and a single-leg KO bracket.' },
  },
  formations: {
    '4-3-3':  'Classic three-up-top',
    '4-4-2':  'Two strikers, wide play',
    '4-2-3-1':'Double pivot + #10',
    '3-5-2':  'Wingbacks, packed midfield',
    '4-5-1':  'Compact, lone striker',
    '3-4-3':  'Wide front three',
  } as Record<string, string>,
  pool: {
    instruction: 'Pick one player. Highlighted players fit at least one empty slot in your XI.',
    canFill: 'Can fill a slot →',
    noSlot: 'No matching open slot',
  },
  banner: {
    clLabel: 'Champions League · all-time XI',
    plLabel: 'All-time fantasy XI',
    formation: 'FORMATION',
    att: 'ATT', def: 'DEF', ovr: 'OVR',
  },
  postSim: {
    addKey: 'Add your OpenAI key',
    unlockVerdict: 'to unlock the AI verdict.',
    downloadSeason: 'Download season JSON',
    downloadCampaign: 'Download campaign JSON',
  },
  error: {
    title: 'SOMETHING BROKE',
    heading: 'Render error',
    help: 'Open the browser console (F12) for the full stack. Click below to try again.',
    reset: 'Reset',
  },
};

// ---------- spanish ----------

export const es: typeof en = {
  nav: {
    tagline: 'Gira · Elige · Conquista',
    footer: 'Hecho por diversión. Todas las marcas pertenecen a sus respectivos propietarios.',
  },
  landing: {
    headingPL: 'FORMA TU XI',
    headingCL: 'CONQUISTA EUROPA',
    descPL: 'Gira para obtener un equipo de la Premier League. Elige un jugador. Repite 11 veces para forjar tu XI fantasy y juega una temporada completa.',
    descCL: 'Gira para obtener un gigante europeo. Elige un jugador. Repite 11 veces y enfréntate a la fase de grupos y las eliminatorias.',
    competition: 'Competición',
    teamName: 'Nombre del equipo',
    teamNamePlaceholder: 'Mi equipo',
    formation: 'Formación',
    difficulty: 'Dificultad',
    spinPick1: 'GIRAR SELECCIÓN 1',
    autoFill: '⚡ Rellenar XI (debug)',
  },
  draft: {
    yourXI: 'Tu XI',
    pick: (n, total) => `Selección ${n} / ${total}`,
    spinForPlayer: (n) => `Gira para el jugador #${n}`,
    undoLastPick: '← Deshacer última elección',
    spin: 'GIRAR',
    drawing: 'Sorteando selección…',
    reelsSpinning: 'Los carretes están girando',
    team: 'Equipo',
    era: 'Era',
    changePlayer: '← Cambiar jugador',
    tapToPlace: (name) => `Toca una casilla iluminada en tu XI para colocar ${name}`,
    xiLockedIn: 'XI COMPLETO',
    lockedDescPL: '11 jugadores elegidos de distintas épocas. Hora de descubrir cómo rinden en 38 partidos.',
    lockedDescCL: '11 jugadores elegidos de distintas épocas. Hora de conquistar Europa.',
    changeLastPick: '← Cambiar última elección',
    startSeason: 'Iniciar temporada →',
    simulationError: (msg) => `Error de simulación: ${msg}`,
    squadOrigins: 'Origen del equipo',
    defaultTeamName: 'Mi equipo',
    rerollTeam: 'Cambiar equipo',
    rerollEra: 'Cambiar era',
  },
  season: {
    matchday: (n) => `Jornada ${n}`,
    playback: 'Simulación de temporada',
    pause: 'Pausar',
    resume: 'Reanudar',
    skipToEnd: 'Ir al final',
    seeFinalResults: 'Ver resultados finales →',
    leagueTable: 'Clasificación',
    headers: { pos: '#', team: 'Equipo', played: 'PJ', won: 'G', drawn: 'E', gd: 'DG', pts: 'Pts' },
  },
  results: {
    finalPosition: 'POSICIÓN FINAL',
    seasonMvp: 'MVP DE LA TEMPORADA',
    topScorers: 'MÁXIMOS GOLEADORES',
    yourSquad: (f) => `TU EQUIPO · ${f}`,
    analyzing: 'Generando informe de IA…',
    getAnalysis: 'Obtener análisis de IA',
    spinAgain: 'Jugar de nuevo',
    positionLabel: (p) => {
      if (p === 1) return 'CAMPEONES';
      if (p === 2) return 'SUBCAMPEONES';
      if (p <= 4) return 'CHAMPIONS LEAGUE';
      if (p <= 7) return 'EUROPA / CONFERENCE';
      if (p <= 17) return 'MITAD DE TABLA';
      return 'DESCENDIDO';
    },
    stats: { goals: 'Goles', assists: 'Asistencias', rating: 'Valoración' },
    pills: { w: 'G', d: 'E', l: 'P', gf: 'GF', ga: 'GC', pts: 'Pts' },
  },
  cl: {
    title: 'Champions League',
    pause: 'Pausar',
    resume: 'Reanudar',
    skipToFinal: 'Ir a la final',
    seeFinalResults: 'Ver resultados finales →',
    groupStage: 'Fase de grupos',
    group: (letter) => `Grupo ${letter}`,
    groupMatchday: (md) => `Fase de grupos · Jornada ${md}`,
    roundLabel: (round) => ({ 'quarter-finals': 'Cuartos de final', 'semi-finals': 'Semifinal', final: 'Final' }[round] ?? round),
    legTitle: (round, leg) => round === 'final' ? 'Final' : `${{ 'quarter-finals': 'Cuartos de final', 'semi-finals': 'Semifinal', final: 'Final' }[round] ?? round} · ${leg === 1 ? 'Ida' : 'Vuelta'}`,
    legAgg: (round) => `${{ 'quarter-finals': 'Cuartos de final', 'semi-finals': 'Semifinal', final: 'Final' }[round] ?? round} · GLOBAL`,
    describeStage: (kind, matchday, round, leg) => {
      if (kind === 'group') return `Fase de grupos · Jornada ${matchday}`;
      if (round === 'final') return 'Final';
      const lbl = { 'quarter-finals': 'Cuartos de final', 'semi-finals': 'Semifinal', final: 'Final' }[round ?? ''] ?? round;
      return `${lbl} · ${leg === 1 ? 'Ida' : 'Vuelta'}`;
    },
    knockoutBracket: 'Cuadro eliminatorio',
    qf: 'CF',
    sf: 'SF',
    final: 'FINAL',
    tbd: 'POR DEF.',
    agg: 'GLOBAL',
    pens: (h, a) => `Pens ${h}-${a}`,
    pensLong: (h, a) => `pens ${h}-${a}`,
    leg1Score: (h, a) => `Ida: ${h}-${a}`,
  },
  clResults: {
    yourFinish: 'TU RESULTADO',
    stageLabel: (s) => ({ group: 'Fase de grupos', 'quarter-finals': 'Cuartos de final', 'semi-finals': 'Semifinales', final: 'Final', champion: 'CAMPEONES DE EUROPA' }[s] ?? s),
    stageBlurb: (s) => ({
      group: 'Eliminados antes de las rondas eliminatorias.',
      'quarter-finals': 'Una respetable campaña europea, pero no suficiente.',
      'semi-finals': 'A un paso de la final.',
      final: 'Subcampeones. Tan cerca del trofeo.',
      champion: '¡Reyes de Europa!',
    }[s] ?? ''),
    yourMvp: 'TU MVP',
    topScorers: 'MÁXIMOS GOLEADORES DEL TORNEO',
    yourSquad: (f) => `TU EQUIPO · ${f}`,
    analyzing: 'Generando informe de IA…',
    getAnalysis: 'Obtener análisis de campaña',
    runItBack: 'Volver a jugar',
    eliminatedBy: (name) => `Eliminado por ${name}`,
    champion: '🏆 Campeón:',
    runnerUp: '🥈',
    stats: { goals: 'Goles', assists: 'Asistencias', rating: 'Valoración' },
  },
  ai: {
    label: 'INFORME DE IA',
    verdict: 'El veredicto',
    backToStats: '← Volver a estadísticas',
    spinAgain: 'Jugar de nuevo →',
  },
  apiKey: {
    title: 'Clave API de OpenAI',
    description: 'Pega tu clave para desbloquear el análisis de IA de la temporada. Tu clave se almacena solo en el almacenamiento local de tu navegador y se envía directamente a nuestro proxy para llamar a OpenAI.',
    placeholder: 'sk-...',
    clear: 'Borrar',
    cancel: 'Cancelar',
    saved: 'Guardado ✓',
    save: 'Guardar',
  },
  difficulty: {
    easy:   { label: 'Fácil',   tagline: '1 + 1 por selección', description: 'Cada selección incluye 1 cambio de equipo y 1 de era. Sin presión.' },
    normal: { label: 'Normal',  tagline: '3 + 3 en total',      description: 'Un banco compartido de 3 cambios de equipo y 3 de era para todo el draft. Elige bien.' },
    sandbox:{ label: 'Libre',   tagline: 'Ilimitado',           description: 'Gira y cambia sin límites. Construye tu XI ideal sin ninguna presión.' },
  },
  mode: {
    pl: { label: 'Premier League',   tagline: '20 equipos · 38 partidos',        description: 'Elige entre los 20 clubes de la Premier League a través de todas las eras. Juega una temporada completa de 38 partidos.' },
    cl: { label: 'Champions League', tagline: '16 clubes · grupos + eliminatorias', description: 'Elige entre la realeza europea — el top 6 inglés más Real, Barça, Bayern, Juve, Milán y más. Conquista Europa en grupos y eliminatorias.' },
  },
  formations: {
    '4-3-3':  'El clásico tres arriba',
    '4-4-2':  'Dos delanteros, juego por bandas',
    '4-2-3-1':'Doble pivote + número 10',
    '3-5-2':  'Carrileros, mediocampo poblado',
    '4-5-1':  'Compacto, delantero solitario',
    '3-4-3':  'Tres arriba por bandas',
  } as Record<string, string>,
  pool: {
    instruction: 'Elige un jugador. Los resaltados encajan en al menos una casilla libre de tu XI.',
    canFill: 'Puede ocupar una casilla →',
    noSlot: 'Sin casilla disponible',
  },
  banner: {
    clLabel: 'Champions League · XI histórico',
    plLabel: 'XI fantasy histórico',
    formation: 'FORMACIÓN',
    att: 'ATQ', def: 'DEF', ovr: 'GLB',
  },
  postSim: {
    addKey: 'Añade tu clave de OpenAI',
    unlockVerdict: 'para desbloquear el veredicto de IA.',
    downloadSeason: 'Descargar JSON de temporada',
    downloadCampaign: 'Descargar JSON de campaña',
  },
  error: {
    title: 'ALGO FALLÓ',
    heading: 'Error de renderizado',
    help: 'Abre la consola del navegador (F12) para ver el error completo. Haz clic abajo para intentarlo de nuevo.',
    reset: 'Reiniciar',
  },
};

// ---------- registry ----------

export const translations: Record<Language, typeof en> = { en, es };

// ---------- browser detection ----------

export function detectLanguage(): Language {
  if (typeof window === 'undefined') return 'en';
  const saved = localStorage.getItem('football-draft-lang') as Language | null;
  if (saved === 'en' || saved === 'es') return saved;
  const lang = navigator.language.toLowerCase();
  return lang.startsWith('es') ? 'es' : 'en';
}

// ---------- hook ----------

export function useT() {
  const language = useGameStore(s => s.language);
  return translations[language];
}
