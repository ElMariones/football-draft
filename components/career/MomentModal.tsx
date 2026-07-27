'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useCareerStore } from '@/store/careerStore';
import { momentTitle, momentDesc, optionLabel } from '@/lib/career/moments';
import type { Lang } from '@/lib/career/i18n';

const RISK_STYLE: Record<string, { chip: string; en: string; es: string }> = {
  safe:  { chip: 'border-white/25 bg-white/10 text-white/70', en: 'Safe',  es: 'Seguro' },
  bold:  { chip: 'border-cl/50 bg-cl/15 text-cl',             en: 'Bold',  es: 'Arriesgado' },
  allin: { chip: 'border-gold/60 bg-gold/15 text-gold',       en: 'All in', es: 'A todo o nada' },
};

export default function MomentModal({ lang }: { lang: Lang }) {
  const { moment, momentResult, pickMoment, dismissMoment } = useCareerStore();
  const es = lang === 'es';
  if (!moment) return null;
  const resolved = !!moment.resolved;
  const won = moment.resolved === 'win';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] grid place-items-center bg-black/85 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ scale: 0.88, y: 30, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 180, damping: 20 }}
          className="w-full max-w-lg rounded-3xl border border-white/15 bg-[#0b0f14] p-6 relative overflow-hidden"
        >
          {/* stadium glow */}
          <motion.div
            animate={{ opacity: resolved ? (won ? [0.3, 0.6, 0.3] : 0.15) : [0.15, 0.35, 0.15] }}
            transition={{ duration: 2, repeat: Infinity }}
            className={`absolute -top-24 left-1/2 -translate-x-1/2 h-48 w-96 rounded-full blur-3xl ${
              resolved ? (won ? 'bg-wc' : 'bg-ll') : 'bg-gold'
            }`}
          />

          <div className="relative">
            <div className="text-[10px] tracking-[0.35em] text-gold uppercase mb-2">
              {es ? 'Momento decisivo' : 'Decisive moment'} · {moment.year}
            </div>
            <h2 className="font-display text-4xl leading-none mb-3">{momentTitle(moment, lang)}</h2>
            <p className="text-white/65 text-sm mb-5">{momentDesc(moment, lang)}</p>

            {/* the tell — reading the game is an attribute, not a guess */}
            {!resolved && moment.tellId && (
              <motion.div
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                className="mb-4 rounded-xl border border-cl/30 bg-cl/10 px-3 py-2 text-xs text-cl"
              >
                👁️ {es ? 'Leés la jugada: algo te dice que ' : 'You read it: something says '}
                <strong>
                  {optionLabel(moment.options.find(o => o.id === moment.tellId)!, lang).toLowerCase()}
                </strong>
                {es ? ' no va a salir.' : ' will not work.'}
              </motion.div>
            )}

            {!resolved ? (
              <div className="space-y-2.5">
                {moment.options.map((o, i) => {
                  const r = RISK_STYLE[o.risk];
                  return (
                    <motion.button
                      key={o.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + i * 0.07 }}
                      whileHover={{ scale: 1.02, x: 4 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => pickMoment(o.id)}
                      className="w-full flex items-center justify-between gap-3 rounded-2xl border border-white/12 bg-white/5 px-4 py-3.5 text-left hover:bg-white/10 hover:border-white/30 transition-colors"
                    >
                      <span className="font-display text-lg">{optionLabel(o, lang)}</span>
                      <span className={`shrink-0 text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full border ${r.chip}`}>
                        {es ? r.es : r.en}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            ) : (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
                <motion.div
                  animate={won ? { scale: [1, 1.25, 1], rotate: [0, -8, 8, 0] } : { y: [0, -4, 0] }}
                  transition={{ duration: 0.7 }}
                  className="text-6xl mb-3"
                >
                  {won ? (momentResult?.viaRebound ? '🔁' : '⚽') : '😖'}
                </motion.div>
                <div className={`font-display text-3xl mb-2 ${won ? 'text-wc' : 'text-ll'}`}>
                  {won ? (es ? '¡LA METISTE!' : 'YOU BURIED IT!') : (es ? 'SE ESCAPÓ' : 'IT SLIPPED AWAY')}
                </div>
                <p className="text-white/65 text-sm mb-4">
                  {es ? momentResult?.newsEs : momentResult?.newsEn}
                </p>
                {momentResult && (
                  <div className="flex flex-wrap justify-center gap-1.5 mb-5">
                    {[
                      ['Idolatría', 'Idolatry', momentResult.idol],
                      ['Fama', 'Fame', momentResult.reputation],
                      ['Ánimo', 'Morale', momentResult.morale],
                      ['Forma', 'Form', momentResult.form],
                    ].map(([esL, enL, v]) => {
                      const n = Math.round(v as number);
                      if (!n) return null;
                      return (
                        <span key={enL as string}
                          className={`text-[11px] px-2 py-0.5 rounded-full border ${
                            n > 0 ? 'border-wc/40 bg-wc/15 text-wc' : 'border-ll/40 bg-ll/15 text-red-300'
                          }`}>
                          {n > 0 ? '+' : ''}{n} {es ? esL as string : enL as string}
                        </span>
                      );
                    })}
                  </div>
                )}
                <motion.button
                  whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                  onClick={dismissMoment}
                  className="btn-primary px-8"
                >
                  {es ? 'Seguir' : 'Continue'}
                </motion.button>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
