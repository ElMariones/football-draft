'use client';

// The career-mode board. One row per player — their single best career — with the
// run's story expandable underneath, because a career score on its own tells you
// nothing about how it was earned.
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { nationFlag, nationName } from '@/data/career/nations';
import { titleLabel } from '@/lib/career/i18n';
import { resultLabel } from '@/lib/career/international';
import type { NtResult } from '@/lib/career/international';
import type { CareerHistory } from '@/lib/career/submission';

type Sort = 'score' | 'trophies' | 'goals' | 'overall';

interface Entry {
  id: string;
  surname: string;
  nationCode: string;
  position: string;
  score: number;
  peakOverall: number;
  seasonsPlayed: number;
  trophies: number;
  goals: number;
  assists: number;
  apps: number;
  ballonDors: number;
  seed: number;
  history: CareerHistory;
  createdAt: string;
  user_name: string | null;
  user_image: string | null;
}

const SORTS: { key: Sort; en: string; es: string }[] = [
  { key: 'score', en: 'Career score', es: 'Puntaje de carrera' },
  { key: 'overall', en: 'Peak overall', es: 'Pico de media' },
  { key: 'trophies', en: 'Trophies', es: 'Títulos' },
  { key: 'goals', en: 'Goals', es: 'Goles' },
];

const T = {
  blurb: {
    en: 'No account needed — the name you give your player is the entry. Rolled seeds only: a typed seed can be replayed until the world cooperates, so seeded careers stay on your local board and are never submitted here.',
    es: 'No hace falta cuenta: el nombre que le pones a tu jugador es la entrada. Solo semillas sorteadas: una semilla escrita se puede repetir hasta que el mundo colabore, así que esas carreras se quedan en tu tabla local y nunca se envían aquí.',
  },
  loadError: { en: 'Could not load the board.', es: 'No se pudo cargar la tabla.' },
  notMigrated: {
    en: 'The career table has not been created yet. Run',
    es: 'La tabla de carreras todavía no existe. Ejecuta',
  },
  empty: {
    en: 'Nobody has finished a ranked career yet. Be first.',
    es: 'Todavía nadie terminó una carrera puntuable. Sé el primero.',
  },
  seasons: { en: 'seasons', es: 'temporadas' },
  peak: { en: 'peak', es: 'pico' },
  apps: { en: 'Apps', es: 'PJ' },
  goals: { en: 'Goals', es: 'Goles' },
  assists: { en: 'Assists', es: 'Asistencias' },
  trophies: { en: 'Trophies', es: 'Títulos' },
  ballon: { en: "Ballon d'Or", es: 'Balón de Oro' },
  score: { en: 'Score', es: 'Puntaje' },
  path: { en: 'Career path', es: 'Trayectoria' },
  loan: { en: 'loan', es: 'préstamo' },
  honours: { en: 'Honours', es: 'Palmarés' },
  nt: { en: 'National team', es: 'Selección' },
  caps: { en: 'caps', es: 'partidos' },
  ntGoals: { en: 'goals', es: 'goles' },
  best: { en: 'Best season', es: 'Mejor temporada' },
  bestAt: { en: 'at', es: 'en' },
  inApps: { en: 'goals in', es: 'goles en' },
  appsWord: { en: 'apps', es: 'partidos' },
  rating: { en: 'rating', es: 'nota' },
  seed: { en: 'seed', es: 'semilla' },
} as const;

const MEDAL = ['🥇', '🥈', '🥉'];

export default function CareerBoard() {
  const language = useGameStore(st => st.language);
  const lang: 'en' | 'es' = language === 'en' ? 'en' : 'es';
  const es = lang === 'es';
  const tr = <K extends keyof typeof T>(k: K) => T[k][lang];

  const [sort, setSort] = useState<Sort>('score');
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [notMigrated, setNotMigrated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setEntries(null);
    setError(null);
    fetch(`/api/career-leaderboard?sort=${sort}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (!live) return;
        setEntries(d.entries ?? []);
        setNotMigrated(!!d.notMigrated);
      })
      .catch(() => live && setError(T.loadError[lang]));
    return () => { live = false; };
  }, [sort, lang]);

  const value = (e: Entry) =>
    sort === 'trophies' ? e.trophies
      : sort === 'goals' ? e.goals
        : sort === 'overall' ? e.peakOverall
          : e.score;

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        {SORTS.map(s => (
          <button
            key={s.key}
            onClick={() => setSort(s.key)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              sort === s.key
                ? 'border-wc bg-wc/15 text-wc'
                : 'border-white/15 bg-white/5 text-white/55 hover:bg-white/10'
            }`}
          >
            {s[lang]}
          </button>
        ))}
      </div>

      <p className="text-[11px] text-white/40 mb-4">
        {tr('blurb')}
      </p>

      {error && <div className="text-red-300 text-sm py-6 text-center">{error}</div>}

      {notMigrated && (
        <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 px-4 py-3 text-sm text-amber-200">
          {tr('notMigrated')} <code className="font-mono">npm run db:migrate</code>.
        </div>
      )}

      {!error && !notMigrated && entries === null && (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-white/[0.03] animate-pulse" />
          ))}
        </div>
      )}

      {entries?.length === 0 && !notMigrated && (
        <div className="text-white/40 text-sm py-10 text-center">
          {tr('empty')}
        </div>
      )}

      <div className="space-y-1.5">
        {entries?.map((e, i) => {
          const isOpen = open === e.id;
          return (
            <div key={e.id} className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
              <button
                onClick={() => setOpen(isOpen ? null : e.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-white/[0.04] transition-colors"
              >
                <span className="w-7 text-center shrink-0 font-display text-sm text-white/50">
                  {i < 3 ? MEDAL[i] : i + 1}
                </span>
                <span className="text-lg shrink-0" title={nationName(e.nationCode, lang)}>
                  {nationFlag(e.nationCode)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2 min-w-0">
                    <span className="font-display text-base leading-none truncate">{e.surname}</span>
                    <span className="text-[10px] text-white/35 shrink-0">{e.position}</span>
                  </div>
                  <div className="text-[11px] text-white/45 truncate">
                    {/* the player's name is the entry; an account is optional
                        and only ever adds a credit next to it */}
                    {e.user_name && <span className="text-white/60">{e.user_name} · </span>}
                    {e.seasonsPlayed} {tr('seasons')} · {tr('peak')} {e.peakOverall}
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-3 text-[11px] text-white/45 shrink-0">
                  <span>{e.goals} G</span>
                  <span>{e.assists} A</span>
                  <span>{e.trophies} 🏆</span>
                  {e.ballonDors > 0 && <span className="text-gold">{e.ballonDors} 🏅</span>}
                </div>
                <span className="font-display text-xl text-wc w-16 text-right shrink-0 tabular-nums">
                  {value(e)}
                </span>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-white/10"
                  >
                    <div className="px-3 py-3 space-y-3">
                      {/* career totals, including the ones hidden on mobile above */}
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
                        {([
                          [tr('apps'), e.apps], [tr('goals'), e.goals], [tr('assists'), e.assists],
                          [tr('trophies'), e.trophies], [tr('ballon'), e.ballonDors], [tr('score'), e.score],
                        ] as const).map(([l, v]) => (
                          <div key={l}>
                            <div className="font-display text-lg leading-none">{v}</div>
                            <div className="text-[9px] uppercase tracking-widest text-white/35">{l}</div>
                          </div>
                        ))}
                      </div>

                      {/* the clubs, in order */}
                      <div>
                        <div className="text-[9px] uppercase tracking-[0.25em] text-white/35 mb-1.5">{tr('path')}</div>
                        <div className="flex flex-wrap gap-1.5">
                          {e.history?.spells?.map((sp, j) => (
                            <span key={j}
                              className={`text-[11px] px-2 py-1 rounded-lg border ${
                                sp.onLoan
                                  ? 'border-white/10 bg-white/[0.02] text-white/40'
                                  : 'border-white/15 bg-white/5 text-white/70'
                              }`}>
                              {sp.club}
                              <span className="text-white/30"> {sp.from}{sp.to !== sp.from ? `–${sp.to}` : ''}</span>
                              {sp.onLoan && <span className="text-white/25"> ({tr('loan')})</span>}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* honours */}
                      {!!e.history?.honours?.length && (
                        <div>
                          <div className="text-[9px] uppercase tracking-[0.25em] text-white/35 mb-1.5">{tr('honours')}</div>
                          <div className="flex flex-wrap gap-1.5">
                            {e.history.honours.map(h => (
                              <span key={h.label ?? h.key}
                                className="text-[11px] px-2 py-1 rounded-lg border border-gold/25 bg-gold/[0.07] text-gold/90">
                                {/* rows written before labelEs existed fall back to the
                                    key, which is right for everything except a domestic
                                    cup — that one needs the club to name properly */}
                                {(es ? (h.labelEs ?? titleLabel(h.key, 'es'))
                                     : (h.label ?? titleLabel(h.key, 'en')))}
                                {h.n > 1 && ` ×${h.n}`}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* national team */}
                      {e.history?.nation && (
                        <div>
                          <div className="text-[9px] uppercase tracking-[0.25em] text-white/35 mb-1.5">
                            {tr('nt')}
                          </div>
                          <div className="text-[12px] text-white/60">
                            {nationFlag(e.history.nation.code)}{' '}
                            {nationName(e.history.nation.code, lang)} ·{' '}
                            {e.history.nation.caps} {e.history.nation.caps === 1 ? (es ? 'partido' : 'cap') : tr('caps')} · {e.history.nation.goals} {e.history.nation.goals === 1 ? (es ? 'gol' : 'goal') : tr('ntGoals')}
                          </div>
                          {!!e.history.nation.tournaments?.length && (
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              {e.history.nation.tournaments.map((tt, j) => (
                                <span key={j}
                                  className={`text-[11px] px-2 py-0.5 rounded-lg border ${
                                    tt.result === 'champion'
                                      ? 'border-gold/40 bg-gold/10 text-gold'
                                      : 'border-white/12 bg-white/[0.03] text-white/50'
                                  }`}>
                                  {tt.year} {titleLabel(tt.key, lang)} · {resultLabel(tt.result as NtResult, lang)}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {e.history?.bestSeason && (
                        <div className="text-[11px] text-white/45">
                          {tr('best')}: {e.history.bestSeason.year} {tr('bestAt')} {e.history.bestSeason.club} —{' '}
                          {e.history.bestSeason.goals} {tr('inApps')} {e.history.bestSeason.apps} {tr('appsWord')},
                          {' '}{tr('rating')} {e.history.bestSeason.rating.toFixed(1)}
                        </div>
                      )}

                      <div className="text-[10px] text-white/25 font-mono">{tr('seed')} {e.seed}</div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
