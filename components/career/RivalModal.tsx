'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useCareerStore } from '@/store/careerStore';
import { getClub } from '@/data/career/clubs';
import { derbyBetween } from '@/data/career/derbies';
import {
  rivalTitle, rivalDesc, rivalOptLabel, rivalOptOutcome, fillRivalCopy, heatLabel, recordVs,
} from '@/lib/career/rivalry';
import { effectChips, fmtMoney } from '@/lib/career/effects';
import { Crest } from './bits';
import type { Lang } from '@/lib/career/i18n';

/**
 * A derby story.
 *
 * Deliberately red rather than the game's usual green: this is the one night of
 * the season that is not about points, and it should not look like the rest of
 * the game.
 */
export default function RivalModal({ lang }: { lang: Lang }) {
  const {
    rival, player, ceremony, brand, miniGame, moment,
    chooseRivalOption, dismissRival,
  } = useCareerStore();
  const es = lang === 'es';

  if (!rival || !player) return null;
  if (ceremony || brand || miniGame || moment) return null;

  const rivalClub = getClub(rival.rivalId);
  const derby = player.clubId ? derbyBetween(player.clubId, rival.rivalId) : null;
  const rec = recordVs(player, rival.rivalId);
  const fill = (t: string) => fillRivalCopy(t, player, rival.rivalId, derby, lang);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[77] grid place-items-center bg-black/92 backdrop-blur-md p-4 overflow-y-auto"
      >
        <motion.div
          initial={{ scale: 0.94, y: 22 }} animate={{ scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 180, damping: 21 }}
          className="w-full max-w-lg rounded-3xl border border-red-500/35 bg-[#120b0c] overflow-hidden my-auto"
        >
          {/* ---- the fixture ---- */}
          <div className="relative px-5 sm:px-6 pt-6 pb-5 overflow-hidden">
            <div className="absolute inset-0 opacity-[0.18] bg-[radial-gradient(120%_80%_at_50%_0%,#E4002B_0%,transparent_70%)]" />

            <div className="relative flex items-center justify-center gap-4 mb-3">
              {player.clubId && <Crest clubId={player.clubId} size={40} />}
              <motion.span
                initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 250, damping: 12, delay: 0.1 }}
                className="text-2xl"
              >
                ⚔️
              </motion.span>
              <Crest clubId={rival.rivalId} size={40} />
            </div>

            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="relative text-center text-[10px] tracking-[0.35em] uppercase text-red-300/80 mb-1.5"
            >
              {derby ? (es ? derby.es : derby.en) : rivalClub?.name}
            </motion.div>

            {(rec.w + rec.d + rec.l) > 0 && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                className="relative text-center text-[10px] text-white/35 mb-3"
              >
                {rec.w}{es ? 'G' : 'W'} · {rec.d}{es ? 'E' : 'D'} · {rec.l}{es ? 'P' : 'L'}
                {rec.goals > 0 && ` · ${rec.goals} ${es ? 'goles' : 'goals'}`}
                {' · '}<span className="text-red-300/70">{heatLabel(rec.heat, lang)}</span>
              </motion.div>
            )}

            <motion.h2
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="relative font-display text-2xl leading-tight text-center"
            >
              {fill(rivalTitle(rival.def, lang))}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
              className="relative text-white/65 text-sm leading-relaxed mt-2.5"
            >
              {fill(rivalDesc(rival.def, lang))}
            </motion.p>
          </div>

          {/* ---- what you did about it ---- */}
          <div className="border-t border-red-500/20 bg-red-500/[0.03] px-5 sm:px-6 py-5">
            {!rival.chosen ? (
              <div className="space-y-2">
                {rival.def.options.map((o, i) => (
                  <motion.button
                    key={o.id}
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + i * 0.07 }}
                    whileHover={{ scale: 1.01, x: 3 }} whileTap={{ scale: 0.99 }}
                    onClick={() => chooseRivalOption(o.id)}
                    className="w-full text-left rounded-xl border border-white/12 bg-white/5 px-3.5 py-3 text-sm transition-colors hover:bg-white/10 hover:border-red-400/50"
                  >
                    {fill(rivalOptLabel(o, lang))}
                  </motion.button>
                ))}
              </div>
            ) : (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <div className="rounded-xl border border-red-400/35 bg-red-500/10 px-3.5 py-3">
                  <div className="text-[10px] tracking-[0.25em] uppercase text-red-300/80 mb-1.5">
                    {fill(rivalOptLabel(rival.chosen, lang))}
                  </div>
                  <p className="text-sm leading-relaxed text-white/85">
                    {fill(rivalOptOutcome(rival.chosen, lang))}
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5 mt-3">
                  {rival.chosen.heat ? (
                    <span className={`text-[11px] px-2 py-0.5 rounded-full border font-semibold ${
                      rival.chosen.heat > 0
                        ? 'border-red-400/50 bg-red-500/15 text-red-300'
                        : 'border-wc/50 bg-wc/15 text-wc'
                    }`}>
                      {rival.chosen.heat > 0 ? '+' : ''}{rival.chosen.heat} {es ? 'Tensión' : 'Bad blood'}
                    </span>
                  ) : null}
                  {effectChips(rival.chosen.effects, lang).map((c, i) => (
                    <motion.span
                      key={c.label}
                      initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.15 + i * 0.05, type: 'spring', stiffness: 300, damping: 18 }}
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

                <motion.button
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={dismissRival}
                  className="btn-primary w-full mt-4"
                >
                  {es ? 'Continuar' : 'Continue'}
                </motion.button>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
