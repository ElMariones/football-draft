'use client';

import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { WCResult } from '@/lib/worldCup';
import { getTeam } from '@/data';
import { useGameStore } from '@/store/gameStore';
import { FORMATION_LAYOUTS } from '@/data/formations';
import { Formation } from '@/data/types';
import PlayerCard from './PlayerCard';
import { useT } from '@/lib/i18n';

interface Props {
  result: WCResult;
  onRequestAnalysis: () => void;
  analyzing: boolean;
  analysisDisabled?: boolean;
}

// Confetti in the colours of the competing nations — a festival of flags.
function FlagConfetti({ heavy }: { heavy?: boolean }) {
  const particles = useMemo(() => {
    const colors = [
      '#F5C542', '#00DFA2', '#FFDF00', '#009C3B', '#75AADB', '#DD0000',
      '#0055A4', '#EF4135', '#FFFFFF', '#FF7F00', '#C60B1E', '#008751',
    ];
    const count = heavy ? 56 : 30;
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      color: colors[i % colors.length],
      left: `${(i * 9 + 4) % 100}%`,
      delay: (i * 0.1) % 2.4,
      duration: 2.4 + (i % 6) * 0.35,
      size: 5 + (i % 5) * 3,
      rotate: i % 2 === 0 ? 360 : -360,
      shape: i % 3,
    }));
  }, [heavy]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map(p => (
        <motion.div
          key={p.id}
          style={{ position: 'absolute', left: p.left, top: -20, width: p.size, height: p.shape === 0 ? p.size : p.size * 1.6, background: p.color, borderRadius: p.shape === 0 ? '50%' : p.shape === 1 ? '2px' : '1px', opacity: 0.9 }}
          animate={{ y: ['0px', '110vh'], rotate: [0, p.rotate], opacity: [1, 1, 0.2] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'linear' }}
        />
      ))}
    </div>
  );
}

// Soft radial firework bursts behind the champion card.
function Fireworks() {
  const bursts = useMemo(() => [
    { left: '12%', top: '18%', color: 'rgba(245,197,66,0.55)', delay: 0 },
    { left: '78%', top: '12%', color: 'rgba(0,223,162,0.5)', delay: 0.7 },
    { left: '64%', top: '55%', color: 'rgba(255,255,255,0.4)', delay: 1.3 },
    { left: '24%', top: '60%', color: 'rgba(245,197,66,0.45)', delay: 1.9 },
    { left: '88%', top: '42%', color: 'rgba(117,170,219,0.5)', delay: 0.4 },
  ], []);
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {bursts.map((b, i) => (
        <span
          key={i}
          className="wc-firework"
          style={{
            left: b.left,
            top: b.top,
            background: `radial-gradient(circle, ${b.color} 0%, transparent 65%)`,
            animationDelay: `${b.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

export default function WCFinalResults({ result, onRequestAnalysis, analyzing, analysisDisabled }: Props) {
  const reset = useGameStore(s => s.reset);
  const t = useT();
  const stageLabel = t.wcResults.stageLabel(result.playerStage);
  const stageBlurb = t.wcResults.stageBlurb(result.playerStage);
  const isChamp = result.playerStage === 'champion';
  const isPodium = isChamp || result.playerStage === 'final' || result.playerStage === 'third-place';

  return (
    <div className="space-y-6 mt-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative overflow-hidden rounded-3xl border border-wc/40"
        style={{
          background: isChamp
            ? 'linear-gradient(135deg, rgba(245,197,66,0.35) 0%, rgba(0,223,162,0.18) 45%, #04110c 100%)'
            : isPodium
            ? 'linear-gradient(135deg, rgba(0,223,162,0.25) 0%, rgba(1,71,55,0.4) 55%, #04110c 100%)'
            : 'linear-gradient(135deg, rgba(1,71,55,0.7) 0%, #04110c 70%)',
        }}
      >
        <div className="wc-stars" />
        {isChamp && <Fireworks />}
        {isPodium && <FlagConfetti heavy={isChamp} />}
        <div className="relative px-6 py-10 sm:px-10 sm:py-14 text-center">
          {isChamp && (
            <div className="text-7xl sm:text-8xl mb-4 select-none wc-trophy">🏆</div>
          )}
          {result.playerStage === 'third-place' && (
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              className="text-6xl sm:text-7xl mb-4 select-none"
            >
              🥉
            </motion.div>
          )}
          {result.playerStage === 'final' && (
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              className="text-6xl sm:text-7xl mb-4 select-none"
            >
              🥈
            </motion.div>
          )}
          <div className="font-display text-xs tracking-[0.4em] text-wc mb-2">
            {t.wcResults.yourFinish}
          </div>
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 180, damping: 14, delay: 0.15 }}
            className="font-display text-5xl sm:text-7xl wc-shimmer leading-none mb-2"
          >
            {stageLabel}
          </motion.div>
          <div className="text-sm sm:text-base text-white/80 mt-2">{stageBlurb}</div>
          {result.playerEliminator && !isChamp && (
            <div className="text-xs text-white/50 mt-2">
              {t.wcResults.eliminatedBy(result.playerEliminator.name)}
            </div>
          )}
          <div className="mt-6 inline-flex flex-wrap justify-center items-center gap-2 rounded-full bg-white/10 backdrop-blur px-4 py-2 text-xs">
            {t.wcResults.champion}
            <strong className="text-wc-gold">{result.champion.name}</strong>
            <span className="text-white/40">·</span>
            {t.wcResults.runnerUp} {result.runnerUp.name}
            <span className="text-white/40">·</span>
            {t.wcResults.thirdPlace} {result.thirdPlace.name}
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass wc-glass p-6 text-center"
        >
          <div className="font-display text-xs tracking-[0.3em] text-wc mb-1">
            ✨ {t.wcResults.yourMvp}
          </div>
          <div className="font-display text-4xl mb-2">{result.mvp.player.name}</div>
          <div className="text-sm text-white/60">
            {result.mvp.player.position} · OVR {result.mvp.player.overall}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 max-w-md mx-auto">
            <BigStat label={t.wcResults.stats.goals} value={result.mvp.goals} />
            <BigStat label={t.wcResults.stats.assists} value={result.mvp.assists} />
            <BigStat label={t.wcResults.stats.rating} value={result.mvp.rating.toFixed(1)} />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass wc-glass p-6"
        >
          <div className="font-display text-xs tracking-[0.3em] text-wc-gold mb-3">
            👟 {t.wcResults.topScorers}
          </div>
          <div className="space-y-2">
            {result.topScorers.slice(0, 8).map((s, i) => {
              const team = s.teamId === result.playerTeam.id ? result.playerTeam : getTeam(s.teamId);
              return (
                <div key={`${s.teamId}-${s.playerName}-${i}`} className="flex items-center gap-3 text-sm">
                  <div className={`w-6 text-center font-display ${i === 0 ? 'text-wc-gold' : 'text-white/40'}`}>
                    {i === 0 ? '👑' : i + 1}
                  </div>
                  <span className="w-1.5 h-6 rounded-full" style={{ background: team?.colors.primary }} />
                  <div className="flex-1 min-w-0 truncate">{s.playerName}</div>
                  <div className="text-xs text-white/50 truncate hidden sm:block">{s.teamName}</div>
                  <div className="font-display text-lg tabular-nums w-10 text-right">{s.goals}</div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass wc-glass p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="font-display text-xs tracking-[0.3em] text-wc">
            {t.wcResults.yourSquad(result.playerTeam.formation)}
          </div>
          {result.playerTeam.manager && result.playerTeam.manager !== 'You' && (
            <div className="text-xs text-white/60">
              {t.banner.mgr}{' '}
              <strong className="text-white">{result.playerTeam.manager}</strong>
              {result.playerTeam.managerRating != null && (
                <span className="font-display text-wc ml-1.5">{result.playerTeam.managerRating}</span>
              )}
            </div>
          )}
        </div>
        <WCSquadPitch result={result} />
      </motion.div>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <button
          onClick={onRequestAnalysis}
          disabled={analyzing || analysisDisabled}
          className="btn-primary"
          title={analysisDisabled ? t.apiKey.title : ''}
          style={{ background: 'linear-gradient(90deg, #00DFA2, #014737)', color: 'white' }}
        >
          {analyzing ? t.wcResults.analyzing : t.wcResults.getAnalysis}
        </button>
        <button onClick={reset} className="btn-ghost">
          {t.wcResults.runItBack}
        </button>
      </div>
    </div>
  );
}

function WCSquadPitch({ result }: { result: WCResult }) {
  const { playerTeam, playerSquadStats } = result;
  const layout = FORMATION_LAYOUTS[playerTeam.formation as Formation];

  return (
    <div className="relative w-full max-w-[380px] mx-auto aspect-[2/3]">
      <div className="absolute inset-0 rounded-3xl overflow-hidden border border-wc/25 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)]">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #1a8a3f 0%, #0d5e2a 50%, #073d1a 100%)' }} />
        {[...Array(8)].map((_, i) => (
          <div key={i} className="absolute left-0 right-0"
            style={{ top: `${i * 12.5}%`, height: '12.5%', background: i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent' }} />
        ))}
        <svg viewBox="0 0 100 150" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
          <g stroke="rgba(255,255,255,0.4)" fill="none" strokeWidth="0.3">
            <rect x="3" y="3" width="94" height="144" />
            <line x1="3" y1="75" x2="97" y2="75" />
            <circle cx="50" cy="75" r="9" />
            <rect x="22" y="3" width="56" height="18" />
            <rect x="36" y="3" width="28" height="7" />
            <path d="M 38 21 A 13 13 0 0 0 62 21" />
            <rect x="22" y="129" width="56" height="18" />
            <rect x="36" y="140" width="28" height="7" />
            <path d="M 38 129 A 13 13 0 0 1 62 129" />
          </g>
        </svg>
      </div>
      {playerTeam.players.map((player, i) => {
        const slot = layout?.[i];
        const stat = playerSquadStats?.[i];
        if (!slot) return null;
        return (
          <div
            key={player.name}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ top: `${100 - slot.y}%`, left: `${slot.x}%` }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.5, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.08 + i * 0.06, type: 'spring', stiffness: 200, damping: 18 }}
            >
              <PlayerCard player={player} primaryColor="#00DFA2" secondaryColor="#04110c" size="sm" />
              {stat && (stat.goals > 0 || stat.assists > 0) && (
                <div className="text-[8px] text-center mt-0.5 text-yellow-300 font-bold leading-none">
                  {stat.goals > 0 ? `⚽${stat.goals}` : ''}
                  {stat.goals > 0 && stat.assists > 0 ? ' ' : ''}
                  {stat.assists > 0 ? `🅰${stat.assists}` : ''}
                </div>
              )}
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}

function BigStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-white/5 px-3 py-3 text-center">
      <div className="font-display text-2xl text-white">{value}</div>
      <div className="text-[10px] tracking-widest text-white/50 uppercase">{label}</div>
    </div>
  );
}
