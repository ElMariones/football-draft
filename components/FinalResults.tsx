'use client';

import { motion } from 'framer-motion';
import { SeasonResult } from '@/lib/simulation';
import { getTeam } from '@/data';
import { useGameStore } from '@/store/gameStore';
import { FORMATION_LAYOUTS } from '@/data/formations';
import { Formation } from '@/data/types';
import PlayerCard from './PlayerCard';
import { useT } from '@/lib/i18n';

interface Props {
  season: SeasonResult;
  onRequestAnalysis: () => void;
  analyzing: boolean;
  analysisDisabled?: boolean;
}

export default function FinalResults({ season, onRequestAnalysis, analyzing, analysisDisabled }: Props) {
  const reset = useGameStore(s => s.reset);
  const t = useT();
  const row = season.table.find(t => t.teamId === season.playerTeam.id)!;

  return (
    <div className="space-y-6 mt-6">
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
            {t.results.finalPosition}
          </div>
          <div className="font-display text-8xl sm:text-9xl shimmer leading-none">
            #{season.finalPosition}
          </div>
          <div className="font-display text-xl tracking-widest text-white/90 mt-2">
            {t.results.positionLabel(season.finalPosition)}
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-3 text-sm">
            <StatPill label={t.results.pills.w} value={row.won} />
            <StatPill label={t.results.pills.d} value={row.drawn} />
            <StatPill label={t.results.pills.l} value={row.lost} />
            <StatPill label={t.results.pills.gf} value={row.gf} />
            <StatPill label={t.results.pills.ga} value={row.ga} />
            <StatPill label={t.results.pills.pts} value={row.points} highlight />
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass p-6 text-center"
        >
          <div className="font-display text-xs tracking-[0.3em] text-gold mb-1">
            {t.results.seasonMvp}
          </div>
          <div className="font-display text-4xl text-white mb-2">
            {season.mvp.player.name}
          </div>
          <div className="text-sm text-white/60">
            {season.mvp.player.position} · OVR {season.mvp.player.overall}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 max-w-md mx-auto">
            <BigStat label={t.results.stats.goals} value={season.mvp.goals} />
            <BigStat label={t.results.stats.assists} value={season.mvp.assists} />
            <BigStat label={t.results.stats.rating} value={season.mvp.rating.toFixed(1)} />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass p-6"
        >
          <div className="font-display text-xs tracking-[0.3em] text-white/50 mb-3">
            {t.results.topScorers}
          </div>
          <div className="space-y-2">
            {season.topScorers.slice(0, 8).map((s, i) => {
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
        className="glass p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="font-display text-xs tracking-[0.3em] text-white/50">
            {t.results.yourSquad(season.playerTeam.formation)}
          </div>
          {season.playerTeam.manager && season.playerTeam.manager !== 'You' && (
            <div className="text-xs text-white/60">
              {t.banner.mgr}{' '}
              <strong className="text-white">{season.playerTeam.manager}</strong>
              {season.playerTeam.managerRating != null && (
                <span className="font-display text-gold ml-1.5">{season.playerTeam.managerRating}</span>
              )}
            </div>
          )}
        </div>
        <PLSquadPitch season={season} />
      </motion.div>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <button
          onClick={onRequestAnalysis}
          disabled={analyzing || analysisDisabled}
          className="btn-primary"
          title={analysisDisabled ? t.apiKey.title : ''}
        >
          {analyzing ? t.results.analyzing : t.results.getAnalysis}
        </button>
        <button onClick={reset} className="btn-ghost">
          {t.results.spinAgain}
        </button>
      </div>
    </div>
  );
}

function PLSquadPitch({ season }: { season: SeasonResult }) {
  const { playerTeam, playerSquadStats } = season;
  const layout = FORMATION_LAYOUTS[playerTeam.formation as Formation];

  return (
    <div className="relative w-full max-w-[380px] mx-auto aspect-[2/3]">
      <div className="absolute inset-0 rounded-3xl overflow-hidden border border-gold/20 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)]">
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
              <PlayerCard player={player} primaryColor="#FFD700" secondaryColor="#0a0a0f" size="sm" />
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
