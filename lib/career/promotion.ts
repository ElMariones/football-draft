// Ascensos y descensos.
//
// Each offseason the divisions shuffle: the weakest sides in a top flight can
// drop, the strongest below can come up. Strength is the driver, so a giant
// essentially never falls — Real Madrid's chance is not zero on paper, but it
// is vanishingly small — while a newly promoted minnow is always in danger.
//
// Clubs carry their league on the club object, so moves are applied by mutating
// it through `setClubLeague`. `resetLeagues()` puts everything back at the start
// of a new career.
import { CLUBS, setClubLeague, resetLeagues } from '@/data/career/clubs';
import { LEAGUES, getLeague } from '@/data/career/leagues';
import type { CareerClub } from '@/data/career/types';
import type { Rng } from './rng';
import type { Lang } from './i18n';

export { resetLeagues };

export interface LeagueMove {
  clubId: string;
  clubName: string;
  from: string;
  to: string;
  direction: 'up' | 'down';
}

/** Pairs of leagues in the same country, one tier apart, that clubs move between. */
function ladders(): { top: string; bottom: string }[] {
  const out: { top: string; bottom: string }[] = [];
  for (const a of LEAGUES) {
    for (const b of LEAGUES) {
      if (a.nationCode !== b.nationCode) continue;
      if (b.tier > a.tier) out.push({ top: a.id, bottom: b.id });
    }
  }
  // keep only the closest pairing per top league (Premier↔Championship, not
  // Premier↔some third tier that doesn't exist here)
  const best = new Map<string, { top: string; bottom: string; gap: number }>();
  for (const l of out) {
    const gap = (getLeague(l.bottom)?.tier ?? 9) - (getLeague(l.top)?.tier ?? 0);
    const cur = best.get(l.top);
    if (!cur || gap < cur.gap) best.set(l.top, { ...l, gap });
  }
  return [...best.values()].map(({ top, bottom }) => ({ top, bottom }));
}

/**
 * Relegation risk from a club's standing inside its own division. A side well
 * below its league's average is in real trouble; an elite club is effectively
 * immune no matter what the dice say.
 */
function relegationRisk(club: CareerClub, leagueAvg: number): number {
  if (club.strength >= 84) return 0.004;          // the giants: once a century
  const below = leagueAvg - club.strength;
  if (below <= 0) return 0.02;
  return Math.min(0.42, 0.03 + below * 0.035);
}

function promotionChance(club: CareerClub, leagueMax: number): number {
  const behind = leagueMax - club.strength;
  return Math.max(0.03, 0.34 - behind * 0.04);
}

/** Roll one season of movement across every country's ladder. */
export function rollLeagueMoves(rng: Rng): LeagueMove[] {
  const moves: LeagueMove[] = [];
  for (const { top, bottom } of ladders()) {
    const upper = CLUBS.filter(c => c.leagueId === top);
    const lower = CLUBS.filter(c => c.leagueId === bottom);
    if (upper.length < 4 || lower.length < 2) continue;   // too thin to shuffle

    const avg = upper.reduce((s, c) => s + c.strength, 0) / upper.length;
    const maxLower = lower.reduce((m, c) => Math.max(m, c.strength), 0);

    // Only the bottom few are ever candidates, and at most two go each way so a
    // division never empties out.
    const atRisk = [...upper].sort((a, b) => a.strength - b.strength).slice(0, 4);
    const going = atRisk.filter(c => rng.chance(relegationRisk(c, avg))).slice(0, 2);

    const contenders = [...lower].sort((a, b) => b.strength - a.strength).slice(0, 4);
    const coming = contenders.filter(c => rng.chance(promotionChance(c, maxLower))).slice(0, going.length || 1);

    // keep the divisions balanced: only swap as many as go both ways
    const n = Math.min(going.length, coming.length);
    for (let i = 0; i < n; i++) {
      setClubLeague(going[i].id, bottom);
      moves.push({ clubId: going[i].id, clubName: going[i].name, from: top, to: bottom, direction: 'down' });
      setClubLeague(coming[i].id, top);
      moves.push({ clubId: coming[i].id, clubName: coming[i].name, from: bottom, to: top, direction: 'up' });
    }
  }
  return moves;
}

/** Headlines for the season ticker — the player's own club comes first. */
export function moveNews(moves: LeagueMove[], playerClubId: string | null, lang: Lang): string[] {
  const es = lang === 'es';
  const out: string[] = [];
  for (const m of moves) {
    const mine = m.clubId === playerClubId;
    if (!mine) continue;
    out.push(m.direction === 'up'
      ? (es ? `🎉 ¡${m.clubName} asciende! El año que viene se juega arriba.`
            : `🎉 ${m.clubName} are promoted! Next year is a division higher.`)
      : (es ? `💔 ${m.clubName} desciende. Toca reconstruir desde abajo.`
            : `💔 ${m.clubName} are relegated. Rebuilding starts a division down.`));
  }
  // a short note on everyone else, so the world feels alive
  const others = moves.filter(m => m.clubId !== playerClubId);
  if (others.length) {
    const up = others.filter(m => m.direction === 'up').map(m => m.clubName).slice(0, 2);
    const down = others.filter(m => m.direction === 'down').map(m => m.clubName).slice(0, 2);
    if (up.length) out.push((es ? '⬆️ Ascienden: ' : '⬆️ Promoted: ') + up.join(', '));
    if (down.length) out.push((es ? '⬇️ Descienden: ' : '⬇️ Relegated: ') + down.join(', '));
  }
  return out;
}
