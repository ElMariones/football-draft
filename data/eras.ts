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

// World Cup editions — the "eras" of World Cup mode. Each national team only
// defines the editions it actually qualified for.
export const WC_ERAS: { key: EraKey; label: string }[] = [
  { key: '1998', label: 'France 1998' },
  { key: '2002', label: 'Korea/Japan 2002' },
  { key: '2006', label: 'Germany 2006' },
  { key: '2010', label: 'South Africa 2010' },
  { key: '2014', label: 'Brazil 2014' },
  { key: '2018', label: 'Russia 2018' },
  { key: '2022', label: 'Qatar 2022' },
];

export const WC_ERA_KEYS = WC_ERAS.map(e => e.key);
