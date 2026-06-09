'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

interface Props {
  mode: 'pl' | 'cl' | 'll';
  teamName: string;
  formation: string;
  finalPosition: number | null;
  clStage: string | null;
  payload: any;
  xiSummary: { slot: string; name: string; position: string; overall: number; teamName: string; era: string }[];
  userName: string;
  userImage: string | null;
}

const CL_STAGE_LABEL: Record<string, string> = {
  champion: 'Champions of Europe',
  final: 'Runner-up',
  'semi-finals': 'Semi-finals',
  'quarter-finals': 'Quarter-finals',
  group: 'Group Stage',
};

export default function ShareView({
  mode,
  teamName,
  formation,
  finalPosition,
  clStage,
  payload,
  xiSummary,
  userName,
  userImage,
}: Props) {
  const isCL = mode === 'cl';
  const isLL = mode === 'll';
  const modeLabel = isCL ? 'Champions League' : isLL ? 'La Liga' : 'Premier League';

  const managerName: string | undefined = payload?.playerTeam?.manager;
  const managerRating: number | undefined = payload?.playerTeam?.managerRating;
  const showManager = !!managerName && managerName !== 'You';

  const resultLabel = isCL
    ? CL_STAGE_LABEL[clStage ?? ''] ?? clStage
    : `#${finalPosition}`;

  const accentColor = isCL ? '#3DA9FC' : isLL ? '#C8102E' : '#FFD700';

  return (
    <div className="space-y-6">
      {/* Hero card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border"
        style={{ borderColor: `${accentColor}44` }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${accentColor}33 0%, transparent 60%, #0a0a0f 100%)`,
          }}
        />
        <div className="relative px-6 py-8 sm:px-10 sm:py-12 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            {userImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={userImage} alt="" className="w-10 h-10 rounded-full border border-white/20" />
            )}
            <span className="font-display text-sm text-white/70">{userName}</span>
          </div>
          <div className="text-[10px] tracking-[0.4em] uppercase text-white/50 mb-1">
            {modeLabel} · {formation}
          </div>
          <div className="font-display text-4xl sm:text-5xl mb-2" style={{ color: accentColor }}>
            {teamName}
          </div>
          <div className="font-display text-7xl sm:text-8xl leading-none" style={{ color: accentColor }}>
            {resultLabel}
          </div>
          {isCL && clStage === 'champion' && (
            <div className="text-5xl mt-3">🏆</div>
          )}
          {showManager && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur px-4 py-1.5 text-xs text-white/70">
              Manager
              <strong className="text-white">{managerName}</strong>
              {managerRating != null && (
                <span className="font-display" style={{ color: accentColor }}>{managerRating}</span>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* XI list */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="glass p-5"
      >
        <div className="text-xs tracking-[0.3em] text-white/50 uppercase mb-3">
          The XI
        </div>
        <div className="space-y-1.5">
          {xiSummary.map((p, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-1.5 text-sm"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-[10px] font-bold text-white/40 w-8">{p.slot}</span>
                <span className="truncate">{p.name}</span>
                <span className="text-[10px] font-display px-1.5 py-0.5 rounded bg-white/10 text-white/60">
                  {p.overall}
                </span>
              </div>
              <span className="text-[10px] text-white/50 truncate ml-2">
                {p.teamName} · {p.era}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* CTA */}
      <div className="text-center pt-4">
        <Link
          href="/"
          className="inline-block px-8 py-4 rounded-full font-display text-xl tracking-widest text-black bg-gradient-to-r from-gold to-gold-dark shadow-[0_0_30px_rgba(255,215,0,0.4)] hover:shadow-[0_0_50px_rgba(255,215,0,0.7)] transition-shadow"
        >
          BUILD YOUR XI
        </Link>
      </div>
    </div>
  );
}
