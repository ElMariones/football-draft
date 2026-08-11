// Career simulator — core types. Positions reuse the game-wide union.
import type { Position } from '@/data/types';
import type { NtSeason } from '@/lib/career/international';
import type { FaceGenes } from '@/lib/career/face';
import type { ContinentalTier } from '@/lib/career/continental';
import type { AgeingProfile } from '@/lib/career/ageing';

export type Foot = 'left' | 'right';
export type Confederation = 'UEFA' | 'CONMEBOL' | 'CONCACAF' | 'AFC' | 'CAF';

export interface CareerNation {
  code: string;      // ISO-ish short code, e.g. 'AR'
  en: string;
  es: string;
  flag: string;      // emoji
  strength: number;  // national-team strength 0-100 (title odds)
  confed: Confederation;
}

export interface CareerLeague {
  id: string;
  en: string;
  es: string;
  nationCode: string;   // country the league belongs to
  confed: Confederation;
  tier: number;         // 1 = elite European, up to 6 = lower divisions
}

export interface CareerClub {
  id: string;
  name: string;
  short: string;        // 3-letter tag for the monogram crest
  leagueId: string;
  strength: number;     // sporting strength 0-99
  colors: { primary: string; secondary: string };
}

// ---- Attributes ------------------------------------------------------------

/** The five attributes that compose `overall` (see lib/career/attributes.ts). */
export interface Attrs {
  tec: number;  // technique / finishing / handling
  pac: number;  // pace
  phy: number;  // physical
  vis: number;  // vision
  lea: number;  // leadership
}

export type IdolLevel = 'one-more' | 'beloved' | 'reference' | 'idol' | 'legend';

// ---- Titles / awards -------------------------------------------------------

export type TitleKind = 'club' | 'national' | 'individual';
export type TitleScope = 'club' | 'national' | 'league' | 'continent' | 'world' | 'tournament';

export interface Title {
  key: string;          // e.g. 'league', 'champions', 'ballon-dor'
  kind: TitleKind;
  scope: TitleScope;
  age: number;
  clubId?: string;
  nationCode?: string;
  /**
   * The division this was won in, stamped at the time.
   *
   * Not derivable from the club afterwards: clubs are promoted and relegated
   * between seasons, so resolving the league from `clubId` at render time
   * renamed a title the season after its winner went down — a Premier League
   * trophy quietly became a Championship one.
   */
  leagueId?: string;
  /** the year it was won, for record books and "twenty years later" copy */
  year?: number;
}

// ---- Player state ----------------------------------------------------------

export interface CareerPlayer {
  // identity
  nationCode: string;
  secondNationCode?: string;
  ntNationCode: string;
  ntCapped: boolean;        // has a competitive senior cap → nationality locks
  surname: string;
  number: number;
  foot: Foot;
  position: Position;

  // progression
  age: number;
  overall: number;
  potential: number;
  value: number;

  // hidden attributes 0-100
  form: number;
  morale: number;
  fitness: number;
  injuryProneness: number;
  loyalty: number;
  reputation: number;
  discipline: number;
  consistency: number;

  // transient modifiers
  roleBias: number;         // temp minutes bias from a transfer/event, decays
  injuryGamesNext: number;  // games to miss next season from an injury event
  ovrTemp: { delta: number; years: number }[]; // temporary OVR modifiers

  // peaks + bookkeeping
  peakOverall: number;
  peakValue: number;
  clubId: string | null;
  loanFromClubId: string | null;
  contractYears: number;
  retired: boolean;

  // cumulative
  apps: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  ntCaps: number;
  ntGoals: number;

  // flags set by events (for legacy badges / gating)
  flags: Record<string, boolean>;
  clubsPlayed: string[];

  // ---- Legend update -------------------------------------------------------
  /** the five attributes `overall` is composed from */
  attrs: Attrs;
  /** permanent identity chosen at the start of the career */
  archetypeId: string | null;
  /** 1-in-100 generational talent */
  wonderkid: boolean;
  /** the seed this whole career was generated from, so it can be shared */
  careerSeed: number;
  /**
   * Whether that seed was rolled for you or typed in. A typed seed lets you
   * retry the same world until you like it, so the two can never share a board.
   */
  seedSource: 'random' | 'custom' | 'daily';
  /**
   * Which day's world this is, `YYYY-MM-DD`. Set at creation for daily runs and
   * never re-read from the clock: a career started before midnight and finished
   * after it still belongs to the day it was actually played.
   */
  dayKey?: string;

  /** idolatry per club id (0-100) — the scoring spine */
  idolatry: Record<string, number>;
  /** club ids you betrayed by signing for a direct rival */
  traitorAt: Record<string, boolean>;
  /** titles won per club — lifts that club's idolatry ceiling to 100 */
  titlesByClub: Record<string, number>;
  /** the club that gave you your debut */
  debutClubId: string | null;
  /** consecutive seasons at the current club */
  stayStreak: number;

  /** derby goals — worth 10x a normal goal to the terraces */
  derbyGoals: number;
  /** stamina 0-100, drains with minutes, restored in preseason */
  stamina: number;
  /** career earnings, spent in the shop */
  money: number;
  /** seasons until another clutch moment can fire */
  momentCooldown: number;
  /** seasons left before another minigame may fire */
  miniCooldown: number;
  /** Ballons d'Or already won — a reigning winner faces a tougher field */
  ballonWins: number;
  /** clutch moments won across the career */
  clutchWon: number;
  /** shop items owned */
  owned: string[];

  /** procedural face, rolled at creation and aged at render time */
  face: FaceGenes;
  /** one entry per season of international football (see lib/career/international.ts) */
  ntHistory: NtSeason[];
  /** the ceiling this player was born with, before any late-bloomer breakout */
  basePotential: number;
  /** the role the club promised when you signed — honoured while it lasts */
  rolePromise: OfferRole | null;
  /** seasons the promise still binds the manager (1 = this coming season) */
  rolePromiseYears: number;

  // ---- Brands --------------------------------------------------------------
  /** the boot deal currently held, if any (see lib/career/sponsors.ts) */
  sponsor: SponsorState | null;
  /** every closed boot-deal chapter, for the panel and the epilogue */
  sponsorHistory: SponsorSpell[];
  /** lifestyle brand ids picked up along the way — watches, cars, airlines */
  endorsements: string[];
  /** seasons before another brand event may fire */
  brandCooldown: number;

  // ---- Rivalries and the press ---------------------------------------------
  /** career derby record, keyed by rival club id (see lib/career/rivalry.ts) */
  derbyRecord: Record<string, DerbyRecord>;
  /** seasons before another derby story may fire */
  derbyCooldown: number;
  /** seasons before you face the press again */
  pressCooldown: number;

  // ---- Continental qualification -------------------------------------------
  /**
   * The continental place held for the coming season, and the club that earned
   * it. A place belongs to the club, not to the player: leave and you do not
   * take it with you. See lib/career/continental.ts.
   */
  contPlace: { clubId: string; tier: ContinentalTier } | null;
  /** last season's league finish, for explaining why there is no place */
  lastFinish: { leagueId: string; position: number; teams: number } | null;

  // ---- Ageing --------------------------------------------------------------
  /**
   * How this body ages, rolled once from the career seed.
   *
   * Decline used to be one shared table, so every career fell apart on the same
   * schedule. See lib/career/ageing.ts.
   */
  ageing: AgeingProfile;
}

/**
 * What you have done to one particular rival, across the whole career.
 *
 * `heat` is the bad blood: it rises with goals, wins and every polemic you
 * choose to be part of, and it is what decides whether the fixture generates a
 * story at all.
 */
export interface DerbyRecord {
  w: number;
  d: number;
  l: number;
  goals: number;
  heat: number;
}

/**
 * The rung you are on with your boot brand.
 *
 * Most professionals never get past free boots; a signature boot is genuinely
 * rare. The ladder is deliberately the real one — see lib/career/sponsors.ts,
 * which owns everything that decides who sits where.
 */
export type DealTier = 'kit' | 'squad' | 'silo' | 'signature' | 'global';

export interface SponsorState {
  brandId: string;
  tier: DealTier;
  /** seasons left to run, including the coming one */
  yearsLeft: number;
  /** guaranteed money per season, before performance */
  annual: number;
  signedYear: number;
  /** paid out by this deal so far */
  earned: number;
  /** how happy they are with you, 0-100. Drives renewals and being dropped. */
  standing: number;
  /** you have a boot with your name on it */
  signature: boolean;
  /** brand event ids already run under this deal */
  done: string[];
}

/** A closed chapter with a brand, kept for the panel and the epilogue. */
export interface SponsorSpell {
  brandId: string;
  from: number;
  to: number;
  tier: DealTier;
  earned: number;
  signature: boolean;
}

/** How far a knockout competition was survived. */
export type CompStage = 'group' | 'r32' | 'r16' | 'qf' | 'sf' | 'final' | 'won';

/**
 * One competition, as it actually went. A binary "did you win it" throws away
 * everything that makes a season a season: finishing second by a point, going
 * out of the cup to a third-division side, a first European semi-final. Every
 * club competition now records where the run ended, not just whether it ended
 * with a trophy.
 */
export interface CompRun {
  key: string;                 // 'league' | 'domestic-cup' | 'champions' | ...
  kind: 'league' | 'cup' | 'continental';
  /** the club did not enter at all (no continental place) */
  entered: boolean;
  won: boolean;
  /** league only: final table position and how many were in it */
  position?: number;
  teams?: number;
  /** knockout only: the round the run ended in */
  stage?: CompStage;
}

/** The offseason decision that preceded a season, so its aftermath can be told. */
export interface SeasonDecision {
  eventId: string;
  optionIndex: number;
  outcomeIndex: number;
}

export interface SeasonRecord {
  year: number;
  age: number;
  clubId: string;
  /**
   * The division actually played this season.
   *
   * Not derivable from the club afterwards — promotion and relegation move
   * clubs every summer, so reading `getClub(clubId).leagueId` for an old season
   * reports whatever division that club sits in *now*.
   */
  leagueId?: string;
  overallAtSeason: number;
  apps: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  rating: number;         // 0-10
  onLoan: boolean;
  titles: Title[];
  eventId?: string;

  /** every competition the club played, and how far it got */
  comps?: CompRun[];
  /** games the club had available to you across all competitions */
  availableGames?: number;
  /** the choice you made before the season, resolved */
  decision?: SeasonDecision;

  // ---- Legend update ----
  derbyGoals?: number;
  /** idolatry gained at this club this season */
  idolGain?: number;
  /** idolatry at this club after the season */
  idolAfter?: number;
  /** season headlines (ticker) */
  news?: string[];
  /** preseason card taken before this season */
  cardId?: string;
}

// ---- Transfers -------------------------------------------------------------

export type OfferVerb = 'sign' | 'stay' | 'loan';
/**
 * What the club is signing you for.
 *
 * `prospect` and `squad` are the same minutes and opposite stories: one is a
 * teenager being developed, the other a veteran being kept around. Calling a
 * thirty-eight-year-old a prospect read as a bug.
 */
export type OfferRole = 'starter' | 'rotation' | 'prospect' | 'squad';

export interface ClubOffer {
  clubId: string;
  verb: OfferVerb;
  role: OfferRole;
  locked?: boolean;       // held in the force-transfer board
  /** an out-of-region surprise suitor — rare, and labelled as such in the UI */
  wildcard?: boolean;
  /** a former club (usually the one that debuted you) asking you to come home */
  homecoming?: boolean;
}

// ---- Events ----------------------------------------------------------------

export type EventCategory =
  | 'injury' | 'health' | 'discipline' | 'family'
  | 'nation' | 'contract' | 'role' | 'offfield'
  | 'teammate' | 'staff' | 'media' | 'transfer';

export type Effect =
  | { type: 'ovr'; delta: number }
  | { type: 'ovrTemp'; delta: number; years: number }
  | { type: 'value'; mult: number }
  | { type: 'morale'; delta: number }
  | { type: 'form'; delta: number }
  | { type: 'fitness'; delta: number }
  | { type: 'injury'; games: number; proneness?: number }
  | { type: 'loyalty'; delta: number }
  | { type: 'reputation'; delta: number }
  | { type: 'discipline'; delta: number }
  | { type: 'minutesBias'; delta: number }
  | { type: 'switchNation' }        // switch to secondNationCode
  | { type: 'unlockNation'; code: string }
  | { type: 'flag'; name: string }
  /**
   * Actually move the player. Transfer events used to hand out money and take
   * idolatry while leaving you at the same club, so "fly out and sign" signed
   * you for nobody. `leagues` names the destination leagues to pick a club from.
   */
  | { type: 'transfer'; leagues: string[]; role?: 'starter' | 'rotation' }
  | { type: 'contract'; years: number }
  | { type: 'title'; key: string; kind: TitleKind; scope: TitleScope }
  | { type: 'attr'; attrs: Partial<Attrs> }
  | { type: 'idol'; delta: number }
  | { type: 'money'; delta: number }
  | { type: 'stamina'; delta: number }
  | { type: 'retire' };

export interface EventOutcome {
  weight: number;
  badge: string;          // localized-ish short label (built in i18n)
  effects: Effect[];
}

export interface EventOption {
  label: string;
  outcomes: EventOutcome[];
}

export interface CareerEvent {
  id: string;
  category: EventCategory;
  title: string;
  desc: string;
  weight: number;
  onceOnly?: boolean;
  cooldown?: number;
  when: (p: CareerPlayer) => boolean;
  options: EventOption[];
}
