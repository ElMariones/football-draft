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
