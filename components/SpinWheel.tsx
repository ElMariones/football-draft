'use client';

import { motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';

interface Item {
  key: string;
  label: string;
  sublabel?: string;
  color?: string;
}

interface Props {
  items: Item[];
  targetKey: string;
  spinning: boolean;
  onComplete?: () => void;
  height?: number;        // px
  durationMs?: number;
  label?: string;
}

const ROW_HEIGHT = 84;

export default function SpinWheel({
  items,
  targetKey,
  spinning,
  onComplete,
  height = 252,
  durationMs = 3200,
  label,
}: Props) {
  const targetIdx = useMemo(
    () => items.findIndex(i => i.key === targetKey),
    [items, targetKey],
  );

  // 5 full repetitions + land on target.
  const reel = useMemo(() => {
    const reps = 5;
    const out: Item[] = [];
    for (let i = 0; i < reps; i++) out.push(...items);
    return out;
  }, [items]);

  const fired = useRef(false);
  const [restY, setRestY] = useState<number>(0);

  useEffect(() => {
    fired.current = false;
  }, [spinning, targetKey]);

  if (targetIdx < 0) return null;

  const finalY = -((items.length * 4 + targetIdx) * ROW_HEIGHT) + height / 2 - ROW_HEIGHT / 2;
  const animateY = spinning ? finalY : restY;

  return (
    <div className="flex flex-col items-center gap-2">
      {label && (
        <div className="font-display text-sm tracking-[0.3em] text-white/60">{label}</div>
      )}
      <div
        className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 backdrop-blur w-[min(43vw,220px)] sm:w-[260px]"
        style={{ height }}
      >
        {/* Top + bottom fade masks */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-black/80 to-transparent z-10" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/80 to-transparent z-10" />
        {/* Center selector line */}
        <div className="pointer-events-none absolute inset-x-2 z-20 flex items-center" style={{ top: height / 2 - ROW_HEIGHT / 2, height: ROW_HEIGHT }}>
          <div className="w-full h-full rounded-xl border-2 border-gold/70 shadow-[0_0_25px_rgba(255,215,0,0.4)]" />
        </div>

        <motion.div
          initial={{ y: restY }}
          animate={{ y: animateY }}
          transition={
            spinning
              ? { duration: durationMs / 1000, ease: [0.16, 0.84, 0.34, 1] }
              : { duration: 0 }
          }
          onAnimationComplete={() => {
            if (spinning && !fired.current) {
              fired.current = true;
              setRestY(finalY);
              onComplete?.();
            }
          }}
        >
          {reel.map((item, i) => (
            <div
              key={`${item.key}-${i}`}
              className="flex flex-col items-center justify-center px-3 text-center"
              style={{ height: ROW_HEIGHT }}
            >
              <div
                className="font-display text-2xl sm:text-3xl leading-none"
                style={{ color: item.color ?? '#fff' }}
              >
                {item.label}
              </div>
              {item.sublabel && (
                <div className="text-[11px] tracking-wider text-white/50 mt-1 uppercase max-w-full truncate">
                  {item.sublabel}
                </div>
              )}
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
