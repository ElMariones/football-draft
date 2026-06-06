import { PL_TEAMS, getTeam, availableEras } from '@/data';
import { EraKey, Team } from '@/data/types';
import { pickOne } from './random';

// Every spin draws from a *pool* of teams (PL teams for league mode,
// CL teams for Champions League mode). The pool is supplied by the caller.

export function randomTeam(pool: Team[], excludeId?: string): Team {
  const list = excludeId ? pool.filter(t => t.id !== excludeId) : pool;
  return pickOne(list);
}

export function randomEra(team: Team, excludeKey?: EraKey): EraKey {
  const all = availableEras(team);
  const list = excludeKey && all.length > 1 ? all.filter(e => e !== excludeKey) : all;
  return pickOne(list);
}

export function randomDraft(pool: Team[]): { team: Team; era: EraKey } {
  const team = randomTeam(pool);
  const era = randomEra(team);
  return { team, era };
}

export function rerollTeamKeepEra(
  pool: Team[],
  currentTeamId: string,
  currentEra: EraKey,
): { team: Team; era: EraKey } {
  const candidates = pool.filter(t => t.id !== currentTeamId && t.eras[currentEra]);
  if (candidates.length > 0) {
    return { team: pickOne(candidates), era: currentEra };
  }
  const team = randomTeam(pool, currentTeamId);
  return { team, era: randomEra(team) };
}

export function rerollEraKeepTeam(teamId: string, currentEra: EraKey): { team: Team; era: EraKey } {
  const team = getTeam(teamId)!;
  return { team, era: randomEra(team, currentEra) };
}

// Backwards-compatible default for callers that haven't been migrated yet
// (e.g. the /api/sim-test debug route which is PL-only).
export const DEFAULT_POOL = PL_TEAMS;
