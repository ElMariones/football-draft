// The shape a finished career is submitted in, and the code that builds it.
//
// Kept out of the component so the API route can validate against exactly the
// same type the client sends, and so the aggregate columns on the leaderboard
// are derived in one place rather than twice.
import type { CareerPlayer, SeasonRecord, Title } from '@/data/career/types';
import { getClub } from '@/data/career/clubs';
import { getLeague } from '@/data/career/leagues';
import { titleName } from './competitions';

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
  seedSource: 'random' | 'custom';
  history: CareerHistory;
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
