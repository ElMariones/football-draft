// What kind of career was this?
//
// The farewell and the epilogue both need the same answer, and it has to come
// from what actually happened rather than from a score: a one-club idol with
// two league titles and a mercenary with nine clubs and the same trophy count
// should not be handed the same ending.
//
// Everything here is derived. Nothing new is stored on the player.
import type { CareerPlayer, SeasonRecord, Title } from '@/data/career/types';
import { getClub } from '@/data/career/clubs';
import { idolAt } from './idolatry';

const RECORD_KEYS = new Set([
  'club-top-scorer', 'club-most-apps', 'nation-top-scorer', 'nation-most-caps',
]);
const BIG_KEYS = new Set([
  'league', 'champions', 'libertadores', 'world-cup', 'euro', 'copa-america',
  'asian-cup', 'afcon', 'gold-cup',
]);

export type CareerTier = 'immortal' | 'legend' | 'great' | 'solid' | 'journeyman' | 'forgotten';

export interface Spell {
  clubId: string;
  seasons: number;
  goals: number;
  apps: number;
}

export interface CareerProfile {
  // ---- clubs ----
  /** the club that loved you most, and how much */
  homeClubId: string | null;
  homeIdol: number;
  debutClubId: string | null;
  finalClubId: string | null;
  clubCount: number;
  longestSpell: Spell | null;
  /** the spell at your home club, if you had one */
  homeSpell: Spell | null;
  /** essentially one club — the great majority of a career in one shirt */
  oneClubMan: boolean;
  /** many shirts, none of them home */
  mercenary: boolean;
  /** you crossed to a direct rival, somewhere */
  traitor: boolean;
  /** you went back to the club that made you, after leaving it */
  wentHome: boolean;

  // ---- honours ----
  leagues: number;
  cups: number;
  continental: number;
  worldCups: number;
  continentalNations: number;
  ballon: number;
  individual: number;
  bigTitles: number;
  totalTitles: number;
  /** club and national silverware only — no individual awards, no records */
  teamTitles: number;
  records: number;
  /** runner-up: cup and continental finals, league seconds, tournament finals */
  finalsLost: number;
  neverWon: boolean;

  // ---- numbers ----
  seasons: number;
  goals: number;
  assists: number;
  apps: number;
  ntCaps: number;
  ntGoals: number;
  peakOverall: number;
  /** clutch moments won across the career */
  clutchWon: number;

  // ---- country ----
  neverCapped: boolean;
  ntLegend: boolean;

  tier: CareerTier;
}

function spells(stages: SeasonRecord[]): Spell[] {
  const out: Spell[] = [];
  for (const s of stages) {
    if (s.onLoan) continue;              // a loan is somebody else's shirt
    const last = out[out.length - 1];
    if (last && last.clubId === s.clubId) {
      last.seasons++; last.goals += s.goals; last.apps += s.apps;
    } else {
      out.push({ clubId: s.clubId, seasons: 1, goals: s.goals, apps: s.apps });
    }
  }
  return out;
}

/** Merge every spell at the same club — a homecoming adds to the first chapter. */
function byClub(list: Spell[]): Map<string, Spell> {
  const m = new Map<string, Spell>();
  for (const s of list) {
    const cur = m.get(s.clubId);
    if (cur) { cur.seasons += s.seasons; cur.goals += s.goals; cur.apps += s.apps; }
    else m.set(s.clubId, { ...s });
  }
  return m;
}

export function buildProfile(
  p: CareerPlayer, stages: SeasonRecord[], trophies: Title[],
): CareerProfile {
  const raw = spells(stages);
  const merged = byClub(raw);
  const seasons = stages.length;

  // The club that loved you most — idolatry, not appearances. A season at a
  // giant who never took to you is not a home.
  let homeClubId: string | null = null;
  let homeIdol = 0;
  for (const clubId of merged.keys()) {
    const v = idolAt(p, clubId);
    if (v > homeIdol) { homeIdol = v; homeClubId = clubId; }
  }

  const longestSpell = [...merged.values()].sort((a, b) => b.seasons - a.seasons)[0] ?? null;
  const homeSpell = homeClubId ? merged.get(homeClubId) ?? null : null;
  const clubCount = merged.size;

  const key = (k: string) => trophies.filter(t => t.key === k).length;
  const leagues = key('league');
  const cups = key('domestic-cup');
  const continental = trophies.filter(t =>
    ['champions', 'libertadores', 'europa', 'sudamericana', 'concacaf-cup', 'afc-cl', 'caf-cl']
      .includes(t.key)).length;
  const worldCups = key('world-cup');
  const continentalNations = trophies.filter(t =>
    ['euro', 'copa-america', 'asian-cup', 'afcon', 'gold-cup'].includes(t.key)).length;
  const ballon = key('ballon-dor');
  const records = trophies.filter(t => RECORD_KEYS.has(t.key)).length;
  const individual = trophies.filter(t => t.kind === 'individual' && !RECORD_KEYS.has(t.key)).length;
  const bigTitles = trophies.filter(t => BIG_KEYS.has(t.key)).length;

  // Runner-up, everywhere it can happen. This is the number that makes a
  // nearly-man's ending different from a winner's, and it is already recorded —
  // it was just never read.
  let finalsLost = 0;
  for (const s of stages) {
    for (const c of s.comps ?? []) {
      if (c.kind === 'league') { if (c.position === 2) finalsLost++; }
      else if (c.stage === 'final' && !c.won) finalsLost++;
    }
  }
  for (const h of p.ntHistory ?? []) {
    if (h.tournament?.result === 'runner-up') finalsLost++;
  }

  // Every title ever won, including the individual gongs and the record
  // plaques. Kept for scoring; anything writing prose about "trophies" should
  // use `teamTitles`, because "59 trophies" for a man with 10 leagues and
  // 40-odd top-scorer awards is not a sentence anybody believes.
  const totalTitles = trophies.length;
  const teamTitles = trophies.filter(
    t => (t.kind === 'club' || t.kind === 'national') && !RECORD_KEYS.has(t.key)).length;
  const neverWon = leagues + cups + continental + worldCups + continentalNations === 0;

  const oneClubMan = clubCount <= 2 && !!longestSpell && longestSpell.seasons >= seasons * 0.7;
  const mercenary = clubCount >= 5 && homeIdol < 62;
  const traitor = Object.values(p.traitorAt ?? {}).some(Boolean);
  const wentHome = !!p.debutClubId
    && raw.filter(s => s.clubId === p.debutClubId).length >= 2;

  const ntLegend = p.ntCaps >= 90;
  const neverCapped = p.ntCaps === 0;

  // The one judgement call in here. Trophies first, because that is how football
  // remembers people, with the Ballon d'Or and a World Cup as the separators at
  // the very top and idolatry standing in for "meant something somewhere".
  const weight =
    ballon * 5 + worldCups * 5 + continental * 3 + continentalNations * 3
    + leagues * 2 + cups + individual * 0.5 + records * 2;
  // `forgotten` is for a career that ended before it started, not for a decade
  // of honest football — nine seasons and 190 games at one club is a real life
  // in the game and should not be filed under nothing.
  const tier: CareerTier =
    weight >= 30 && homeIdol >= 70 ? 'immortal'
      : weight >= 18 ? 'legend'
        : weight >= 8 ? 'great'
          : weight >= 3 || homeIdol >= 65 ? 'solid'
            : seasons >= 8 || p.apps >= 150 ? 'journeyman'
              : 'forgotten';

  return {
    homeClubId, homeIdol,
    debutClubId: p.debutClubId ?? null,
    finalClubId: p.clubId ?? (stages[stages.length - 1]?.clubId ?? null),
    clubCount, longestSpell, homeSpell, oneClubMan, mercenary, traitor, wentHome,
    leagues, cups, continental, worldCups, continentalNations, ballon, individual,
    bigTitles, totalTitles, teamTitles, records, finalsLost, neverWon,
    seasons, goals: p.goals, assists: p.assists, apps: p.apps,
    ntCaps: p.ntCaps, ntGoals: p.ntGoals, peakOverall: p.peakOverall,
    clutchWon: p.clutchWon ?? 0,
    neverCapped, ntLegend, tier,
  };
}

/** Convenience for copy: the club name, or a sensible blank. */
export function clubName(id: string | null | undefined): string {
  return (id ? getClub(id)?.name : '') ?? '';
}
