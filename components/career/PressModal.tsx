'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useCareerStore } from '@/store/careerStore';
import { mainRival } from '@/data/career/rivals';
import {
  TONES, TONE_ICON, toneLabel, situationLabel, fillPressCopy,
  pressQuestionText, pressAsker, pressAnswerText, pressAnswerOutcome, pressReactionText,
  type PressTone, type PressCtx,
} from '@/lib/career/pressroom';
import { effectChips, fmtMoney } from '@/lib/career/effects';
import type { Lang } from '@/lib/career/i18n';

const TONE_STYLE: Record<PressTone, { border: string; hover: string; text: string }> = {
  arrogant: { border: 'border-red-400/25', hover: 'hover:border-red-400/60 hover:bg-red-500/10', text: 'text-red-300' },
  humble:   { border: 'border-wc/25',      hover: 'hover:border-wc/60 hover:bg-wc/10',           text: 'text-wc' },
  funny:    { border: 'border-gold/25',    hover: 'hover:border-gold/60 hover:bg-gold/10',       text: 'text-gold' },
  formal:   { border: 'border-white/15',   hover: 'hover:border-white/45 hover:bg-white/10',     text: 'text-white/70' },
};

/**
 * The press conference.
 *
 * Four ways to answer, and the point is that none of them is safe. Arrogance
 * usually buys reputation and occasionally buys a fine; humility usually buys
 * the terraces and occasionally reads as a man who has stopped believing. What
 * the room does with your answer is drawn after you have committed to it.
 */
export default function PressModal({ lang }: { lang: Lang }) {
  const {
    press, player, stages, trophies, ceremony, brand, rival, miniGame, moment,
    answerPressConference, dismissPress,
  } = useCareerStore();
  const es = lang === 'es';

  if (!press || !player) return null;
  if (ceremony || brand || rival || miniGame || moment) return null;

  const ctx: PressCtx = {
    p: player, situation: press.situation, trophies, seasons: stages.length,
    apps: stages[stages.length - 1]?.apps ?? 0,
    goals: stages[stages.length - 1]?.goals ?? 0,
    rivalId: press.rivalId ?? (player.clubId ? mainRival(player.clubId) : null),
    tenure: player.stayStreak ?? 1,
  };
  const fill = (t: string) => fillPressCopy(t, ctx, lang);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[76] grid place-items-center bg-black/92 backdrop-blur-md p-4 overflow-y-auto"
      >
        <motion.div
          initial={{ scale: 0.94, y: 22 }} animate={{ scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 180, damping: 21 }}
          className="w-full max-w-xl rounded-3xl border border-white/15 bg-[#0b0f14] overflow-hidden my-auto"
        >
          {/* ---- the room ---- */}
          <div className="relative px-5 sm:px-6 pt-6 pb-5 overflow-hidden">
            {/* a wall of flashes behind the backdrop */}
            <div className="absolute inset-0 opacity-[0.13] bg-[radial-gradient(90%_60%_at_50%_0%,#ffffff_0%,transparent_65%)]" />
            {[12, 34, 58, 76, 88].map((x, i) => (
              <motion.span
                key={x}
                className="absolute top-2 w-1 h-1 rounded-full bg-white"
                style={{ left: `${x}%` }}
                animate={{ opacity: [0, 1, 0], scale: [0.5, 2.2, 0.5] }}
                transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1.4 + i * 0.7, delay: i * 0.3 }}
              />
            ))}

            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="relative flex items-center gap-2 mb-3"
            >
              <span className="text-lg leading-none">🎙️</span>
              <span className="text-[10px] tracking-[0.35em] uppercase text-white/45">
                {situationLabel(press.situation, lang)}
              </span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
              className="relative text-[11px] text-white/35 italic mb-2"
            >
              {es ? 'Pregunta ' : 'From '}{pressAsker(press, lang)}
            </motion.div>

            <motion.blockquote
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="relative font-display text-xl sm:text-2xl leading-snug border-l-2 border-wc/50 pl-3.5"
            >
              “{fill(pressQuestionText(press.question, lang))}”
            </motion.blockquote>
          </div>

          {/* ---- four ways to answer ---- */}
          <div className="border-t border-white/10 px-5 sm:px-6 py-5">
            {!press.chosen ? (
              <>
                <div className="text-[10px] tracking-[0.3em] uppercase text-white/30 mb-2.5">
                  {es ? 'Tu respuesta' : 'Your answer'}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {TONES.map((tone, i) => {
                    const a = press.question.answers.find(x => x.tone === tone)!;
                    const st = TONE_STYLE[tone];
                    return (
                      <motion.button
                        key={tone}
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 + i * 0.06 }}
                        whileHover={{ scale: 1.015, y: -2 }} whileTap={{ scale: 0.99 }}
                        onClick={() => answerPressConference(tone)}
                        className={`text-left rounded-xl border bg-white/[0.03] px-3.5 py-3 transition-colors ${st.border} ${st.hover}`}
                      >
                        <div className={`flex items-center gap-1.5 text-[9px] uppercase tracking-[0.2em] mb-1.5 ${st.text}`}>
                          <span className="text-sm leading-none">{TONE_ICON[tone]}</span>
                          {toneLabel(tone, lang)}
                        </div>
                        <div className="text-sm leading-snug text-white/85">
                          “{fill(pressAnswerText(a, lang))}”
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </>
            ) : (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <div className={`rounded-xl border px-3.5 py-3 ${TONE_STYLE[press.chosen.tone].border} bg-white/[0.04]`}>
                  <div className={`flex items-center gap-1.5 text-[9px] uppercase tracking-[0.2em] mb-1.5 ${TONE_STYLE[press.chosen.tone].text}`}>
                    <span className="text-sm leading-none">{TONE_ICON[press.chosen.tone]}</span>
                    {toneLabel(press.chosen.tone, lang)}
                  </div>
                  <p className="text-sm text-white/90 leading-snug mb-2">
                    “{fill(pressAnswerText(press.chosen, lang))}”
                  </p>
                  <p className="text-[13px] text-white/60 leading-relaxed">
                    {fill(pressAnswerOutcome(press.chosen, lang))}
                  </p>
                </div>

                {press.reaction && (
                  <>
                    <motion.p
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 }}
                      className="text-sm text-white/80 leading-relaxed mt-3 pl-3 border-l-2 border-white/15"
                    >
                      {fill(pressReactionText(press.reaction, lang))}
                    </motion.p>

                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {effectChips(press.reaction.effects, lang).map((c, i) => (
                        <motion.span
                          key={c.label}
                          initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.35 + i * 0.05, type: 'spring', stiffness: 300, damping: 18 }}
                          className={`text-[11px] px-2 py-0.5 rounded-full border font-semibold ${
                            c.delta > 0
                              ? 'border-wc/50 bg-wc/15 text-wc'
                              : 'border-red-400/50 bg-red-500/15 text-red-300'
                          }`}
                        >
                          {c.money ? fmtMoney(c.delta) : `${c.delta > 0 ? '+' : ''}${c.delta}`} {c.label}
                        </motion.span>
                      ))}
                    </div>
                  </>
                )}

                <motion.button
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={dismissPress}
                  className="btn-primary w-full mt-4"
                >
                  {es ? 'Salir de la sala' : 'Leave the room'}
                </motion.button>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
