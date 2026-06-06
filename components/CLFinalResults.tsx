'use client';

import { motion } from 'framer-motion';
import { CLResult, CLStage } from '@/lib/championsLeague';
import { getTeam } from '@/data';
import { useGameStore } from '@/store/gameStore';

interface Props {
  result: CLResult;
  onRequestAnalysis: () => void;
  analyzing: boolean;
  analysisDisabled?: boolean;
}

const STAGE_LABEL: Record<CLStage, string> = {
  group:           'Group Stage',
  'quarter-finals': 'Quarter-finals',
  'semi-finals':    'Semi-finals',
  final:            'Final',
  champion:         'CHAMPIONS OF EUROPE',
};

const STAGE_BLURB: Record<CLStage, string> = {
  group:           'Crashed out before the knockouts.',
  'quarter-finals': 'A respectable European run, but not enough.',
  'semi-finals':    'One step away from the final.',
  final:            'Runners-up. So close to the trophy.',
  champion:         'Kings of Europe!',
};

export default function CLFinalResults({ result, onRequestAnalysis, analyzing, analysisDisabled }: Props) {
  const reset = useGameStore(s => s.reset);
  const stageLabel = STAGE_LABEL[result.playerStage];
  const stageBlurb = STAGE_BLURB[result.playerStage];
  const isChamp = result.playerStage === 'champion';

  return (
    <div className="space-y-6 mt-6">
      {/* Headline */}
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
        <div className="relative px-6 py-10 sm:px-10 sm:py-14 text-center">
          <div className="font-display text-xs tracking-[0.4em] text-cl mb-2">
            YOUR FINISH
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
              Eliminated by <strong>{result.playerEliminator.name}</strong>
            </div>
          )}
          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur px-4 py-2 text-xs">
            🏆 Champion:
            <strong className="text-white">{result.champion.name}</strong>
            <span className="text-white/40">·</span>
            🥈 {result.runnerUp.name}
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* MVP */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass cl-glass p-6 text-center"
        >
          <div className="font-display text-xs tracking-[0.3em] text-cl mb-1">
            YOUR MVP
          </div>
          <div className="font-display text-4xl mb-2">{result.mvp.player.name}</div>
          <div className="text-sm text-white/60">
            {result.mvp.player.position} · OVR {result.mvp.player.overall}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 max-w-md mx-auto">
            <BigStat label="Goals" value={result.mvp.goals} />
            <BigStat label="Assists" value={result.mvp.assists} />
            <BigStat label="Rating" value={result.mvp.rating.toFixed(1)} />
          </div>
        </motion.div>

        {/* Top scorers across the tournament */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass cl-glass p-6"
        >
          <div className="font-display text-xs tracking-[0.3em] text-cl mb-3">
            TOURNAMENT TOP SCORERS
          </div>
          <div className="space-y-2">
            {result.topScorers.slice(0, 8).map((s, i) => {
              const t = getTeam(s.teamId);
              return (
                <div key={`${s.teamId}-${s.playerName}-${i}`} className="flex items-center gap-3 text-sm">
                  <div className="w-6 text-center font-display text-white/40">{i + 1}</div>
                  <span className="w-1.5 h-6 rounded-full" style={{ background: t?.colors.primary }} />
                  <div className="flex-1 min-w-0 truncate">{s.playerName}</div>
                  <div className="text-xs text-white/50 truncate hidden sm:block">{s.teamName}</div>
                  <div className="font-display text-lg tabular-nums w-10 text-right">{s.goals}</div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Your squad stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass cl-glass p-6"
      >
        <div className="font-display text-xs tracking-[0.3em] text-cl mb-3">
          YOUR SQUAD ON THE NIGHT
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {result.playerSquadStats.map(ps => (
            <div
              key={ps.player.name}
              className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm"
            >
              <div className="min-w-0 flex-1 truncate">
                <span className="text-[10px] font-bold text-white/40 mr-2 inline-block w-8">
                  {ps.player.position}
                </span>
                {ps.player.name}
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="tabular-nums">⚽ {ps.goals}</span>
                <span className="tabular-nums">🅰 {ps.assists}</span>
                <span className="font-display text-cl">{ps.rating.toFixed(1)}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <button
          onClick={onRequestAnalysis}
          disabled={analyzing || analysisDisabled}
          className="btn-primary"
          title={analysisDisabled ? 'Add your OpenAI key in Settings' : ''}
          style={{ background: 'linear-gradient(90deg, #3DA9FC, #0C2D52)', color: 'white' }}
        >
          {analyzing ? 'Generating AI Briefing…' : 'Get AI Campaign Analysis'}
        </button>
        <button onClick={reset} className="btn-ghost">
          Run It Back
        </button>
      </div>
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
