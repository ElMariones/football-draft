'use client';

import { useGameStore } from '@/store/gameStore';

// ---------- types ----------

export type Language = 'en' | 'es';

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

// ---------- english ----------

export const en = {
  nav: {
    tagline: 'Spin · Pick · Conquer',
    footer: 'Built for fun. All trademarks belong to their respective owners.',
  },
  landing: {
    headingPL: 'BUILD YOUR XI',
    headingCL: 'CONQUER EUROPE',
    headingLL: 'DOMINA LA LIGA',
    descPL: 'Spin for a Premier League side. Pick one player. Repeat 11 times to forge your fantasy XI, then play out a full season.',
    descCL: 'Spin for a European giant. Pick one player. Repeat 11 times, then group stage and knockouts await.',
    descLL: 'Spin for a Spanish La Liga side. Pick one player. Repeat 11 times to build your fantasy XI, then play a full 38-game season in Spain.',
    competition: 'Competition',
    teamName: 'Team Name',
    teamNamePlaceholder: 'Drafted Team',
    formation: 'Formation',
    difficulty: 'Difficulty',
    spinPick1: 'SPIN PICK 1',
    autoFill: '⚡ Auto-fill XI (debug)',
    hardcore: 'Hardcore Mode',
    hardcoreDesc: 'Player ratings are hidden during the draft. Trust your knowledge, not the numbers.',
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
    description: "Paste your key to unlock AI-powered season analysis. If you're signed in, the key is encrypted and saved to your account; otherwise it stays in your browser's local storage.",
    descriptionSignedIn: 'Signed in — your key is encrypted and stored on your account. It is never returned to the browser.',
    placeholder: 'sk-...',
    placeholderStored: '•••••••••••• (stored)',
    clear: 'Clear',
    cancel: 'Cancel',
    saved: 'Saved ✓',
    save: 'Save',
    modelLabel: 'Analysis Model',
    modelHint: 'More powerful models give richer analysis but cost more per request.',
  },
  auth: {
    signIn: 'Sign in',
    signInTitle: 'Sign in with Google to save your runs',
    signOut: 'Sign out',
    account: 'Account',
    history: 'My Seasons',
  },
  leaderboard: {
    title: 'Leaderboard',
    open: 'Leaderboard',
    byOverall: 'By Squad Rating',
    byResults: 'By Results',
    loading: 'Loading…',
    empty: 'No runs yet. Be the first to climb this board.',
    anonymous: 'Anonymous',
  },
  history: {
    title: 'Your Seasons',
    empty: 'No saved runs yet. Finish a season while signed in and it will appear here.',
    backHome: '← Back to Draft',
    delete: 'Delete',
    deleteConfirm: 'Delete this run? This cannot be undone.',
    open: 'Open →',
    finalPos: (n: number) => `Finished ${n}${ordinal(n)}`,
    clStage: (s: string) => `Reached ${s}`,
    notFound: 'Run not found.',
    backToHistory: '← Back to My Seasons',
  },
  difficulty: {
    easy:   { label: 'Easy',    tagline: '1 + 1 per pick',  description: 'Each pick comes with 1 team reroll and 1 era reroll. Lots of safety.' },
    normal: { label: 'Normal',  tagline: '3 + 3 total',     description: 'A shared pool of 3 team rerolls and 3 era rerolls across the entire 11-pick draft. Pick your spots.' },
    sandbox:{ label: 'Sandbox', tagline: 'Unlimited',       description: 'Spin and reroll forever. Build your dream XI with zero pressure.' },
  },
  mode: {
    pl: { label: 'Premier League',   tagline: '20 teams · 38 games',           description: 'Draft from any of the 20 Premier League clubs across every era. Play a full 38-game league season.' },
    cl: { label: 'Champions League', tagline: '16 clubs · groups + knockouts', description: 'Draft from European royalty — the top 6 English plus Real, Barça, Bayern, Juve, Milan and more. Conquer Europe through groups and a single-leg KO bracket.' },
    ll: { label: 'La Liga',          tagline: '20 clubs · 38 games',           description: 'Draft from the 20 Spanish La Liga clubs across the eras — from Real Madrid\'s Galácticos to Celta\'s Aspas generation. Play a full 38-game Spanish season.' },
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
    llLabel: 'La Liga · all-time XI',
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
    headingLL: 'DOMINA LA LIGA',
    descPL: 'Gira para obtener un equipo de la Premier League. Elige un jugador. Repite 11 veces para forjar tu XI fantasy y juega una temporada completa.',
    descCL: 'Gira para obtener un gigante europeo. Elige un jugador. Repite 11 veces y enfréntate a la fase de grupos y las eliminatorias.',
    descLL: 'Gira para obtener un equipo de La Liga española. Elige un jugador. Repite 11 veces y juega una temporada completa de 38 partidos en España.',
    competition: 'Competición',
    teamName: 'Nombre del equipo',
    teamNamePlaceholder: 'Mi equipo',
    formation: 'Formación',
    difficulty: 'Dificultad',
    spinPick1: 'GIRAR SELECCIÓN 1',
    autoFill: '⚡ Rellenar XI (debug)',
    hardcore: 'Modo Extremo',
    hardcoreDesc: 'Las valoraciones están ocultas durante el draft. Confía en tu conocimiento, no en los números.',
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
    description: 'Pega tu clave para desbloquear el análisis de IA. Si has iniciado sesión, la clave se cifra y se guarda en tu cuenta; si no, queda solo en el almacenamiento local del navegador.',
    descriptionSignedIn: 'Sesión iniciada — tu clave se cifra y se guarda en tu cuenta. Nunca se devuelve al navegador.',
    placeholder: 'sk-...',
    placeholderStored: '•••••••••••• (guardada)',
    clear: 'Borrar',
    cancel: 'Cancelar',
    saved: 'Guardado ✓',
    save: 'Guardar',
    modelLabel: 'Modelo de análisis',
    modelHint: 'Los modelos más potentes dan análisis más ricos pero cuestan más por petición.',
  },
  auth: {
    signIn: 'Iniciar sesión',
    signInTitle: 'Inicia sesión con Google para guardar tus partidas',
    signOut: 'Cerrar sesión',
    account: 'Cuenta',
    history: 'Mis temporadas',
  },
  leaderboard: {
    title: 'Clasificación',
    open: 'Clasificación',
    byOverall: 'Por valoración',
    byResults: 'Por resultados',
    loading: 'Cargando…',
    empty: 'Aún no hay partidas. Sé el primero en escalar esta tabla.',
    anonymous: 'Anónimo',
  },
  history: {
    title: 'Tus temporadas',
    empty: 'Aún no hay partidas guardadas. Termina una temporada con sesión iniciada y aparecerá aquí.',
    backHome: '← Volver al draft',
    delete: 'Eliminar',
    deleteConfirm: '¿Eliminar esta partida? No se puede deshacer.',
    open: 'Abrir →',
    finalPos: (n: number) => `Acabó ${n}º`,
    clStage: (s: string) => `Llegó a ${s}`,
    notFound: 'Partida no encontrada.',
    backToHistory: '← Volver a mis temporadas',
  },
  difficulty: {
    easy:   { label: 'Fácil',   tagline: '1 + 1 por selección', description: 'Cada selección incluye 1 cambio de equipo y 1 de era. Sin presión.' },
    normal: { label: 'Normal',  tagline: '3 + 3 en total',      description: 'Un banco compartido de 3 cambios de equipo y 3 de era para todo el draft. Elige bien.' },
    sandbox:{ label: 'Libre',   tagline: 'Ilimitado',           description: 'Gira y cambia sin límites. Construye tu XI ideal sin ninguna presión.' },
  },
  mode: {
    pl: { label: 'Premier League',   tagline: '20 equipos · 38 partidos',        description: 'Elige entre los 20 clubes de la Premier League a través de todas las eras. Juega una temporada completa de 38 partidos.' },
    cl: { label: 'Champions League', tagline: '16 clubes · grupos + eliminatorias', description: 'Elige entre la realeza europea — el top 6 inglés más Real, Barça, Bayern, Juve, Milán y más. Conquista Europa en grupos y eliminatorias.' },
    ll: { label: 'La Liga',          tagline: '20 clubes · 38 partidos',          description: 'Elige entre los 20 clubes de La Liga española — desde los Galácticos del Real Madrid hasta la generación de Aspas en el Celta. Juega una temporada completa.' },
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
    llLabel: 'La Liga · XI histórico',
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
