'use client';

import { useEffect, useState } from 'react';
import { useT } from '@/lib/i18n';
import { useGameStore } from '@/store/gameStore';

type Mode = 'pl' | 'cl' | 'll' | 'wc';
type Sort = 'ovr' | 'results';

interface Row {
  id: string;
  userId: string;
  mode: Mode;
  teamName: string;
  formation: string;
  finalPosition: number | null;
  clStage: string | null;
  overall: number | null;
  wins: number | null;
  draws: number | null;
  losses: number | null;
  points: number | null;
  user_name: string | null;
  user_image: string | null;
}

const MODE_META: Record<Mode, { label: string; color: string; emoji: string }> = {
  pl: { label: 'Premier League', color: '#FFD700', emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  ll: { label: 'La Liga',         color: '#C8102E', emoji: '🇪🇸' },
  cl: { label: 'Champions League',color: '#3DA9FC', emoji: '🌍' },
  wc: { label: 'World Cup',       color: '#00DFA2', emoji: '🏆' },
};

// The only strings on this board that were not already going through useT().
const CL_STAGE_LABEL: Record<string, { en: string; es: string }> = {
  'champion':       { en: 'Champion',       es: 'Campeón' },
  'final':          { en: 'Runner-up',      es: 'Subcampeón' },
  'third-place':    { en: 'Third place',    es: 'Tercer puesto' },
  'semi-finals':    { en: 'Semi-finals',    es: 'Semifinales' },
  'quarter-finals': { en: 'Quarter-finals', es: 'Cuartos de final' },
  'group':          { en: 'Group stage',    es: 'Fase de grupos' },
};

export default function LeaderboardClient() {
  const [mode, setMode] = useState<Mode>('pl');
  const [sort, setSort] = useState<Sort>('ovr');
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(false);
  const t = useT();
  const language = useGameStore(s => s.language);
  const stageLang: 'en' | 'es' = language === 'en' ? 'en' : 'es';

  useEffect(() => {
    setLoading(true);
    fetch(`/api/leaderboard?mode=${mode}&sort=${sort}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(json => setRows(json.rows ?? []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [mode, sort]);

  const meta = MODE_META[mode];

  return (
    <>
      {/* Mode tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
        {(['pl', 'll', 'cl', 'wc'] as Mode[]).map(m => {
          const active = mode === m;
          const mm = MODE_META[m];
          return (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-xl px-3 py-2.5 border text-sm font-display tracking-wide transition-all ${
                active
                  ? 'border-white/40 bg-white/10 text-white shadow-lg'
                  : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
              }`}
              style={active ? { borderColor: `${mm.color}88`, boxShadow: `0 0 18px ${mm.color}33` } : undefined}
            >
              <span className="block text-[10px] tracking-[0.25em] text-white/40 uppercase mb-0.5">
                {mm.label}
              </span>
              <span style={{ color: active ? mm.color : undefined }}>{mm.emoji}</span>
            </button>
          );
        })}
      </div>

      {/* Sort toggle */}
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setSort('ovr')}
          className={`flex-1 rounded-lg px-3 py-2 border text-xs font-display tracking-widest uppercase transition-colors ${
            sort === 'ovr' ? 'border-gold/60 bg-gold/10 text-white' : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
          }`}
        >
          {t.leaderboard.byOverall}
        </button>
        <button
          onClick={() => setSort('results')}
          className={`flex-1 rounded-lg px-3 py-2 border text-xs font-display tracking-widest uppercase transition-colors ${
            sort === 'results' ? 'border-gold/60 bg-gold/10 text-white' : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
          }`}
        >
          {t.leaderboard.byResults}
        </button>
      </div>

      <div className="glass overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-white/40 text-sm">{t.leaderboard.loading}</div>
        ) : !rows || rows.length === 0 ? (
          <div className="p-8 text-center text-white/50 text-sm">{t.leaderboard.empty}</div>
        ) : (
          <ul className="divide-y divide-white/5">
            {rows.map((row, i) => (
              <li key={row.id} className="flex items-center gap-3 px-3 sm:px-4 py-2.5">
                <div
                  className="w-7 text-center font-display text-base tabular-nums"
                  style={{ color: i < 3 ? meta.color : 'rgba(255,255,255,0.4)' }}
                >
                  {i + 1}
                </div>
                {row.user_image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={row.user_image}
                    alt=""
                    className="w-9 h-9 rounded-full border border-white/15 object-cover"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-white/10 border border-white/15 grid place-items-center font-display text-sm">
                    {(row.user_name?.[0] ?? '?').toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-display truncate">
                    {row.user_name ?? t.leaderboard.anonymous}
                  </div>
                  <div className="text-[10px] text-white/45 truncate">
                    {row.teamName} · {row.formation}
                  </div>
                </div>
                <div className="text-right">
                  {sort === 'ovr' ? (
                    <div className="font-display text-lg tabular-nums" style={{ color: meta.color }}>
                      {row.overall ?? '—'}
                    </div>
                  ) : mode === 'cl' || mode === 'wc' ? (
                    <>
                      <div className="font-display text-sm" style={{ color: meta.color }}>
                        {CL_STAGE_LABEL[row.clStage ?? '']?.[stageLang] ?? '—'}
                      </div>
                      <div className="text-[10px] text-white/45 tabular-nums">
                        {row.wins}W {row.draws}D {row.losses}L
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="font-display text-lg tabular-nums" style={{ color: meta.color }}>
                        {row.points ?? '—'} pts
                      </div>
                      <div className="text-[10px] text-white/45 tabular-nums">
                        {row.wins}W {row.draws}D {row.losses}L
                      </div>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
