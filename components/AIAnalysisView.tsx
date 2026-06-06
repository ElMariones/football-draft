'use client';

import { motion } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';

interface Props {
  analysis: string;
}

export default function AIAnalysisView({ analysis }: Props) {
  const reset = useGameStore(s => s.reset);
  const setPhase = useGameStore(s => s.setPhase);
  // Break into paragraphs for animation.
  const paragraphs = analysis.split(/\n\s*\n/).filter(Boolean);

  return (
    <div className="space-y-6 mt-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass p-6 sm:p-8 relative overflow-hidden"
      >
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-gold/20 blur-3xl" />
        <div className="relative">
          <div className="font-display text-xs tracking-[0.4em] text-gold mb-1">
            AI SEASON BRIEFING
          </div>
          <h3 className="font-display text-3xl mb-5">The Verdict</h3>

          <div className="space-y-4 text-white/90 leading-relaxed text-[15px]">
            {paragraphs.map((p, i) => (
              <motion.p
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18 + i * 0.08, duration: 0.45 }}
              >
                {p}
              </motion.p>
            ))}
          </div>
        </div>
      </motion.div>

      <div className="flex flex-wrap justify-center gap-3">
        <button onClick={() => setPhase('finished')} className="btn-ghost">
          ← Back to Stats
        </button>
        <button onClick={reset} className="btn-primary">
          Spin Again →
        </button>
      </div>
    </div>
  );
}
