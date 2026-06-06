'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { MatchResult, SeasonResult, TableRow } from '@/lib/simulation';
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

  // Build a lookup from teamId → era label for display.
  const teamEraMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const r of season.table) {
      map[r.teamId] = r.era;
    }
    return map;
  }, [season]);

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

        <div className="space-y-3 max-h-[460px] overflow-y-auto pr-2 no-scrollbar">
          <AnimatePresence initial={false}>
            {season.fixtures.slice(0, matchIdx + 1).reverse().map(m => (
              <MatchRow key={`${m.matchday}-${m.home.teamId}`} match={m} playerTeamId={playerTeamId} teamEraMap={teamEraMap} />
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

function MatchRow({ match, playerTeamId, teamEraMap }: { match: MatchResult; playerTeamId: string; teamEraMap: Record<string, string> }) {
  const home = getTeam(match.home.teamId);
  const away = getTeam(match.away.teamId);
  const isPlayerMatch =
    match.home.teamId === playerTeamId || match.away.teamId === playerTeamId;
  const homeEra = teamEraMap[match.home.teamId];
  const awayEra = teamEraMap[match.away.teamId];

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35 }}
      className={`relative rounded-xl p-3 border transition-colors ${
        isPlayerMatch
          ? 'bg-gold/10 border-gold/40'
          : 'bg-white/5 border-white/10'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
          <div className="text-right min-w-0">
            <span className="truncate text-sm block">{home?.name}</span>
            {homeEra && homeEra !== 'all-time' && (
              <span className="text-[10px] text-white/40">({homeEra})</span>
            )}
          </div>
          <ColorTag color={home?.colors.primary ?? '#444'} />
        </div>
        <div className="font-display text-xl tabular-nums px-3 min-w-[68px] text-center">
          {match.home.goals} – {match.away.goals}
        </div>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <ColorTag color={away?.colors.primary ?? '#444'} />
          <div className="min-w-0">
            <span className="truncate text-sm block">{away?.name}</span>
            {awayEra && awayEra !== 'all-time' && (
              <span className="text-[10px] text-white/40">({awayEra})</span>
            )}
          </div>
        </div>
      </div>
      {match.scorers.length > 0 && (
        <div className="mt-2 text-[11px] text-white/60 flex flex-wrap gap-x-3 gap-y-0.5 pl-1">
          {match.scorers.map((s, i) => (
            <span key={i}>
              ⚽ {s.playerName} <span className="opacity-50">{s.minute}&apos;</span>
            </span>
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
  return (
    <div className="text-sm">
      <div className="grid grid-cols-[24px_1fr_28px_28px_28px_36px_36px] gap-2 text-[10px] tracking-widest uppercase text-white/40 pb-1 border-b border-white/10">
        <div>#</div>
        <div>Team</div>
        <div className="text-center">P</div>
        <div className="text-center">W</div>
        <div className="text-center">D</div>
        <div className="text-center">GD</div>
        <div className="text-center">Pts</div>
      </div>
      {rows.map((row, i) => {
        const team = getTeam(row.teamId);
        const isYou = row.teamId === highlightTeamId;
        const eraLabel = row.era && row.era !== 'all-time' ? ` (${row.era})` : '';
        return (
          <motion.div
            key={row.teamId}
            layout
            transition={{ type: 'spring', stiffness: 250, damping: 25 }}
            className={`grid grid-cols-[24px_1fr_28px_28px_28px_36px_36px] gap-2 items-center py-1.5 px-0.5 rounded ${
              isYou ? 'bg-gold/15 border-l-2 border-gold' : ''
            }`}
          >
            <div className="text-xs text-white/40 tabular-nums">{i + 1}</div>
            <div className="flex items-center gap-2 min-w-0">
              <ColorTag color={team?.colors.primary ?? '#444'} />
              <div className="min-w-0">
                <span className="truncate text-xs sm:text-sm block">{row.name}</span>
                {eraLabel && (
                  <span className="text-[9px] text-white/35 block">{eraLabel}</span>
                )}
              </div>
            </div>
            <div className="text-center text-xs tabular-nums">{row.played}</div>
            <div className="text-center text-xs tabular-nums">{row.won}</div>
            <div className="text-center text-xs tabular-nums">{row.drawn}</div>
            <div className="text-center text-xs tabular-nums">{row.gd > 0 ? `+${row.gd}` : row.gd}</div>
            <div className="text-center font-bold tabular-nums">{row.points}</div>
          </motion.div>
        );
      })}
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
