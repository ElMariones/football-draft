'use client';

import { motion } from 'framer-motion';
import { useCareerStore } from '@/store/careerStore';
import { archetypeName, archetypeDesc } from '@/lib/career/archetypes';
import { ATTR_LABEL, type AttrKey } from '@/lib/career/attributes';
import type { Lang } from '@/lib/career/i18n';

const RISK_TONE = 'from-wc/25 to-transparent';

export default function ArchetypePicker({ lang }: { lang: Lang }) {
  const { player, archetypeOptions, chooseArchetype } = useCareerStore();
  if (!player) return null;
  const es = lang === 'es';

  return (
    <div className="max-w-4xl mx-auto">
      {/* The 1-in-100 banner — the reference game's best cold open. */}
      {player.wonderkid && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 16 }}
          className="relative overflow-hidden rounded-2xl border-2 border-gold bg-gradient-to-b from-gold/20 to-transparent p-5 text-center mb-6"
        >
          <motion.div
            animate={{ opacity: [0.35, 0.85, 0.35] }}
            transition={{ duration: 2.4, repeat: Infinity }}
            className="absolute inset-0 bg-gold/10"
          />
          <div className="relative">
            <div className="font-display text-3xl sm:text-4xl text-gold tracking-wide">
              ⭐ {es ? 'NACIÓ UN PIBE MARAVILLA' : 'A GENERATIONAL TALENT'}
            </div>
            <p className="text-white/70 text-sm mt-2 max-w-xl mx-auto">
              {es
                ? 'Uno de cada cien. Si la rompés estas primeras temporadas, los grandes te van a venir a buscar juntos. No desperdicies este don.'
                : 'One in a hundred. Tear it up in your first seasons and every giant will come for you at once. Do not waste this.'}
            </p>
          </div>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
        <div className="text-[10px] tracking-[0.35em] text-white/40 uppercase mb-2">
          {es ? 'La cuna' : 'Your origin'}
        </div>
        <h2 className="font-display text-4xl sm:text-5xl leading-none mb-2">
          {es ? '¿QUÉ CLASE DE JUGADOR ERES?' : 'WHAT KIND OF PLAYER ARE YOU?'}
        </h2>
        <p className="text-white/55 text-sm">
          {es
            ? 'El dado trajo tres destinos. Elige uno: te define para siempre.'
            : 'The dice dealt three paths. Pick one — it defines you forever.'}
        </p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {archetypeOptions.map((a, i) => (
          <motion.button
            key={a.id}
            initial={{ opacity: 0, y: 24, rotateX: -12 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ delay: i * 0.09, type: 'spring', stiffness: 140, damping: 16 }}
            whileHover={{ scale: 1.035, y: -6 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => chooseArchetype(a.id)}
            className="group relative overflow-hidden rounded-2xl border border-white/12 bg-white/5 p-5 text-left hover:border-wc/60 hover:bg-white/10 transition-colors"
          >
            <div className={`absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${RISK_TONE} opacity-0 group-hover:opacity-100 transition-opacity`} />
            <div className="relative">
              <h3 className="font-display text-2xl mb-1.5 leading-none">{archetypeName(a, lang)}</h3>
              <p className="text-sm text-white/55 mb-4 min-h-[2.5rem]">{archetypeDesc(a, lang)}</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(a.delta).map(([k, v]) => (
                  <span
                    key={k}
                    className="text-[11px] px-2 py-0.5 rounded-full border border-wc/40 bg-wc/15 text-wc"
                  >
                    +{v} {ATTR_LABEL[k as AttrKey][es ? 'es' : 'en']}
                  </span>
                ))}
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
