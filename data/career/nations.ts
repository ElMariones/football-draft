import type { CareerNation } from './types';

// A broad set of footballing nations for the nationality picker. `strength`
// drives national-team title odds. Sorted alphabetically by English name at use.
export const NATIONS: CareerNation[] = [
  { code: 'AR', en: 'Argentina', es: 'Argentina', flag: '🇦🇷', strength: 93, confed: 'CONMEBOL' },
  { code: 'BR', en: 'Brazil', es: 'Brasil', flag: '🇧🇷', strength: 93, confed: 'CONMEBOL' },
  { code: 'FR', en: 'France', es: 'Francia', flag: '🇫🇷', strength: 94, confed: 'UEFA' },
  { code: 'ES', en: 'Spain', es: 'España', flag: '🇪🇸', strength: 91, confed: 'UEFA' },
  { code: 'DE', en: 'Germany', es: 'Alemania', flag: '🇩🇪', strength: 90, confed: 'UEFA' },
  { code: 'EN', en: 'England', es: 'Inglaterra', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', strength: 90, confed: 'UEFA' },
  { code: 'PT', en: 'Portugal', es: 'Portugal', flag: '🇵🇹', strength: 89, confed: 'UEFA' },
  { code: 'NL', en: 'Netherlands', es: 'Países Bajos', flag: '🇳🇱', strength: 88, confed: 'UEFA' },
  { code: 'IT', en: 'Italy', es: 'Italia', flag: '🇮🇹', strength: 88, confed: 'UEFA' },
  { code: 'BE', en: 'Belgium', es: 'Bélgica', flag: '🇧🇪', strength: 86, confed: 'UEFA' },
  { code: 'UY', en: 'Uruguay', es: 'Uruguay', flag: '🇺🇾', strength: 84, confed: 'CONMEBOL' },
  { code: 'HR', en: 'Croatia', es: 'Croacia', flag: '🇭🇷', strength: 84, confed: 'UEFA' },
  { code: 'CO', en: 'Colombia', es: 'Colombia', flag: '🇨🇴', strength: 83, confed: 'CONMEBOL' },
  { code: 'MX', en: 'Mexico', es: 'México', flag: '🇲🇽', strength: 80, confed: 'CONCACAF' },
  { code: 'CH', en: 'Switzerland', es: 'Suiza', flag: '🇨🇭', strength: 80, confed: 'UEFA' },
  { code: 'US', en: 'United States', es: 'Estados Unidos', flag: '🇺🇸', strength: 78, confed: 'CONCACAF' },
  { code: 'DK', en: 'Denmark', es: 'Dinamarca', flag: '🇩🇰', strength: 80, confed: 'UEFA' },
  { code: 'RS', en: 'Serbia', es: 'Serbia', flag: '🇷🇸', strength: 79, confed: 'UEFA' },
  { code: 'SN', en: 'Senegal', es: 'Senegal', flag: '🇸🇳', strength: 79, confed: 'CAF' },
  { code: 'MA', en: 'Morocco', es: 'Marruecos', flag: '🇲🇦', strength: 82, confed: 'CAF' },
  { code: 'JP', en: 'Japan', es: 'Japón', flag: '🇯🇵', strength: 78, confed: 'AFC' },
  { code: 'KR', en: 'South Korea', es: 'Corea del Sur', flag: '🇰🇷', strength: 76, confed: 'AFC' },
  { code: 'PL', en: 'Poland', es: 'Polonia', flag: '🇵🇱', strength: 77, confed: 'UEFA' },
  { code: 'AT', en: 'Austria', es: 'Austria', flag: '🇦🇹', strength: 77, confed: 'UEFA' },
  { code: 'RU', en: 'Russia', es: 'Rusia', flag: '🇷🇺', strength: 75, confed: 'UEFA' },
  { code: 'UA', en: 'Ukraine', es: 'Ucrania', flag: '🇺🇦', strength: 76, confed: 'UEFA' },
  { code: 'SE', en: 'Sweden', es: 'Suecia', flag: '🇸🇪', strength: 75, confed: 'UEFA' },
  { code: 'NO', en: 'Norway', es: 'Noruega', flag: '🇳🇴', strength: 76, confed: 'UEFA' },
  { code: 'CL', en: 'Chile', es: 'Chile', flag: '🇨🇱', strength: 76, confed: 'CONMEBOL' },
  { code: 'EC', en: 'Ecuador', es: 'Ecuador', flag: '🇪🇨', strength: 75, confed: 'CONMEBOL' },
  { code: 'PE', en: 'Peru', es: 'Perú', flag: '🇵🇪', strength: 72, confed: 'CONMEBOL' },
  { code: 'PY', en: 'Paraguay', es: 'Paraguay', flag: '🇵🇾', strength: 71, confed: 'CONMEBOL' },
  { code: 'NG', en: 'Nigeria', es: 'Nigeria', flag: '🇳🇬', strength: 78, confed: 'CAF' },
  { code: 'GH', en: 'Ghana', es: 'Ghana', flag: '🇬🇭', strength: 74, confed: 'CAF' },
  { code: 'CI', en: 'Ivory Coast', es: 'Costa de Marfil', flag: '🇨🇮', strength: 75, confed: 'CAF' },
  { code: 'CM', en: 'Cameroon', es: 'Camerún', flag: '🇨🇲', strength: 74, confed: 'CAF' },
  { code: 'EG', en: 'Egypt', es: 'Egipto', flag: '🇪🇬', strength: 74, confed: 'CAF' },
  { code: 'DZ', en: 'Algeria', es: 'Argelia', flag: '🇩🇿', strength: 75, confed: 'CAF' },
  { code: 'AU', en: 'Australia', es: 'Australia', flag: '🇦🇺', strength: 72, confed: 'AFC' },
  { code: 'SA', en: 'Saudi Arabia', es: 'Arabia Saudita', flag: '🇸🇦', strength: 70, confed: 'AFC' },
  { code: 'CA', en: 'Canada', es: 'Canadá', flag: '🇨🇦', strength: 72, confed: 'CONCACAF' },
  { code: 'CR', en: 'Costa Rica', es: 'Costa Rica', flag: '🇨🇷', strength: 69, confed: 'CONCACAF' },
  { code: 'TR', en: 'Turkey', es: 'Turquía', flag: '🇹🇷', strength: 76, confed: 'UEFA' },
  { code: 'GR', en: 'Greece', es: 'Grecia', flag: '🇬🇷', strength: 72, confed: 'UEFA' },
  { code: 'SC', en: 'Scotland', es: 'Escocia', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', strength: 72, confed: 'UEFA' },
  { code: 'IE', en: 'Ireland', es: 'Irlanda', flag: '🇮🇪', strength: 70, confed: 'UEFA' },
  { code: 'CZ', en: 'Czechia', es: 'Chequia', flag: '🇨🇿', strength: 74, confed: 'UEFA' },
];

export function getNation(code: string): CareerNation | undefined {
  return NATIONS.find(n => n.code === code);
}
export function nationName(code: string, lang: 'en' | 'es'): string {
  const n = getNation(code);
  return n ? n[lang] : code;
}
export function nationFlag(code: string): string {
  return getNation(code)?.flag ?? '🏳️';
}
