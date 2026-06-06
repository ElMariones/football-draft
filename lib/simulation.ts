import { TEAMS, getTeam } from '@/data';
import { EraKey, Player, Position, Team, TeamEra } from '@/data/types';
import { randomEra } from './randomizer';
import { rand, shuffle } from './random';
import type { DraftedPlayer, DraftSlot } from './draft';

// A real-team starting XI is the first 11 players in the team data file
// (the rest are bench / depth used for the draft pool but not the sim).
const STARTING_COUNT = 11;

// ---------- public types ----------

export interface TeamSnapshot {
  id: string;
  name: string;
  shortName: string;
  era: string; // EraKey for real teams, anything for fantasy
  colors: { primary: string; secondary: string };
  attackRating: number;
  defenseRating: number;
  overallRating: number;
  manager?: string;
  notes?: string;
  formation: string;
  players: Player[];
  // For fantasy XIs, the source team/era of each drafted player (same order as players).
  sources?: { teamId: string; teamName: string; era: EraKey }[];
}

export interface Scorer {
  playerName: string;
  teamId: string;
  minute: number;
  assistName?: string;
}

export interface MatchResult {
  matchday: number;
  home: { teamId: string; goals: number };
  away: { teamId: string; goals: number };
  scorers: Scorer[];
}

export interface TableRow {
  teamId: string;
  name: string;
  shortName: string;
  era: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
}

export interface ScorerRow {
  playerName: string;
  teamId: string;
  teamName: string;
  goals: number;
  assists: number;
}

export interface PlayerStat {
  player: Player;
  goals: number;
  assists: number;
  appearances: number;
  rating: number; // composite end-of-season rating 0-10
}

export interface SeasonResult {
  playerTeam: TeamSnapshot;
  rivals: TeamSnapshot[];
  fixtures: MatchResult[];     // player team's 38 matches only
  allFixtures: MatchResult[];  // entire league
  table: TableRow[];
  topScorers: ScorerRow[];
  mvp: PlayerStat;
  playerSquadStats: PlayerStat[];
  finalPosition: number;
  generatedAt: string;
}

// ---------- rating helpers ----------

const FW: Position[] = ['ST', 'CF', 'LW', 'RW'];
const MID: Position[] = ['CM', 'CDM', 'CAM', 'LM', 'RM'];
const DEF: Position[] = ['CB', 'RB', 'LB', 'RWB', 'LWB'];

function avg(nums: number[]): number {
  return nums.length ? nums.reduce((s, n) => s + n, 0) / nums.length : 70;
}

export function snapshotTeam(team: Team, eraKey: EraKey): TeamSnapshot {
  const era = team.eras[eraKey]!;
  // Only the first 11 players are the starting XI; later entries are bench
  // depth used for the draft pool, not the season simulation.
  const starters = era.players.slice(0, STARTING_COUNT);

  const fws = starters.filter(p => FW.includes(p.position)).map(p => p.overall);
  const mids = starters.filter(p => MID.includes(p.position)).map(p => p.overall);
  const defs = starters.filter(p => DEF.includes(p.position)).map(p => p.overall);
  const gk = starters.find(p => p.position === 'GK')?.overall ?? 70;

  const attack = avg(fws) * 0.55 + avg(mids) * 0.35 + avg(defs) * 0.10;
  const defense = avg(defs) * 0.55 + gk * 0.30 + avg(mids) * 0.15;
  const overall = avg(starters.map(p => p.overall));

  return {
    id: team.id,
    name: team.name,
    shortName: team.shortName,
    era: eraKey,
    colors: team.colors,
    manager: era.manager,
    notes: era.notes,
    formation: era.formation,
    players: starters,
    attackRating: Math.round(attack * 10) / 10,
    defenseRating: Math.round(defense * 10) / 10,
    overallRating: Math.round(overall * 10) / 10,
  };
}

// ---------- match sim ----------

const BASE_GOALS = 1.30;
const HOME_ADV = 0.25;
const RATING_SKEW_EXP = 4.0; // higher = ratings matter more

function samplePoisson(lambda: number): number {
  const l = Math.max(0.05, Math.min(lambda, 7));
  const L = Math.exp(-l);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rand();
  } while (p > L);
  return k - 1;
}

function expectedGoals(attackerOff: number, defenderDef: number, isHome: boolean): number {
  // Ratio centred at 1.0 = balanced; >1.0 = favoured. The exponent compresses
  // mismatches at the bottom and stretches them at the top, so a 90-rated
  // attack absolutely punishes a 70-rated defence.
  const ratio = attackerOff / defenderDef;
  const skew = Math.pow(ratio, RATING_SKEW_EXP);
  return BASE_GOALS * skew + (isHome ? HOME_ADV : 0);
}

// Better teams produce more *consistent* results. We sample Poisson N times
// and round the average. N=1 is pure chaos; N=3 smooths out upsets.
function consistencyFactor(overallRating: number): number {
  // 85+ overall → 3 samples (very consistent)
  // 80+ overall → 2 samples (fairly consistent)
  // below 80   → 1 sample  (chaotic / upset-prone)
  if (overallRating >= 85) return 3;
  if (overallRating >= 80) return 2;
  return 1;
}

function sampleConsistentPoisson(lambda: number, overallRating: number): number {
  const n = consistencyFactor(overallRating);
  if (n === 1) return samplePoisson(lambda);
  let total = 0;
  for (let i = 0; i < n; i++) total += samplePoisson(lambda);
  return Math.round(total / n);
}

function pickScorer(snap: TeamSnapshot): Player {
  // Weight by position role and overall.
  const weights = snap.players.map(p => {
    if (FW.includes(p.position)) return Math.pow(p.overall / 70, 3) * 5;
    if (p.position === 'CAM')   return Math.pow(p.overall / 70, 3) * 3.5;
    if (MID.includes(p.position)) return Math.pow(p.overall / 70, 3) * 1.6;
    if (DEF.includes(p.position)) return Math.pow(p.overall / 70, 3) * 0.5;
    return 0.05; // GK
  });
  return weightedPick(snap.players, weights);
}

function pickAssister(snap: TeamSnapshot, scorer: Player): Player | undefined {
  const candidates = snap.players.filter(p => p !== scorer);
  const weights = candidates.map(p => {
    if (p.position === 'CAM') return Math.pow(p.overall / 70, 3) * 4;
    if (MID.includes(p.position)) return Math.pow(p.overall / 70, 3) * 2.5;
    if (FW.includes(p.position)) return Math.pow(p.overall / 70, 3) * 2;
    if (['RB', 'LB', 'RWB', 'LWB'].includes(p.position)) return Math.pow(p.overall / 70, 3) * 1.2;
    return 0.3;
  });
  if (rand() < 0.25) return undefined;
  return weightedPick(candidates, weights);
}

function weightedPick<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((s, w) => s + w, 0);
  let roll = rand() * total;
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return items[i];
  }
  return items[items.length - 1];
}

export function simulateMatch(
  home: TeamSnapshot,
  away: TeamSnapshot,
  matchday: number,
): MatchResult {
  const homeXG = expectedGoals(home.attackRating, away.defenseRating, true);
  const awayXG = expectedGoals(away.attackRating, home.defenseRating, false);
  const homeGoals = sampleConsistentPoisson(homeXG, home.overallRating);
  const awayGoals = sampleConsistentPoisson(awayXG, away.overallRating);

  const scorers: Scorer[] = [];
  for (let i = 0; i < homeGoals; i++) {
    const sc = pickScorer(home);
    const as = pickAssister(home, sc);
    scorers.push({
      playerName: sc.name,
      teamId: home.id,
      minute: 1 + Math.floor(rand() * 90),
      assistName: as?.name,
    });
  }
  for (let i = 0; i < awayGoals; i++) {
    const sc = pickScorer(away);
    const as = pickAssister(away, sc);
    scorers.push({
      playerName: sc.name,
      teamId: away.id,
      minute: 1 + Math.floor(rand() * 90),
      assistName: as?.name,
    });
  }
  scorers.sort((a, b) => a.minute - b.minute);

  return {
    matchday,
    home: { teamId: home.id, goals: homeGoals },
    away: { teamId: away.id, goals: awayGoals },
    scorers,
  };
}

// ---------- season sim ----------

function generateRivals(playerTeamId: string): TeamSnapshot[] {
  // Each real PL team appears at most once, with a single randomly chosen era.
  const pool = TEAMS.filter(t => t.id !== playerTeamId);
  const shuffled = shuffle([...pool]).slice(0, 19);
  return shuffled.map(t => snapshotTeam(t, randomEra(t)));
}

function blankRow(snap: TeamSnapshot): TableRow {
  return {
    teamId: snap.id,
    name: snap.name,
    shortName: snap.shortName,
    era: snap.era,
    played: 0, won: 0, drawn: 0, lost: 0,
    gf: 0, ga: 0, gd: 0, points: 0,
  };
}

function applyResult(table: Record<string, TableRow>, m: MatchResult) {
  const h = table[m.home.teamId];
  const a = table[m.away.teamId];
  if (!h || !a) return;
  h.played++; a.played++;
  h.gf += m.home.goals; h.ga += m.away.goals;
  a.gf += m.away.goals; a.ga += m.home.goals;
  if (m.home.goals > m.away.goals) {
    h.won++; h.points += 3; a.lost++;
  } else if (m.home.goals < m.away.goals) {
    a.won++; a.points += 3; h.lost++;
  } else {
    h.drawn++; a.drawn++;
    h.points++; a.points++;
  }
  h.gd = h.gf - h.ga;
  a.gd = a.gf - a.ga;
}

function buildFixtures(teams: TeamSnapshot[]): { home: TeamSnapshot; away: TeamSnapshot; matchday: number }[] {
  // Round-robin via the "circle" method. For N=20 teams: 19 first-half matchdays
  // of 10 matches each, then mirror for the second half (matchdays 20..38).
  if (teams.length % 2 !== 0) throw new Error('Need even number of teams');
  const n = teams.length;
  const fixed = teams[0];
  const rotating = teams.slice(1);
  const k = rotating.length; // n - 1
  const half = n / 2;
  const rounds = n - 1;

  const fixtures: { home: TeamSnapshot; away: TeamSnapshot; matchday: number }[] = [];

  for (let r = 0; r < rounds; r++) {
    // Match the fixed team with rotating[r mod k]
    const opp = rotating[r % k];
    if (r % 2 === 0) {
      fixtures.push({ home: fixed, away: opp, matchday: r + 1 });
    } else {
      fixtures.push({ home: opp, away: fixed, matchday: r + 1 });
    }
    // Pair the remaining rotating teams as: rotating[(r+i) mod k] vs rotating[(r+k-i) mod k]
    for (let i = 1; i < half; i++) {
      const a = rotating[(r + i) % k];
      const b = rotating[(r + k - i) % k];
      if ((r + i) % 2 === 0) {
        fixtures.push({ home: a, away: b, matchday: r + 1 });
      } else {
        fixtures.push({ home: b, away: a, matchday: r + 1 });
      }
    }
  }

  // Second half: reverse each fixture.
  const reverse = fixtures.map(f => ({
    home: f.away,
    away: f.home,
    matchday: f.matchday + rounds,
  }));

  return [...fixtures, ...reverse];
}

// Builds a TeamSnapshot for the user's drafted fantasy XI.
export function buildFantasySnapshot(
  slots: DraftSlot[],
  opts: {
    id?: string;
    name?: string;
    shortName?: string;
    colors?: { primary: string; secondary: string };
    formation: string;
    manager?: string;
    notes?: string;
  },
): TeamSnapshot {
  const players: Player[] = slots.map(s => {
    if (!s.player) throw new Error('Cannot snapshot incomplete fantasy XI');
    return s.player.player;
  });
  const sources = slots.map(s => ({
    teamId: s.player!.sourceTeamId,
    teamName: s.player!.sourceTeamName,
    era: s.player!.sourceEra,
  }));

  const fws = players.filter(p => FW.includes(p.position)).map(p => p.overall);
  const mids = players.filter(p => MID.includes(p.position)).map(p => p.overall);
  const defs = players.filter(p => DEF.includes(p.position)).map(p => p.overall);
  const gk = players.find(p => p.position === 'GK')?.overall ?? 70;

  const attack = avg(fws) * 0.55 + avg(mids) * 0.35 + avg(defs) * 0.10;
  const defense = avg(defs) * 0.55 + gk * 0.30 + avg(mids) * 0.15;
  const overall = avg(players.map(p => p.overall));

  return {
    id: opts.id ?? 'fantasy-xi',
    name: opts.name ?? 'Your Fantasy XI',
    shortName: opts.shortName ?? 'XI',
    era: 'all-time',
    colors: opts.colors ?? { primary: '#FFD700', secondary: '#0a0a0f' },
    manager: opts.manager ?? 'You',
    notes: opts.notes ?? 'Hand-picked across the Premier League era.',
    formation: opts.formation,
    players,
    sources,
    attackRating: Math.round(attack * 10) / 10,
    defenseRating: Math.round(defense * 10) / 10,
    overallRating: Math.round(overall * 10) / 10,
  };
}

// Runs a full season for any pre-built TeamSnapshot.
export function simulateSeasonForSnapshot(playerTeam: TeamSnapshot): SeasonResult {
  const rivals = generateRivals(playerTeam.id);
  const all = [playerTeam, ...rivals];

  const fixtures = buildFixtures(all);
  const tableMap: Record<string, TableRow> = {};
  all.forEach(t => { tableMap[t.id] = blankRow(t); });

  const playerFixtures: MatchResult[] = [];
  const allResults: MatchResult[] = [];
  const scorerCounter: Record<string, { goals: number; assists: number; teamId: string }> = {};

  for (const f of fixtures) {
    const m = simulateMatch(f.home, f.away, f.matchday);
    allResults.push(m);
    applyResult(tableMap, m);
    if (m.home.teamId === playerTeam.id || m.away.teamId === playerTeam.id) {
      playerFixtures.push(m);
    }
    for (const s of m.scorers) {
      const k = `${s.teamId}::${s.playerName}`;
      if (!scorerCounter[k]) scorerCounter[k] = { goals: 0, assists: 0, teamId: s.teamId };
      scorerCounter[k].goals++;
      if (s.assistName) {
        const ak = `${s.teamId}::${s.assistName}`;
        if (!scorerCounter[ak]) scorerCounter[ak] = { goals: 0, assists: 0, teamId: s.teamId };
        scorerCounter[ak].assists++;
      }
    }
  }

  playerFixtures.sort((a, b) => a.matchday - b.matchday);

  // Build top scorers list (top 10).
  const scorerRows: ScorerRow[] = Object.entries(scorerCounter).map(([k, v]) => {
    const name = k.split('::')[1];
    const t = all.find(x => x.id === v.teamId);
    return {
      playerName: name,
      teamId: v.teamId,
      teamName: t ? (t.era && t.era !== 'all-time' ? `${t.name} (${t.era})` : t.name) : '',
      goals: v.goals,
      assists: v.assists,
    };
  });
  scorerRows.sort((a, b) => b.goals - a.goals || b.assists - a.assists);

  // Player team stats per squad member.
  const playerSquadStats: PlayerStat[] = playerTeam.players.map(p => {
    const k = `${playerTeam.id}::${p.name}`;
    const c = scorerCounter[k] ?? { goals: 0, assists: 0, teamId: playerTeam.id };
    const baseRating = p.overall / 10;
    const productionBonus =
      (FW.includes(p.position) ? c.goals * 0.06 : c.goals * 0.04) +
      c.assists * 0.03;
    return {
      player: p,
      goals: c.goals,
      assists: c.assists,
      appearances: 38,
      rating: Math.max(1, Math.min(10, Math.round((baseRating + productionBonus) * 10) / 10)),
    };
  });

  // MVP: best composite (goals + 0.7 assists + rating bonus).
  const mvp = [...playerSquadStats].sort((a, b) => {
    const sA = a.goals + a.assists * 0.7 + a.rating * 0.6;
    const sB = b.goals + b.assists * 0.7 + b.rating * 0.6;
    return sB - sA;
  })[0];

  const sortedTable = Object.values(tableMap).sort((a, b) =>
    b.points - a.points || b.gd - a.gd || b.gf - a.gf,
  );
  const finalPosition = sortedTable.findIndex(r => r.teamId === playerTeam.id) + 1;

  return {
    playerTeam,
    rivals,
    fixtures: playerFixtures,
    allFixtures: allResults,
    table: sortedTable,
    topScorers: scorerRows.slice(0, 10),
    mvp,
    playerSquadStats,
    finalPosition,
    generatedAt: new Date().toISOString(),
  };
}

// Compact JSON for sending to OpenAI (strips noisy fields, keeps insight payload).
export function seasonToCompactJSON(s: SeasonResult): string {
  return JSON.stringify({
    yourTeam: {
      name: s.playerTeam.name,
      era: s.playerTeam.era,
      manager: s.playerTeam.manager,
      notes: s.playerTeam.notes,
      formation: s.playerTeam.formation,
      attack: s.playerTeam.attackRating,
      defense: s.playerTeam.defenseRating,
      overall: s.playerTeam.overallRating,
      xi: s.playerTeam.players.map((p, i) => {
        const src = s.playerTeam.sources?.[i];
        return {
          name: p.name,
          pos: p.position,
          ovr: p.overall,
          ...(src ? { from: `${src.teamName} ${src.era}` } : {}),
        };
      }),
    },
    finalPosition: s.finalPosition,
    points: s.table.find(t => t.teamId === s.playerTeam.id)?.points,
    record: (() => {
      const r = s.table.find(t => t.teamId === s.playerTeam.id);
      return r ? { W: r.won, D: r.drawn, L: r.lost, GF: r.gf, GA: r.ga } : null;
    })(),
    topTable: s.table.slice(0, 6).map((r, i) => ({
      pos: i + 1, name: r.name, P: r.points, GD: r.gd,
    })),
    topScorers: s.topScorers.slice(0, 5).map(sc => ({
      name: sc.playerName, team: sc.teamName, goals: sc.goals, assists: sc.assists,
    })),
    yourMvp: {
      name: s.mvp.player.name,
      pos: s.mvp.player.position,
      goals: s.mvp.goals,
      assists: s.mvp.assists,
      seasonRating: s.mvp.rating,
    },
    yourTopScorers: s.playerSquadStats
      .filter(p => p.goals > 0)
      .sort((a, b) => b.goals - a.goals)
      .slice(0, 5)
      .map(p => ({ name: p.player.name, pos: p.player.position, goals: p.goals, assists: p.assists })),
  }, null, 2);
}
