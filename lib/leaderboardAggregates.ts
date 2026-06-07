import type { SeasonResult } from './simulation';
import type { CLResult } from './championsLeague';

export interface Aggregates {
  overall: number;
  wins: number;
  draws: number;
  losses: number;
  points: number | null; // league only
}

/**
 * Extracts leaderboard aggregates from a completed run. Designed to be
 * tolerant of the shape — used both at write time (in POST /api/seasons) and
 * when backfilling old rows where some fields might be missing.
 */
export function computeAggregates(
  mode: 'pl' | 'cl' | 'll',
  payload: SeasonResult | CLResult,
): Aggregates {
  if (mode === 'cl') return computeFromCL(payload as CLResult);
  return computeFromLeague(payload as SeasonResult);
}

function computeFromLeague(s: SeasonResult): Aggregates {
  const row = s.table.find(r => r.teamId === s.playerTeam.id);
  return {
    overall: Math.round(s.playerTeam.overallRating ?? 0),
    wins: row?.won ?? 0,
    draws: row?.drawn ?? 0,
    losses: row?.lost ?? 0,
    points: row?.points ?? 0,
  };
}

function computeFromCL(r: CLResult): Aggregates {
  const playerId = r.playerTeam.id;
  let wins = 0;
  let draws = 0;
  let losses = 0;

  // Group stage — find the player's group, count their matches.
  const playerGroup = r.groups?.find(g => g.teamIds.includes(playerId));
  if (playerGroup) {
    for (const m of playerGroup.matches) {
      const involved = m.home.teamId === playerId || m.away.teamId === playerId;
      if (!involved) continue;
      const myGoals = m.home.teamId === playerId ? m.home.goals : m.away.goals;
      const theirGoals = m.home.teamId === playerId ? m.away.goals : m.home.goals;
      if (myGoals > theirGoals) wins++;
      else if (myGoals === theirGoals) draws++;
      else losses++;
    }
  }

  // Knockout legs — count each individual 90-min result for the player team.
  for (const tie of r.knockout ?? []) {
    const legs = [tie.leg1, tie.leg2].filter(Boolean) as Array<{
      home: { teamId: string; goals: number };
      away: { teamId: string; goals: number };
    }>;
    for (const leg of legs) {
      const involved = leg.home.teamId === playerId || leg.away.teamId === playerId;
      if (!involved) continue;
      const myGoals = leg.home.teamId === playerId ? leg.home.goals : leg.away.goals;
      const theirGoals = leg.home.teamId === playerId ? leg.away.goals : leg.home.goals;
      if (myGoals > theirGoals) wins++;
      else if (myGoals === theirGoals) draws++;
      else losses++;
    }
  }

  return {
    overall: Math.round(r.playerTeam.overallRating ?? 0),
    wins,
    draws,
    losses,
    points: null,
  };
}

// Numeric rank for clStage so SQL can order champions > finalists > SF > QF > group.
export function clStageRank(stage: string | null | undefined): number {
  switch (stage) {
    case 'champion':      return 4;
    case 'final':         return 3;
    case 'semi-finals':   return 2;
    case 'quarter-finals':return 1;
    case 'group':         return 0;
    default:              return -1;
  }
}
