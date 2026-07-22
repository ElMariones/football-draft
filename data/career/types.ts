// Career simulator — core types. Positions reuse the game-wide union.
import type { Position } from '@/data/types';

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
}

export interface SeasonRecord {
  year: number;
  age: number;
  clubId: string;
  overallAtSeason: number;
  apps: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  rating: number;         // 0-10
  onLoan: boolean;
  titles: Title[];
  eventId?: string;
}

// ---- Transfers -------------------------------------------------------------

export type OfferVerb = 'sign' | 'stay' | 'loan';
export type OfferRole = 'starter' | 'rotation' | 'prospect';

export interface ClubOffer {
  clubId: string;
  verb: OfferVerb;
  role: OfferRole;
  locked?: boolean;       // held in the force-transfer board
}

// ---- Events ----------------------------------------------------------------

export type EventCategory =
  | 'injury' | 'health' | 'discipline' | 'family'
  | 'nation' | 'contract' | 'role' | 'offfield';

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
  | { type: 'contract'; years: number }
  | { type: 'title'; key: string; kind: TitleKind; scope: TitleScope }
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
