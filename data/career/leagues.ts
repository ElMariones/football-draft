import type { CareerLeague } from './types';

// Leagues the career can move through. Tier 1 = elite European; higher tiers
// are weaker/lower divisions and step-down leagues.
export const LEAGUES: CareerLeague[] = [
  // Elite European (tier 1)
  { id: 'premier-league', en: 'Premier League', es: 'Premier League', nationCode: 'EN', confed: 'UEFA', tier: 1 },
  { id: 'laliga', en: 'LaLiga', es: 'LaLiga', nationCode: 'ES', confed: 'UEFA', tier: 1 },
  { id: 'bundesliga', en: 'Bundesliga', es: 'Bundesliga', nationCode: 'DE', confed: 'UEFA', tier: 1 },
  { id: 'serie-a', en: 'Serie A', es: 'Serie A', nationCode: 'IT', confed: 'UEFA', tier: 1 },
  { id: 'ligue-1', en: 'Ligue 1', es: 'Ligue 1', nationCode: 'FR', confed: 'UEFA', tier: 1 },
  // Strong European (tier 2)
  { id: 'primeira-liga', en: 'Primeira Liga', es: 'Primeira Liga', nationCode: 'PT', confed: 'UEFA', tier: 2 },
  { id: 'eredivisie', en: 'Eredivisie', es: 'Eredivisie', nationCode: 'NL', confed: 'UEFA', tier: 2 },
  // Mid European (tier 3)
  { id: 'championship', en: 'Championship', es: 'Championship', nationCode: 'EN', confed: 'UEFA', tier: 3 },
  { id: 'laliga2', en: 'LaLiga 2', es: 'LaLiga 2', nationCode: 'ES', confed: 'UEFA', tier: 3 },
  // South America (tier 3)
  { id: 'liga-argentina', en: 'Argentine Primera', es: 'Liga Profesional', nationCode: 'AR', confed: 'CONMEBOL', tier: 3 },
  { id: 'brasileirao', en: 'Brasileirão', es: 'Brasileirão', nationCode: 'BR', confed: 'CONMEBOL', tier: 3 },
  // Step-down / rising leagues (tier 4-5)
  { id: 'liga-mx', en: 'Liga MX', es: 'Liga MX', nationCode: 'MX', confed: 'CONCACAF', tier: 4 },
  { id: 'mls', en: 'MLS', es: 'MLS', nationCode: 'US', confed: 'CONCACAF', tier: 4 },
  { id: 'chile-primera', en: 'Chilean Primera', es: 'Liga de Primera', nationCode: 'CL', confed: 'CONMEBOL', tier: 4 },
  { id: 'saudi-league', en: 'Saudi Pro League', es: 'Liga Saudí', nationCode: 'SA', confed: 'AFC', tier: 4 },
  { id: 'liga-argentina-2', en: 'Primera Nacional', es: 'Primera Nacional', nationCode: 'AR', confed: 'CONMEBOL', tier: 5 },

  // ---- Expanded coverage -------------------------------------------------
  // Every selectable nation needs a credible domestic league, otherwise the
  // transfer market has nowhere sensible to send a player and falls back to a
  // worldwide pool (which is how a German at AZ ended up with Argentine offers).
  // Strong European (tier 2)
  { id: 'belgium-pro', en: 'Belgian Pro League', es: 'Pro League de Bélgica', nationCode: 'BE', confed: 'UEFA', tier: 3 },
  { id: 'super-lig', en: 'Süper Lig', es: 'Süper Lig', nationCode: 'TR', confed: 'UEFA', tier: 3 },
  { id: 'scottish-prem', en: 'Scottish Premiership', es: 'Premiership de Escocia', nationCode: 'SC', confed: 'UEFA', tier: 3 },
  // Mid European (tier 4)
  { id: 'swiss-super', en: 'Swiss Super League', es: 'Super Liga Suiza', nationCode: 'CH', confed: 'UEFA', tier: 4 },
  { id: 'austria-bl', en: 'Austrian Bundesliga', es: 'Bundesliga de Austria', nationCode: 'AT', confed: 'UEFA', tier: 4 },
  { id: 'greece-sl', en: 'Greek Super League', es: 'Superliga de Grecia', nationCode: 'GR', confed: 'UEFA', tier: 4 },
  { id: 'ukraine-pl', en: 'Ukrainian Premier League', es: 'Premier de Ucrania', nationCode: 'UA', confed: 'UEFA', tier: 4 },
  { id: 'russia-pl', en: 'Russian Premier League', es: 'Premier de Rusia', nationCode: 'RU', confed: 'UEFA', tier: 4 },
  { id: 'denmark-sl', en: 'Danish Superliga', es: 'Superliga de Dinamarca', nationCode: 'DK', confed: 'UEFA', tier: 4 },
  // Developing European (tier 5)
  { id: 'eliteserien', en: 'Eliteserien', es: 'Eliteserien', nationCode: 'NO', confed: 'UEFA', tier: 5 },
  { id: 'allsvenskan', en: 'Allsvenskan', es: 'Allsvenskan', nationCode: 'SE', confed: 'UEFA', tier: 5 },
  { id: 'ekstraklasa', en: 'Ekstraklasa', es: 'Ekstraklasa', nationCode: 'PL', confed: 'UEFA', tier: 5 },
  { id: 'czech-liga', en: 'Czech First League', es: 'Liga Checa', nationCode: 'CZ', confed: 'UEFA', tier: 5 },
  { id: 'croatia-hnl', en: 'Croatian HNL', es: 'HNL de Croacia', nationCode: 'HR', confed: 'UEFA', tier: 5 },
  { id: 'serbia-sl', en: 'Serbian SuperLiga', es: 'Superliga de Serbia', nationCode: 'RS', confed: 'UEFA', tier: 5 },
  { id: 'ireland-pd', en: 'League of Ireland', es: 'Liga de Irlanda', nationCode: 'IE', confed: 'UEFA', tier: 6 },
  // South America (tier 4-5)
  { id: 'colombia-a', en: 'Categoría Primera A', es: 'Primera A de Colombia', nationCode: 'CO', confed: 'CONMEBOL', tier: 4 },
  { id: 'uruguay-pd', en: 'Uruguayan Primera', es: 'Primera de Uruguay', nationCode: 'UY', confed: 'CONMEBOL', tier: 4 },
  { id: 'peru-liga1', en: 'Liga 1', es: 'Liga 1 de Perú', nationCode: 'PE', confed: 'CONMEBOL', tier: 5 },
  { id: 'ecuador-ligapro', en: 'LigaPro', es: 'LigaPro de Ecuador', nationCode: 'EC', confed: 'CONMEBOL', tier: 5 },
  { id: 'paraguay-dp', en: 'Paraguayan Primera', es: 'Primera de Paraguay', nationCode: 'PY', confed: 'CONMEBOL', tier: 5 },
  // CONCACAF (tier 5)
  { id: 'costa-rica-pd', en: 'Liga Promerica', es: 'Liga Promerica', nationCode: 'CR', confed: 'CONCACAF', tier: 5 },
  // Asia / Oceania (tier 4-5)
  { id: 'j1-league', en: 'J1 League', es: 'J1 League', nationCode: 'JP', confed: 'AFC', tier: 4 },
  { id: 'k-league', en: 'K League 1', es: 'K League 1', nationCode: 'KR', confed: 'AFC', tier: 5 },
  { id: 'a-league', en: 'A-League', es: 'A-League', nationCode: 'AU', confed: 'AFC', tier: 5 },
  // Africa (tier 5)
  { id: 'egypt-pl', en: 'Egyptian Premier League', es: 'Premier de Egipto', nationCode: 'EG', confed: 'CAF', tier: 5 },
  { id: 'botola', en: 'Botola Pro', es: 'Botola Pro', nationCode: 'MA', confed: 'CAF', tier: 5 },
  { id: 'nigeria-npfl', en: 'Nigeria Premier League', es: 'Premier de Nigeria', nationCode: 'NG', confed: 'CAF', tier: 5 },
  { id: 'algeria-l1', en: 'Algerian Ligue 1', es: 'Ligue 1 de Argelia', nationCode: 'DZ', confed: 'CAF', tier: 5 },
  { id: 'senegal-l1', en: 'Senegal Ligue 1', es: 'Ligue 1 de Senegal', nationCode: 'SN', confed: 'CAF', tier: 6 },
  { id: 'ghana-pl', en: 'Ghana Premier League', es: 'Premier de Ghana', nationCode: 'GH', confed: 'CAF', tier: 6 },
  { id: 'ivory-l1', en: 'Ivorian Ligue 1', es: 'Ligue 1 de Costa de Marfil', nationCode: 'CI', confed: 'CAF', tier: 6 },
  { id: 'cameroon-l1', en: 'Elite One', es: 'Elite One', nationCode: 'CM', confed: 'CAF', tier: 6 },
];

export function getLeague(id: string): CareerLeague | undefined {
  return LEAGUES.find(l => l.id === id);
}
export function leagueName(id: string, lang: 'en' | 'es'): string {
  const l = getLeague(id);
  return l ? l[lang] : id;
}

// Continental competition name for a confederation + club strength tier.
export function continentalCompetition(confed: string, elite: boolean, lang: 'en' | 'es') {
  const map: Record<string, [string, string]> = {
    UEFA: elite ? ['Champions League', 'Champions League'] : ['Europa League', 'Europa League'],
    CONMEBOL: elite ? ['Copa Libertadores', 'Copa Libertadores'] : ['Copa Sudamericana', 'Copa Sudamericana'],
    CONCACAF: ['CONCACAF Champions Cup', 'Copa de Campeones CONCACAF'],
    AFC: ['AFC Champions League', 'AFC Champions League'],
    CAF: ['CAF Champions League', 'CAF Champions League'],
  };
  const pair = map[confed] ?? map.UEFA;
  return lang === 'es' ? pair[1] : pair[0];
}
