'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { CLResult, CLKnockoutTie, CLGroup } from '@/lib/championsLeague';
import { MatchResult } from '@/lib/simulation';
import { getTeam } from '@/data';

interface Props {
  result: CLResult;
  onDone: () => void;
}

const MATCH_INTERVAL_MS = 900;

type Stage =
  | { kind: 'group'; matchdayIdx: number }   // 0..5
  | { kind: 'ko'; tieIdx: number }           // 0..6
  | { kind: 'done' };

const ROUND_LABEL: Record<string, string> = {
  'quarter-finals': 'Quarter-final',
  'semi-finals': 'Semi-final',
  'final': 'Final',
};

export default function CLPlayback({ result, onDone }: Props) {
  // Track playback as: stepIdx in the overall match queue (group matches in
  // matchday order, then knockout ties in order).
  const queue = useMemo(() => buildQueue(result), [result]);
  const [stepIdx, setStepIdx] = useState(0);
  const [autoplay, setAutoplay] = useState(true);

  useEffect(() => {
    if (!autoplay) return;
    if (stepIdx >= queue.length) return;
    const t = setTimeout(() => setStepIdx(i => i + 1), MATCH_INTERVAL_MS);
    return () => clearTimeout(t);
  }, [stepIdx, autoplay, queue.length]);

  const visibleSteps = queue.slice(0, stepIdx + 1);
  const lastVisible = visibleSteps[visibleSteps.length - 1];
  const allDone = stepIdx >= queue.length;
  const playerTeamId = result.playerTeam.id;

  // Build progressive group tables for the bar on the right side.
  const liveGroups = useMemo(
    () => buildLiveGroups(result, visibleSteps),
    [result, stepIdx],
  );

  const stageHeader = describeStage(lastVisible);

  return (
    <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-6">
      <div className="glass p-5 sm:p-6 cl-glass">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[10px] tracking-[0.4em] text-cl uppercase font-display">
              {stageHeader}
            </div>
            <h3 className="font-display text-2xl">Champions League</h3>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setAutoplay(a => !a)} className="btn-ghost text-sm">
              {autoplay ? 'Pause' : 'Resume'}
            </button>
            <button onClick={() => setStepIdx(queue.length)} className="btn-ghost text-sm">
              Skip to Final
            </button>
          </div>
        </div>

        <div className="space-y-2 max-h-[520px] overflow-y-auto pr-2 no-scrollbar">
          <AnimatePresence initial={false}>
            {visibleSteps.slice().reverse().map((s, i) => (
              <StepRow key={s.key} step={s} playerTeamId={playerTeamId} />
            ))}
          </AnimatePresence>
        </div>

        {allDone && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 flex justify-end"
          >
            <button onClick={onDone} className="btn-primary">
              See Final Results →
            </button>
          </motion.div>
        )}
      </div>

      <div className="space-y-4">
        <div className="glass p-4 cl-glass">
          <div className="text-xs tracking-[0.3em] text-cl uppercase font-display mb-2">
            Group Stage
          </div>
          <div className="grid grid-cols-2 gap-3">
            {liveGroups.map(g => (
              <GroupBox key={g.letter} group={g} playerTeamId={playerTeamId} />
            ))}
          </div>
        </div>
        <BracketBox result={result} stepIdx={stepIdx} queue={queue} playerTeamId={playerTeamId} />
      </div>
    </div>
  );
}

// ---------- queue builder ----------

type QueueStep =
  | { key: string; kind: 'group'; matchday: number; match: MatchResult; groupLetter: string }
  | { key: string; kind: 'ko'; tie: CLKnockoutTie; tieIdx: number };

function buildQueue(result: CLResult): QueueStep[] {
  const out: QueueStep[] = [];
  // Group matches are 12 per group × 4 = 48. They were generated unordered;
  // bucket by matchday so playback advances 8 games per matchday.
  const flat: { groupLetter: string; m: MatchResult }[] = [];
  result.groups.forEach(g => {
    g.matches.forEach(m => flat.push({ groupLetter: g.letter, m }));
  });
  flat.sort((a, b) => a.m.matchday - b.m.matchday);
  flat.forEach(({ groupLetter, m }, i) => {
    out.push({
      key: `g-${groupLetter}-${m.matchday}-${i}`,
      kind: 'group',
      matchday: m.matchday,
      match: m,
      groupLetter,
    });
  });
  result.knockout.forEach((tie, i) => {
    out.push({ key: `ko-${i}`, kind: 'ko', tie, tieIdx: i });
  });
  return out;
}

function describeStage(step: QueueStep | undefined): string {
  if (!step) return 'Group Stage · Matchday 1';
  if (step.kind === 'group') return `Group Stage · Matchday ${step.matchday}`;
  return ROUND_LABEL[step.tie.round] ?? step.tie.round;
}

// ---------- match row ----------

function StepRow({ step, playerTeamId }: { step: QueueStep; playerTeamId: string }) {
  if (step.kind === 'group') {
    return (
      <MatchCard
        match={step.match}
        title={`Group ${step.groupLetter} · MD${step.matchday}`}
        playerTeamId={playerTeamId}
      />
    );
  }
  const tie = step.tie;
  return (
    <MatchCard
      match={tie.match}
      title={ROUND_LABEL[tie.round] ?? tie.round}
      playerTeamId={playerTeamId}
      shootout={tie.shootout}
      isKO
    />
  );
}

function MatchCard({
  match,
  title,
  playerTeamId,
  shootout,
  isKO,
}: {
  match: MatchResult;
  title: string;
  playerTeamId: string;
  shootout?: { home: number; away: number };
  isKO?: boolean;
}) {
  const home = getTeam(match.home.teamId);
  const away = getTeam(match.away.teamId);
  const isPlayerMatch =
    match.home.teamId === playerTeamId || match.away.teamId === playerTeamId;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`rounded-xl p-3 border ${
        isPlayerMatch
          ? 'bg-cl/15 border-cl/60'
          : isKO
          ? 'bg-white/5 border-cl/30'
          : 'bg-white/5 border-white/10'
      }`}
    >
      <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-widest text-white/40 mb-1">
        <span>{title}</span>
        {shootout && (
          <span className="text-cl">Pens {shootout.home}-{shootout.away}</span>
        )}
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
          <span className="truncate text-sm text-right">{home?.name}</span>
          <ColorTag color={home?.colors.primary ?? '#444'} />
        </div>
        <div className="font-display text-xl tabular-nums px-3 min-w-[68px] text-center">
          {match.home.goals} – {match.away.goals}
        </div>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <ColorTag color={away?.colors.primary ?? '#444'} />
          <span className="truncate text-sm">{away?.name}</span>
        </div>
      </div>
      {match.scorers.length > 0 && (
        <div className="mt-2 text-[11px] text-white/60 flex flex-wrap gap-x-3 gap-y-0.5 pl-1">
          {match.scorers.map((s, i) => (
            <span key={i}>
              ⚽ {s.playerName} <span className="opacity-50">{s.minute}&apos;</span>
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function ColorTag({ color }: { color: string }) {
  return <span className="w-1.5 h-5 rounded-full inline-block" style={{ background: color }} />;
}

// ---------- live groups ----------

interface LiveGroup {
  letter: string;
  rows: Array<{
    teamId: string;
    name: string;
    shortName: string;
    pts: number;
    gd: number;
    pos: number;
  }>;
}

function buildLiveGroups(result: CLResult, visible: QueueStep[]): LiveGroup[] {
  const groupRows: Record<string, Record<string, {
    teamId: string;
    name: string;
    shortName: string;
    pts: number;
    gd: number;
    gf: number;
  }>> = {};
  result.groups.forEach(g => {
    groupRows[g.letter] = {};
    g.teamIds.forEach(id => {
      const r = g.table.find(x => x.teamId === id)!;
      groupRows[g.letter][id] = {
        teamId: id,
        name: r.name,
        shortName: r.shortName,
        pts: 0,
        gd: 0,
        gf: 0,
      };
    });
  });
  for (const step of visible) {
    if (step.kind !== 'group') continue;
    const g = groupRows[step.groupLetter];
    const h = g[step.match.home.teamId];
    const a = g[step.match.away.teamId];
    if (!h || !a) continue;
    h.gf += step.match.home.goals; a.gf += step.match.away.goals;
    h.gd += step.match.home.goals - step.match.away.goals;
    a.gd += step.match.away.goals - step.match.home.goals;
    if (step.match.home.goals > step.match.away.goals) h.pts += 3;
    else if (step.match.home.goals < step.match.away.goals) a.pts += 3;
    else { h.pts++; a.pts++; }
  }
  return result.groups.map(g => {
    const sorted = Object.values(groupRows[g.letter])
      .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
    return {
      letter: g.letter,
      rows: sorted.map((r, i) => ({ ...r, pos: i + 1 })),
    };
  });
}

function GroupBox({ group, playerTeamId }: { group: LiveGroup; playerTeamId: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 p-2">
      <div className="text-[10px] tracking-widest text-cl uppercase font-display mb-1">
        Group {group.letter}
      </div>
      {group.rows.map(r => {
        const isYou = r.teamId === playerTeamId;
        const advances = r.pos <= 2;
        return (
          <motion.div
            key={r.teamId}
            layout
            className={`flex items-center justify-between text-[11px] py-0.5 rounded px-1 ${
              isYou ? 'bg-cl/25' : ''
            }`}
          >
            <span className={`tabular-nums w-3 ${advances ? 'text-cl' : 'text-white/30'}`}>
              {r.pos}
            </span>
            <span className="flex-1 mx-1 truncate">{r.shortName}</span>
            <span className="tabular-nums text-white/60 w-6 text-right">
              {r.gd > 0 ? `+${r.gd}` : r.gd}
            </span>
            <span className="tabular-nums font-bold w-6 text-right">{r.pts}</span>
          </motion.div>
        );
      })}
    </div>
  );
}

// ---------- bracket ----------

function BracketBox({
  result,
  stepIdx,
  queue,
  playerTeamId,
}: {
  result: CLResult;
  stepIdx: number;
  queue: QueueStep[];
  playerTeamId: string;
}) {
  // Determine which knockout ties have been "revealed" so far.
  const revealedTieIdxs = new Set<number>();
  queue.slice(0, stepIdx + 1).forEach(s => {
    if (s.kind === 'ko') revealedTieIdxs.add(s.tieIdx);
  });

  const qfs = result.knockout.filter(t => t.round === 'quarter-finals');
  const sfs = result.knockout.filter(t => t.round === 'semi-finals');
  const fin = result.knockout.find(t => t.round === 'final');

  // Map tie → index in result.knockout for revealed lookup.
  function rev(t: CLKnockoutTie): boolean {
    const idx = result.knockout.indexOf(t);
    return revealedTieIdxs.has(idx);
  }

  return (
    <div className="glass p-4 cl-glass">
      <div className="text-xs tracking-[0.3em] text-cl uppercase font-display mb-3">
        Knockout Bracket
      </div>
      <div className="grid grid-cols-3 gap-2 text-[11px]">
        <Column title="QF">
          {qfs.map((t, i) => (
            <TieRow key={i} tie={t} revealed={rev(t)} playerTeamId={playerTeamId} />
          ))}
        </Column>
        <Column title="SF">
          {sfs.map((t, i) => (
            <TieRow key={i} tie={t} revealed={rev(t)} playerTeamId={playerTeamId} />
          ))}
        </Column>
        <Column title="FINAL">
          {fin && <TieRow tie={fin} revealed={rev(fin)} playerTeamId={playerTeamId} />}
        </Column>
      </div>
    </div>
  );
}

function Column({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[9px] tracking-[0.3em] text-white/40 mb-1 text-center">{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function TieRow({
  tie,
  revealed,
  playerTeamId,
}: {
  tie: CLKnockoutTie;
  revealed: boolean;
  playerTeamId: string;
}) {
  const playerInside = tie.home.id === playerTeamId || tie.away.id === playerTeamId;
  return (
    <div
      className={`rounded-md border p-1.5 ${
        playerInside ? 'border-cl/60 bg-cl/10' : 'border-white/10 bg-black/30'
      }`}
    >
      <Line side={tie.home} won={revealed && tie.winner.id === tie.home.id} revealed={revealed} score={revealed ? tie.match.home.goals : undefined} />
      <Line side={tie.away} won={revealed && tie.winner.id === tie.away.id} revealed={revealed} score={revealed ? tie.match.away.goals : undefined} />
      {revealed && tie.shootout && (
        <div className="text-[9px] text-cl text-center mt-0.5">
          pens {tie.shootout.home}-{tie.shootout.away}
        </div>
      )}
    </div>
  );
}

function Line({
  side,
  won,
  revealed,
  score,
}: {
  side: { id: string; shortName: string; name: string; colors: { primary: string } };
  won: boolean;
  revealed: boolean;
  score?: number;
}) {
  return (
    <div className={`flex items-center gap-1.5 py-0.5 ${won ? 'text-cl font-bold' : revealed ? 'text-white/50' : 'text-white/80'}`}>
      <span className="w-1.5 h-3 rounded-full inline-block" style={{ background: side.colors.primary }} />
      <span className="flex-1 truncate text-[10px]">{side.shortName}</span>
      {revealed && <span className="font-display tabular-nums w-3 text-right">{score}</span>}
    </div>
  );
}
