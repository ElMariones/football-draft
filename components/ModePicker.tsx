'use client';

import { motion } from 'framer-motion';
import { MODES, Mode } from '@/lib/draft';

interface Props {
  value: Mode;
  onChange: (m: Mode) => void;
}

const ORDER: Mode[] = ['pl', 'cl'];

export default function ModePicker({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {ORDER.map((id, i) => {
        const cfg = MODES[id];
        const selected = value === id;
        const isCL = id === 'cl';
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
                  : 'border-gold bg-gold/10 shadow-[0_0_30px_rgba(255,215,0,0.25)]'
                : 'border-white/10 bg-white/5 hover:bg-white/10'
            }`}
          >
            {isCL && selected && <div className="cl-stars" />}
            <div className="relative">
              <div className="flex items-baseline justify-between mb-1">
                <div className="font-display text-xl">{cfg.label}</div>
                <div className="text-[10px] tracking-widest text-white/40 uppercase">
                  {cfg.tagline}
                </div>
              </div>
              <p className="text-[12px] text-white/70 leading-snug">{cfg.description}</p>
              {selected && (
                <span
                  className={`absolute -top-1 right-0 w-2 h-2 rounded-full ${
                    isCL ? 'bg-cl' : 'bg-gold'
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
