'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { MatchResult, SeasonResult, TableRow, TeamSnapshot } from '@/lib/simulation';
import { getTeam } from '@/data';

interface Props {
  season: SeasonResult;
  onDone: () => void;
}

// Replay pace per matchday.
const MATCH_INTERVAL_MS = 800;

export default function SeasonView({ season, onDone }: Props) {
  const [matchIdx, setMatchIdx] = useState(0);
  const [autoplay, setAutoplay] = useState(true);
  const playerTeamId = season.playerTeam.id;

  // Recompute progressive table.
  const progressiveTable = useMemo(() => {
    return buildProgressiveTables(season.allFixtures, season.table.map(r => r.teamId), {
      idToName: Object.fromEntries(season.table.map(r => [r.teamId, r.name])),
      idToShortName: Object.fromEntries(season.table.map(r => [r.teamId, r.shortName])),
      idToEra: Object.fromEntries(season.table.map(r => [r.teamId, r.era])),
    });
  }, [season]);

  useEffect(() => {
    if (!autoplay) return;
    if (matchIdx >= season.fixtures.length) return;
    const t = setTimeout(() => setMatchIdx(i => i + 1), MATCH_INTERVAL_MS);
    return () => clearTimeout(t);
  }, [matchIdx, autoplay, season.fixtures.length]);

  const currentMatch = season.fixtures[Math.min(matchIdx, season.fixtures.length - 1)];
  const allMatchdaysDone = matchIdx >= season.fixtures.length;
  const tableNow = progressiveTable[
    Math.min(currentMatch?.matchday ?? 1, progressiveTable.length) - 1
  ];

  return (
    <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6">
      {/* Match feed */}
      <div className="glass p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs tracking-[0.3em] text-white/50 uppercase">
              Matchday {currentMatch?.matchday ?? season.fixtures.length}
            </div>
            <h3 className="font-display text-2xl">Season Playback</h3>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setAutoplay(a => !a)}
              className="btn-ghost text-sm"
            >
              {autoplay ? 'Pause' : 'Resume'}
            </button>
            <button
              onClick={() => setMatchIdx(season.fixtures.length)}
              className="btn-ghost text-sm"
            >
              Skip to End
            </button>
          </div>
        </div>

        <div className="space-y-3 max-h-[260px] sm:max-h-[460px] overflow-y-auto pr-2 no-scrollbar">
          <AnimatePresence initial={false}>
            {season.fixtures.slice(0, matchIdx + 1).reverse().map(m => (
              <MatchRow key={`${m.matchday}-${m.home.teamId}`} match={m} playerTeamId={playerTeamId} playerTeam={season.playerTeam} />
            ))}
          </AnimatePresence>
        </div>

        {allMatchdaysDone && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 flex justify-end"
          >
            <button onClick={onDone} className="btn-primary">
              See Final Results →
            </button>
          </motion.div>
        )}
      </div>

      {/* Live table */}
      <div className="glass p-5 sm:p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-xl">League Table</h3>
          <div className="text-xs text-white/50">
            Matchday {currentMatch?.matchday ?? '-'}
          </div>
        </div>
        <LeagueTable rows={tableNow ?? season.table} highlightTeamId={playerTeamId} />
      </div>
    </div>
  );
}

function MatchRow({ match, playerTeamId, playerTeam }: {
  match: MatchResult;
  playerTeamId: string;
  playerTeam: TeamSnapshot;
}) {
  const resolve = (teamId: string) =>
    teamId === playerTeam.id ? playerTeam : getTeam(teamId);

  const home = resolve(match.home.teamId);
  const away = resolve(match.away.teamId);
  const isPlayerMatch =
    match.home.teamId === playerTeamId || match.away.teamId === playerTeamId;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35 }}
      className={`relative rounded-xl px-3 py-2 border transition-colors ${
        isPlayerMatch ? 'bg-gold/10 border-gold/40' : 'bg-white/5 border-white/10'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0 flex-1 justify-end">
          <span className="sm:hidden truncate text-xs text-right">{home?.shortName ?? home?.name}</span>
          <span className="hidden sm:block truncate text-sm text-right">{home?.name}</span>
          <ColorTag color={home?.colors.primary ?? '#444'} />
        </div>
        <div className="font-display text-lg tabular-nums px-2 min-w-[56px] text-center">
          {match.home.goals}–{match.away.goals}
        </div>
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <ColorTag color={away?.colors.primary ?? '#444'} />
          <span className="sm:hidden truncate text-xs">{away?.shortName ?? away?.name}</span>
          <span className="hidden sm:block truncate text-sm">{away?.name}</span>
        </div>
      </div>
      {isPlayerMatch && match.scorers.length > 0 && (
        <div className="mt-1 text-[10px] text-white/50 flex flex-wrap gap-x-2 gap-y-0.5">
          {match.scorers.map((s, i) => (
            <span key={i}>⚽ {s.playerName} <span className="opacity-60">{s.minute}&apos;</span></span>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function ColorTag({ color }: { color: string }) {
  return <span className="w-2 h-6 rounded-full inline-block" style={{ background: color }} />;
}

function LeagueTable({ rows, highlightTeamId }: { rows: TableRow[]; highlightTeamId: string }) {
  const playerPos = rows.findIndex(r => r.teamId === highlightTeamId);

  return (
    <div className="text-sm">
      {/* Mobile: compact columns. Desktop: full columns. */}
      <div className="grid grid-cols-[20px_1fr_28px_32px_32px] sm:grid-cols-[24px_1fr_28px_28px_28px_36px_36px] gap-x-1 sm:gap-x-2 text-[10px] tracking-widest uppercase text-white/40 pb-1 border-b border-white/10">
        <div>#</div>
        <div>Team</div>
        <div className="text-center">P</div>
        <div className="text-center hidden sm:block">W</div>
        <div className="text-center hidden sm:block">D</div>
        <div className="text-center">GD</div>
        <div className="text-center">Pts</div>
      </div>
      {/* On mobile: cap at 260px so it doesn't dominate the page */}
      <div className="max-h-[260px] overflow-y-auto no-scrollbar sm:max-h-none">
        {rows.map((row, i) => {
          const team = getTeam(row.teamId);
          const isYou = row.teamId === highlightTeamId;
          // On mobile: only render top 6, bottom 3, and player's row ± 1
          const nearPlayer = playerPos >= 0 && Math.abs(i - playerPos) <= 1;
          const showOnMobile = i < 6 || i >= rows.length - 3 || nearPlayer;
          return (
            <motion.div
              key={row.teamId}
              layout
              transition={{ type: 'spring', stiffness: 250, damping: 25 }}
              className={`grid grid-cols-[20px_1fr_28px_32px_32px] sm:grid-cols-[24px_1fr_28px_28px_28px_36px_36px] gap-x-1 sm:gap-x-2 items-center py-1 sm:py-1.5 px-0.5 rounded ${
                isYou ? 'bg-gold/15 border-l-2 border-gold' : ''
              } ${!showOnMobile ? 'hidden sm:grid' : ''}`}
            >
              <div className="text-[10px] text-white/40 tabular-nums">{i + 1}</div>
              <div className="flex items-center gap-1.5 min-w-0">
                <ColorTag color={team?.colors.primary ?? '#444'} />
                <span className="truncate text-[11px] sm:text-sm">{row.shortName || row.name}</span>
              </div>
              <div className="text-center text-[11px] tabular-nums">{row.played}</div>
              <div className="text-center text-[11px] tabular-nums hidden sm:block">{row.won}</div>
              <div className="text-center text-[11px] tabular-nums hidden sm:block">{row.drawn}</div>
              <div className="text-center text-[11px] tabular-nums">{row.gd > 0 ? `+${row.gd}` : row.gd}</div>
              <div className="text-center text-[11px] font-bold tabular-nums">{row.points}</div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// Build a table snapshot per matchday (1..38) by replaying allFixtures.
function buildProgressiveTables(
  fixtures: MatchResult[],
  teamIds: string[],
  meta: { idToName: Record<string, string>; idToShortName: Record<string, string>; idToEra: Record<string, string> },
): TableRow[][] {
  const init = (): Record<string, TableRow> => {
    const map: Record<string, TableRow> = {};
    teamIds.forEach(id => {
      map[id] = {
        teamId: id,
        name: meta.idToName[id] ?? id,
        shortName: meta.idToShortName[id] ?? '',
        era: meta.idToEra[id] ?? '',
        played: 0, won: 0, drawn: 0, lost: 0,
        gf: 0, ga: 0, gd: 0, points: 0,
      };
    });
    return map;
  };

  const acc = init();
  const tables: TableRow[][] = [];
  const byMatchday: Record<number, MatchResult[]> = {};
  fixtures.forEach(m => {
    if (!byMatchday[m.matchday]) byMatchday[m.matchday] = [];
    byMatchday[m.matchday].push(m);
  });

  const maxMd = Math.max(...Object.keys(byMatchday).map(Number));
  for (let md = 1; md <= maxMd; md++) {
    (byMatchday[md] ?? []).forEach(m => {
      const h = acc[m.home.teamId];
      const a = acc[m.away.teamId];
      if (!h || !a) return;
      h.played++; a.played++;
      h.gf += m.home.goals; h.ga += m.away.goals;
      a.gf += m.away.goals; a.ga += m.home.goals;
      if (m.home.goals > m.away.goals) {
        h.won++; h.points += 3; a.lost++;
      } else if (m.home.goals < m.away.goals) {
        a.won++; a.points += 3; h.lost++;
      } else {
        h.drawn++; a.drawn++;
        h.points++; a.points++;
      }
      h.gd = h.gf - h.ga; a.gd = a.gf - a.ga;
    });
    const snapshot = Object.values(acc)
      .map(r => ({ ...r }))
      .sort((x, y) => y.points - x.points || y.gd - x.gd || y.gf - x.gf);
    tables.push(snapshot);
  }
  return tables;
}
