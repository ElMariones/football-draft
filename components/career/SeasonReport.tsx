'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { CareerPlayer, SeasonRecord } from '@/data/career/types';
import { getClub } from '@/data/career/clubs';
import { buildSeasonReport, type ReportLine, type Tone } from '@/lib/career/report';
import { titleName } from '@/lib/career/competitions';
import { careerT, type Lang } from '@/lib/career/i18n';
import { positionAbbr } from '@/lib/career/format';
import { Crest, TrophyBadge } from './bits';

const TONE_TEXT: Record<Tone, string> = {
  great: 'text-gold',
  good: 'text-wc',
  ok: 'text-white/70',
  bad: 'text-red-300',
  neutral: 'text-white/40',
};
const TONE_BORDER: Record<Tone, string> = {
  great: 'border-gold/40 bg-gold/[0.07]',
  good: 'border-wc/30 bg-wc/[0.06]',
  ok: 'border-white/10 bg-white/[0.03]',
  bad: 'border-red-400/25 bg-red-500/[0.05]',
  neutral: 'border-white/5 bg-white/[0.02]',
};

/** One competition row: what it was, how far you got, and what that felt like. */
function CompRow({ line, i }: { line: ReportLine; i: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.15 + i * 0.07 }}
      className={`rounded-xl border px-3 py-2 ${TONE_BORDER[line.tone]}`}
    >
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-sm leading-none">{line.icon}</span>
        <span className="text-xs font-semibold text-white/80 truncate">{line.label}</span>
        <span className={`ml-auto text-[11px] uppercase tracking-wider font-display ${TONE_TEXT[line.tone]}`}>
          {line.result}
        </span>
      </div>
      <p className="mt-1 text-[11px] leading-snug text-white/50">{line.detail}</p>
    </motion.div>
  );
}

/** A big number with its label — the stat line, read at a glance. */
function Stat({ value, label, accent }: { value: string; label: string; accent?: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-1">
      <span className={`font-display text-xl sm:text-2xl leading-none ${accent ?? 'text-white'}`}>{value}</span>
      <span className="text-[9px] uppercase tracking-widest text-white/35 text-center leading-tight">{label}</span>
    </div>
  );
}

export default function SeasonReport({
  rec, player, lang, prev,
}: { rec: SeasonRecord; player: CareerPlayer; lang: Lang; prev?: SeasonRecord | null }) {
  const t = careerT(lang);
  const es = lang === 'es';
  const club = getClub(rec.clubId);
  // The report is a pure function of the season, so it is only rebuilt when the
  // season or the language changes — never on an unrelated store update.
  const r = useMemo(() => buildSeasonReport(rec, player, lang, prev), [rec, player, lang, prev]);

  const ratingTone = rec.rating >= 8.5 ? 'text-gold'
    : rec.rating >= 7.5 ? 'text-wc'
      : rec.rating >= 6.5 ? 'text-white'
        : 'text-red-300';

  return (
    <motion.div
      key={rec.year}
      initial={{ opacity: 0, y: -14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.02] overflow-hidden"
    >
      {/* ---- header: who, where, how it went ---- */}
      <div className="px-4 pt-3 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[9px] tracking-[0.3em] text-white/35 uppercase">
            {es ? 'Informe de temporada' : 'Season report'}
          </span>
          <span className="ml-auto text-[10px] text-white/40">
            {rec.year} · {rec.age} {es ? 'años' : 'yrs'} · {positionAbbr(player.position, lang)}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {club && <Crest clubId={club.id} size={40} />}
          <div className="min-w-0 flex-1">
            <div className="font-display text-xl leading-none truncate">{club?.name}</div>
            {/* wraps rather than truncates — the per-game figure is the point of
                the line, and it was the first thing cut off */}
            <div className="text-[11px] text-white/45 leading-tight">{r.summary}</div>
          </div>
          <div className="flex flex-col items-end shrink-0">
            <motion.span
              initial={{ scale: 0.5 }} animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 16 }}
              className={`font-display text-3xl leading-none ${ratingTone}`}
            >
              {rec.rating.toFixed(1)}
            </motion.span>
            <span className={`text-[9px] uppercase tracking-widest ${TONE_TEXT[r.verdictTone]}`}>
              {r.grade}
            </span>
          </div>
        </div>

        <p className={`mt-2.5 text-sm italic leading-snug ${TONE_TEXT[r.verdictTone]}`}>
          {r.verdict}
        </p>

        {rec.onLoan && (
          <span className="inline-block mt-2 text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-white/10 text-white/50">
            {es ? 'Cedido' : 'On loan'}
          </span>
        )}
      </div>

      {/* ---- the stat line ---- */}
      <div className="grid grid-cols-4 sm:grid-cols-5 gap-1 px-3 py-3 border-b border-white/10 bg-black/20">
        <Stat value={String(rec.apps)} label={t.apps} />
        <Stat value={String(rec.goals)} label={t.goals} accent={rec.goals > 0 ? 'text-wc' : undefined} />
        <Stat value={String(rec.assists)} label={t.assists} accent={rec.assists > 0 ? 'text-cl' : undefined} />
        <Stat
          value={String(rec.cleanSheets)}
          label={es ? 'Vallas' : 'Clean sheets'}
          accent={rec.cleanSheets > 0 ? 'text-white' : undefined}
        />
        <div className="hidden sm:block">
          <Stat
            value={String(rec.overallAtSeason)}
            label="OVR"
            accent="text-gold"
          />
        </div>
      </div>

      <div className="p-3 sm:p-4 space-y-3">
        {/* ---- the club's season, competition by competition ---- */}
        {r.club.length > 0 && (
          <section>
            <div className="text-[9px] tracking-[0.3em] text-white/30 uppercase mb-1.5">
              {es ? 'El club' : 'The club'}
            </div>
            <div className="space-y-1.5">
              {r.club.map((line, i) => <CompRow key={line.label + i} line={line} i={i} />)}
            </div>
          </section>
        )}

        {/* ---- your country ---- */}
        <section>
          <div className="text-[9px] tracking-[0.3em] text-white/30 uppercase mb-1.5">
            {es ? 'Selección' : 'International'}
          </div>
          <CompRow line={r.nation} i={r.club.length} />
        </section>

        {/* ---- your own year, read through your position ---- */}
        {r.notes.length > 0 && (
          <motion.section
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          >
            <div className="text-[9px] tracking-[0.3em] text-white/30 uppercase mb-1.5">
              {es ? 'Tu año' : 'Your year'}
            </div>
            <ul className="space-y-1.5">
              {r.notes.map((n, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.45 + i * 0.08 }}
                  className="flex gap-2 text-[12px] leading-snug text-white/65"
                >
                  <span className="text-wc/60 shrink-0">▸</span>
                  <span>{n}</span>
                </motion.li>
              ))}
            </ul>
          </motion.section>
        )}

        {/* ---- what last summer's decision actually did ---- */}
        {r.decision && (
          <motion.section
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
            className="rounded-xl border border-amber-400/25 bg-amber-400/[0.06] px-3 py-2"
          >
            <div className="text-[9px] tracking-[0.3em] text-amber-200/60 uppercase mb-1">
              {es ? 'Tu decisión' : 'Your decision'}
            </div>
            <div className="text-[12px] leading-snug text-white/70">
              <span className="text-white/45">{r.decision.title}: </span>
              <span className="text-white/90">“{r.decision.option}”</span>
              <span className="text-white/45"> → </span>
              <span className="text-amber-200 font-semibold">{r.decision.outcome}</span>
            </div>
          </motion.section>
        )}

        {/* ---- silverware ---- */}
        {r.titles.length > 0 && (
          <motion.section
            initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
            className="rounded-xl border border-gold/30 bg-gold/[0.07] px-3 py-2"
          >
            <div className="text-[9px] tracking-[0.3em] text-gold/60 uppercase mb-1.5">
              {es ? 'Vitrina' : 'Silverware'}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {r.titles.map((tt, i) => (
                <motion.span
                  key={i}
                  initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.65 + i * 0.08, type: 'spring', stiffness: 280, damping: 14 }}
                  className="flex items-center gap-1.5 rounded-full bg-black/30 pl-1 pr-2.5 py-1"
                >
                  <TrophyBadge title={tt.title} label={tt.label} size={18} />
                  <span className="text-[11px] text-gold">{tt.label}</span>
                </motion.span>
              ))}
            </div>
          </motion.section>
        )}

        {/* ---- the ticker: everything the engine wrote during the season ---- */}
        {r.news.length > 0 && (
          <motion.section
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
          >
            <div className="text-[9px] tracking-[0.3em] text-white/30 uppercase mb-1.5">
              {es ? 'La temporada, día a día' : 'The season, as it happened'}
            </div>
            <ul className="space-y-1 border-l border-white/10 pl-3">
              {r.news.map((n, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.75 + i * 0.06 }}
                  className="text-[11px] leading-snug text-white/45"
                >
                  {n}
                </motion.li>
              ))}
            </ul>
          </motion.section>
        )}
      </div>
    </motion.div>
  );
}
