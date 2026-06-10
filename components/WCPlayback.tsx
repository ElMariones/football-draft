'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState, useEffect } from 'react';
import { WCResult, WCKnockoutTie } from '@/lib/worldCup';
import { MatchResult, TeamSnapshot } from '@/lib/simulation';
import { getTeam } from '@/data';
import { useT } from '@/lib/i18n';

interface Props {
  result: WCResult;
  onDone: () => void;
}

const VISIBLE_INTERVAL_MS = 950;
const HIDDEN_INTERVAL_MS = 280;

export default function WCPlayback({ result, onDone }: Props) {
  const t = useT();
  const queue = useMemo(() => buildQueue(result), [result]);
  const [stepIdx, setStepIdx] = useState(0);
  const [autoplay, setAutoplay] = useState(true);

  useEffect(() => {
    if (!autoplay || stepIdx >= queue.length) return;
    const isHidden = queue[stepIdx]?.hidden ?? false;
    const delay = isHidden ? HIDDEN_INTERVAL_MS : VISIBLE_INTERVAL_MS;
    const timer = setTimeout(() => setStepIdx(i => i + 1), delay);
    return () => clearTimeout(timer);
  }, [stepIdx, autoplay, queue]);

  const visibleSteps = queue.slice(0, stepIdx + 1);
  const feedSteps = visibleSteps.filter(s => !s.hidden);
  const lastFeedStep = feedSteps[feedSteps.length - 1];
  const allDone = stepIdx >= queue.length;
  const playerTeamId = result.playerTeam.id;

  const liveGroups = useMemo(
    () => buildLiveGroups(result, visibleSteps),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [result, stepIdx],
  );

  return (
    <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-6">
      <div className="glass p-5 sm:p-6 wc-glass relative overflow-hidden">
        <div className="wc-stars" />
        <div className="relative">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <div className="text-[10px] tracking-[0.4em] text-wc uppercase font-display">
                {describeStage(lastFeedStep, t)}
              </div>
              <h3 className="font-display text-2xl">🏆 {t.wc.title}</h3>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setAutoplay(a => !a)} className="btn-ghost text-sm">
                {autoplay ? t.wc.pause : t.wc.resume}
              </button>
              <button onClick={() => setStepIdx(queue.length)} className="btn-ghost text-sm">
                {t.wc.skipToFinal}
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-2 no-scrollbar">
            <AnimatePresence initial={false}>
              {feedSteps.slice().reverse().map(s => (
                <StepRow key={s.key} step={s} playerTeamId={playerTeamId} playerTeam={result.playerTeam} />
              ))}
            </AnimatePresence>
          </div>

          {allDone && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-5 flex justify-end"
            >
              <button onClick={onDone} className="btn-primary wc-glow" style={{ background: 'linear-gradient(90deg, #00DFA2, #F5C542)', color: '#04110c' }}>
                {t.wc.seeFinalResults}
              </button>
            </motion.div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="glass p-4 wc-glass">
          <div className="text-xs tracking-[0.3em] text-wc uppercase font-display mb-2">
            {t.wc.groupStage}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {liveGroups.map(g => (
              <GroupBox key={g.letter} group={g} playerTeamId={playerTeamId} t={t} />
            ))}
          </div>
        </div>
        <BracketBox result={result} stepIdx={stepIdx} queue={queue} playerTeamId={playerTeamId} t={t} />
      </div>
    </div>
  );
}

// ---------- queue ----------

type GroupStep = {
  key: string; kind: 'group'; matchday: number; match: MatchResult;
  groupLetter: string; hidden: boolean;
};
type KOStep = {
  key: string; kind: 'ko'; tie: WCKnockoutTie; tieIdx: number; hidden: boolean;
};
type QueueStep = GroupStep | KOStep;

function buildQueue(result: WCResult): QueueStep[] {
  const out: QueueStep[] = [];
  const playerTeamId = result.playerTeam.id;

  const playerGroup = result.groups.find(g => g.teamIds.includes(playerTeamId))!;
  playerGroup.matches
    .slice().sort((a, b) => a.matchday - b.matchday)
    .forEach((m, i) => {
      const playerInMatch = m.home.teamId === playerTeamId || m.away.teamId === playerTeamId;
      out.push({ key: `g-${playerGroup.letter}-${m.matchday}-${i}`, kind: 'group', matchday: m.matchday, match: m, groupLetter: playerGroup.letter, hidden: !playerInMatch });
    });

  result.knockout.forEach((tie, i) => {
    const playerInvolved = tie.home.id === playerTeamId || tie.away.id === playerTeamId;
    // Always show the final on the feed — it's the World Cup final.
    const hidden = !playerInvolved && tie.round !== 'final';
    out.push({ key: `ko-${i}`, kind: 'ko', tie, tieIdx: i, hidden });
  });

  return out;
}

type T = ReturnType<typeof useT>;

function describeStage(step: QueueStep | undefined, t: T): string {
  if (!step) return t.wc.groupStage;
  if (step.kind === 'group') return t.wc.groupMatchday(step.matchday);
  return t.wc.roundLabel(step.tie.round);
}

// ---------- rows ----------

function StepRow({ step, playerTeamId, playerTeam }: {
  step: QueueStep; playerTeamId: string; playerTeam: TeamSnapshot;
}) {
  const t = useT();
  if (step.kind === 'group') {
    return (
      <MatchCard
        match={step.match}
        title={t.wc.group(step.groupLetter) + ` · MD${step.matchday}`}
        playerTeamId={playerTeamId}
        playerTeam={playerTeam}
      />
    );
  }

  const tie = step.tie;
  return (
    <MatchCard
      match={tie.match}
      title={t.wc.roundLabel(tie.round)}
      playerTeamId={playerTeamId}
      playerTeam={playerTeam}
      shootout={tie.shootout}
      isKO
      isFinal={tie.round === 'final'}
    />
  );
}

function MatchCard({
  match, title, playerTeamId, playerTeam, shootout, isKO, isFinal,
}: {
  match: MatchResult; title: string; playerTeamId: string; playerTeam: TeamSnapshot;
  shootout?: { home: number; away: number }; isKO?: boolean; isFinal?: boolean;
}) {
  const t = useT();
  const resolve = (teamId: string) =>
    teamId === playerTeam.id ? playerTeam : getTeam(teamId);

  const home = resolve(match.home.teamId);
  const away = resolve(match.away.teamId);
  const isPlayerMatch =
    match.home.teamId === playerTeamId || match.away.teamId === playerTeamId;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`rounded-xl p-3 border ${
        isFinal
          ? 'bg-gradient-to-r from-wc/15 via-wc-gold/10 to-wc/15 border-wc-gold/60'
          : isPlayerMatch
          ? 'bg-wc/15 border-wc/60'
          : isKO
          ? 'bg-white/5 border-wc/30'
          : 'bg-white/5 border-white/10'
      }`}
    >
      <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-widest text-white/40 mb-1">
        <span className={isFinal ? 'text-wc-gold' : undefined}>{isFinal ? `🏆 ${title}` : title}</span>
        {shootout && <span className="text-wc">{t.wc.pens(shootout.home, shootout.away)}</span>}
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
          <span className="sm:hidden truncate text-xs text-right">{home?.shortName ?? home?.name}</span>
          <span className="hidden sm:block truncate text-sm text-right">{home?.name}</span>
          <ColorTag color={home?.colors.primary ?? '#444'} />
        </div>
        <div className="font-display text-xl tabular-nums px-3 min-w-[68px] text-center">
          {match.home.goals} – {match.away.goals}
        </div>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <ColorTag color={away?.colors.primary ?? '#444'} />
          <span className="sm:hidden truncate text-xs">{away?.shortName ?? away?.name}</span>
          <span className="hidden sm:block truncate text-sm">{away?.name}</span>
        </div>
      </div>
      {match.scorers.length > 0 && (
        <div className="mt-2 text-[11px] text-white/60 flex flex-wrap gap-x-3 gap-y-0.5 pl-1">
          {match.scorers.map((s, i) => (
            <span key={i}>⚽ {s.playerName} <span className="opacity-50">{s.minute}&apos;</span></span>
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

interface LiveGroupRow { teamId: string; name: string; shortName: string; pts: number; gd: number; gf: number; }
interface LiveGroup { letter: string; rows: Array<LiveGroupRow & { pos: number }>; }

function buildLiveGroups(result: WCResult, visible: QueueStep[]): LiveGroup[] {
  const playerGroupLetter = result.groups.find(g => g.teamIds.includes(result.playerTeam.id))!.letter;

  return result.groups.map(g => {
    if (g.letter !== playerGroupLetter) {
      return {
        letter: g.letter,
        rows: g.table.map((r, i) => ({ teamId: r.teamId, name: r.name, shortName: r.shortName, pts: r.points, gd: r.gd, gf: r.gf, pos: i + 1 })),
      };
    }

    const rows: Record<string, LiveGroupRow> = {};
    g.teamIds.forEach(id => {
      const r = g.table.find(x => x.teamId === id)!;
      rows[id] = { teamId: id, name: r.name, shortName: r.shortName, pts: 0, gd: 0, gf: 0 };
    });
    for (const step of visible) {
      if (step.kind !== 'group') continue;
      const h = rows[step.match.home.teamId];
      const a = rows[step.match.away.teamId];
      if (!h || !a) continue;
      h.gf += step.match.home.goals; a.gf += step.match.away.goals;
      h.gd += step.match.home.goals - step.match.away.goals;
      a.gd += step.match.away.goals - step.match.home.goals;
      if (step.match.home.goals > step.match.away.goals) h.pts += 3;
      else if (step.match.home.goals < step.match.away.goals) a.pts += 3;
      else { h.pts++; a.pts++; }
    }
    const sorted = Object.values(rows).sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
    return { letter: g.letter, rows: sorted.map((r, i) => ({ ...r, pos: i + 1 })) };
  });
}

function GroupBox({ group, playerTeamId, t }: { group: LiveGroup; playerTeamId: string; t: T }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 p-2">
      <div className="text-[10px] tracking-widest text-wc uppercase font-display mb-1">
        {t.wc.group(group.letter)}
      </div>
      {group.rows.map(r => {
        const isYou = r.teamId === playerTeamId;
        const advances = r.pos <= 2;
        return (
          <motion.div
            key={r.teamId}
            layout
            className={`flex items-center justify-between text-[11px] py-0.5 rounded px-1 ${isYou ? 'bg-wc/25' : ''}`}
          >
            <span className={`tabular-nums w-3 ${advances ? 'text-wc' : 'text-white/30'}`}>{r.pos}</span>
            <span className="flex-1 mx-1 truncate">{r.shortName}</span>
            <span className="tabular-nums text-white/60 w-6 text-right">{r.gd > 0 ? `+${r.gd}` : r.gd}</span>
            <span className="tabular-nums font-bold w-6 text-right">{r.pts}</span>
          </motion.div>
        );
      })}
    </div>
  );
}

// ---------- bracket ----------

function BracketBox({ result, stepIdx, queue, playerTeamId, t }: {
  result: WCResult; stepIdx: number; queue: QueueStep[]; playerTeamId: string; t: T;
}) {
  const totalGroupSteps = queue.filter(s => s.kind === 'group').length;
  const shownGroupSteps = queue.slice(0, stepIdx + 1).filter(s => s.kind === 'group').length;
  const groupDone = shownGroupSteps >= totalGroupSteps;

  const revealedTies = new Set<number>();
  queue.slice(0, stepIdx + 1).forEach(s => {
    if (s.kind === 'ko') revealedTies.add(s.tieIdx);
  });

  const resolved = (tie: WCKnockoutTie) =>
    revealedTies.has(result.knockout.indexOf(tie));

  const qfs = result.knockout.filter(ti => ti.round === 'quarter-finals');
  const sfs = result.knockout.filter(ti => ti.round === 'semi-finals');
  const third = result.knockout.find(ti => ti.round === 'third-place');
  const fin = result.knockout.find(ti => ti.round === 'final');

  const sfTeamsVisible = [
    resolved(qfs[0]) && resolved(qfs[1]),
    resolved(qfs[2]) && resolved(qfs[3]),
  ];
  const finalTeamsVisible = sfs.every(ti => resolved(ti));

  return (
    <div className="glass p-4 wc-glass">
      <div className="text-xs tracking-[0.3em] text-wc uppercase font-display mb-3">
        {t.wc.knockoutBracket}
      </div>
      <div className="grid grid-cols-3 gap-2 text-[11px]">
        <Column title={t.wc.qf}>
          {qfs.map((tie, i) => (
            <TieRow key={i} tie={tie} teamsVisible={groupDone} revealed={resolved(tie)} playerTeamId={playerTeamId} t={t} />
          ))}
        </Column>
        <Column title={t.wc.sf}>
          {sfs.map((tie, i) => (
            <TieRow key={i} tie={tie} teamsVisible={sfTeamsVisible[i] ?? false} revealed={resolved(tie)} playerTeamId={playerTeamId} t={t} />
          ))}
        </Column>
        <div className="space-y-3">
          <Column title={`🏆 ${t.wc.final}`}>
            {fin && (
              <TieRow tie={fin} teamsVisible={finalTeamsVisible} revealed={resolved(fin)} playerTeamId={playerTeamId} t={t} highlight />
            )}
          </Column>
          <Column title={`🥉 ${t.wc.thirdPlaceShort}`}>
            {third && (
              <TieRow tie={third} teamsVisible={finalTeamsVisible} revealed={resolved(third)} playerTeamId={playerTeamId} t={t} />
            )}
          </Column>
        </div>
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

function TieRow({ tie, teamsVisible, revealed, playerTeamId, t, highlight }: {
  tie: WCKnockoutTie; teamsVisible: boolean; revealed: boolean;
  playerTeamId: string; t: T; highlight?: boolean;
}) {
  const playerInside = tie.home.id === playerTeamId || tie.away.id === playerTeamId;

  return (
    <div className={`rounded-md border p-1.5 ${
      playerInside && teamsVisible
        ? 'border-wc/60 bg-wc/10'
        : highlight && revealed
        ? 'border-wc-gold/50 bg-wc-gold/5'
        : 'border-white/10 bg-black/30'
    }`}>
      <TieLine side={tie.home} won={revealed && tie.winner.id === tie.home.id}
        revealed={revealed} visible={teamsVisible}
        score={revealed ? tie.match.home.goals : undefined} tbd={t.wc.tbd} />
      <TieLine side={tie.away} won={revealed && tie.winner.id === tie.away.id}
        revealed={revealed} visible={teamsVisible}
        score={revealed ? tie.match.away.goals : undefined} tbd={t.wc.tbd} />
      {revealed && tie.shootout && (
        <div className="text-[9px] text-wc text-center mt-0.5">
          {t.wc.pensLong(tie.shootout.home, tie.shootout.away)}
        </div>
      )}
    </div>
  );
}

function TieLine({ side, won, revealed, visible, score, tbd }: {
  side: { id: string; shortName: string; colors: { primary: string } };
  won: boolean; revealed: boolean; visible: boolean; score?: number; tbd: string;
}) {
  if (!visible) {
    return (
      <div className="flex items-center gap-1.5 py-0.5 opacity-25">
        <span className="w-1.5 h-3 rounded-full inline-block bg-white/40" />
        <span className="flex-1 text-[10px]">{tbd}</span>
      </div>
    );
  }
  return (
    <motion.div
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex items-center gap-1.5 py-0.5 ${
        won ? 'text-wc font-bold' : revealed ? 'text-white/50' : 'text-white/80'
      }`}
    >
      <span className="w-1.5 h-3 rounded-full inline-block" style={{ background: side.colors.primary }} />
      <span className="flex-1 truncate text-[10px]">{side.shortName}</span>
      {revealed && <span className="font-display tabular-nums w-3 text-right">{score}</span>}
    </motion.div>
  );
}
