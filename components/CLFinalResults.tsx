'use client';

import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { CLResult, CLStage } from '@/lib/championsLeague';
import { getTeam } from '@/data';
import { useGameStore } from '@/store/gameStore';
import { FORMATION_LAYOUTS } from '@/data/formations';
import { Formation } from '@/data/types';
import PlayerCard from './PlayerCard';
import { useT } from '@/lib/i18n';

interface Props {
  result: CLResult;
  onRequestAnalysis: () => void;
  analyzing: boolean;
  analysisDisabled?: boolean;
}

function Confetti() {
  const particles = useMemo(() => {
    const colors = ['#FFD700', '#3DA9FC', '#ffffff', '#A0D8FF', '#FFB700', '#51CF66'];
    return Array.from({ length: 36 }, (_, i) => ({
      id: i,
      color: colors[i % colors.length],
      left: `${(i * 11 + 3) % 100}%`,
      delay: (i * 0.12) % 2.5,
      duration: 2.2 + (i % 5) * 0.4,
      size: 5 + (i % 5) * 3,
      rotate: i % 2 === 0 ? 360 : -360,
      shape: i % 3,
    }));
  }, []);

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

export default function CLFinalResults({ result, onRequestAnalysis, analyzing, analysisDisabled }: Props) {
  const reset = useGameStore(s => s.reset);
  const t = useT();
  const stageLabel = t.clResults.stageLabel(result.playerStage);
  const stageBlurb = t.clResults.stageBlurb(result.playerStage);
  const isChamp = result.playerStage === 'champion';

  return (
    <div className="space-y-6 mt-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative overflow-hidden rounded-3xl border border-cl/40"
        style={{
          background: isChamp
            ? 'linear-gradient(135deg, rgba(61,169,252,0.4) 0%, rgba(160, 216, 255, 0.15) 50%, #0a0a0f 100%)'
            : 'linear-gradient(135deg, rgba(12,45,82,0.7) 0%, #050b18 70%)',
        }}
      >
        <div className="cl-stars" />
        {isChamp && <Confetti />}
        <div className="relative px-6 py-10 sm:px-10 sm:py-14 text-center">
          {isChamp && (
            <motion.div
              animate={{ y: [0, -18, 0], scale: [1, 1.12, 1] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              className="text-7xl sm:text-8xl mb-4 select-none"
            >
              🏆
            </motion.div>
          )}
          <div className="font-display text-xs tracking-[0.4em] text-cl mb-2">
            {t.clResults.yourFinish}
          </div>
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 180, damping: 14, delay: 0.15 }}
            className="font-display text-5xl sm:text-7xl cl-shimmer leading-none mb-2"
          >
            {stageLabel}
          </motion.div>
          <div className="text-sm sm:text-base text-white/80 mt-2">{stageBlurb}</div>
          {result.playerEliminator && (
            <div className="text-xs text-white/50 mt-2">
              {t.clResults.eliminatedBy(result.playerEliminator.name)}
            </div>
          )}
          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur px-4 py-2 text-xs">
            {t.clResults.champion}
            <strong className="text-white">{result.champion.name}</strong>
            <span className="text-white/40">·</span>
            {t.clResults.runnerUp} {result.runnerUp.name}
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass cl-glass p-6 text-center"
        >
          <div className="font-display text-xs tracking-[0.3em] text-cl mb-1">
            {t.clResults.yourMvp}
          </div>
          <div className="font-display text-4xl mb-2">{result.mvp.player.name}</div>
          <div className="text-sm text-white/60">
            {result.mvp.player.position} · OVR {result.mvp.player.overall}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 max-w-md mx-auto">
            <BigStat label={t.clResults.stats.goals} value={result.mvp.goals} />
            <BigStat label={t.clResults.stats.assists} value={result.mvp.assists} />
            <BigStat label={t.clResults.stats.rating} value={result.mvp.rating.toFixed(1)} />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass cl-glass p-6"
        >
          <div className="font-display text-xs tracking-[0.3em] text-cl mb-3">
            {t.clResults.topScorers}
          </div>
          <div className="space-y-2">
            {result.topScorers.slice(0, 8).map((s, i) => {
              const team = getTeam(s.teamId);
              return (
                <div key={`${s.teamId}-${s.playerName}-${i}`} className="flex items-center gap-3 text-sm">
                  <div className="w-6 text-center font-display text-white/40">{i + 1}</div>
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
        className="glass cl-glass p-6"
      >
        <div className="font-display text-xs tracking-[0.3em] text-cl mb-4">
          {t.clResults.yourSquad(result.playerTeam.formation)}
        </div>
        <CLSquadPitch result={result} />
      </motion.div>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <button
          onClick={onRequestAnalysis}
          disabled={analyzing || analysisDisabled}
          className="btn-primary"
          title={analysisDisabled ? t.apiKey.title : ''}
          style={{ background: 'linear-gradient(90deg, #3DA9FC, #0C2D52)', color: 'white' }}
        >
          {analyzing ? t.clResults.analyzing : t.clResults.getAnalysis}
        </button>
        <button onClick={reset} className="btn-ghost">
          {t.clResults.runItBack}
        </button>
      </div>
    </div>
  );
}

function CLSquadPitch({ result }: { result: CLResult }) {
  const { playerTeam, playerSquadStats } = result;
  const layout = FORMATION_LAYOUTS[playerTeam.formation as Formation];

  return (
    <div className="relative w-full max-w-[380px] mx-auto aspect-[2/3]">
      <div className="absolute inset-0 rounded-3xl overflow-hidden border border-cl/20 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)]">
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
              <PlayerCard player={player} primaryColor="#3DA9FC" secondaryColor="#0a0a0f" size="sm" />
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
