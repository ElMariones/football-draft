import { Formation, Position } from './types';

export interface Slot {
  position: Position;
  x: number; // 0 (left) – 100 (right)
  y: number; // 0 (own goal) – 100 (opponent goal)
}

// Slot order in each array IS the order the team's `players` array must follow.
// Coordinates are relative to a 100x100 pitch.
export const FORMATION_LAYOUTS: Record<Formation, Slot[]> = {
  '4-4-2': [
    { position: 'GK', x: 50, y: 7 },
    { position: 'RB', x: 85, y: 25 },
    { position: 'CB', x: 62, y: 20 },
    { position: 'CB', x: 38, y: 20 },
    { position: 'LB', x: 15, y: 25 },
    { position: 'RM', x: 85, y: 55 },
    { position: 'CM', x: 60, y: 52 },
    { position: 'CM', x: 40, y: 52 },
    { position: 'LM', x: 15, y: 55 },
    { position: 'ST', x: 60, y: 82 },
    { position: 'ST', x: 40, y: 82 },
  ],
  '4-3-3': [
    { position: 'GK',  x: 50, y: 7 },
    { position: 'RB',  x: 85, y: 25 },
    { position: 'CB',  x: 62, y: 20 },
    { position: 'CB',  x: 38, y: 20 },
    { position: 'LB',  x: 15, y: 25 },
    { position: 'CDM', x: 50, y: 42 },
    { position: 'CM',  x: 70, y: 55 },
    { position: 'CM',  x: 30, y: 55 },
    { position: 'RW',  x: 82, y: 78 },
    { position: 'ST',  x: 50, y: 85 },
    { position: 'LW',  x: 18, y: 78 },
  ],
  '4-2-3-1': [
    { position: 'GK',  x: 50, y: 7 },
    { position: 'RB',  x: 85, y: 25 },
    { position: 'CB',  x: 62, y: 20 },
    { position: 'CB',  x: 38, y: 20 },
    { position: 'LB',  x: 15, y: 25 },
    { position: 'CDM', x: 60, y: 45 },
    { position: 'CDM', x: 40, y: 45 },
    { position: 'RM',  x: 82, y: 68 },
    { position: 'CAM', x: 50, y: 68 },
    { position: 'LM',  x: 18, y: 68 },
    { position: 'ST',  x: 50, y: 88 },
  ],
  '3-5-2': [
    { position: 'GK',  x: 50, y: 7 },
    { position: 'CB',  x: 70, y: 20 },
    { position: 'CB',  x: 50, y: 18 },
    { position: 'CB',  x: 30, y: 20 },
    { position: 'RWB', x: 88, y: 48 },
    { position: 'CM',  x: 65, y: 50 },
    { position: 'CDM', x: 50, y: 42 },
    { position: 'CM',  x: 35, y: 50 },
    { position: 'LWB', x: 12, y: 48 },
    { position: 'ST',  x: 60, y: 82 },
    { position: 'ST',  x: 40, y: 82 },
  ],
  '4-5-1': [
    { position: 'GK',  x: 50, y: 7 },
    { position: 'RB',  x: 85, y: 25 },
    { position: 'CB',  x: 62, y: 20 },
    { position: 'CB',  x: 38, y: 20 },
    { position: 'LB',  x: 15, y: 25 },
    { position: 'RM',  x: 85, y: 55 },
    { position: 'CM',  x: 65, y: 50 },
    { position: 'CDM', x: 50, y: 45 },
    { position: 'CM',  x: 35, y: 50 },
    { position: 'LM',  x: 15, y: 55 },
    { position: 'ST',  x: 50, y: 85 },
  ],
  '3-4-3': [
    { position: 'GK', x: 50, y: 7 },
    { position: 'CB', x: 70, y: 20 },
    { position: 'CB', x: 50, y: 18 },
    { position: 'CB', x: 30, y: 20 },
    { position: 'RM', x: 85, y: 52 },
    { position: 'CM', x: 60, y: 50 },
    { position: 'CM', x: 40, y: 50 },
    { position: 'LM', x: 15, y: 52 },
    { position: 'RW', x: 80, y: 82 },
    { position: 'ST', x: 50, y: 85 },
    { position: 'LW', x: 20, y: 82 },
  ],
};
