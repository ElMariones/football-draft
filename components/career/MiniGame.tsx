'use client';

// Minigames — the few times a season where the outcome is in your hands rather
// than the dice. Three kinds, each testing something different:
//   luck   — the ball is under one of three shirts (a coin-flip you can't game)
//   memory — repeat the run the winger just made
//   skill  — stop the power bar inside the sweet spot
// They resolve real career consequences: shaking off an injury, finishing a
// wonder goal, or winning the derby.
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCareerStore } from '@/store/careerStore';
import type { Lang } from '@/lib/career/i18n';

export type MiniKind = 'luck' | 'memory' | 'skill';
export type MiniStake = 'injury' | 'wonder-goal' | 'derby' | 'tournament';

export interface MiniGameSpec {
  kind: MiniKind;
  stake: MiniStake;
  /** pre-rolled answers so the engine, not the DOM, owns the outcome */
  luckIndex: number;
  sequence: number[];
  /** where the sweet spot sits, 0-100, and how wide it is */
  target: number;
  width: number;
  /** for the tournament stake: what is on the line, and against whom */
  label?: string;
  round?: string;
}

const COPY: Record<MiniStake, { en: [string, string]; es: [string, string] }> = {
  injury: {
    en: ['The rehab test', 'Pass the fitness test and you are back for the run-in.'],
    es: ['La prueba de recuperación', 'Pasa el test físico y vuelves para la recta final.'],
  },
  'wonder-goal': {
    en: ['The chance of the season', 'The ball sits up on the edge of the box.'],
    es: ['La jugada del año', 'La pelota te queda botando al borde del área.'],
  },
  derby: {
    en: ['The derby', 'Ninety minutes that the city will talk about for a year.'],
    es: ['El clásico', 'Noventa minutos de los que la ciudad va a hablar un año.'],
  },
  tournament: {
    en: ['With your country', 'The whole nation has stopped to watch this.'],
    es: ['Con tu selección', 'El país entero se detuvo para ver esto.'],
  },
};

const KIND_COPY: Record<MiniKind, { en: string; es: string }> = {
  luck: { en: 'Which shirt is the ball under?', es: '¿Bajo qué camiseta está la pelota?' },
  memory: { en: 'Repeat the run', es: 'Repite la jugada' },
  skill: { en: 'Stop the power in the green', es: 'Detén la potencia en el verde' },
};

export default function MiniGame({ lang }: { lang: Lang }) {
  const { miniGame, resolveMiniGame } = useCareerStore();
  const es = lang === 'es';

  const [phase, setPhase] = useState<'watch' | 'play' | 'done'>('watch');
  const [flash, setFlash] = useState(-1);
  const [entered, setEntered] = useState<number[]>([]);
  const [bar, setBar] = useState(0);
  const [result, setResult] = useState<boolean | null>(null);
  const raf = useRef<number>();
  const dir = useRef(1);

  // reset whenever a new minigame arrives
  useEffect(() => {
    setPhase(miniGame?.kind === 'memory' ? 'watch' : 'play');
    setEntered([]); setResult(null); setBar(0); setFlash(-1);
  }, [miniGame]);

  // memory: play the sequence back to the player first
  useEffect(() => {
    if (!miniGame || miniGame.kind !== 'memory' || phase !== 'watch') return;
    let i = 0;
    const id = window.setInterval(() => {
      if (i >= miniGame.sequence.length) {
        window.clearInterval(id);
        setFlash(-1);
        window.setTimeout(() => setPhase('play'), 350);
        return;
      }
      setFlash(miniGame.sequence[i]);
      window.setTimeout(() => setFlash(-1), 380);
      i += 1;
    }, 620);
    return () => window.clearInterval(id);
  }, [miniGame, phase]);

  // skill: sweep the power bar back and forth until the player stops it
  useEffect(() => {
    if (!miniGame || miniGame.kind !== 'skill' || phase !== 'play') return;
    let v = 0;
    const step = () => {
      v += dir.current * 1.9;
      if (v >= 100) { v = 100; dir.current = -1; }
      if (v <= 0) { v = 0; dir.current = 1; }
      setBar(v);
      raf.current = window.requestAnimationFrame(step);
    };
    raf.current = window.requestAnimationFrame(step);
    return () => { if (raf.current) window.cancelAnimationFrame(raf.current); };
  }, [miniGame, phase]);

  if (!miniGame) return null;
  const c = COPY[miniGame.stake][es ? 'es' : 'en'];

  const finish = (won: boolean) => {
    setResult(won);
    setPhase('done');
    window.setTimeout(() => resolveMiniGame(won), 1500);
  };

  const pickShirt = (i: number) => {
    if (phase !== 'play') return;
    finish(i === miniGame.luckIndex);
  };

  const pressPad = (i: number) => {
    if (phase !== 'play') return;
    const next = [...entered, i];
    setFlash(i);
    window.setTimeout(() => setFlash(-1), 200);
    if (miniGame.sequence[next.length - 1] !== i) { finish(false); return; }
    if (next.length === miniGame.sequence.length) { finish(true); return; }
    setEntered(next);
  };

  const stopBar = () => {
    if (phase !== 'play') return;
    if (raf.current) window.cancelAnimationFrame(raf.current);
    finish(Math.abs(bar - miniGame.target) <= miniGame.width / 2);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[75] grid place-items-center bg-black/88 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ scale: 0.9, y: 24 }} animate={{ scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 180, damping: 20 }}
          className="w-full max-w-md rounded-3xl border border-white/15 bg-[#0b0f14] p-6 text-center"
        >
          <div className="text-[10px] tracking-[0.35em] text-cl uppercase">
            {es ? 'Minijuego' : 'Minigame'}
          </div>
          <h2 className="font-display text-3xl leading-none mt-1">
            {miniGame.label ?? c[0]}
          </h2>
          <p className="text-white/60 text-sm mt-2">{c[1]}</p>
          {miniGame.round && (
            <div className="inline-block mt-2 text-[10px] uppercase tracking-widest px-2 py-1 rounded-full border border-gold/40 bg-gold/10 text-gold">
              {miniGame.round}
            </div>
          )}

          {phase !== 'done' && (
            <p className="text-xs text-wc mt-3">{KIND_COPY[miniGame.kind][es ? 'es' : 'en']}</p>
          )}

          {/* ---- luck: three shirts ---- */}
          {miniGame.kind === 'luck' && (
            <div className="grid grid-cols-3 gap-3 mt-5">
              {[0, 1, 2].map(i => {
                const reveal = phase === 'done' && i === miniGame.luckIndex;
                return (
                  <motion.button
                    key={i}
                    whileHover={phase === 'play' ? { scale: 1.06, y: -4 } : undefined}
                    whileTap={phase === 'play' ? { scale: 0.94 } : undefined}
                    onClick={() => pickShirt(i)}
                    className={`aspect-square rounded-2xl border-2 grid place-items-center text-4xl transition-colors ${
                      reveal ? 'border-wc bg-wc/20' : 'border-white/15 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    {reveal ? '⚽' : '👕'}
                  </motion.button>
                );
              })}
            </div>
          )}

          {/* ---- memory: four pads ---- */}
          {miniGame.kind === 'memory' && (
            <>
              <div className="grid grid-cols-2 gap-3 mt-5">
                {[0, 1, 2, 3].map(i => (
                  <motion.button
                    key={i}
                    animate={{ scale: flash === i ? 1.08 : 1 }}
                    transition={{ duration: 0.12 }}
                    onClick={() => pressPad(i)}
                    disabled={phase !== 'play'}
                    className={`h-20 rounded-2xl border-2 transition-colors ${
                      flash === i
                        ? 'border-wc bg-wc/40 shadow-[0_0_24px_rgba(0,223,162,0.6)]'
                        : 'border-white/15 bg-white/5 hover:bg-white/10'
                    } ${phase !== 'play' ? 'opacity-60' : ''}`}
                  />
                ))}
              </div>
              <div className="text-[11px] text-white/45 mt-3">
                {phase === 'watch'
                  ? (es ? 'Mira la jugada…' : 'Watch the run…')
                  : `${entered.length}/${miniGame.sequence.length}`}
              </div>
            </>
          )}

          {/* ---- skill: timing bar ---- */}
          {miniGame.kind === 'skill' && (
            <div className="mt-6">
              <div className="relative h-8 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="absolute inset-y-0 bg-wc/35 border-x-2 border-wc"
                  style={{ left: `${miniGame.target - miniGame.width / 2}%`, width: `${miniGame.width}%` }}
                />
                <motion.div
                  className="absolute inset-y-0 w-1.5 bg-white rounded-full shadow-[0_0_12px_rgba(255,255,255,0.9)]"
                  style={{ left: `${bar}%` }}
                />
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={stopBar}
                disabled={phase !== 'play'}
                className="btn-primary w-full mt-4 disabled:opacity-40"
              >
                {es ? 'DISPARAR' : 'STRIKE'}
              </motion.button>
            </div>
          )}

          {/* ---- result ---- */}
          <AnimatePresence>
            {phase === 'done' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
                className="mt-5"
              >
                <div className="text-5xl">{result ? '🎉' : '😖'}</div>
                <div className={`font-display text-2xl mt-1 ${result ? 'text-wc' : 'text-ll'}`}>
                  {result
                    ? (es ? '¡SALIÓ!' : 'NAILED IT!')
                    : (es ? 'NO SALIÓ' : 'NOT THIS TIME')}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
