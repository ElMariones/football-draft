'use client';

import { motion } from 'framer-motion';
import { Mode } from '@/lib/draft';
import { useT } from '@/lib/i18n';

interface Props {
  value: Mode;
  onChange: (m: Mode) => void;
}

const ORDER: Mode[] = ['pl', 'll', 'cl', 'wc'];

export default function ModePicker({ value, onChange }: Props) {
  const t = useT();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {ORDER.map((id, i) => {
        const cfg = t.mode[id];
        const selected = value === id;
        const isCL = id === 'cl';
        const isLL = id === 'll';
        const isWC = id === 'wc';
        return (
          <motion.button
            key={id}
            onClick={() => onChange(id)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i }}
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.97 }}
            className={`relative overflow-hidden text-left rounded-2xl p-5 border transition-colors ${
              selected
                ? isCL
                  ? 'border-cl bg-cl/10 shadow-[0_0_30px_rgba(61,169,252,0.3)]'
                  : isLL
                  ? 'border-ll bg-ll/10 shadow-[0_0_30px_rgba(200,16,46,0.3)]'
                  : isWC
                  ? 'border-wc bg-wc/10 shadow-[0_0_30px_rgba(0,223,162,0.35)]'
                  : 'border-gold bg-gold/10 shadow-[0_0_30px_rgba(255,215,0,0.25)]'
                : 'border-white/10 bg-white/5 hover:bg-white/10'
            }`}
          >
            {isCL && selected && <div className="cl-stars" />}
            {isWC && selected && <div className="wc-stars" />}
            <div className="relative">
              <div className="flex items-baseline justify-between mb-1">
                <div className={`font-display text-xl ${isWC && selected ? 'wc-shimmer' : ''}`}>
                  {isWC ? `🏆 ${cfg.label}` : cfg.label}
                </div>
                <div className="text-[10px] tracking-widest text-white/40 uppercase">
                  {cfg.tagline}
                </div>
              </div>
              <p className="text-[12px] text-white/70 leading-snug">{cfg.description}</p>
              {selected && (
                <span
                  className={`absolute -top-1 right-0 w-2 h-2 rounded-full ${
                    isCL ? 'bg-cl' : isLL ? 'bg-ll' : isWC ? 'bg-wc' : 'bg-gold'
                  }`}
                />
              )}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
