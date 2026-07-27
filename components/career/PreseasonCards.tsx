'use client';

import { motion } from 'framer-motion';
import { useCareerStore } from '@/store/careerStore';
import { cardName, cardDesc, cardChips, type CardRarity } from '@/lib/career/preseason';
import type { Lang } from '@/lib/career/i18n';

const RARITY: Record<CardRarity, { ring: string; glow: string; label: { en: string; es: string } }> = {
  common: { ring: 'border-white/12', glow: '', label: { en: 'Common', es: 'Común' } },
  rare:   { ring: 'border-cl/50', glow: 'shadow-[0_0_22px_rgba(61,169,252,0.25)]', label: { en: 'Rare', es: 'Rara' } },
  epic:   { ring: 'border-gold/70', glow: 'shadow-[0_0_28px_rgba(255,215,0,0.3)]', label: { en: 'Epic', es: 'Épica' } },
};

export default function PreseasonCards({ lang }: { lang: Lang }) {
  const { offseason, chooseCard } = useCareerStore();
  if (!offseason || !offseason.cards.length) return null;
  const es = lang === 'es';
  const done = !!offseason.cardChosen;

  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-4 sm:p-5">
      <div className="flex items-baseline justify-between mb-1">
        <div className="text-[10px] tracking-[0.3em] text-white/40 uppercase">
          {es ? 'Pretemporada' : 'Preseason'}
        </div>
        {done && (
          <span className="text-[10px] text-wc uppercase tracking-widest">
            {es ? 'Elegida' : 'Chosen'}
          </span>
        )}
      </div>
      <p className="text-sm text-white/55 mb-3">
        {es ? 'El dado trajo tres mejoras. Elige una.' : 'The dice dealt three upgrades. Take one.'}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {offseason.cards.map((c, i) => {
          const r = RARITY[c.rarity];
          const picked = offseason.cardChosen === c.id;
          const dimmed = done && !picked;
          return (
            <motion.button
              key={c.id}
              initial={{ opacity: 0, rotateY: -60, y: 16 }}
              animate={{
                opacity: dimmed ? 0.32 : 1,
                rotateY: 0,
                y: 0,
                scale: picked ? 1.03 : 1,
              }}
              transition={{ delay: i * 0.08, type: 'spring', stiffness: 150, damping: 17 }}
              whileHover={done ? undefined : { scale: 1.04, y: -5 }}
              whileTap={done ? undefined : { scale: 0.97 }}
              disabled={done}
              onClick={() => chooseCard(c.id)}
              className={`relative overflow-hidden rounded-2xl border bg-white/5 p-4 text-left transition-colors ${
                picked ? 'border-wc bg-wc/12 ' + RARITY[c.rarity].glow : r.ring + ' ' + (done ? '' : 'hover:bg-white/10 ' + r.glow)
              }`}
            >
              {c.rarity !== 'common' && (
                <span
                  className={`absolute right-2 top-2 text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-full ${
                    c.rarity === 'epic' ? 'bg-gold/20 text-gold' : 'bg-cl/20 text-cl'
                  }`}
                >
                  {r.label[es ? 'es' : 'en']}
                </span>
              )}
              <h4 className="font-display text-lg leading-tight mb-1.5 pr-12">{cardName(c, lang)}</h4>
              <p className="text-xs text-white/50 mb-3 min-h-[2.2rem]">{cardDesc(c, lang)}</p>
              <div className="flex flex-wrap gap-1">
                {cardChips(c, lang).map((chip, j) => (
                  <span key={j} className="text-[10px] px-1.5 py-0.5 rounded-full bg-wc/15 text-wc border border-wc/30">
                    {chip}
                  </span>
                ))}
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
