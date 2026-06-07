'use client';

import { motion } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { useT } from '@/lib/i18n';

interface Props {
  summary: string;
}

export default function PressConferenceSummary({ summary }: Props) {
  const reset = useGameStore(s => s.reset);
  const setPhase = useGameStore(s => s.setPhase);
  const t = useT();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="glass p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-5">
          <span className="text-2xl">🎙</span>
          <div className="font-display text-xs tracking-[0.3em] text-gold uppercase">
            {t.press.summaryLabel}
          </div>
        </div>
        <div className="prose prose-invert max-w-none">
          {summary.split('\n\n').map((para, i) => (
            <p key={i} className="text-white/85 leading-relaxed text-[15px] mb-4 last:mb-0">
              {para}
            </p>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button onClick={() => setPhase('finished')} className="btn-ghost">
          ← {t.ai.backToStats}
        </button>
        <button onClick={reset} className="btn-primary">
          {t.ai.spinAgain}
        </button>
      </div>
    </motion.div>
  );
}
