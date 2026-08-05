// The record books.
//
// Between trophies there was nothing to aim at. A mid-table season at a small
// club produced numbers that went into a table and meant nothing, because
// nothing in the game was counting them towards anything.
//
// Every club has an all-time top scorer and an appearance record; every country
// has a leading scorer and a most-capped player. They are the other thing a
// career can be about — and unlike titles, they are reachable at a small club,
// which is exactly where the game was emptiest. Staying somewhere for eight
// years now buys you something a trophy cannot.
//
// The books are generated, not stored: a club's record follows from its
// strength and its division, hashed off its id so it is the same number every
// time anyone looks. No migration, no seeding, no drift.
import type { CareerPlayer, SeasonRecord, Title } from '@/data/career/types';
import { getClub } from '@/data/career/clubs';
import { getLeague } from '@/data/career/leagues';
import { getNation } from '@/data/career/nations';
import { surnameFor } from '@/data/career/surnames';
import type { Lang } from './i18n';

// Record holders are named from the country the book belongs to. One shared
// list gave Colombia a top scorer called LINDQVIST and a most-capped player
// called BAKKER, which is the sort of detail a player reads closely.

/** Stable hash so a record is the same number every time it is read. */
function hash(s: string, salt: number): number {
  let h = 0x811c9dc5 ^ salt;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}
const spread = (h: number, lo: number, hi: number) => lo + (h % (hi - lo + 1));

/**
 * A second holder who is not the first one.
 *
 * One player holding both the scoring and appearance records is realistic, but
 * a generated book that prints the same surname twice reads as a bug rather
 * than as a club legend.
 */
function distinct(taken: string, nationCode: string | undefined, h: number): string {
  for (let i = 0; i < 6; i++) {
    const pick = surnameFor(nationCode, h + i * 7);
    if (pick !== taken) return pick;
  }
  return surnameFor(nationCode, h + 1);
}

export interface RecordEntry {
  /** what is being counted */
  kind: 'club-goals' | 'club-apps' | 'nation-goals' | 'nation-caps';
  /** the club or nation the book belongs to */
  clubId?: string;
  nationCode?: string;
  /** the standing record and who set it */
  target: number;
  holder: string;
  /** where you are */
  current: number;
}

// ---- the books ---------------------------------------------------------------

/**
 * A club's all-time marks.
 *
 * Bigger, older clubs have taller records — a giant's top scorer sits out of
 * reach of all but a whole career in one shirt, while a modest side's is a real
 * target for a striker who stays six or seven years. That asymmetry is the
 * point: it gives a small club something to offer that a big one cannot.
 */
export function clubRecords(clubId: string): { goals: number; apps: number; scorer: string; ever: string } {
  const club = getClub(clubId);
  const strength = club?.strength ?? 60;
  const league = club ? getLeague(club.leagueId) : null;
  const tier = league?.tier ?? 3;
  const nationOfClub = league?.nationCode;

  const h1 = hash(clubId, 1);
  const h2 = hash(clubId, 2);
  // Calibrated against 1270 club spells from simulated careers. A player who
  // moves every few years lands at the 90th percentile on 44 goals and 149
  // games for a club; a player who stays a decade reaches 400-600 of each. The
  // records sit deliberately in the gap, so they are a reward for staying and
  // not something a journeyman collects on the way past.
  const goalBase = Math.round(150 + Math.max(0, strength - 55) * 5.2 - (tier - 1) * 8);
  const appBase = Math.round(430 + Math.max(0, strength - 55) * 5.0 - (tier - 1) * 12);

  return {
    goals: Math.max(120, goalBase + spread(h1, -20, 20)),
    apps: Math.max(360, appBase + spread(h2, -45, 45)),
    // A club's record holders come from the club's own country, not the
    // player's — Everton's all-time scorer is not Colombian.
    scorer: surnameFor(nationOfClub, h1),
    ever: distinct(surnameFor(nationOfClub, h1), nationOfClub, h2 + 7),
  };
}

/** A country's all-time marks, scaled by how strong a footballing nation it is. */
export function nationRecords(code: string): { goals: number; caps: number; scorer: string; capped: string } {
  const nation = getNation(code);
  const strength = nation?.strength ?? 60;
  const h1 = hash(code, 3);
  const h2 = hash(code, 4);
  // A long international career in this engine ends around 200 caps and 100
  // goals (measured p90: 215 caps, 109 goals), so the marks sit just above that
  // — reachable by someone who is first choice for his country for a decade,
  // and by nobody else.
  return {
    goals: Math.max(75, Math.round(88 + Math.max(0, strength - 50) * 0.45) + spread(h1, -7, 7)),
    caps: Math.max(180, Math.round(198 + Math.max(0, strength - 50) * 0.35) + spread(h2, -14, 14)),
    scorer: surnameFor(code, h1 + 3),
    capped: distinct(surnameFor(code, h1 + 3), code, h2 + 11),
  };
}

// ---- where you are -----------------------------------------------------------

/**
 * Your goals and appearances for one club, across every spell at it.
 *
 * Derived from the season log rather than carried on the player: the tallies are
 * already in `stages`, and two spells at the same club must add together — a
 * homecoming does not start your record from zero.
 */
export function tallyAtClub(stages: SeasonRecord[], clubId: string): { goals: number; apps: number } {
  let goals = 0;
  let apps = 0;
  for (const s of stages) {
    // A loan is somebody else's club. Those goals belong to that club's book,
    // which is why `onLoan` is not filtered out here — only matched by id.
    if (s.clubId !== clubId) continue;
    goals += s.goals;
    apps += s.apps;
  }
  return { goals, apps };
}

/** Every club the player has ever turned out for, with their tally at each. */
export function clubTallies(stages: SeasonRecord[]): Map<string, { goals: number; apps: number }> {
  const out = new Map<string, { goals: number; apps: number }>();
  for (const s of stages) {
    const cur = out.get(s.clubId) ?? { goals: 0, apps: 0 };
    cur.goals += s.goals;
    cur.apps += s.apps;
    out.set(s.clubId, cur);
  }
  return out;
}

// ---- the chase ---------------------------------------------------------------

export interface Chase {
  entry: RecordEntry;
  /** how many left, 0 once it is beaten */
  remaining: number;
  /** already past it */
  held: boolean;
  /** 0-1, for a progress bar */
  progress: number;
}

function chaseOf(entry: RecordEntry): Chase {
  const remaining = Math.max(0, entry.target + 1 - entry.current);
  return {
    entry,
    remaining,
    held: entry.current > entry.target,
    progress: Math.min(1, entry.current / Math.max(1, entry.target + 1)),
  };
}

/**
 * Records within sight, closest first.
 *
 * Only the current club and the current country are offered: a record you can
 * no longer add to is history, not a target, and listing every club you ever
 * played for would bury the one you can actually do something about.
 */
export function activeChases(p: CareerPlayer, stages: SeasonRecord[]): Chase[] {
  const out: Chase[] = [];

  if (p.clubId) {
    const rec = clubRecords(p.clubId);
    const mine = tallyAtClub(stages, p.clubId);
    out.push(chaseOf({
      kind: 'club-goals', clubId: p.clubId,
      target: rec.goals, holder: rec.scorer, current: mine.goals,
    }));
    out.push(chaseOf({
      kind: 'club-apps', clubId: p.clubId,
      target: rec.apps, holder: rec.ever, current: mine.apps,
    }));
  }

  const nat = nationRecords(p.ntNationCode);
  out.push(chaseOf({
    kind: 'nation-goals', nationCode: p.ntNationCode,
    target: nat.goals, holder: nat.scorer, current: p.ntGoals,
  }));
  out.push(chaseOf({
    kind: 'nation-caps', nationCode: p.ntNationCode,
    target: nat.caps, holder: nat.capped, current: p.ntCaps,
  }));

  return out.sort((a, b) => {
    if (a.held !== b.held) return a.held ? 1 : -1;
    return a.remaining - b.remaining;
  });
}

// ---- breaking one ------------------------------------------------------------

const TITLE_KEY: Record<RecordEntry['kind'], string> = {
  'club-goals': 'club-top-scorer',
  'club-apps': 'club-most-apps',
  'nation-goals': 'nation-top-scorer',
  'nation-caps': 'nation-most-caps',
};

export interface BrokenRecord {
  title: Title;
  chase: Chase;
}

/**
 * Records broken *this* season.
 *
 * Compared against the tally before the season so a record is only ever awarded
 * once — passing 150 goals in your seventh year is the moment; being on 190 in
 * your twelfth is not news.
 */
export function recordsBroken(
  p: CareerPlayer, before: { stages: SeasonRecord[]; ntGoals: number; ntCaps: number },
  after: { stages: SeasonRecord[]; ntGoals: number; ntCaps: number },
  clubId: string, year: number,
): BrokenRecord[] {
  const out: BrokenRecord[] = [];
  const push = (kind: RecordEntry['kind'], target: number, holder: string, was: number, now: number,
                ids: { clubId?: string; nationCode?: string }) => {
    if (!(was <= target && now > target)) return;
    const entry: RecordEntry = { kind, target, holder, current: now, ...ids };
    out.push({
      chase: chaseOf(entry),
      title: {
        key: TITLE_KEY[kind], kind: 'individual',
        scope: ids.nationCode ? 'national' : 'club',
        age: p.age, year,
        clubId: ids.clubId, nationCode: ids.nationCode,
      },
    });
  };

  const rec = clubRecords(clubId);
  const was = tallyAtClub(before.stages, clubId);
  const now = tallyAtClub(after.stages, clubId);
  push('club-goals', rec.goals, rec.scorer, was.goals, now.goals, { clubId });
  push('club-apps', rec.apps, rec.ever, was.apps, now.apps, { clubId });

  const nat = nationRecords(p.ntNationCode);
  push('nation-goals', nat.goals, nat.scorer, before.ntGoals, after.ntGoals, { nationCode: p.ntNationCode });
  push('nation-caps', nat.caps, nat.capped, before.ntCaps, after.ntCaps, { nationCode: p.ntNationCode });

  return out;
}

// ---- copy --------------------------------------------------------------------

function holderName(e: RecordEntry, lang: Lang): string {
  if (e.nationCode) {
    const n = getNation(e.nationCode);
    return n ? (lang === 'es' ? n.es : n.en) : e.nationCode;
  }
  return (e.clubId ? getClub(e.clubId)?.name : '') ?? '';
}

/** "4 goals from Fluminense's all-time record." */
export function chaseLine(c: Chase, lang: Lang): string {
  const es = lang === 'es';
  const who = holderName(c.entry, lang);
  const n = c.remaining;

  if (c.held) {
    switch (c.entry.kind) {
      case 'club-goals': return es ? `Eres el máximo goleador histórico de ${who}.` : `You are ${who}'s all-time top scorer.`;
      case 'club-apps': return es ? `Nadie jugó más partidos en ${who}.` : `Nobody has played more games for ${who}.`;
      case 'nation-goals': return es ? `Eres el máximo goleador histórico de ${who}.` : `You are ${who}'s all-time top scorer.`;
      case 'nation-caps': return es ? `Nadie vistió más veces la camiseta de ${who}.` : `Nobody has worn the ${who} shirt more often.`;
    }
  }
  switch (c.entry.kind) {
    case 'club-goals':
      return es ? `${n} ${n === 1 ? 'gol' : 'goles'} para el récord histórico de ${who} (${c.entry.holder}, ${c.entry.target}).`
                : `${n} ${n === 1 ? 'goal' : 'goals'} from ${who}'s all-time record (${c.entry.holder}, ${c.entry.target}).`;
    case 'club-apps':
      return es ? `${n} ${n === 1 ? 'partido' : 'partidos'} para el récord de ${who} (${c.entry.holder}, ${c.entry.target}).`
                : `${n} ${n === 1 ? 'game' : 'games'} from ${who}'s appearance record (${c.entry.holder}, ${c.entry.target}).`;
    case 'nation-goals':
      return es ? `${n} ${n === 1 ? 'gol' : 'goles'} para ser el máximo goleador de ${who} (${c.entry.holder}, ${c.entry.target}).`
                : `${n} ${n === 1 ? 'goal' : 'goals'} from being ${who}'s all-time top scorer (${c.entry.holder}, ${c.entry.target}).`;
    case 'nation-caps':
      return es ? `${n} ${n === 1 ? 'partido' : 'partidos'} para el récord de internacionalidades de ${who} (${c.entry.holder}, ${c.entry.target}).`
                : `${n} ${n === 1 ? 'cap' : 'caps'} from ${who}'s all-time record (${c.entry.holder}, ${c.entry.target}).`;
  }
}

/** The headline the season ticker gets when one falls. */
export function brokenLine(b: BrokenRecord, lang: Lang): string {
  const es = lang === 'es';
  const who = holderName(b.chase.entry, lang);
  const held = b.chase.entry.holder;
  switch (b.chase.entry.kind) {
    case 'club-goals':
      return es ? `📖 RÉCORD. Pasaste a ${held} y eres el máximo goleador histórico de ${who}.`
                : `📖 RECORD. You passed ${held} to become ${who}'s all-time top scorer.`;
    case 'club-apps':
      return es ? `📖 RÉCORD. Nadie vistió la camiseta de ${who} más veces que tú.`
                : `📖 RECORD. Nobody has worn the ${who} shirt more times than you.`;
    case 'nation-goals':
      return es ? `📖 RÉCORD. Eres el máximo goleador histórico de ${who}, por delante de ${held}.`
                : `📖 RECORD. You are ${who}'s all-time top scorer, ahead of ${held}.`;
    case 'nation-caps':
      return es ? `📖 RÉCORD. Nadie jugó más veces para ${who} que tú.`
                : `📖 RECORD. Nobody has played for ${who} more times than you.`;
  }
}
