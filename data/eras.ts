import { EraKey } from './types';

export const ERAS: { key: EraKey; label: string }[] = [
  { key: '90-95', label: '1990 – 1995' },
  { key: '95-00', label: '1995 – 2000' },
  { key: '00-05', label: '2000 – 2005' },
  { key: '05-10', label: '2005 – 2010' },
  { key: '10-15', label: '2010 – 2015' },
  { key: '15-20', label: '2015 – 2020' },
  { key: '20-25', label: '2020 – 2025' },
];

export const ERA_KEYS = ERAS.map(e => e.key);
