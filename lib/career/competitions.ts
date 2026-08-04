import type { Title } from '@/data/career/types';
import { getClub } from '@/data/career/clubs';
import { getLeague, leagueName } from '@/data/career/leagues';
import { domesticCupName } from '@/data/career/cups';
import { getNation } from '@/data/career/nations';
import { titleLabel, type Lang } from './i18n';

/**
 * Which division a title belongs to.
 *
 * Prefers the id stamped on the title when it was won. Falling back to the
 * club's *current* league only covers titles written before that field existed:
 * clubs are promoted and relegated, so the fallback can rename an old trophy.
 */
function leagueOf(t: Title): string | null {
  if (t.leagueId) return t.leagueId;
  const club = t.clubId ? getClub(t.clubId) : null;
  return club ? club.leagueId : null;
}

/**
 * League-scoped individual awards, split by division.
 *
 * "League MVP" four times over reads as one award repeated; a Premier League
 * MVP, a LaLiga MVP and two Serie A Golden Boots is a career with a shape.
 *
 * The map holds the award on its own. English prepends the division; Spanish
 * appends it after a separator, because "MVP de la Premier League" and "MVP de
 * LaLiga" take different articles and a separator sidesteps a grammar problem
 * that would add nothing.
 */
const LEAGUE_AWARD: Record<string, [string, string]> = {
  'league-mvp': ['MVP', 'MVP'],
  'league-top-scorer': ['Top Scorer', 'Goleador'],
  'league-top-assist': ['Playmaker', 'Máximo Asistente'],
  'league-best-keeper': ['Best Goalkeeper', 'Mejor Portero'],
  'league-best-defender': ['Best Defender', 'Mejor Defensor'],
  'league-best-midfielder': ['Best Midfielder', 'Mejor Mediocampista'],
  'league-best-forward': ['Best Forward', 'Mejor Delantero'],
  'league-best-young': ['Best Young Player', 'Mejor Joven'],
};

/** Records are named after whose book they are in. */
const RECORD_LABEL: Record<string, [string, string]> = {
  'club-top-scorer': ['all-time top scorer', 'Máximo goleador histórico'],
  'club-most-apps': ['appearance record', 'Récord de partidos'],
  'nation-top-scorer': ['all-time top scorer', 'Máximo goleador histórico'],
  'nation-most-caps': ['cap record', 'Récord de partidos'],
};

/**
 * The display name of a trophy, resolved against where it was actually won.
 *
 * `titleLabel` only knows the key, so every domestic cup came out as the same
 * generic "Copa Nacional" and every league as "Liga". Both are competitions with
 * real names, and which one you won is most of what a trophy cabinet says: three
 * FA Cups and a Copa del Rey is a career, four "Copa Nacional" is a row in a
 * table.
 */
export function titleName(t: Title, lang: Lang): string {
  const es = lang === 'es';
  const leagueId = leagueOf(t);
  const league = leagueId ? getLeague(leagueId) : null;

  if (t.key === 'domestic-cup') {
    return domesticCupName(league?.nationCode, lang) ?? titleLabel(t.key, lang);
  }
  if (t.key === 'league' && league) return leagueName(league.id, lang);

  const award = LEAGUE_AWARD[t.key];
  if (award && league) {
    const name = leagueName(league.id, lang);
    const label = es ? award[1] : award[0];
    return es ? `${label} · ${name}` : `${name} ${label}`;
  }

  const record = RECORD_LABEL[t.key];
  if (record) {
    const label = es ? record[1] : record[0];
    const holder = t.nationCode
      ? (getNation(t.nationCode)?.[es ? 'es' : 'en'] ?? t.nationCode)
      : (t.clubId ? getClub(t.clubId)?.name ?? '' : '');
    return holder ? (es ? `${label} de ${holder}` : `${holder} ${label}`) : label;
  }

  return titleLabel(t.key, lang);
}
