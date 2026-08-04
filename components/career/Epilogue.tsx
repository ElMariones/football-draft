'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useCareerStore } from '@/store/careerStore';
import {
  pathLabel, pathBlurb, epilogueHeadline, epilogueCoda, beatText,
  type EpilogueBeat,
} from '@/lib/career/epilogue';
import Face from './Face';
import type { Lang } from '@/lib/career/i18n';

const TONE: Record<EpilogueBeat['tone'], string> = {
  gold: 'border-gold/35 bg-gold/[0.08] text-gold',
  good: 'border-wc/30 bg-wc/[0.06] text-wc',
  neutral: 'border-white/12 bg-white/[0.03] text-white/60',
  cold: 'border-red-400/25 bg-red-500/[0.05] text-red-300/90',
};

/**
 * After.
 *
 * One decision about the rest of his life, then twenty years pass. Every beat
 * on the card is earned by something the career actually did, which is why two
 * players who finished on the same score can get opposite endings.
 */
export default function Epilogue({ lang }: { lang: Lang }) {
  const { player, epilogue, choosePath, finishEpilogue } = useCareerStore();
  if (!player || !epilogue) return null;
  const es = lang === 'es';
  const { paths, chosen, card } = epilogue;
  const outcome = es ? epilogue.outcomeEs : epilogue.outcomeEn;

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

      <AnimatePresence mode="wait">
        {!chosen ? (
          <motion.div
            key="choose"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -16 }}
          >
            <p className="text-center text-white/60 text-sm mb-5 leading-relaxed">
              {es
                ? 'Las botas están colgadas y quedan cuarenta años por delante. ¿Qué haces con ellos?'
                : 'The boots are hung up and there are forty years left. What do you do with them?'}
            </p>
            <div className="space-y-2.5">
              {paths.map((p, i) => (
                <motion.button
                  key={p.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.08 + i * 0.06 }}
                  whileHover={{ scale: 1.01, x: 3 }}
                  whileTap={{ scale: 0.99 }}
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
        ) : (
          <motion.div
            key="card"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-4"
          >
            {/* what the choice became */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
              className="rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3.5"
            >
              <p className="text-sm leading-relaxed text-white/75">{outcome}</p>
            </motion.div>

            {/* twenty years */}
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, type: 'spring', stiffness: 90, damping: 18 }}
              className="rounded-3xl border border-gold/25 bg-gradient-to-b from-gold/[0.07] to-transparent p-5 sm:p-6"
            >
              <div className="text-[10px] tracking-[0.4em] text-gold/70 uppercase mb-3 text-center">
                {es ? 'Veinte años después' : 'Twenty years later'}
              </div>

              {card && (
                <>
                  <p className="font-display text-2xl sm:text-3xl leading-tight text-center mb-5">
                    {epilogueHeadline(card, lang)}
                  </p>

                  <div className="space-y-2">
                    {card.beats.map((b, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 + i * 0.13 }}
                        className={`rounded-xl border px-3 py-2.5 flex gap-2.5 ${TONE[b.tone]}`}
                      >
                        <span className="text-base leading-none shrink-0">{b.icon}</span>
                        <span className="text-[12px] leading-relaxed text-white/80">
                          {beatText(b, lang)}
                        </span>
                      </motion.div>
                    ))}
                  </div>

                  <motion.p
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 + card.beats.length * 0.13 }}
                    className="mt-5 pt-4 border-t border-white/10 text-center text-sm italic text-white/55 leading-relaxed"
                  >
                    {epilogueCoda(card, lang)}
                  </motion.p>
                </>
              )}
            </motion.div>

            <motion.button
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ delay: 1 + (card?.beats.length ?? 0) * 0.13 }}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={finishEpilogue}
              className="btn-primary w-full text-lg"
            >
              {es ? 'Ver la carrera completa ▸' : 'See the full career ▸'}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
