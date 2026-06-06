// Central team registry.
// To add a new team: create data/teams/<id>.ts exporting a Team, then add it
// to the TEAMS array below.

import { Team, EraKey } from './types';
import { manchesterUnited } from './teams/manchester-united';
import { arsenal } from './teams/arsenal';
import { chelsea } from './teams/chelsea';
import { liverpool } from './teams/liverpool';
import { manchesterCity } from './teams/manchester-city';
import { tottenham } from './teams/tottenham';
import { leicester } from './teams/leicester';
import { everton } from './teams/everton';
import { newcastle } from './teams/newcastle';
import { astonVilla } from './teams/aston-villa';
import { westHam } from './teams/west-ham';
import { leeds } from './teams/leeds';
import { blackburn } from './teams/blackburn';
import { southampton } from './teams/southampton';
import { sunderland } from './teams/sunderland';
import { middlesbrough } from './teams/middlesbrough';
import { nottinghamForest } from './teams/nottingham-forest';
import { wolves } from './teams/wolves';
import { crystalPalace } from './teams/crystal-palace';
import { fulham } from './teams/fulham';
import { realMadrid } from './teams/real-madrid';
import { barcelona } from './teams/barcelona';
import { atleticoMadrid } from './teams/atletico-madrid';
import { bayernMunich } from './teams/bayern-munich';
import { borussiaDortmund } from './teams/borussia-dortmund';
import { juventus } from './teams/juventus';
import { acMilan } from './teams/ac-milan';
import { interMilan } from './teams/inter-milan';
import { psg } from './teams/psg';
import { porto } from './teams/porto';

// All 20 Premier League teams — the pool used by Premier League mode.
export const PL_TEAMS: Team[] = [
  manchesterUnited,
  arsenal,
  chelsea,
  liverpool,
  manchesterCity,
  tottenham,
  leicester,
  everton,
  newcastle,
  astonVilla,
  westHam,
  leeds,
  blackburn,
  southampton,
  sunderland,
  middlesbrough,
  nottinghamForest,
  wolves,
  crystalPalace,
  fulham,
];

// The 10 European "elite" clubs that join CL mode.
export const EUROPEAN_TEAMS: Team[] = [
  realMadrid,
  barcelona,
  atleticoMadrid,
  bayernMunich,
  borussiaDortmund,
  juventus,
  acMilan,
  interMilan,
  psg,
  porto,
];

// Champions League pool — the top 6 English clubs + the European elite.
// 16 teams: enough for a 4-group × 4-team CL with the player's XI as a 17th
// (the player's XI replaces one rival when generating the bracket).
export const CL_TEAMS: Team[] = [
  manchesterUnited,
  arsenal,
  chelsea,
  liverpool,
  manchesterCity,
  tottenham,
  ...EUROPEAN_TEAMS,
];

// Backwards-compatible: TEAMS is the union of every club (used as the
// authoritative `getTeam(id)` lookup table).
export const TEAMS: Team[] = [...PL_TEAMS, ...EUROPEAN_TEAMS];

export function getTeam(id: string): Team | undefined {
  return TEAMS.find(t => t.id === id);
}

export function availableEras(team: Team): EraKey[] {
  return Object.keys(team.eras) as EraKey[];
}

export * from './types';
export * from './eras';
export * from './formations';
export * from './helpers';
