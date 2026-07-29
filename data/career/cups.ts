// Real names for the domestic cup of every country that has a league in the
// game. "Copa Nacional · Inglaterra" told you what kind of trophy it was but
// never what it actually was — a cabinet full of FA Cups and Copas del Rey read
// as one anonymous competition repeated eleven times.
//
// Keyed by the nationCode on the league the club plays in.
export const DOMESTIC_CUPS: Record<string, { en: string; es: string }> = {
  AR: { en: 'Copa Argentina', es: 'Copa Argentina' },
  AT: { en: 'Austrian Cup', es: 'Copa de Austria' },
  AU: { en: 'Australia Cup', es: 'Copa de Australia' },
  BE: { en: 'Belgian Cup', es: 'Copa de Bélgica' },
  BR: { en: 'Copa do Brasil', es: 'Copa de Brasil' },
  CH: { en: 'Swiss Cup', es: 'Copa de Suiza' },
  CI: { en: 'Ivorian Cup', es: 'Copa de Costa de Marfil' },
  CL: { en: 'Copa Chile', es: 'Copa Chile' },
  CM: { en: 'Cameroonian Cup', es: 'Copa de Camerún' },
  CO: { en: 'Copa Colombia', es: 'Copa Colombia' },
  CR: { en: 'Costa Rican Cup', es: 'Copa de Costa Rica' },
  CZ: { en: 'Czech Cup', es: 'Copa de Chequia' },
  DE: { en: 'DFB-Pokal', es: 'DFB-Pokal' },
  DK: { en: 'Danish Cup', es: 'Copa de Dinamarca' },
  DZ: { en: 'Algerian Cup', es: 'Copa de Argelia' },
  EC: { en: 'Copa Ecuador', es: 'Copa Ecuador' },
  EG: { en: 'Egypt Cup', es: 'Copa de Egipto' },
  EN: { en: 'FA Cup', es: 'FA Cup' },
  ES: { en: 'Copa del Rey', es: 'Copa del Rey' },
  FR: { en: 'Coupe de France', es: 'Copa de Francia' },
  GH: { en: 'Ghana FA Cup', es: 'Copa de Ghana' },
  GR: { en: 'Greek Cup', es: 'Copa de Grecia' },
  HR: { en: 'Croatian Cup', es: 'Copa de Croacia' },
  IE: { en: 'FAI Cup', es: 'Copa de Irlanda' },
  IT: { en: 'Coppa Italia', es: 'Copa Italia' },
  JP: { en: "Emperor's Cup", es: 'Copa del Emperador' },
  KR: { en: 'Korean FA Cup', es: 'Copa de Corea' },
  MA: { en: 'Throne Cup', es: 'Copa del Trono' },
  MX: { en: 'Copa MX', es: 'Copa MX' },
  NG: { en: 'Nigerian FA Cup', es: 'Copa de Nigeria' },
  NL: { en: 'KNVB Beker', es: 'Copa de los Países Bajos' },
  NO: { en: 'Norwegian Cup', es: 'Copa de Noruega' },
  PE: { en: 'Copa Bicentenario', es: 'Copa Bicentenario' },
  PL: { en: 'Polish Cup', es: 'Copa de Polonia' },
  PT: { en: 'Taça de Portugal', es: 'Copa de Portugal' },
  PY: { en: 'Copa Paraguay', es: 'Copa Paraguay' },
  RS: { en: 'Serbian Cup', es: 'Copa de Serbia' },
  RU: { en: 'Russian Cup', es: 'Copa de Rusia' },
  SA: { en: "King's Cup", es: 'Copa del Rey de Arabia' },
  SC: { en: 'Scottish Cup', es: 'Copa de Escocia' },
  SE: { en: 'Svenska Cupen', es: 'Copa de Suecia' },
  SN: { en: 'Senegal FA Cup', es: 'Copa de Senegal' },
  TR: { en: 'Turkish Cup', es: 'Copa de Turquía' },
  UA: { en: 'Ukrainian Cup', es: 'Copa de Ucrania' },
  US: { en: 'US Open Cup', es: 'US Open Cup' },
  UY: { en: 'Copa Uruguay', es: 'Copa Uruguay' },
};

export function domesticCupName(nationCode: string | undefined, lang: 'en' | 'es'): string | null {
  if (!nationCode) return null;
  const c = DOMESTIC_CUPS[nationCode];
  return c ? c[lang] : null;
}
