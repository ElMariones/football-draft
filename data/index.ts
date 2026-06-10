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
import { athleticBilbao } from './teams/athletic-bilbao';
import { valencia } from './teams/valencia';
import { sevilla } from './teams/sevilla';
import { espanyol } from './teams/espanyol';
import { realSociedad } from './teams/real-sociedad';
import { realBetis } from './teams/real-betis';
import { celtaDeVigo } from './teams/celta-de-vigo';
import { villarreal } from './teams/villarreal';
import { mallorca } from './teams/mallorca';
import { malaga } from './teams/malaga';
import { osasuna } from './teams/osasuna';
import { getafe } from './teams/getafe';
import { rayoVallecano } from './teams/rayo-vallecano';
import { almeria } from './teams/almeria';
import { oviedo } from './teams/oviedo';
import { levante } from './teams/levante';
import { alaves } from './teams/alaves';
import { brazil } from './nations/brazil';
import { argentina } from './nations/argentina';
import { france } from './nations/france';
import { germany } from './nations/germany';
import { italy } from './nations/italy';
import { spain } from './nations/spain';
import { england } from './nations/england';
import { netherlands } from './nations/netherlands';
import { portugal } from './nations/portugal';
import { uruguay } from './nations/uruguay';
import { croatia } from './nations/croatia';
import { belgium } from './nations/belgium';
import { mexico } from './nations/mexico';
import { usa } from './nations/usa';
import { japan } from './nations/japan';
import { nigeria } from './nations/nigeria';

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

// All 20 La Liga clubs — the pool used by La Liga mode.
// Real Madrid, Barcelona, and Atlético are shared with CL_TEAMS.
export const LL_TEAMS: Team[] = [
  realMadrid,
  barcelona,
  atleticoMadrid,
  athleticBilbao,
  valencia,
  sevilla,
  espanyol,
  realSociedad,
  realBetis,
  celtaDeVigo,
  villarreal,
  mallorca,
  malaga,
  osasuna,
  getafe,
  rayoVallecano,
  almeria,
  oviedo,
  levante,
  alaves,
];

// The 16 national teams of World Cup mode. Their "eras" are World Cup
// editions ('1998'…'2022') — each nation only lists the cups it qualified for.
export const WC_TEAMS: Team[] = [
  brazil,
  argentina,
  france,
  germany,
  italy,
  spain,
  england,
  netherlands,
  portugal,
  uruguay,
  croatia,
  belgium,
  mexico,
  usa,
  japan,
  nigeria,
];

// Backwards-compatible: TEAMS is the union of every club (used as the
// authoritative `getTeam(id)` lookup table). Deduped by id — LL shares
// Real Madrid, Barcelona, and Atlético with EUROPEAN_TEAMS.
const seen = new Set<string>();
export const TEAMS: Team[] = [...PL_TEAMS, ...EUROPEAN_TEAMS, ...LL_TEAMS, ...WC_TEAMS].filter(t => {
  if (seen.has(t.id)) return false;
  seen.add(t.id);
  return true;
});

export function getTeam(id: string): Team | undefined {
  return TEAMS.find(t => t.id === id);
}

export function availableEras(team: Team): EraKey[] {
  return Object.keys(team.eras) as EraKey[];
}

export * from './types';
export * from './eras';
export * from './i18nNations';
export * from './formations';
export * from './helpers';
export * from './managers';
