'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { CareerPlayer, SeasonRecord, Title } from '@/data/career/types';
import { getClub } from '@/data/career/clubs';
import { getLeague, leagueName } from '@/data/career/leagues';
import { nationName, nationFlag } from '@/data/career/nations';
import { careerT, titleLabel, Lang } from '@/lib/career/i18n';
import { titleName } from '@/lib/career/competitions';
import { formatValue, positionAbbr } from '@/lib/career/format';
import { idolLevel } from '@/lib/career/idolatry';
import { ATTR_KEYS, ATTR_LABEL } from '@/lib/career/attributes';
import { patrimony } from '@/lib/career/shop';
import {
  saveRecord, rankOf, type CareerRecord, type Records,
} from '@/lib/career/records';
import { buildSubmission } from '@/lib/career/submission';
import { Crest, OvrBadge, CountUp, TrophyBadge } from './bits';
import { LeagueBadge } from './crests';
import { TrophyIcon } from './TrophyArt';
import Face from './Face';
import { NationalTeamHistory } from './NationalTeam';

const TITLE_WEIGHT: Record<string, number> = {
  'world-cup': 60, 'ballon-dor': 55, champions: 45, 'the-best': 40, libertadores: 30,
  euro: 30, 'copa-america': 30, 'asian-cup': 26, afcon: 26, 'gold-cup': 24, 'ucl-mvp': 24,
  'world-cup-golden-ball': 34, 'golden-shoe': 25, league: 18, europa: 18, 'club-world-cup': 20,
  'best-player-continent': 22, 'world-best-keeper': 22, 'world-best-defender': 22,
  'world-best-midfielder': 22, 'world-best-forward': 22, 'world-best-young': 18,
};
function careerScore(player: CareerPlayer, trophies: Title[]): number {
  let s = player.peakOverall * 3 + player.apps * 0.2 + player.goals * 0.6 + player.assists * 0.3;
  for (const t of trophies) s += TITLE_WEIGHT[t.key] ?? 8;
  return Math.round(s);
}

const rise = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, type: 'spring' as const, stiffness: 90, damping: 18 },
});

function Section({ label, children, right, delay = 0 }: {
  label: string; children: React.ReactNode; right?: React.ReactNode; delay?: number;
}) {
  return (
    <motion.section {...rise(delay)} className="card p-4 sm:p-5">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h3 className="text-[10px] tracking-[0.3em] text-white/40 uppercase">{label}</h3>
        {right}
      </div>
      {children}
    </motion.section>
  );
}

/**
 * Domestic honours are grouped by the competition they were actually won in.
 * "Liga ×10" told you nothing — ten league titles across four countries is a
 * completely different career from ten in one.
 */
function domesticGroups(titles: Title[], lang: Lang) {
  const m = new Map<string, { label: string; leagueId?: string; n: number; sample: Title }>();
  for (const t of titles) {
    if (t.key !== 'league' && t.key !== 'domestic-cup') continue;
    const club = t.clubId ? getClub(t.clubId) : null;
    const league = club ? getLeague(club.leagueId) : null;
    // Both halves resolve to the competition's real name — the FA Cup and the
    // Copa del Rey are not the same trophy won twice.
    const label = titleName(t, lang);
    const id = `${t.key}:${league?.id ?? '?'}`;
    const e = m.get(id);
    if (e) e.n++;
    else m.set(id, { label, leagueId: t.key === 'league' ? league?.id : undefined, n: 1, sample: t });
  }
  return [...m.values()].sort((a, b) => b.n - a.n);
}

/** Continental and world club silverware — the same trophy wherever you win it. */
function globalGroups(titles: Title[]) {
  const m = new Map<string, { n: number; sample: Title }>();
  for (const t of titles) {
    if (t.key === 'league' || t.key === 'domestic-cup') continue;
    const e = m.get(t.key);
    if (e) e.n++; else m.set(t.key, { n: 1, sample: t });
  }
  return [...m.entries()].map(([key, v]) => ({ key, ...v })).sort((a, b) => b.n - a.n);
}

export default function CareerSummary({
  player, stages, trophies, lang, onReplay,
}: {
  player: CareerPlayer; stages: SeasonRecord[]; trophies: Title[]; lang: Lang; onReplay: () => void;
}) {
  const t = careerT(lang);
  const es = lang === 'es';
  const [openClub, setOpenClub] = useState<string | null>(null);

  /**
   * One entry per *spell* at a club rather than per club, so returning home
   * late in a career reads as a second chapter instead of being merged into
   * the first.
   */
  const spells = useMemo(() => {
    const out: {
      clubId: string; from: number; to: number; seasons: SeasonRecord[];
      apps: number; goals: number; assists: number; titles: Title[]; onLoan: boolean;
    }[] = [];
    for (const s of stages) {
      const last = out[out.length - 1];
      if (last && last.clubId === s.clubId && last.onLoan === s.onLoan) {
        last.to = s.year; last.apps += s.apps; last.goals += s.goals; last.assists += s.assists;
        last.seasons.push(s); last.titles.push(...s.titles);
      } else {
        out.push({
          clubId: s.clubId, from: s.year, to: s.year, seasons: [s],
          apps: s.apps, goals: s.goals, assists: s.assists, titles: [...s.titles], onLoan: s.onLoan,
        });
      }
    }
    return out;
  }, [stages]);

  const clubTitles = trophies.filter(x => x.kind === 'club');
  const natTitles = trophies.filter(x => x.kind === 'national');
  const indTitles = trophies.filter(x => x.kind === 'individual');
  const score = careerScore(player, trophies);

  // File the run onto its board — random and seeded are kept apart, because a
  // typed seed can be replayed until the world cooperates and a rolled one cannot.
  const seedSource = player.seedSource ?? 'random';
  const filed = useRef(false);
  const [records, setRecords] = useState<Records | null>(null);
  const [mine, setMine] = useState<CareerRecord | null>(null);
  useEffect(() => {
    if (filed.current) return;
    filed.current = true;
    const rec: CareerRecord = {
      surname: player.surname, position: player.position, nationCode: player.ntNationCode,
      score, peakOverall: player.peakOverall, seasons: stages.length,
      trophies: trophies.length, seed: player.careerSeed ?? 0, seedSource,
      at: new Date().toISOString(),
    };
    setMine(rec);
    setRecords(saveRecord(rec));

    // Rolled seeds also go to the public board. Seeded runs never leave the
    // device — the server rejects them too, but there is no reason to ask.
    if (seedSource !== 'random') { setSubmit('seeded'); return; }
    setSubmit('sending');
    fetch('/api/career-runs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildSubmission(player, stages, trophies, score)),
    })
      .then(async r => {
        if (r.ok) { setSubmit('done'); return; }
        setSubmit(r.status === 401 ? 'anon' : 'failed');
      })
      .catch(() => setSubmit('failed'));
  }, [player, stages, trophies, score, seedSource]);

  const [submit, setSubmit] = useState<'idle'|'sending'|'done'|'anon'|'failed'|'seeded'>('idle');
  const [copied, setCopied] = useState(false);
  const copySeed = () => {
    const v = String(player.careerSeed ?? '');
    navigator.clipboard?.writeText(v).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    }).catch(() => { /* clipboard blocked — the number is on screen anyway */ });
  };
  const rank = records && mine ? rankOf(records, mine) : 0;
  const domestic = domesticGroups(clubTitles, lang);
  const global = globalGroups(clubTitles);
  const legacyClubs = Object.entries(player.idolatry ?? {}).sort((a, b) => b[1] - a[1]);
  const vanity = patrimony(player, lang);
  const bestSeason = stages.reduce<SeasonRecord | undefined>(
    (b, s) => (s.goals > (b?.goals ?? -1) ? s : b), undefined);

  const indGrouped = Object.entries(
    indTitles.reduce<Record<string, { n: number; sample: Title }>>((acc, tt) => {
      acc[tt.key] = acc[tt.key] ? { ...acc[tt.key], n: acc[tt.key].n + 1 } : { n: 1, sample: tt };
      return acc;
    }, {}),
  ).sort((a, b) => (TITLE_WEIGHT[b[0]] ?? 0) - (TITLE_WEIGHT[a[0]] ?? 0));

  return (
    <div className="max-w-5xl mx-auto space-y-4 pb-10">
      {/* ---------- hero ---------- */}
      <motion.div
        {...rise(0)}
        className="relative overflow-hidden rounded-3xl border border-white/12 bg-gradient-to-br from-white/[0.07] to-transparent p-5 sm:p-6"
      >
        <motion.div
          animate={{ opacity: [0.2, 0.45, 0.2] }} transition={{ duration: 5, repeat: Infinity }}
          className="absolute -top-24 -right-16 h-64 w-64 rounded-full bg-wc/20 blur-3xl"
        />
        <div className="relative flex flex-wrap items-center gap-5">
          {/* the face he retired with — beard, lines and grey included */}
          <Face genes={player.face} age={player.age} size={82} />
          <OvrBadge ovr={player.peakOverall} size="lg" animated />
          <div className="min-w-0">
            <div className="text-[10px] tracking-[0.35em] text-wc uppercase">{t.careerSummary}</div>
            <div className="font-display text-4xl sm:text-5xl leading-none flex items-center gap-3 mt-1">
              <span>{nationFlag(player.ntNationCode)}</span>{player.surname}
            </div>
            <div className="text-white/50 text-sm mt-1.5">
              #{player.number} · {positionAbbr(player.position, lang)} ·{' '}
              {stages.length} {es ? 'temporadas' : 'seasons'}
              {stages.length > 0 && <> · {stages[0].year}–{stages[stages.length - 1].year}</>}
              {' '}· {t.peak} {formatValue(player.peakValue)}
            </div>
          </div>
          <div className="ml-auto grid grid-cols-4 gap-4 sm:gap-5 text-center">
            <div>
              <div className="font-display text-2xl sm:text-3xl"><CountUp value={player.apps} /></div>
              <div className="text-[9px] uppercase tracking-widest text-white/40">{t.apps}</div>
            </div>
            <div>
              <div className="font-display text-2xl sm:text-3xl"><CountUp value={player.goals} /></div>
              <div className="text-[9px] uppercase tracking-widest text-white/40">{t.goals}</div>
            </div>
            <div>
              <div className="font-display text-2xl sm:text-3xl"><CountUp value={player.assists} /></div>
              <div className="text-[9px] uppercase tracking-widest text-white/40">{t.assists}</div>
            </div>
            <div>
              <div className="font-display text-2xl sm:text-3xl text-wc"><CountUp value={score} /></div>
              <div className="text-[9px] uppercase tracking-widest text-white/40">{t.careerScore}</div>
            </div>
          </div>
        </div>

        {/* Which world this was, and which board it counts on. */}
        <div className="relative mt-4 flex flex-wrap items-center gap-2">
          <span className={`text-[9px] uppercase tracking-[0.25em] px-2 py-1 rounded-full border ${
            seedSource === 'custom'
              ? 'border-amber-400/50 bg-amber-400/10 text-amber-200'
              : 'border-wc/50 bg-wc/10 text-wc'
          }`}>
            {seedSource === 'custom'
              ? (es ? 'Con semilla · no puntúa' : 'Seeded · unranked')
              : (es ? 'Aleatoria · puntúa' : 'Random · ranked')}
          </span>
          <button
            onClick={copySeed}
            title={es ? 'Copiar semilla' : 'Copy seed'}
            className="text-[11px] font-mono px-2 py-1 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-white/70 transition-colors"
          >
            {es ? 'semilla' : 'seed'} {player.careerSeed ?? '—'} {copied ? '✓' : '⧉'}
          </button>
          {rank > 0 && (
            <span className="text-[11px] text-white/45">
              {es ? `#${rank} de tus mejores` : `#${rank} of your best`}
              {seedSource === 'custom' && (es ? ' (con semilla)' : ' (seeded)')}
            </span>
          )}

          {/* what happened to the public submission */}
          {submit !== 'idle' && submit !== 'seeded' && (
            <span className="text-[11px] ml-auto flex items-center gap-2">
              {submit === 'sending' && (
                <span className="text-white/40">{es ? 'Enviando a la tabla…' : 'Submitting…'}</span>
              )}
              {submit === 'done' && (
                <a href="/leaderboard" className="text-wc hover:underline">
                  {es ? '✓ En la tabla global' : '✓ On the global board'}
                </a>
              )}
              {submit === 'anon' && (
                <span className="text-white/40">
                  {es ? 'Inicia sesión para aparecer en la tabla global' : 'Sign in to appear on the global board'}
                </span>
              )}
              {submit === 'failed' && (
                <span className="text-white/40">{es ? 'No se pudo enviar' : 'Could not submit'}</span>
              )}
            </span>
          )}
        </div>

        {/* the profile he retired with */}
        {/* Five columns at 375px gave each label ~60px and clipped three of the
            five to "TÉCN…", "VELO…", "LIDER…" on the most important screen in
            the mode. Two columns on a phone, five once there is room. */}
        <div className="relative grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-3 mt-5 pt-4 border-t border-white/10">
          {ATTR_KEYS.map(k => (
            <div key={k}>
              <div className="flex justify-between gap-2 text-[9px] uppercase tracking-widest text-white/40">
                <span className="truncate">{ATTR_LABEL[k][es ? 'es' : 'en']}</span>
                <span className="text-white/70">{Math.round(player.attrs[k])}</span>
              </div>
              <div className="h-1 mt-1 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-wc-dark to-wc"
                  initial={{ width: '0%' }} animate={{ width: `${Math.round(player.attrs[k])}%` }}
                  transition={{ delay: 0.4, type: 'spring', stiffness: 70, damping: 18 }}
                />
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ---------- club history ---------- */}
      <Section
        label={es ? 'Trayectoria por club' : 'Club history'}
        right={
          <span className="text-[10px] text-white/35 shrink-0">
            {es ? 'Toca un club para ver sus temporadas' : 'Tap a club for its seasons'}
          </span>
        }
      >
        <div className="space-y-2">
          {spells.map((sp, i) => {
            const club = getClub(sp.clubId);
            if (!club) return null;
            const league = getLeague(club.leagueId);
            const idol = player.idolatry?.[sp.clubId] ?? 0;
            const lvl = idolLevel(idol);
            const years = sp.to - sp.from + 1;
            const key = `${sp.clubId}-${i}`;
            const open = openClub === key;
            return (
              <motion.div
                key={key} {...rise(0)} layout
                className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden"
              >
                <button
                  onClick={() => setOpenClub(open ? null : key)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-white/[0.05] transition-colors text-left"
                >
                  {/* the timeline rail down the left */}
                  <div className="flex flex-col items-center self-stretch w-2 shrink-0">
                    <span className="w-2 h-2 rounded-full bg-wc shrink-0 mt-1.5" />
                    {i < spells.length - 1 && <span className="flex-1 w-px bg-white/15 mt-1" />}
                  </div>
                  <Crest clubId={club.id} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-display text-lg leading-none">{club.name}</span>
                      {sp.onLoan && (
                        <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-white/10 text-white/50">
                          {es ? 'Préstamo' : 'Loan'}
                        </span>
                      )}
                    </div>
                    {/* On a phone this wrapped into three ragged lines with the
                        separators stranded at the end of each. Keep the league on
                        its own line and the dates together on the next. */}
                    <div className="flex items-center gap-1.5 text-[11px] text-white/45 mt-0.5 min-w-0">
                      {league && <LeagueBadge leagueId={league.id} size={13} />}
                      <span className="truncate">{league ? leagueName(league.id, lang) : ''}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-white/45 whitespace-nowrap">
                      <span className="text-white/70">{sp.from}–{sp.to}</span>
                      <span className="text-white/25">·</span>
                      <span>
                        {years} {years === 1 ? (es ? 'temporada' : 'season') : (es ? 'temporadas' : 'seasons')}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm text-white/80 whitespace-nowrap">
                      {sp.apps} {t.apps} · <span className="text-wc">{sp.goals}</span> {t.goals}
                    </div>
                    {/* what the terraces made of you here */}
                    {!sp.onLoan && (
                      <div className="text-[11px] mt-0.5 whitespace-nowrap">
                        {lvl.emoji} <span className="text-white/60">{es ? lvl.es : lvl.en}</span>
                        <span className="text-white/30"> · {idol.toFixed(0)}</span>
                      </div>
                    )}
                  </div>
                  {sp.titles.length > 0 && (
                    <div className="flex items-center shrink-0 pl-1">
                      {sp.titles.slice(0, 5).map((tt, j) => (
                        <span key={j} className="-ml-1.5 first:ml-0">
                          <TrophyBadge title={tt} label={titleName(tt, lang)} size={18} />
                        </span>
                      ))}
                    </div>
                  )}
                </button>

                {open && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                    className="px-3 pb-3 overflow-hidden"
                  >
                    <table className="w-full text-[11px]">
                      <thead className="text-white/35 uppercase tracking-widest text-[9px]">
                        <tr>
                          <th className="text-left font-normal py-1">{es ? 'Año' : 'Year'}</th>
                          <th className="text-left font-normal">{es ? 'Edad' : 'Age'}</th>
                          <th className="text-center font-normal">OVR</th>
                          <th className="text-center font-normal">{t.apps}</th>
                          <th className="text-center font-normal">{t.goals}</th>
                          <th className="text-center font-normal">{t.assists}</th>
                          <th className="text-right font-normal">🏆</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sp.seasons.map(s => (
                          <tr key={s.year} className="border-t border-white/5">
                            <td className="py-1 text-white/60">{s.year}</td>
                            <td className="text-white/60">{s.age}</td>
                            <td className="text-center text-white/80">{s.overallAtSeason}</td>
                            <td className="text-center text-white/70">{s.apps}</td>
                            <td className="text-center text-wc">{s.goals}</td>
                            <td className="text-center text-white/70">{s.assists}</td>
                            <td className="text-right">
                              <span className="inline-flex">
                                {s.titles.map((tt, j) => (
                                  <span key={j} className="-ml-1 first:ml-0">
                                    <TrophyBadge title={tt} label={titleName(tt, lang)} size={14} />
                                  </span>
                                ))}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      </Section>

      {/* ---------- silverware, split domestic vs international ---------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section label={es ? 'Títulos nacionales' : 'Domestic titles'}>
          {domestic.length === 0 ? (
            <div className="text-white/30 text-xs uppercase tracking-widest py-4 text-center">{t.emptyCabinet}</div>
          ) : (
            <div className="space-y-1.5">
              {domestic.map((g, i) => (
                <motion.div
                  key={g.label + i} {...rise(0)}
                  className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 bg-white/[0.03]"
                >
                  <TrophyIcon title={g.sample} size={24} />
                  {g.leagueId && <LeagueBadge leagueId={g.leagueId} size={16} />}
                  <span className="text-sm text-white/80 truncate">{g.label}</span>
                  <span className="ml-auto font-display text-gold text-lg">×{g.n}</span>
                </motion.div>
              ))}
            </div>
          )}
        </Section>

        <Section label={es ? 'Títulos internacionales' : 'International titles'}>
          {global.length === 0 && natTitles.length === 0 ? (
            <div className="text-white/30 text-xs uppercase tracking-widest py-4 text-center">{t.emptyCabinet}</div>
          ) : (
            <div className="space-y-1.5">
              {global.map(g => (
                <motion.div
                  key={g.key} {...rise(0)}
                  className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 bg-white/[0.03]"
                >
                  <TrophyIcon title={g.sample} size={24} />
                  <span className="text-sm text-white/80 truncate">{titleLabel(g.key, lang)}</span>
                  {g.n > 1 && <span className="ml-auto font-display text-gold text-lg">×{g.n}</span>}
                </motion.div>
              ))}
              {natTitles.map((tt, i) => (
                <motion.div
                  key={tt.key + i} {...rise(0)}
                  className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 bg-gold/[0.07] border border-gold/20"
                >
                  <TrophyIcon title={tt} size={24} />
                  <span className="text-sm text-gold truncate">{titleLabel(tt.key, lang)}</span>
                  <span className="ml-auto text-[11px] text-white/40">{nationFlag(player.ntNationCode)}</span>
                </motion.div>
              ))}
            </div>
          )}
        </Section>
      </div>

      {/* ---------- individual awards (previously not rendered at all) ---------- */}
      <Section label={es ? 'Premios individuales' : 'Individual awards'}>
        {indGrouped.length === 0 ? (
          <div className="text-white/30 text-xs uppercase tracking-widest py-4 text-center">{t.emptyCabinet}</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {indGrouped.map(([key, v]) => (
              <motion.div
                key={key} {...rise(0)} whileHover={{ scale: 1.04, y: -3 }}
                className="flex flex-col items-center text-center gap-1 rounded-xl border border-gold/25 bg-gold/[0.06] px-2 py-3"
              >
                <TrophyIcon title={v.sample} size={40} />
                <span className="text-[11px] leading-tight text-white/80">{titleLabel(key, lang)}</span>
                {v.n > 1 && <span className="font-display text-gold leading-none">×{v.n}</span>}
              </motion.div>
            ))}
          </div>
        )}
      </Section>

      {/* ---------- legacy + country ---------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section label={es ? 'Idolatría por club' : 'Legacy by club'}>
          {legacyClubs.length === 0 ? (
            <div className="text-white/30 text-xs uppercase tracking-widest py-4 text-center">{t.emptyCabinet}</div>
          ) : (
            <div className="space-y-2">
              {legacyClubs.map(([clubId, v]) => {
                const club = getClub(clubId);
                if (!club) return null;
                const lvl = idolLevel(v);
                return (
                  <div key={clubId} className="flex items-center gap-2.5">
                    <Crest clubId={clubId} size={24} />
                    <span className="text-sm text-white/75 truncate w-24 sm:w-28">{club.name}</span>
                    <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-gold-dark via-gold to-yellow-200"
                        initial={{ width: '0%' }} animate={{ width: `${Math.min(100, v)}%` }}
                        transition={{ type: 'spring', stiffness: 70, damping: 20 }}
                      />
                    </div>
                    <span className="text-[11px] w-24 text-right shrink-0">
                      {lvl.emoji} <span className="text-white/55">{es ? lvl.es : lvl.en}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        <Section label={t.nationalTeam}>
          <NationalTeamHistory player={player} lang={lang} />
          <div className="grid grid-cols-3 gap-3 mt-4 pt-3 border-t border-white/10 text-center">
            <div>
              <div className="font-display text-xl text-wc">{player.derbyGoals ?? 0}</div>
              <div className="text-[9px] uppercase tracking-widest text-white/40 leading-tight">
                {es ? 'Goles en clásicos' : 'Derby goals'}
              </div>
            </div>
            <div>
              <div className="font-display text-xl text-gold">{player.clutchWon ?? 0}</div>
              <div className="text-[9px] uppercase tracking-widest text-white/40 leading-tight">
                {es ? 'Momentos ganados' : 'Clutch wins'}
              </div>
            </div>
            <div>
              <div className="font-display text-xl">{bestSeason?.goals ?? 0}</div>
              <div className="text-[9px] uppercase tracking-widest text-white/40 leading-tight">
                {es ? 'Mejor temporada' : 'Best season'}
              </div>
            </div>
          </div>
          {vanity.length > 0 && (
            <p className="text-[11px] text-white/45 mt-3 pt-3 border-t border-white/10 italic">
              {es ? 'Deja atrás ' : 'He leaves behind '}{vanity.join(', ')}.
            </p>
          )}
        </Section>
      </div>

      {/* ---------- personal boards, kept apart by seed source ---------- */}
      {records && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {([
            ['random', es ? 'Mejores · aleatorias' : 'Best · random runs', 'text-wc', 'border-wc/25'],
            ['custom', es ? 'Mejores · con semilla' : 'Best · seeded runs', 'text-amber-200', 'border-amber-400/25'],
          ] as const).map(([board, label, tone, ring]) => (
            <Section key={board} label={label}>
              {records[board].length === 0 ? (
                <div className="text-white/30 text-xs uppercase tracking-widest py-4 text-center">
                  {es ? 'Sin registros' : 'No records yet'}
                </div>
              ) : (
                <div className="space-y-1">
                  {records[board].map((r, i) => {
                    const isMine = !!mine && r.at === mine.at && r.score === mine.score;
                    return (
                      <div key={r.at + i}
                        className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[12px] border ${
                          isMine ? `bg-white/[0.06] ${ring}` : 'border-transparent bg-white/[0.02]'
                        }`}>
                        <span className="w-5 text-white/35 tabular-nums shrink-0">{i + 1}</span>
                        <span className="shrink-0">{nationFlag(r.nationCode)}</span>
                        <span className="font-display truncate">{r.surname}</span>
                        <span className="text-white/35 text-[10px] shrink-0">
                          {positionAbbr(r.position as CareerPlayer['position'], lang)}
                        </span>
                        <span className="text-white/30 text-[10px] shrink-0 hidden sm:inline">
                          {r.peakOverall} · {r.seasons}{es ? 'T' : 's'} · {r.trophies}🏆
                        </span>
                        <span className={`ml-auto font-display shrink-0 ${isMine ? tone : 'text-white/70'}`}>
                          {r.score}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Section>
          ))}
        </div>
      )}

      <motion.div {...rise(0)} className="flex justify-center pt-2">
        <motion.button
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
          onClick={onReplay} className="btn-primary text-lg px-10"
        >
          {t.playAgain}
        </motion.button>
      </motion.div>
    </div>
  );
}
