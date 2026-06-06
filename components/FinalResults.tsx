'use client';

import { motion } from 'framer-motion';
import { SeasonResult } from '@/lib/simulation';
import { getTeam } from '@/data';
import { useGameStore } from '@/store/gameStore';

interface Props {
  season: SeasonResult;
  onRequestAnalysis: () => void;
  analyzing: boolean;
  analysisDisabled?: boolean;
}

function positionLabel(p: number): string {
  if (p === 1) return 'CHAMPIONS';
  if (p === 2) return 'RUNNERS-UP';
  if (p <= 4) return 'CHAMPIONS LEAGUE';
  if (p <= 7) return 'EUROPA / CONFERENCE';
  if (p <= 17) return 'MID-TABLE';
  return 'RELEGATED';
}

export default function FinalResults({ season, onRequestAnalysis, analyzing, analysisDisabled }: Props) {
  const reset = useGameStore(s => s.reset);
  const row = season.table.find(t => t.teamId === season.playerTeam.id)!;

  return (
    <div className="space-y-6 mt-6">
      {/* Headline result */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative overflow-hidden rounded-3xl border border-gold/30"
        style={{
          background: `linear-gradient(135deg, ${season.playerTeam.colors.primary}cc 0%, #0a0a0f 70%)`,
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,215,0,0.25),transparent_60%)]" />
        <div className="relative px-6 py-8 sm:px-10 sm:py-12 text-center">
          <div className="font-display text-xs tracking-[0.4em] text-gold mb-2">
            FINAL POSITION
          </div>
          <div className="font-display text-8xl sm:text-9xl shimmer leading-none">
            #{season.finalPosition}
          </div>
          <div className="font-display text-xl tracking-widest text-white/90 mt-2">
            {positionLabel(season.finalPosition)}
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-3 text-sm">
            <StatPill label="W" value={row.won} />
            <StatPill label="D" value={row.drawn} />
            <StatPill label="L" value={row.lost} />
            <StatPill label="GF" value={row.gf} />
            <StatPill label="GA" value={row.ga} />
            <StatPill label="Pts" value={row.points} highlight />
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* MVP */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass p-6 text-center"
        >
          <div className="font-display text-xs tracking-[0.3em] text-gold mb-1">
            SEASON MVP
          </div>
          <div className="font-display text-4xl text-white mb-2">
            {season.mvp.player.name}
          </div>
          <div className="text-sm text-white/60">
            {season.mvp.player.position} · OVR {season.mvp.player.overall}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 max-w-md mx-auto">
            <BigStat label="Goals" value={season.mvp.goals} />
            <BigStat label="Assists" value={season.mvp.assists} />
            <BigStat label="Rating" value={season.mvp.rating.toFixed(1)} />
          </div>
        </motion.div>

        {/* Top scorers (league) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass p-6"
        >
          <div className="font-display text-xs tracking-[0.3em] text-white/50 mb-3">
            LEAGUE TOP SCORERS
          </div>
          <div className="space-y-2">
            {season.topScorers.slice(0, 8).map((s, i) => {
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
        className="glass p-6"
      >
        <div className="font-display text-xs tracking-[0.3em] text-white/50 mb-3">
          YOUR SQUAD
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {season.playerSquadStats.map(ps => (
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
                <span title="Goals" className="tabular-nums">⚽ {ps.goals}</span>
                <span title="Assists" className="tabular-nums">🅰 {ps.assists}</span>
                <span title="Season rating" className="font-display text-gold">{ps.rating.toFixed(1)}</span>
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
        >
          {analyzing ? 'Generating AI Analysis…' : 'Get AI Season Analysis'}
        </button>
        <button onClick={reset} className="btn-ghost">
          Spin Again
        </button>
      </div>
    </div>
  );
}

function StatPill({ label, value, highlight }: { label: string; value: number | string; highlight?: boolean }) {
  return (
    <div className={`rounded-full px-3 py-1 border ${highlight ? 'bg-gold text-black border-gold font-bold' : 'border-white/20 text-white/80'}`}>
      <span className="text-xs tracking-wider">{label}</span>
      <span className="ml-1 font-display tabular-nums">{value}</span>
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
