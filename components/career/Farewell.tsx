'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useCareerStore } from '@/store/careerStore';
import { sceneTitle, sceneDesc, optLabel, optOutcome } from '@/lib/career/farewell';
import { getNation } from '@/data/career/nations';
import { Crest } from './bits';
import Face from './Face';
import type { Lang } from '@/lib/career/i18n';

/**
 * The last season.
 *
 * One scene at a time, each a real decision with a consequence that is read
 * before moving on — the point of the sequence is that it is slow. A career
 * that took forty minutes to play should take more than one click to end.
 */
export default function Farewell({ lang }: { lang: Lang }) {
  const { player, farewell, chooseFarewell, nextFarewell } = useCareerStore();
  if (!player || !farewell) return null;
  const es = lang === 'es';
  const scene = farewell.scenes[farewell.idx];
  const chosen = farewell.chosen;
  const last = farewell.idx + 1 >= farewell.scenes.length;
  const nation = scene.nationCode ? getNation(scene.nationCode) : null;

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="text-center mb-5"
      >
        <div className="text-[10px] tracking-[0.4em] text-gold uppercase mb-2">
          {es ? 'La última temporada' : 'The final season'}
        </div>
        <div className="flex items-center justify-center gap-3">
          <Face genes={player.face} age={player.age} size={54} />
          <div className="text-left">
            <div className="font-display text-3xl leading-none">{player.surname}</div>
            <div className="text-white/45 text-xs">
              {es ? `${player.age} años` : `${player.age} years old`}
            </div>
          </div>
        </div>
        {/* how far through the send-off we are */}
        <div className="flex items-center justify-center gap-1.5 mt-4">
          {farewell.scenes.map((_, i) => (
            <span
              key={i}
              className={`h-1 rounded-full transition-all ${
                i < farewell.idx ? 'w-6 bg-gold/60'
                  : i === farewell.idx ? 'w-10 bg-gold' : 'w-6 bg-white/15'
              }`}
            />
          ))}
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.div
          key={scene.id}
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.98 }}
          transition={{ duration: 0.35 }}
          className="rounded-3xl border border-gold/25 bg-gradient-to-b from-gold/[0.07] to-transparent p-5 sm:p-7"
        >
          <div className="flex items-center gap-3 mb-3">
            {scene.clubId && <Crest clubId={scene.clubId} size={40} />}
            {nation && <span className="text-3xl leading-none">{nation.flag}</span>}
            <h2 className="font-display text-3xl sm:text-4xl leading-none">
              {sceneTitle(scene, lang)}
            </h2>
          </div>

          <p className="text-white/70 text-sm sm:text-base leading-relaxed mb-5">
            {sceneDesc(scene, lang)}
          </p>

          {!chosen ? (
            <div className="space-y-2.5">
              {scene.options.map((o, i) => (
                <motion.button
                  key={o.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.12 + i * 0.07 }}
                  whileHover={{ scale: 1.01, x: 3 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => chooseFarewell(o.id)}
                  className="w-full text-left rounded-2xl border border-white/12 bg-white/5 hover:bg-white/10 hover:border-gold/40 px-4 py-3.5 transition-colors"
                >
                  <span className="text-sm sm:text-base">{optLabel(o, lang)}</span>
                </motion.button>
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="rounded-2xl border border-gold/35 bg-gold/10 px-4 py-3.5">
                <div className="text-[10px] tracking-[0.3em] text-gold/70 uppercase mb-1.5">
                  {optLabel(chosen, lang)}
                </div>
                <p className="text-sm leading-relaxed text-white/85">
                  {optOutcome(chosen, lang)}
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={nextFarewell}
                className="btn-primary w-full text-lg"
              >
                {last
                  ? (es ? 'Colgar las botas ▸' : 'Hang them up ▸')
                  : (es ? 'Continuar ▸' : 'Continue ▸')}
              </motion.button>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
