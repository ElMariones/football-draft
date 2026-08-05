'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCareerStore } from '@/store/careerStore';
import {
  ceremonyHeadline, ceremonySub, eventTitle, eventDesc,
  ceremonyOptLabel, ceremonyOptOutcome, effectChips,
} from '@/lib/career/ceremony';
import { getNation } from '@/data/career/nations';
import { Crest } from './bits';
import type { Lang } from '@/lib/career/i18n';

const money = (n: number) => {
  const a = Math.abs(n);
  const s = a >= 1_000_000 ? `${(a / 1_000_000).toFixed(1)}M` : `${Math.round(a / 1000)}K`;
  return `${n > 0 ? '+' : '−'}€${s}`;
};

/**
 * The announcement, then what happens to you afterwards.
 *
 * Two beats on purpose: the reveal is allowed to land before it asks you
 * anything. A first call-up that arrived as a row in a side panel and a record
 * that arrived as one line in a ticker were the two biggest things in a career
 * that the game never actually showed you.
 */
export default function CeremonyModal({ lang }: { lang: Lang }) {
  const { ceremony, chooseCeremony, dismissCeremony, player } = useCareerStore();
  const [stage, setStage] = useState<'reveal' | 'event'>('reveal');
  const es = lang === 'es';

  if (!ceremony || !player) return null;
  const nation = ceremony.nationCode ? getNation(ceremony.nationCode) : null;
  const chosen = ceremony.chosen;
  const isCallup = ceremony.kind === 'first-callup';
  const accent = isCallup ? 'wc' : 'gold';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[80] grid place-items-center bg-black/90 backdrop-blur-md p-4"
      >
        <motion.div
          initial={{ scale: 0.92, y: 26 }} animate={{ scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 170, damping: 20 }}
          className={`w-full max-w-md rounded-3xl border bg-[#0b0f14] overflow-hidden ${
            isCallup ? 'border-wc/40' : 'border-gold/40'
          }`}
        >
          {/* ---------- the reveal ---------- */}
          <div className="relative px-6 pt-7 pb-6 text-center overflow-hidden">
            {/* a sweep of light behind the flag */}
            <motion.div
              initial={{ x: '-120%' }} animate={{ x: '120%' }}
              transition={{ duration: 1.4, ease: 'easeInOut', delay: 0.2 }}
              className={`absolute inset-y-0 w-1/2 blur-2xl ${isCallup ? 'bg-wc/25' : 'bg-gold/25'}`}
            />

            <motion.div
              initial={{ scale: 0.3, rotate: -20, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.1 }}
              className="relative grid place-items-center mb-3"
            >
              {nation ? (
                <motion.span
                  className="text-[72px] leading-none drop-shadow-[0_4px_16px_rgba(0,0,0,0.7)]"
                  animate={{ rotate: [0, -4, 4, -2, 0] }}
                  transition={{ duration: 1.6, delay: 0.5 }}
                >
                  {nation.flag}
                </motion.span>
              ) : ceremony.clubId ? (
                <Crest clubId={ceremony.clubId} size={76} />
              ) : null}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className={`relative text-[10px] tracking-[0.4em] uppercase mb-2 ${
                isCallup ? 'text-wc' : 'text-gold'
              }`}
            >
              {isCallup
                ? (es ? 'Convocatoria' : 'Squad announcement')
                : (es ? 'Récord' : 'Record')}
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
              className="relative font-display text-3xl leading-none"
            >
              {ceremonyHeadline(ceremony, lang)}
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ delay: 0.75 }}
              className="relative text-white/55 text-sm mt-2 leading-snug"
            >
              {ceremonySub(ceremony, lang)}
            </motion.p>

            {stage === 'reveal' && (
              <motion.button
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.15 }}
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={() => setStage('event')}
                className="relative btn-primary mt-5 px-8"
              >
                {es ? 'Seguir ▸' : 'Continue ▸'}
              </motion.button>
            )}
          </div>

          {/* ---------- and then what happened ---------- */}
          <AnimatePresence>
            {stage === 'event' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className={`border-t px-5 py-5 text-left ${
                  isCallup ? 'border-wc/20 bg-wc/[0.03]' : 'border-gold/20 bg-gold/[0.03]'
                }`}
              >
                <div className="text-[10px] tracking-[0.3em] text-white/35 uppercase mb-1.5">
                  {eventTitle(ceremony.event, lang)}
                </div>
                <p className="text-sm text-white/75 leading-relaxed mb-4">
                  {eventDesc(ceremony.event, lang)}
                </p>

                {!chosen ? (
                  <div className="space-y-2">
                    {ceremony.event.options.map((o, i) => (
                      <motion.button
                        key={o.id}
                        initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 + i * 0.07 }}
                        whileHover={{ scale: 1.01, x: 3 }} whileTap={{ scale: 0.99 }}
                        onClick={() => chooseCeremony(o.id)}
                        className={`w-full text-left rounded-xl border border-white/12 bg-white/5 px-3.5 py-3 text-sm transition-colors hover:bg-white/10 ${
                          isCallup ? 'hover:border-wc/45' : 'hover:border-gold/45'
                        }`}
                      >
                        {ceremonyOptLabel(o, lang)}
                      </motion.button>
                    ))}
                  </div>
                ) : (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                    <div className={`rounded-xl border px-3.5 py-3 ${
                      isCallup ? 'border-wc/35 bg-wc/10' : 'border-gold/35 bg-gold/10'
                    }`}>
                      <div className={`text-[10px] tracking-[0.25em] uppercase mb-1.5 ${
                        isCallup ? 'text-wc/70' : 'text-gold/70'
                      }`}>
                        {ceremonyOptLabel(chosen, lang)}
                      </div>
                      <p className="text-sm leading-relaxed text-white/85">
                        {ceremonyOptOutcome(chosen, lang)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {effectChips(chosen.effects, lang).map((c, i) => (
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
                          {c.money ? money(c.delta) : `${c.delta > 0 ? '+' : ''}${c.delta}`} {c.label}
                        </motion.span>
                      ))}
                    </div>

                    <motion.button
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      onClick={dismissCeremony}
                      className="btn-primary w-full mt-4"
                    >
                      {es ? 'Continuar' : 'Continue'}
                    </motion.button>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
