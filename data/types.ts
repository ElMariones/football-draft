// Core game types.
// To add new positions, formations, or eras, extend the unions below
// and update FORMATION_LAYOUTS in ./formations.ts.

export type Position =
  | 'GK'
  | 'RB' | 'CB' | 'LB' | 'RWB' | 'LWB'
  | 'CDM' | 'CM' | 'CAM' | 'RM' | 'LM'
  | 'RW' | 'LW' | 'CF' | 'ST';

export type Formation =
  | '4-4-2'
  | '4-3-3'
  | '4-2-3-1'
  | '3-5-2'
  | '4-5-1'
  | '3-4-3';

export type EraKey =
  | '90-95'
  | '95-00'
  | '00-05'
  | '05-10'
  | '10-15'
  | '15-20'
  | '20-25';

export interface Player {
  name: string;
  position: Position;
  overall: number; // 1-99; the visible "rating"
}

export interface TeamEra {
  formation: Formation;
  manager?: string;
  notes?: string;       // shown in the UI as a flavour line
  players: Player[];    // first 11 map 1:1 to FORMATION_LAYOUTS; subsequent players are subs
}

export interface TeamColors {
  primary: string;
  secondary: string;
}

export interface Team {
  id: string;
  name: string;
  shortName: string;     // 3-letter tag (ARS, MUN)
  city?: string;
  colors: TeamColors;
  eras: Partial<Record<EraKey, TeamEra>>;
}
