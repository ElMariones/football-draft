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
import { WC_TEAMS } from '@/data';

// ---------- public types ----------

// How far the player's XI got. 'third-place' means they lost the semi but won
// the bronze-medal match; a semi-final loser who also loses it stays at
// 'semi-finals'.
export type WCStage =
  | 'group'
  | 'quarter-finals'
  | 'semi-finals'
  | 'third-place'
  | 'final'
  | 'champion';

export type WCRound = 'quarter-finals' | 'semi-finals' | 'third-place' | 'final';

export interface WCGroup {
  letter: string;          // 'A' | 'B' | 'C' | 'D'
  teamIds: string[];       // 4 team ids
  matches: MatchResult[];  // 6 matches — single round-robin, 3 per team
  table: TableRow[];
}

// World Cup knockouts are one-off matches: extra drama, no second legs.
export interface WCKnockoutTie {
  round: WCRound;
  home: TeamSnapshot;      // "home" side at a neutral venue
  away: TeamSnapshot;
  match: MatchResult;
  shootout?: { home: number; away: number };
  winner: TeamSnapshot;
}

export interface WCResult {
  mode: 'wc';
  playerTeam: TeamSnapshot;
  rivals: TeamSnapshot[];
  groups: WCGroup[];
  knockout: WCKnockoutTie[];  // 4 QFs, 2 SFs, third-place match, final
  champion: TeamSnapshot;
  runnerUp: TeamSnapshot;
  thirdPlace: TeamSnapshot;
  playerStage: WCStage;
  playerEliminator?: TeamSnapshot;
  topScorers: ScorerRow[];    // the Golden Boot race
  mvp: PlayerStat;            // your squad's Golden Ball
  playerSquadStats: PlayerStat[];
  playerMatches: MatchResult[];
  generatedAt: string;
}

// ---------- pool ----------

function generateRivalsForWC(playerTeamId: string): TeamSnapshot[] {
  const pool = WC_TEAMS.filter(t => t.id !== playerTeamId);
  // 15 rivals + the player's XI = a 16-nation World Cup.
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

function playGroup(teams: TeamSnapshot[], letter: string): WCGroup {
  // Real World Cup group: single round-robin, 3 matchdays of 2 games.
  const pairings: [number, number, number][] = [
    // [home, away, matchday]
    [0, 1, 1], [2, 3, 1],
    [0, 2, 2], [3, 1, 2],
    [3, 0, 3], [1, 2, 3],
  ];
  const matches: MatchResult[] = [];
  const rows: Record<string, TableRow> = {};
  teams.forEach(t => { rows[t.id] = blankRow(t); });

  for (const [h, a, md] of pairings) {
    const m = simulateMatch(teams[h], teams[a], md);
    matches.push(m);
    applyResult(rows, m);
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
  const homeProb = Math.min(0.92, 0.55 + home.overallRating / 250);
  const awayProb = Math.min(0.92, 0.55 + away.overallRating / 250);
  let homeScore = 0;
  let awayScore = 0;
  for (let i = 0; i < 5; i++) {
    if (rand() < homeProb) homeScore++;
    if (rand() < awayProb) awayScore++;
  }
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
  round: WCRound,
  matchday: number,
): WCKnockoutTie {
  const match = simulateMatch(home, away, matchday);
  if (match.home.goals !== match.away.goals) {
    return {
      round, home, away, match,
      winner: match.home.goals > match.away.goals ? home : away,
    };
  }
  const so = shootoutWinner(home, away);
  return { round, home, away, match, shootout: so.score, winner: so.winner };
}

// ---------- main entry ----------

export function simulateWorldCup(playerTeam: TeamSnapshot): WCResult {
  const rivals = generateRivalsForWC(playerTeam.id);
  const all = [playerTeam, ...rivals];          // 16 nations
  const seeded = shuffle([...all]);

  // 4 groups of 4.
  const groupLetters = ['A', 'B', 'C', 'D'];
  const groups: WCGroup[] = [];
  for (let g = 0; g < 4; g++) {
    groups.push(playGroup(seeded.slice(g * 4, g * 4 + 4), groupLetters[g]));
  }

  const playerMatches: MatchResult[] = [];
  const playerGroup = groups.find(g => g.teamIds.includes(playerTeam.id))!;
  playerGroup.matches.forEach(m => {
    if (m.home.teamId === playerTeam.id || m.away.teamId === playerTeam.id) {
      playerMatches.push(m);
    }
  });

  const allMatches: MatchResult[] = [];
  groups.forEach(g => allMatches.push(...g.matches));

  // Classic 16-team bracket: W(A) vs R(B), W(C) vs R(D), W(B) vs R(A), W(D) vs R(C).
  const winners = groups.map(g => snapById(all, g.table[0].teamId));
  const runners = groups.map(g => snapById(all, g.table[1].teamId));

  const knockout: WCKnockoutTie[] = [];
  const qfPairs: [TeamSnapshot, TeamSnapshot][] = [
    [winners[0], runners[1]],
    [winners[2], runners[3]],
    [winners[1], runners[0]],
    [winners[3], runners[2]],
  ];
  const qfWinners: TeamSnapshot[] = [];
  qfPairs.forEach(([h, a], i) => {
    const tie = playKO(h, a, 'quarter-finals', i + 1);
    knockout.push(tie);
    qfWinners.push(tie.winner);
    allMatches.push(tie.match);
  });

  const sfPairs: [TeamSnapshot, TeamSnapshot][] = [
    [qfWinners[0], qfWinners[1]],
    [qfWinners[2], qfWinners[3]],
  ];
  const sfWinners: TeamSnapshot[] = [];
  const sfLosers: TeamSnapshot[] = [];
  sfPairs.forEach(([h, a], i) => {
    const tie = playKO(h, a, 'semi-finals', i + 1);
    knockout.push(tie);
    sfWinners.push(tie.winner);
    sfLosers.push(tie.winner.id === h.id ? a : h);
    allMatches.push(tie.match);
  });

  // Bronze-medal match, then the final.
  const thirdTie = playKO(sfLosers[0], sfLosers[1], 'third-place', 1);
  knockout.push(thirdTie);
  allMatches.push(thirdTie.match);

  const finalTie = playKO(sfWinners[0], sfWinners[1], 'final', 1);
  knockout.push(finalTie);
  allMatches.push(finalTie.match);

  const champion = finalTie.winner;
  const runnerUp = champion.id === sfWinners[0].id ? sfWinners[1] : sfWinners[0];
  const thirdPlace = thirdTie.winner;

  // Goal/assist tally across every match.
  type Counter = { goals: number; assists: number; teamId: string };
  const counter: Record<string, Counter> = {};
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

  // Player progression — walk the bracket adding their KO matches in order.
  let playerStage: WCStage = 'group';
  let playerEliminator: TeamSnapshot | undefined;

  const advanced =
    playerGroup.table[0].teamId === playerTeam.id ||
    playerGroup.table[1].teamId === playerTeam.id;

  if (advanced) {
    playerStage = 'quarter-finals';
    const myQF = knockout.find(
      t => t.round === 'quarter-finals' && involves(t, playerTeam.id),
    );
    if (myQF) {
      playerMatches.push(myQF.match);
      if (myQF.winner.id !== playerTeam.id) {
        playerEliminator = otherSide(myQF, playerTeam.id);
      } else {
        playerStage = 'semi-finals';
        const mySF = knockout.find(
          t => t.round === 'semi-finals' && involves(t, playerTeam.id),
        );
        if (mySF) {
          playerMatches.push(mySF.match);
          if (mySF.winner.id !== playerTeam.id) {
            playerEliminator = otherSide(mySF, playerTeam.id);
            // Semi-final losers still play for bronze.
            playerMatches.push(thirdTie.match);
            if (thirdTie.winner.id === playerTeam.id) playerStage = 'third-place';
          } else {
            playerStage = 'final';
            playerMatches.push(finalTie.match);
            if (finalTie.winner.id === playerTeam.id) {
              playerStage = 'champion';
            } else {
              playerEliminator = otherSide(finalTie, playerTeam.id);
            }
          }
        }
      }
    }
  }

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
      (FW_POS.includes(p.position) ? c.goals * 0.12 : c.goals * 0.08) +
      c.assists * 0.06;
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
    mode: 'wc',
    playerTeam,
    rivals,
    groups,
    knockout,
    champion,
    runnerUp,
    thirdPlace,
    playerStage,
    playerEliminator,
    topScorers: scorerRows.slice(0, 10),
    mvp,
    playerSquadStats,
    playerMatches,
    generatedAt: new Date().toISOString(),
  };
}

function involves(tie: WCKnockoutTie, teamId: string): boolean {
  return tie.home.id === teamId || tie.away.id === teamId;
}

function otherSide(tie: WCKnockoutTie, teamId: string): TeamSnapshot {
  return tie.home.id === teamId ? tie.away : tie.home;
}

function snapById(all: TeamSnapshot[], id: string): TeamSnapshot {
  return all.find(t => t.id === id)!;
}

export function wcToCompactJSON(s: WCResult): string {
  return JSON.stringify({
    competition: 'FIFA World Cup',
    yourTeam: {
      name: s.playerTeam.name,
      manager: {
        name: s.playerTeam.manager,
        ovr: s.playerTeam.managerRating,
        ...(s.playerTeam.managerSource ? { drawnFrom: s.playerTeam.managerSource } : {}),
      },
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
    champion: { name: s.champion.name, edition: s.champion.era },
    runnerUp: { name: s.runnerUp.name, edition: s.runnerUp.era },
    thirdPlace: { name: s.thirdPlace.name, edition: s.thirdPlace.era },
    groups: s.groups.map(g => ({
      letter: g.letter,
      table: g.table.slice(0, 4).map((r, i) => ({
        pos: i + 1, name: r.name, edition: r.era, P: r.points, GD: r.gd,
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
    goldenBootRace: s.topScorers.slice(0, 5).map(sc => ({
      name: sc.playerName, team: sc.teamName, goals: sc.goals, assists: sc.assists,
    })),
    yourMvp: {
      name: s.mvp.player.name,
      pos: s.mvp.player.position,
      goals: s.mvp.goals,
      assists: s.mvp.assists,
      tournamentRating: s.mvp.rating,
    },
  }, null, 2);
}
