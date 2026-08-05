'use client';

// The final.
//
// Drag from the ball to pick a corner and a weight, let go, and beat a keeper
// who is moving the whole time and lunges when the ball is close. Three shots,
// two to win it.
//
// Difficulty is your own overall: a 95 sees a keeper who covers less of the goal,
// moves slower and reaches less far, and his own shot scatters barely at all. A
// 60 is shooting at a keeper who fills half the goal. The scatter is pre-rolled
// by the engine rather than drawn here, so the dice stay where every other
// outcome in the game keeps them.
import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Lang } from '@/lib/career/i18n';

// Goal mouth in local units. A real goal is 7.32m by 2.44m — three to one — and
// at 320x150 the net read as a wall rather than something you shoot into.
const GW = 320;
const GH = 108;
const GOAL_TOP = 10;
const LINE_Y = GOAL_TOP + GH;   // the goal line the keeper stands on
const BALL_Y = 252;             // where the ball sits, out in front
const VIEW_H = 290;
const BALL_R = 10;

export interface ShotSpec {
  /** 0 (a 50-overall) .. 1 (a 99-overall) */
  skill: number;
  /** pre-rolled per attempt, so the engine owns the randomness */
  shots: { scatter: number; phase: number }[];
  needed: number;
}

type Phase = 'aim' | 'flying' | 'beat' | 'over';

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Where the keeper is at a given moment.
 *
 * Analytic rather than accumulated, so the outcome does not depend on animation
 * frames arriving. A backgrounded tab throttles requestAnimationFrame to
 * nothing, and a shot whose result was read off the last rendered frame simply
 * never landed.
 */
export function keeperAt(ms: number, phase: number, speed: number, width: number): number {
  const a = Math.sin(ms * speed + phase);
  const b = Math.sin(ms * speed * 0.53 + phase * 1.7) * 0.35;
  return GW / 2 + ((a + b) / 1.35) * (GW / 2 - width / 2 - 6);
}

/** Everything difficulty touches, derived from one number. */
export function shotDifficulty(skill: number) {
  const t = Math.max(0, Math.min(1, skill));
  return {
    keeperW: lerp(116, 54, t),
    keeperSpeed: lerp(0.00185, 0.00092, t),
    dive: lerp(60, 26, t),
    scatterMax: lerp(40, 9, t),
  };
}

/**
 * Did it go in?
 *
 * Pulled out of the component so the difficulty curve can be measured rather
 * than assumed — a keeper who is unbeatable at every overall would look
 * perfectly fine on screen right up until nobody ever won a final.
 *
 * He is beaten low and wide and strong overhead, so the top corners are worth
 * going for. That is what makes aiming a decision rather than a reflex.
 */
export function judgeShot(o: {
  finalX: number; finalY: number; keeperX: number; keeperW: number; dive: number;
}): 'goal' | 'save' | 'wide' {
  if (o.finalX < 6 || o.finalX > GW - 6 || o.finalY < 4) return 'wide';
  const gap = o.finalX - o.keeperX;
  const reachX = o.keeperX + Math.max(-o.dive, Math.min(o.dive, gap));
  const vertical = 1 - Math.min(1, o.finalY / GH) * 0.55;
  return Math.abs(o.finalX - reachX) < (o.keeperW / 2 + BALL_R) * vertical ? 'save' : 'goal';
}

export default function ShotGame({
  spec, lang, onDone,
}: { spec: ShotSpec; lang: Lang; onDone: (won: boolean) => void }) {
  const es = lang === 'es';
  const t = Math.max(0, Math.min(1, spec.skill));

  // ---- difficulty ----
  const { keeperW, keeperSpeed, dive, scatterMax } = shotDifficulty(t);

  const wrap = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>('aim');
  const [attempt, setAttempt] = useState(0);
  const [scored, setScored] = useState(0);
  const [results, setResults] = useState<('goal' | 'save' | 'wide')[]>([]);

  // aim state, in goal-mouth coordinates
  const [aim, setAim] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  // keeper position, driven by rAF
  const [keeperX, setKeeperX] = useState(GW / 2);
  const keeperRef = useRef(GW / 2);
  const [keeperDive, setKeeperDive] = useState(0);
  const raf = useRef<number>();
  const startedAt = useRef(0);

  // ball flight
  const [ball, setBall] = useState<{ x: number; y: number } | null>(null);

  const shot = spec.shots[Math.min(attempt, spec.shots.length - 1)];
  const done = attempt >= spec.shots.length;
  const won = scored >= spec.needed;

  // ---- the keeper never stops ----
  useEffect(() => {
    if (phase === 'over') return;
    startedAt.current = performance.now();
    const loop = (now: number) => {
      const x = keeperAt(now - startedAt.current, shot.phase, keeperSpeed, keeperW);
      keeperRef.current = x;
      setKeeperX(x);
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [phase, keeperSpeed, keeperW, shot.phase]);

  // ---- aiming ----
  const toLocal = useCallback((clientX: number, clientY: number) => {
    const el = wrap.current;
    if (!el) return { x: GW / 2, y: GH / 2 };
    const r = el.getBoundingClientRect();
    const sx = GW / r.width;
    const sy = VIEW_H / r.height;
    return { x: (clientX - r.left) * sx, y: (clientY - r.top) * sy };
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    if (phase !== 'aim') return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setDragging(true);
    setAim(toLocal(e.clientX, e.clientY));
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging || phase !== 'aim') return;
    setAim(toLocal(e.clientX, e.clientY));
  };

  const release = () => {
    if (!dragging || phase !== 'aim' || !aim) { setDragging(false); return; }
    setDragging(false);

    // power comes from how far the drag reached up the pitch
    const pull = Math.max(0, BALL_Y - aim.y);
    const power = Math.max(0.25, Math.min(1, pull / BALL_Y));

    // Harder shots are less accurate. The engine's pre-rolled scatter is scaled
    // by power, so blasting it is a real trade-off rather than free.
    const spread = scatterMax * (0.45 + power * 0.85);
    const finalX = aim.x + shot.scatter * spread;
    const finalY = Math.max(10, Math.min(GH - 8, aim.y));

    setPhase('flying');
    const travel = lerp(620, 300, power);
    const from = { x: GW / 2, y: BALL_Y };
    const t0 = performance.now();
    const impactAt = (t0 - startedAt.current) + travel;

    // The outcome is on a timer and the animation is on frames. Frames are a
    // courtesy the browser withdraws whenever it likes; the final is not.
    const settle = () => {
      const keeper = keeperAt(impactAt, shot.phase, keeperSpeed, keeperW);
      const outcome = judgeShot({ finalX, finalY, keeperX: keeper, keeperW, dive });
      setBall({ x: finalX, y: finalY });
      setKeeperDive(Math.max(-dive, Math.min(dive, finalX - keeper)));
      setResults(r => [...r, outcome]);
      if (outcome === 'goal') setScored(sc => sc + 1);
      setPhase('beat');
    };
    window.setTimeout(settle, travel);

    const fly = (now: number) => {
      const k = Math.min(1, (now - t0) / travel);
      setBall({ x: lerp(from.x, finalX, k), y: lerp(from.y, finalY, k) });
      // he commits late, and only if it is within reach
      if (k > 0.45) {
        const keeper = keeperAt((t0 - startedAt.current) + k * travel, shot.phase, keeperSpeed, keeperW);
        const lunge = Math.max(-dive, Math.min(dive, finalX - keeper)) * ((k - 0.45) / 0.55);
        setKeeperDive(lunge);
      }
      if (k < 1) requestAnimationFrame(fly);
    };
    requestAnimationFrame(fly);
  };

  // ---- between shots ----
  const next = () => {
    const n = attempt + 1;
    const nowScored = scored;
    const left = spec.shots.length - n;
    // stop early once it cannot change
    if (nowScored >= spec.needed || nowScored + left < spec.needed || n >= spec.shots.length) {
      setPhase('over');
      return;
    }
    setAttempt(n);
    setAim(null); setBall(null); setKeeperDive(0);
    setPhase('aim');
  };

  const last = results[results.length - 1];

  return (
    <div className="select-none">
      {/* ---- scoreboard ---- */}
      <div className="flex items-center justify-center gap-2 mb-3">
        {spec.shots.map((_, i) => {
          const r = results[i];
          return (
            <span
              key={i}
              className={`w-7 h-7 rounded-full grid place-items-center text-xs font-bold border ${
                r === 'goal' ? 'bg-wc text-black border-wc'
                  : r === 'save' ? 'bg-red-500/20 text-red-300 border-red-400/50'
                    : r === 'wide' ? 'bg-white/10 text-white/40 border-white/20'
                      : i === attempt && phase !== 'over'
                        ? 'border-gold text-gold animate-pulse'
                        : 'border-white/15 text-white/25'
              }`}
            >
              {r === 'goal' ? '⚽' : r === 'save' ? '✋' : r === 'wide' ? '✕' : i + 1}
            </span>
          );
        })}
        <span className="ml-2 text-[11px] text-white/45">
          {es ? `${scored}/${spec.needed} para ganarla` : `${scored}/${spec.needed} to win it`}
        </span>
      </div>

      {/* ---- the goal ---- */}
      <div
        ref={wrap}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={release}
        onPointerCancel={release}
        className={`relative w-full rounded-2xl overflow-hidden border border-white/10 ${
          phase === 'aim' ? 'cursor-crosshair' : 'cursor-default'
        }`}
        style={{ aspectRatio: `${GW} / ${VIEW_H}`, touchAction: 'none' }}
      >
        <svg viewBox={`0 0 ${GW} ${VIEW_H}`} className="absolute inset-0 w-full h-full">
          <defs>
            <linearGradient id="sg-grass" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0d5e2a" />
              <stop offset="100%" stopColor="#073d1a" />
            </linearGradient>
            <pattern id="sg-net" width="9" height="9" patternUnits="userSpaceOnUse">
              <path d="M9 0 L0 0 0 9" fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="0.5" />
            </pattern>
            <radialGradient id="sg-glow" cx="50%" cy="50%">
              <stop offset="0%" stopColor="rgba(255,215,0,0.35)" />
              <stop offset="100%" stopColor="rgba(255,215,0,0)" />
            </radialGradient>
          </defs>

          <rect x="0" y="0" width={GW} height={VIEW_H} fill="url(#sg-grass)" />
          {/* mown stripes, only on the grass in front of the goal */}
          {Array.from({ length: 5 }).map((_, i) => (
            <rect key={i} x="0" y={LINE_Y + 8 + i * 30} width={GW} height="15" fill="rgba(255,255,255,0.022)" />
          ))}

          {/* net, then the frame on top of it */}
          <rect x="10" y={GOAL_TOP} width={GW - 20} height={GH} fill="rgba(0,0,0,0.34)" />
          <rect x="10" y={GOAL_TOP} width={GW - 20} height={GH} fill="url(#sg-net)" />
          <g stroke="#f2f2f2" strokeWidth="5.5" strokeLinecap="round" fill="none">
            <line x1="10" y1={GOAL_TOP} x2={GW - 10} y2={GOAL_TOP} />
            <line x1="10" y1={GOAL_TOP} x2="10" y2={LINE_Y} />
            <line x1={GW - 10} y1={GOAL_TOP} x2={GW - 10} y2={LINE_Y} />
          </g>
          {/* the goal line itself */}
          <line x1="0" y1={LINE_Y} x2={GW} y2={LINE_Y} stroke="rgba(255,255,255,0.55)" strokeWidth="2.5" />

          {/* six-yard box, opening towards the camera */}
          <path
            d={`M46 ${LINE_Y} L34 ${LINE_Y + 54} L${GW - 34} ${LINE_Y + 54} L${GW - 46} ${LINE_Y}`}
            fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="2"
          />
          {/* penalty spot */}
          <circle cx={GW / 2} cy={LINE_Y + 96} r="2.5" fill="rgba(255,255,255,0.35)" />

          {/* keeper — feet on the goal line, arms spanning what he covers */}
          <g transform={`translate(${keeperX + keeperDive}, ${LINE_Y - 52})`}>
            <ellipse cx="0" cy="53" rx={keeperW / 2.6} ry="4" fill="rgba(0,0,0,0.35)" />
            <g transform={`rotate(${keeperDive * 0.2})`}>
              <rect x={-keeperW / 2} y="10" width={keeperW} height="8" rx="4" fill="#F5C542" />
              <circle cx={-keeperW / 2} cy="14" r="4.5" fill="#e8b98a" />
              <circle cx={keeperW / 2} cy="14" r="4.5" fill="#e8b98a" />
            </g>
            <rect x="-8" y="8" width="16" height="28" rx="6" fill="#F5C542" />
            <circle cx="0" cy="2" r="7" fill="#e8b98a" />
            <rect x="-6.5" y="35" width="5" height="17" rx="2.5" fill="#1b1b1b" />
            <rect x="1.5" y="35" width="5" height="17" rx="2.5" fill="#1b1b1b" />
          </g>

          {/* aim line + reticle */}
          {phase === 'aim' && aim && dragging && (
            <g>
              <line
                x1={GW / 2} y1={BALL_Y} x2={aim.x} y2={aim.y}
                stroke="rgba(255,215,0,0.55)" strokeWidth="2.5" strokeDasharray="7 6"
              />
              <circle cx={aim.x} cy={aim.y} r="16" fill="url(#sg-glow)" />
              <circle cx={aim.x} cy={aim.y} r="10" fill="none" stroke="#FFD700" strokeWidth="2" />
              <circle cx={aim.x} cy={aim.y} r="2.5" fill="#FFD700" />
            </g>
          )}

          {/* ball */}
          <g transform={`translate(${ball?.x ?? GW / 2}, ${ball?.y ?? BALL_Y})`}>
            <ellipse cx="0" cy={BALL_R + 3} rx={BALL_R * 0.8} ry="3" fill="rgba(0,0,0,0.35)" />
            <circle r={BALL_R} fill="#fff" />
            <circle r={BALL_R} fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth="1" />
            <path d="M-4 -4 L4 -4 L6 3 L0 7 L-6 3 Z" fill="#111" opacity="0.85" />
          </g>
        </svg>

        {/* power meter while dragging */}
        {phase === 'aim' && dragging && aim && (
          <div className="absolute left-2 bottom-2 right-2 h-1.5 rounded-full bg-black/50 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-wc via-gold to-red-500 transition-none"
              style={{ width: `${Math.max(25, Math.min(100, ((BALL_Y - aim.y) / BALL_Y) * 100))}%` }}
            />
          </div>
        )}

        {/* result flash */}
        <AnimatePresence>
          {phase === 'beat' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 grid place-items-center pointer-events-none"
            >
              <div className={`font-display text-5xl sm:text-6xl drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)] ${
                last === 'goal' ? 'text-wc' : last === 'save' ? 'text-red-300' : 'text-white/70'
              }`}>
                {last === 'goal' ? (es ? '¡GOL!' : 'GOAL!')
                  : last === 'save' ? (es ? 'ATAJADA' : 'SAVED')
                    : (es ? 'FUERA' : 'WIDE')}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ---- prompt / advance ---- */}
      <div className="mt-3 min-h-[52px] grid place-items-center">
        {phase === 'aim' && (
          <p className="text-xs text-white/50 text-center leading-snug">
            {es
              ? 'Arrastra desde el balón para elegir palo y potencia. Suéltalo para disparar.'
              : 'Drag from the ball to pick your corner and your power. Let go to shoot.'}
          </p>
        )}
        {phase === 'beat' && (
          <motion.button
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={next}
            className="btn-primary px-8"
          >
            {es ? 'Seguir' : 'Continue'}
          </motion.button>
        )}
        {phase === 'over' && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => onDone(won)}
            className={won ? 'btn-primary px-8 text-lg' : 'btn-ghost px-8 text-lg'}
          >
            {won
              ? (es ? '🏆 Levantarla' : '🏆 Lift it')
              : (es ? 'Aceptarlo' : 'Take it')}
          </motion.button>
        )}
      </div>
    </div>
  );
}
