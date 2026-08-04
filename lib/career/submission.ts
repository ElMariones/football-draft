// The shape a finished career is submitted in, and the code that builds it.
//
// Kept out of the component so the API route can validate against exactly the
// same type the client sends, and so the aggregate columns on the leaderboard
// are derived in one place rather than twice.
import type { CareerPlayer, SeasonRecord, Title } from '@/data/career/types';
import { getClub } from '@/data/career/clubs';
import { getLeague } from '@/data/career/leagues';
import { titleName } from './competitions';
import { dayKey, isDayKey, isDailySeed } from './daily';

export interface CareerSpell {
  club: string;
  leagueId: string | null;
  from: number;
  to: number;
  apps: number;
  goals: number;
  assists: number;
  onLoan: boolean;
  titles: string[];
}

export interface CareerHistory {
  spells: CareerSpell[];
  /**
   * Every honour, counted. Grouped by resolved competition name rather than by
   * key, so three FA Cups and a Copa del Rey do not collapse into "Domestic Cup
   * x4" once the row reaches the board with no club to resolve against.
   */
  honours: { key: string; label: string; labelEs?: string; n: number }[];
  nation: {
    code: string;
    caps: number;
    goals: number;
    /** tournaments the player was at, and how far the country went */
    tournaments: { year: number; key: string; result: string }[];
  };
  /** best single season, for a one-line highlight on the board */
  bestSeason: { year: number; club: string; apps: number; goals: number; rating: number } | null;
}

export interface CareerSubmission {
  surname: string;
  nationCode: string;
  position: string;
  score: number;
  peakOverall: number;
  seasonsPlayed: number;
  trophies: number;
  goals: number;
  assists: number;
  apps: number;
  ballonDors: number;
  seed: number;
  seedSource: 'random' | 'custom' | 'daily';
  /** which day's world this was, `YYYY-MM-DD`. Daily runs only. */
  dayKey?: string;
  history: CareerHistory;
}

/**
 * Reject anything that is not a finishable, plausibly-real career.
 *
 * Lives beside the type it checks rather than inside the route so it can be
 * exercised directly — the bug that let half of all runs die at the database
 * was one this function should have caught first.
 *
 * Returns a reason, or null when the submission is acceptable.
 */
export function validateSubmission(s: CareerSubmission): string | null {
  if (s.seedSource === 'custom') {
    // The whole point of the board. A typed seed can be retried until the world
    // cooperates, so it is not comparable with a seed you were handed.
    return 'Only runs with a rolled seed are eligible for the leaderboard.';
  }
  if (s.seedSource === 'daily') {
    // Never trust the client's word for which day it played. The day's seed is a
    // pure function of the date, so recompute it and check — otherwise anyone
    // could grind a hundred attempts and post the best one as "today".
    if (!isDayKey(s.dayKey)) return 'Bad day.';
    if (!isDailySeed(s.seed, s.dayKey)) return 'That seed is not that day\'s world.';
    // A board that resets at midnight only accepts runs from the window it is
    // still showing. Yesterday's is allowed so a run finished across the reset
    // is not thrown away.
    const today = dayKey();
    const yesterday = dayKey(new Date(Date.now() - 86_400_000));
    if (s.dayKey !== today && s.dayKey !== yesterday) return 'That day is closed.';
  } else if (s.seedSource !== 'random') {
    return 'Unknown seed source.';
  }
  if (!s.surname || s.surname.length > 14) return 'Bad surname.';
  if (!s.nationCode || s.nationCode.length > 3) return 'Bad nation.';
  if (!s.position || s.position.length > 4) return 'Bad position.';
  // A rolled seed is an unsigned 32-bit number. The upper bound is checked here
  // as well as held by the column, so an out-of-range seed is a legible refusal
  // rather than a constraint violation thrown from inside the driver.
  if (!Number.isInteger(s.seed) || s.seed <= 0 || s.seed > 0xFFFFFFFF) return 'Bad seed.';

  // Bounds come straight from the engine's own limits: a career runs from 16 to
  // at most 40, overall is capped at 99, and the score is a linear function of
  // those, so anything outside cannot have come from a real run.
  if (!Number.isFinite(s.score) || s.score < 0 || s.score > 20000) return 'Score out of range.';
  if (s.seasonsPlayed < 1 || s.seasonsPlayed > 25) return 'Seasons out of range.';
  if (s.peakOverall < 40 || s.peakOverall > 99) return 'Overall out of range.';
  if (s.apps < 0 || s.apps > 1400) return 'Apps out of range.';
  if (s.goals < 0 || s.goals > s.apps * 3) return 'Goals out of range.';
  if (s.assists < 0 || s.assists > s.apps * 3) return 'Assists out of range.';
  if (s.trophies < 0 || s.trophies > 400) return 'Trophies out of range.';
  if (s.ballonDors < 0 || s.ballonDors > s.seasonsPlayed) return 'Ballon d\'Or count out of range.';
  if (!s.history || !Array.isArray(s.history.spells)) return 'Missing history.';
  if (s.history.spells.length > 30) return 'History too long.';
  return null;
}

function spellsOf(stages: SeasonRecord[]): CareerSpell[] {
  const out: CareerSpell[] = [];
  for (const s of stages) {
    const club = getClub(s.clubId);
    const last = out[out.length - 1];
    if (last && last.club === (club?.name ?? s.clubId) && last.onLoan === s.onLoan) {
      last.to = s.year;
      last.apps += s.apps; last.goals += s.goals; last.assists += s.assists;
      last.titles.push(...s.titles.map(t => t.key));
    } else {
      out.push({
        club: club?.name ?? s.clubId,
        leagueId: club ? (getLeague(club.leagueId)?.id ?? null) : null,
        from: s.year, to: s.year,
        apps: s.apps, goals: s.goals, assists: s.assists,
        onLoan: s.onLoan,
        titles: s.titles.map(t => t.key),
      });
    }
  }
  return out;
}

export function buildSubmission(
  player: CareerPlayer, stages: SeasonRecord[], trophies: Title[], score: number,
): CareerSubmission {
  // Both languages are resolved here, because the board cannot resolve them
  // later: a domestic cup needs the club to know whether it was the FA Cup or
  // the Copa del Rey, and the club is not stored on the row.
  const counts = new Map<string, { key: string; label: string; labelEs: string; n: number }>();
  for (const t of trophies) {
    const label = titleName(t, 'en');
    const e = counts.get(label);
    if (e) e.n++;
    else counts.set(label, { key: t.key, label, labelEs: titleName(t, 'es'), n: 1 });
  }

  const best = stages.reduce<SeasonRecord | undefined>(
    (b, s) => (s.goals > (b?.goals ?? -1) ? s : b), undefined);

  const tournaments = (player.ntHistory ?? [])
    .filter(h => h.tournament?.qualified)
    .map(h => ({ year: h.year, key: h.tournament!.key, result: h.tournament!.result }));

  return {
    surname: player.surname,
    nationCode: player.ntNationCode,
    position: player.position,
    score,
    peakOverall: player.peakOverall,
    seasonsPlayed: stages.length,
    trophies: trophies.length,
    goals: player.goals,
    assists: player.assists,
    apps: player.apps,
    ballonDors: trophies.filter(t => t.key === 'ballon-dor').length,
    seed: player.careerSeed ?? 0,
    seedSource: player.seedSource ?? 'random',
    // Stamped at creation, not read from the clock, so a career started before
    // midnight and finished after it still files against the day it was played.
    dayKey: player.seedSource === 'daily' ? player.dayKey : undefined,
    history: {
      spells: spellsOf(stages),
      honours: [...counts.values()].sort((a, b) => b.n - a.n),
      nation: {
        code: player.ntNationCode,
        caps: player.ntCaps,
        goals: player.ntGoals,
        tournaments,
      },
      bestSeason: best
        ? {
            year: best.year,
            club: getClub(best.clubId)?.name ?? best.clubId,
            apps: best.apps, goals: best.goals, rating: best.rating,
          }
        : null,
    },
  };
}
