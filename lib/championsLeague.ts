import { Player } from '@/data/types';
import { rand, shuffle } from './random';
import { randomEra } from './randomizer';
import {
  TeamSnapshot,
  MatchResult,
  TableRow,
  ScorerRow,
  PlayerStat,
  simulateMatch,
  snapshotTeam,
} from './simulation';
import { CL_TEAMS } from '@/data';

// ---------- public types ----------

export type CLStage = 'group' | 'quarter-finals' | 'semi-finals' | 'final' | 'champion';

export interface CLGroup {
  letter: string;          // 'A' | 'B' | 'C' | 'D'
  teamIds: string[];       // 4 team ids
  matches: MatchResult[];  // 12 group matches
  table: TableRow[];
}

export interface CLKnockoutTie {
  round: 'quarter-finals' | 'semi-finals' | 'final';
  home: TeamSnapshot;
  away: TeamSnapshot;
  match: MatchResult;
  // Optional shootout if the 90-minute match was level.
  shootout?: { home: number; away: number };
  winner: TeamSnapshot;
}

export interface CLResult {
  mode: 'cl';
  playerTeam: TeamSnapshot;
  rivals: TeamSnapshot[];
  groups: CLGroup[];
  knockout: CLKnockoutTie[];
  champion: TeamSnapshot;
  runnerUp: TeamSnapshot;
  playerStage: CLStage;       // how far the player got
  playerEliminator?: TeamSnapshot;
  topScorers: ScorerRow[];
  mvp: PlayerStat;
  playerSquadStats: PlayerStat[];
  playerMatches: MatchResult[]; // ordered list of every game the player played
  generatedAt: string;
}

// ---------- pool ----------

function generateRivalsForCL(playerTeamId: string): TeamSnapshot[] {
  const pool = CL_TEAMS.filter(t => t.id !== playerTeamId);
  // We need exactly 15 rivals.
  const shuffled = shuffle([...pool]).slice(0, 15);
  return shuffled.map(t => snapshotTeam(t, randomEra(t)));
}

// ---------- group stage ----------

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

function applyResult(rows: Record<string, TableRow>, m: MatchResult) {
  const h = rows[m.home.teamId];
  const a = rows[m.away.teamId];
  if (!h || !a) return;
  h.played++; a.played++;
  h.gf += m.home.goals; h.ga += m.away.goals;
  a.gf += m.away.goals; a.ga += m.home.goals;
  if (m.home.goals > m.away.goals) { h.won++; h.points += 3; a.lost++; }
  else if (m.home.goals < m.away.goals) { a.won++; a.points += 3; h.lost++; }
  else { h.drawn++; a.drawn++; h.points++; a.points++; }
  h.gd = h.gf - h.ga; a.gd = a.gf - a.ga;
}

function playGroup(teams: TeamSnapshot[], letter: string): CLGroup {
  // Each pair plays home and away → 12 fixtures across 6 matchdays.
  const matches: MatchResult[] = [];
  const rows: Record<string, TableRow> = {};
  teams.forEach(t => { rows[t.id] = blankRow(t); });

  // Generate fixture order: simple double round-robin.
  for (let i = 0; i < teams.length; i++) {
    for (let j = 0; j < teams.length; j++) {
      if (i === j) continue;
      // i hosts j
      const matchday = matches.length / (teams.length * (teams.length - 1) / 2) + 1;
      const m = simulateMatch(teams[i], teams[j], Math.ceil(matchday));
      matches.push(m);
      applyResult(rows, m);
    }
  }

  const table = Object.values(rows).sort((a, b) =>
    b.points - a.points || b.gd - a.gd || b.gf - a.gf,
  );

  return { letter, teamIds: teams.map(t => t.id), matches, table };
}

// ---------- knockouts ----------

function shootoutWinner(home: TeamSnapshot, away: TeamSnapshot): {
  winner: TeamSnapshot;
  score: { home: number; away: number };
} {
  // Five spot kicks each. Goal probability is 70% baseline, nudged a touch by
  // overall rating so an elite XI converts slightly more often.
  const homeProb = Math.min(0.92, 0.55 + home.overallRating / 250);
  const awayProb = Math.min(0.92, 0.55 + away.overallRating / 250);
  let homeScore = 0;
  let awayScore = 0;
  for (let i = 0; i < 5; i++) {
    if (rand() < homeProb) homeScore++;
    if (rand() < awayProb) awayScore++;
  }
  // Sudden death until decided.
  let guard = 0;
  while (homeScore === awayScore && guard++ < 20) {
    if (rand() < homeProb) homeScore++;
    if (rand() < awayProb) awayScore++;
  }
  return {
    winner: homeScore > awayScore ? home : away,
    score: { home: homeScore, away: awayScore },
  };
}

function playKO(
  home: TeamSnapshot,
  away: TeamSnapshot,
  round: 'quarter-finals' | 'semi-finals' | 'final',
  matchday: number,
): CLKnockoutTie {
  const m = simulateMatch(home, away, matchday);
  if (m.home.goals !== m.away.goals) {
    return {
      round,
      home,
      away,
      match: m,
      winner: m.home.goals > m.away.goals ? home : away,
    };
  }
  // Level after 90 — straight to penalties.
  const so = shootoutWinner(home, away);
  return {
    round,
    home,
    away,
    match: m,
    shootout: so.score,
    winner: so.winner,
  };
}

// ---------- main entry ----------

export function simulateCLSeason(playerTeam: TeamSnapshot): CLResult {
  const rivals = generateRivalsForCL(playerTeam.id);
  const all = [playerTeam, ...rivals];          // 16 teams
  const seeded = shuffle([...all]);

  // 4 groups of 4.
  const groupLetters = ['A', 'B', 'C', 'D'];
  const groups: CLGroup[] = [];
  for (let g = 0; g < 4; g++) {
    const groupTeams = seeded.slice(g * 4, g * 4 + 4);
    groups.push(playGroup(groupTeams, groupLetters[g]));
  }

  // Track player matches in order.
  const playerMatches: MatchResult[] = [];
  const playerGroup = groups.find(g => g.teamIds.includes(playerTeam.id))!;
  playerGroup.matches.forEach(m => {
    if (m.home.teamId === playerTeam.id || m.away.teamId === playerTeam.id) {
      playerMatches.push(m);
    }
  });

  // Aggregate goals/assists across the entire tournament for top scorers + MVP.
  type Counter = { goals: number; assists: number; teamId: string };
  const counter: Record<string, Counter> = {};
  const allMatches: MatchResult[] = [];
  groups.forEach(g => allMatches.push(...g.matches));

  // KO bracket: standard CL seeding cross-group.
  const winners = groups.map(g => snapById(all, g.table[0].teamId));
  const runners = groups.map(g => snapById(all, g.table[1].teamId));

  const knockoutTies: CLKnockoutTie[] = [];
  // QF: W(A) vs R(B), W(C) vs R(D), W(B) vs R(A), W(D) vs R(C)
  const qfPairs: [TeamSnapshot, TeamSnapshot][] = [
    [winners[0], runners[1]],
    [winners[2], runners[3]],
    [winners[1], runners[0]],
    [winners[3], runners[2]],
  ];
  const qfWinners: TeamSnapshot[] = [];
  qfPairs.forEach(([h, a], i) => {
    const tie = playKO(h, a, 'quarter-finals', i + 1);
    knockoutTies.push(tie);
    qfWinners.push(tie.winner);
    allMatches.push(tie.match);
  });

  // SF: QF1 winner vs QF2 winner, QF3 winner vs QF4 winner
  const sfPairs: [TeamSnapshot, TeamSnapshot][] = [
    [qfWinners[0], qfWinners[1]],
    [qfWinners[2], qfWinners[3]],
  ];
  const sfWinners: TeamSnapshot[] = [];
  sfPairs.forEach(([h, a], i) => {
    const tie = playKO(h, a, 'semi-finals', i + 1);
    knockoutTies.push(tie);
    sfWinners.push(tie.winner);
    allMatches.push(tie.match);
  });

  // Final at neutral venue (treat the first as home for animation purposes).
  const finalTie = playKO(sfWinners[0], sfWinners[1], 'final', 1);
  knockoutTies.push(finalTie);
  allMatches.push(finalTie.match);

  const champion = finalTie.winner;
  const runnerUp = champion === sfWinners[0] ? sfWinners[1] : sfWinners[0];

  // Tally goal scorers/assists across every match.
  for (const m of allMatches) {
    for (const s of m.scorers) {
      const k = `${s.teamId}::${s.playerName}`;
      if (!counter[k]) counter[k] = { goals: 0, assists: 0, teamId: s.teamId };
      counter[k].goals++;
      if (s.assistName) {
        const ak = `${s.teamId}::${s.assistName}`;
        if (!counter[ak]) counter[ak] = { goals: 0, assists: 0, teamId: s.teamId };
        counter[ak].assists++;
      }
    }
  }

  // Determine player progression and append KO matches involving the player.
  let playerStage: CLStage = 'group';
  let playerEliminator: TeamSnapshot | undefined;

  const groupAdvanced =
    playerGroup.table[0].teamId === playerTeam.id ||
    playerGroup.table[1].teamId === playerTeam.id;
  if (!groupAdvanced) {
    playerStage = 'group';
  } else {
    playerStage = 'quarter-finals';
    const myQF = knockoutTies.find(
      t => t.round === 'quarter-finals' &&
        (t.home.id === playerTeam.id || t.away.id === playerTeam.id),
    );
    if (myQF) {
      playerMatches.push(myQF.match);
      if (myQF.winner.id !== playerTeam.id) {
        playerEliminator =
          myQF.home.id === playerTeam.id ? myQF.away : myQF.home;
      } else {
        playerStage = 'semi-finals';
        const mySF = knockoutTies.find(
          t => t.round === 'semi-finals' &&
            (t.home.id === playerTeam.id || t.away.id === playerTeam.id),
        );
        if (mySF) {
          playerMatches.push(mySF.match);
          if (mySF.winner.id !== playerTeam.id) {
            playerEliminator =
              mySF.home.id === playerTeam.id ? mySF.away : mySF.home;
          } else {
            playerStage = 'final';
            const myFinal = knockoutTies.find(t => t.round === 'final');
            if (myFinal) {
              playerMatches.push(myFinal.match);
              if (myFinal.winner.id === playerTeam.id) {
                playerStage = 'champion';
              } else {
                playerEliminator =
                  myFinal.home.id === playerTeam.id ? myFinal.away : myFinal.home;
              }
            }
          }
        }
      }
    }
  }

  // Build scorer rows + player squad stats.
  const scorerRows: ScorerRow[] = Object.entries(counter).map(([k, v]) => {
    const name = k.split('::')[1];
    const t = all.find(x => x.id === v.teamId);
    return {
      playerName: name,
      teamId: v.teamId,
      teamName: t?.name ?? '',
      goals: v.goals,
      assists: v.assists,
    };
  }).sort((a, b) => b.goals - a.goals || b.assists - a.assists);

  const appearances = playerMatches.length || 1;
  const FW_POS = ['ST', 'CF', 'LW', 'RW'];
  const playerSquadStats: PlayerStat[] = playerTeam.players.map(p => {
    const c = counter[`${playerTeam.id}::${p.name}`] ?? { goals: 0, assists: 0, teamId: playerTeam.id };
    const baseRating = p.overall / 10;
    const productionBonus =
      (FW_POS.includes(p.position) ? c.goals * 0.10 : c.goals * 0.07) +
      c.assists * 0.05;
    return {
      player: p,
      goals: c.goals,
      assists: c.assists,
      appearances,
      rating: Math.max(1, Math.min(10, Math.round((baseRating + productionBonus) * 10) / 10)),
    };
  });

  const mvp = [...playerSquadStats].sort((a, b) => {
    const sA = a.goals + a.assists * 0.7 + a.rating * 0.6;
    const sB = b.goals + b.assists * 0.7 + b.rating * 0.6;
    return sB - sA;
  })[0];

  return {
    mode: 'cl',
    playerTeam,
    rivals,
    groups,
    knockout: knockoutTies,
    champion,
    runnerUp,
    playerStage,
    playerEliminator,
    topScorers: scorerRows.slice(0, 10),
    mvp,
    playerSquadStats,
    playerMatches,
    generatedAt: new Date().toISOString(),
  };
}

function snapById(all: TeamSnapshot[], id: string): TeamSnapshot {
  return all.find(t => t.id === id)!;
}

export function clSeasonToCompactJSON(s: CLResult): string {
  return JSON.stringify({
    competition: 'UEFA Champions League',
    yourTeam: {
      name: s.playerTeam.name,
      manager: s.playerTeam.manager,
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
    playerStage: s.playerStage,
    playerEliminator: s.playerEliminator?.name,
    champion: { name: s.champion.name, era: s.champion.era },
    runnerUp: { name: s.runnerUp.name, era: s.runnerUp.era },
    groups: s.groups.map(g => ({
      letter: g.letter,
      table: g.table.slice(0, 4).map((r, i) => ({
        pos: i + 1, name: r.name, era: r.era, P: r.points, GD: r.gd,
      })),
    })),
    knockoutPath: s.knockout.map(t => ({
      round: t.round,
      home: t.home.name,
      away: t.away.name,
      score: `${t.match.home.goals}-${t.match.away.goals}` +
        (t.shootout ? ` (pens ${t.shootout.home}-${t.shootout.away})` : ''),
      winner: t.winner.name,
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
  }, null, 2);
}
