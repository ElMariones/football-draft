'use client';

import { motion } from 'framer-motion';
import { useCareerStore } from '@/store/careerStore';
import {
  pathLabel, pathBlurb, beatText, epilogueHeadline, epilogueCoda,
  type EpilogueBeat,
} from '@/lib/career/epilogue';
import {
  chapterTitle, chapterDesc, optLabel, optOutcome, fillAfterlifeCopy,
  tierLabel, METER_LABEL, type Afterlife,
} from '@/lib/career/afterlife';
import {
  dossierVerdict, dossierSecond, dossierCoda, statLabel, statSub, lineText,
} from '@/lib/career/dossier';
import { buildProfile } from '@/lib/career/profile';
import { getClub } from '@/data/career/clubs';
import { fmtMoney } from '@/lib/career/effects';
import { Crest } from './bits';
import Face from './Face';
import type { Lang } from '@/lib/career/i18n';

const TONE: Record<EpilogueBeat['tone'], string> = {
  gold: 'border-gold/35 bg-gold/[0.08]',
  good: 'border-wc/30 bg-wc/[0.06]',
  neutral: 'border-white/12 bg-white/[0.03]',
  cold: 'border-red-400/25 bg-red-500/[0.05]',
};

const METER_COLOR: Record<keyof typeof METER_LABEL, string> = {
  standing: 'from-wc-dark to-wc',
  respect: 'from-gold/60 to-gold',
  peace: 'from-sky-500/60 to-sky-400',
};

function Meters({ life, lang }: { life: Afterlife; lang: Lang }) {
  const es = lang === 'es';
  return (
    <div className="grid grid-cols-3 gap-3">
      {(['standing', 'respect', 'peace'] as const).map((k, i) => (
        <div key={k}>
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-[9px] uppercase tracking-wider text-white/40">
              {METER_LABEL[k][es ? 1 : 0]}
            </span>
            <motion.span
              key={life[k]}
              initial={{ scale: 1.5, color: '#00DFA2' }} animate={{ scale: 1, color: '#ffffff' }}
              className="font-display text-sm"
            >
              {Math.round(life[k])}
            </motion.span>
          </div>
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className={`h-full rounded-full bg-gradient-to-r ${METER_COLOR[k]}`}
              initial={{ width: '0%' }} animate={{ width: `${Math.round(life[k])}%` }}
              transition={{ type: 'spring', stiffness: 90, damping: 18, delay: i * 0.06 }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * After.
 *
 * Three acts: what you do with the rest of your life, then three chapters of
 * actually living it, then the dossier — which reads the whole career back in
 * its own numbers rather than closing on one drawn sentence.
 */
export default function Epilogue({ lang }: { lang: Lang }) {
  const {
    player, stages, trophies, epilogue,
    choosePath, chooseAfterlifeOption, nextAfterlifeChapter, finishEpilogue,
  } = useCareerStore();
  if (!player || !epilogue) return null;
  const es = lang === 'es';
  const { paths, chosen, life, pending, dossier } = epilogue;
  const prof = buildProfile(player, stages, trophies);
  const fill = (t: string) => fillAfterlifeCopy(t, player, prof, lang);

  return (
    <div className="max-w-2xl mx-auto pb-10">
      <motion.div
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6"
      >
        <div className="text-[10px] tracking-[0.4em] text-white/40 uppercase mb-3">
          {es ? 'Se acabó' : 'It is over'}
        </div>
        <Face genes={player.face} age={player.age} size={72} />
        <div className="font-display text-4xl leading-none mt-2">{player.surname}</div>
      </motion.div>

      {/* Deliberately no AnimatePresence. The ending is a linear progression of
          three stages, and an exit animation on each one buys a cross-fade at
          the cost of keeping the outgoing stage mounted until its animation
          finishes. Any frame the browser declines to deliver — a backgrounded
          tab, a throttled pane, reduced motion — then leaves two stages on
          screen at once, or none. Entrances still animate; nothing has to
          finish animating for the flow to advance. */}
      <>
        {/* ==================== 1. what now ==================== */}
        {!chosen && (
          <motion.div key="choose" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <p className="text-center text-white/60 text-sm mb-5 leading-relaxed">
              {es
                ? 'Las botas están colgadas y quedan cuarenta años por delante. ¿Qué haces con ellos?'
                : 'The boots are hung up and there are forty years left. What do you do with them?'}
            </p>
            <div className="space-y-2.5">
              {paths.map((p, i) => (
                <motion.button
                  key={p.id}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.08 + i * 0.06 }}
                  whileHover={{ scale: 1.01, x: 3 }} whileTap={{ scale: 0.99 }}
                  onClick={() => choosePath(p.id)}
                  className="w-full text-left rounded-2xl border border-white/12 bg-white/5 hover:bg-white/10 hover:border-wc/40 px-4 py-3.5 transition-colors flex items-start gap-3"
                >
                  <span className="text-xl leading-none mt-0.5">{p.icon}</span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{pathLabel(p, lang)}</span>
                    <span className="block text-[11px] text-white/45 leading-snug mt-0.5">
                      {pathBlurb(p, lang)}
                    </span>
                  </span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* ==================== 2. living it ==================== */}
        {chosen && life && !dossier && (
          <motion.div key={`ch-${life.idx}`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-2 mb-4">
              {life.chapters.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    i < life.idx ? 'bg-wc' : i === life.idx ? 'bg-white/50' : 'bg-white/10'
                  }`}
                />
              ))}
            </div>

            {life.chapters[life.idx] && (
              <div className="rounded-3xl border border-white/12 bg-white/[0.03] overflow-hidden">
                <div className="px-5 sm:px-6 pt-5 pb-4">
                  <div className="text-[10px] tracking-[0.3em] uppercase text-white/35 mb-2">
                    {es ? `Capítulo ${life.idx + 1}` : `Chapter ${life.idx + 1}`}
                  </div>
                  <h3 className="font-display text-2xl leading-tight mb-2.5">
                    {fill(chapterTitle(life.chapters[life.idx], lang))}
                  </h3>
                  <p className="text-sm text-white/65 leading-relaxed">
                    {fill(chapterDesc(life.chapters[life.idx], lang))}
                  </p>
                </div>

                <div className="border-t border-white/10 px-5 sm:px-6 py-5">
                  {!pending ? (
                    <div className="space-y-2">
                      {life.chapters[life.idx].options.map((o, i) => (
                        <motion.button
                          key={o.id}
                          initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.15 + i * 0.07 }}
                          whileHover={{ scale: 1.01, x: 3 }} whileTap={{ scale: 0.99 }}
                          onClick={() => chooseAfterlifeOption(o.id)}
                          className="w-full text-left rounded-xl border border-white/12 bg-white/5 px-3.5 py-3 text-sm transition-colors hover:bg-white/10 hover:border-wc/45"
                        >
                          {fill(optLabel(o, lang))}
                        </motion.button>
                      ))}
                    </div>
                  ) : (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                      <div className="rounded-xl border border-wc/35 bg-wc/10 px-3.5 py-3 mb-4">
                        <div className="text-[10px] tracking-[0.25em] uppercase text-wc/70 mb-1.5">
                          {fill(optLabel(pending, lang))}
                        </div>
                        <p className="text-sm leading-relaxed text-white/85">
                          {fill(optOutcome(pending, lang))}
                        </p>
                      </div>
                      <Meters life={life} lang={lang} />
                      <motion.button
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        onClick={nextAfterlifeChapter}
                        className="btn-primary w-full mt-4"
                      >
                        {life.idx + 1 < life.chapters.length
                          ? (es ? 'Seguir ▸' : 'Go on ▸')
                          : (es ? 'Y entonces pasaron los años ▸' : 'And then the years passed ▸')}
                      </motion.button>
                    </motion.div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ==================== 3. the dossier ==================== */}
        {dossier && life && (
          <motion.div key="dossier" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }} className="space-y-4">

            {/* the career, read back in its own numbers */}
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 90, damping: 18 }}
              className="rounded-3xl border border-gold/25 bg-gradient-to-b from-gold/[0.07] to-transparent p-5 sm:p-6"
            >
              <div className="text-[10px] tracking-[0.4em] text-gold/70 uppercase mb-3 text-center">
                {es ? 'El expediente' : 'The record'}
              </div>
              <p className="text-[15px] leading-relaxed text-white/85 text-center">
                {dossierVerdict(dossier, lang)}
              </p>

              <div className="grid grid-cols-4 gap-2 mt-5">
                {dossier.stats.map((st, i) => (
                  <motion.div
                    key={st.labelEn}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 + i * 0.04 }}
                    className="rounded-xl border border-white/10 bg-white/[0.03] px-2 py-2.5 text-center"
                  >
                    <div className={`font-display text-lg leading-none ${st.gold ? 'text-gold' : ''}`}>
                      {st.value}
                    </div>
                    <div className="text-[8px] uppercase tracking-wider text-white/35 mt-1 leading-tight">
                      {statLabel(st, lang)}
                    </div>
                    {statSub(st, lang) && (
                      <div className="text-[8px] text-white/25 leading-tight truncate">{statSub(st, lang)}</div>
                    )}
                  </motion.div>
                ))}
              </div>

              {dossier.honours.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-4 justify-center">
                  {dossier.honours.map(h => (
                    <span key={h.name} className="text-[10px] px-2 py-0.5 rounded-full border border-gold/30 bg-gold/10 text-gold/90">
                      {h.name}{h.n > 1 && ` ×${h.n}`}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>

            {/* the clubs */}
            {dossier.spells.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
                className="rounded-2xl border border-white/12 bg-white/[0.03] p-4"
              >
                <div className="text-[10px] tracking-[0.3em] text-white/35 uppercase mb-2.5">
                  {es ? 'Las camisetas' : 'The shirts'}
                </div>
                <div className="space-y-1.5">
                  {dossier.spells.map(sp => {
                    const club = getClub(sp.clubId);
                    if (!club) return null;
                    return (
                      <div key={sp.clubId} className="flex items-center gap-2.5">
                        <Crest clubId={sp.clubId} size={18} />
                        <span className="text-[12px] text-white/70 truncate">{club.name}</span>
                        <span className="ml-auto text-[11px] text-white/35 shrink-0 font-display">
                          {sp.seasons}{es ? 'T' : 'y'} · {sp.apps}{es ? 'PJ' : 'g'} · {sp.goals}{es ? 'G' : 'g'}
                        </span>
                        {sp.idol >= 70 && <span className="text-gold text-[11px] shrink-0">★</span>}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* the second life */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}
              className="rounded-2xl border border-wc/25 bg-wc/[0.04] p-4 sm:p-5"
            >
              <div className="text-[10px] tracking-[0.3em] text-wc/70 uppercase mb-2">
                {es ? 'La segunda vida' : 'The second life'}
              </div>
              <p className="font-display text-lg leading-tight mb-2">{tierLabel(dossier.tier, lang)}</p>
              <p className="text-sm text-white/70 leading-relaxed mb-4">{dossierSecond(dossier, lang)}</p>
              <Meters life={life} lang={lang} />
              {life.wealth !== 0 && (
                <div className="text-[11px] text-white/40 mt-3">
                  {es ? 'Balance de esos años: ' : 'Those years, on the books: '}
                  <span className={life.wealth > 0 ? 'text-wc' : 'text-red-300'}>{fmtMoney(life.wealth)}</span>
                </div>
              )}
              {dossier.achievements.length > 0 && (
                <div className="mt-3 space-y-1">
                  {dossier.achievements.map((ac, i) => (
                    <div key={i} className="text-[11px] text-white/65 flex gap-2">
                      <span className="text-wc shrink-0">✓</span>
                      <span>{es ? ac.es : ac.en}</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* what the world kept */}
            {dossier.beats.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}
                className="rounded-2xl border border-white/12 bg-white/[0.02] p-4"
              >
                <div className="text-[10px] tracking-[0.3em] text-white/35 uppercase mb-2.5">
                  {es ? 'Veinte años después' : 'Twenty years later'}
                </div>
                {epilogue.card && (
                  <p className="font-display text-xl leading-tight mb-3.5">
                    {epilogueHeadline(epilogue.card, lang)}
                  </p>
                )}
                <div className="space-y-2">
                  {dossier.beats.map((b, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + i * 0.08 }}
                      className={`rounded-xl border px-3 py-2.5 flex gap-2.5 ${TONE[b.tone]}`}
                    >
                      <span className="text-base leading-none shrink-0">{b.icon}</span>
                      <span className="text-[12px] leading-relaxed text-white/80">{beatText(b, lang)}</span>
                    </motion.div>
                  ))}
                </div>
                {epilogue.card && (
                  <p className="mt-3.5 pt-3 border-t border-white/10 text-[12px] italic text-white/50 leading-relaxed">
                    {epilogueCoda(epilogue.card, lang)}
                  </p>
                )}
              </motion.div>
            )}

            {/* the things the summary never says */}
            {dossier.footnotes.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65 }}
                className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-2"
              >
                {dossier.footnotes.map((f, i) => (
                  <div key={i} className="flex gap-2.5 text-[12px] text-white/60 leading-relaxed">
                    <span className="text-base leading-none shrink-0">{f.icon}</span>
                    <span>{lineText(f, lang)}</span>
                  </div>
                ))}
              </motion.div>
            )}

            {/* the last word */}
            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
              className="text-center text-sm italic text-white/60 leading-relaxed px-4 pt-2"
            >
              {dossierCoda(dossier, lang)}
            </motion.p>

            <motion.button
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.95 }}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={finishEpilogue}
              className="btn-primary w-full text-lg"
            >
              {es ? 'Ver la carrera completa ▸' : 'See the full career ▸'}
            </motion.button>
          </motion.div>
        )}
      </>
    </div>
  );
}
