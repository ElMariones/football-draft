import type { Title } from '@/data/career/types';
import { getClub } from '@/data/career/clubs';
import { getLeague, leagueName } from '@/data/career/leagues';
import { domesticCupName } from '@/data/career/cups';
import { titleLabel, type Lang } from './i18n';

/**
 * The display name of a trophy, resolved against where it was actually won.
 *
 * `titleLabel` only knows the key, so every domestic cup came out as the same
 * generic "Copa Nacional" and every league as "Liga". Both are competitions with
 * real names, and which one you won is most of what a trophy cabinet says: three
 * FA Cups and a Copa del Rey is a career, four "Copa Nacional" is a row in a
 * table. A Title carries the club, the club knows its league, and the league
 * knows the country — which is all that is needed to name them properly.
 */
export function titleName(t: Title, lang: Lang): string {
  const club = t.clubId ? getClub(t.clubId) : null;
  const league = club ? getLeague(club.leagueId) : null;

  if (t.key === 'domestic-cup') {
    return domesticCupName(league?.nationCode, lang) ?? titleLabel(t.key, lang);
  }
  if (t.key === 'league' && league) return leagueName(league.id, lang);

  return titleLabel(t.key, lang);
}
