// Filler entries for the career board.
//
// An empty leaderboard tells a new player nothing — not what a good score is,
// not what the rows even look like. These are deliberately modest careers: the
// kind a first run produces, so a real player who does well goes straight past
// them rather than being buried under fabricated superstars.
import { makeRng } from './rng';
import type { CareerSubmission } from './submission';

const NAMES = [
  'RIVERA', 'KOVAC', 'OKONKWO', 'SILVA', 'MÜLLER', 'TANAKA', 'DUBOIS', 'HORVAT',
  'NGUYEN', 'ANDERSEN', 'ROSSI', 'MARQUES', 'PETROV', 'HALL', 'ÖZTÜRK', 'MENDOZA',
  'BAKKER', 'SORENSEN', 'CONTE', 'DIALLO', 'NOVAK', 'REYES', 'WALSH', 'KAMARA',
];
const NATIONS = [
  'AR', 'BR', 'ES', 'IT', 'DE', 'FR', 'EN', 'PT', 'NL', 'BE', 'HR', 'RS',
  'NG', 'SN', 'GH', 'MX', 'CO', 'UY', 'CL', 'JP', 'KR', 'NO', 'SE', 'PL',
];
const POSITIONS = ['ST', 'CF', 'RW', 'LW', 'CAM', 'CM', 'CDM', 'CB', 'LB', 'RB', 'GK'];
const CLUBS = [
  'Boca Juniors', 'River Plate', 'Palmeiras', 'Flamengo', 'Sevilla', 'Valencia',
  'Lazio', 'Torino', 'Wolfsburg', 'Lille', 'Everton', 'Celtic', 'Feyenoord',
  'Anderlecht', 'Dinamo Zagreb', 'Legia Warszawa', 'Rosenborg', 'Malmö FF',
];
const LOW_HONOURS = [
  { key: 'domestic-cup', label: 'Copa Argentina', labelEs: 'Copa Argentina' },
  { key: 'league', label: 'Liga Profesional', labelEs: 'Liga Profesional' },
  { key: 'league-top-scorer', label: 'League Top Scorer', labelEs: 'Goleador de la Liga' },
  { key: 'league-mvp', label: 'League MVP', labelEs: 'MVP de la Liga' },
];

/**
 * Build `n` filler careers from a fixed seed, so re-seeding is idempotent in
 * shape and the board looks the same every time it is regenerated.
 */
export function makeFillerRuns(n: number, seed = 90210): CareerSubmission[] {
  const rng = makeRng(seed);
  const out: CareerSubmission[] = [];

  for (let i = 0; i < n; i++) {
    const surname = NAMES[i % NAMES.length];
    const nationCode = NATIONS[rng.int(NATIONS.length)];
    const position = POSITIONS[rng.int(POSITIONS.length)];
    const keeper = position === 'GK';
    const attacker = ['ST', 'CF', 'RW', 'LW', 'CAM'].includes(position);

    // A modest career: peaks in the seventies, plays a decent number of games,
    // wins very little. Well short of what a good real run produces.
    const seasonsPlayed = 12 + rng.int(7);
    const peakOverall = 62 + rng.int(14);
    const apps = Math.round(seasonsPlayed * (22 + rng.int(14)));
    const goals = keeper ? 0
      : Math.round(apps * (attacker ? 0.10 + rng.next() * 0.14 : 0.03 + rng.next() * 0.06));
    const assists = keeper ? 0 : Math.round(apps * (0.03 + rng.next() * 0.07));
    const trophies = rng.int(4);

    const honours = trophies > 0
      ? [{ ...LOW_HONOURS[rng.int(LOW_HONOURS.length)], n: 1 + rng.int(Math.max(1, trophies)) }]
      : [];

    // two or three clubs, in order
    const spellCount = 2 + rng.int(2);
    const spells = [];
    let year = 2024;
    let left = seasonsPlayed;
    for (let s = 0; s < spellCount; s++) {
      const yrs = s === spellCount - 1 ? left : Math.max(1, Math.round(left / (spellCount - s)));
      left -= yrs;
      const share = yrs / seasonsPlayed;
      spells.push({
        club: CLUBS[rng.int(CLUBS.length)],
        leagueId: null,
        from: year,
        to: year + yrs - 1,
        apps: Math.round(apps * share),
        goals: Math.round(goals * share),
        assists: Math.round(assists * share),
        onLoan: s === 0 && rng.chance(0.25),
        titles: [],
      });
      year += yrs;
      if (left <= 0) break;
    }

    const caps = rng.int(45);
    const score = Math.round(
      peakOverall * 3 + apps * 0.2 + goals * 0.6 + assists * 0.3 + trophies * 12,
    );

    out.push({
      surname, nationCode, position,
      score, peakOverall, seasonsPlayed, trophies,
      goals, assists, apps,
      ballonDors: 0,
      seed: 100000 + rng.int(900000),
      seedSource: 'random',
      history: {
        spells,
        honours,
        nation: {
          code: nationCode,
          caps,
          goals: keeper ? 0 : rng.int(Math.max(1, Math.round(caps * 0.3))),
          tournaments: caps > 20 && rng.chance(0.5)
            ? [{ year: 2030, key: 'world-cup', result: rng.chance(0.6) ? 'group' : 'r16' }]
            : [],
        },
        bestSeason: spells.length
          ? {
              year: spells[0].from + 1,
              club: spells[0].club,
              apps: 24 + rng.int(14),
              goals: keeper ? 0 : rng.int(Math.max(1, Math.round(goals / seasonsPlayed) + 6)),
              rating: Math.round((6.4 + rng.next() * 1.1) * 10) / 10,
            }
          : null,
      },
    });
  }
  return out;
}
