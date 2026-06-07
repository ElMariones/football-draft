'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore, TOTAL_PICKS } from '@/store/gameStore';
import { getTeam } from '@/data';
import { ERAS } from '@/data/eras';
import { Formation } from '@/data/types';
import { getApiKey, getModel } from '@/lib/storage';
import { seasonToCompactJSON } from '@/lib/simulation';
import { clSeasonToCompactJSON } from '@/lib/championsLeague';
import {
  DIFFICULTIES,
  AVAILABLE_FORMATIONS,
  MODES,
  Mode,
  countDrafted,
  eligibleSlotIndices,
} from '@/lib/draft';
import SpinWheel from '@/components/SpinWheel';
import DifficultyPicker from '@/components/DifficultyPicker';
import ModePicker from '@/components/ModePicker';
import FantasyXIBoard from '@/components/FantasyXIBoard';
import PoolView from '@/components/PoolView';
import SeasonView from '@/components/SeasonView';
import FinalResults from '@/components/FinalResults';
import AIAnalysisView from '@/components/AIAnalysisView';
import ApiKeyModal from '@/components/ApiKeyModal';
import CLPlayback from '@/components/CLPlayback';
import CLFinalResults from '@/components/CLFinalResults';
import { useT } from '@/lib/i18n';

export default function HomePage() {
  const {
    phase, mode, difficulty, formation, teamName, xi, pickIndex,
    currentSpin, selectedPlayerIdx,
    pickRerolls, globalRerolls, rerolling,
    season, clResult, aiAnalysis, apiKeyPresent, simulationError,
    setMode, setDifficulty, setFormation, setTeamName,
    setApiKeyPresent, setPhase,
    startSpin, finishSpin, rerollTeam, rerollEra,
    rerollTeamAvailable, rerollEraAvailable,
    selectPlayer, cancelSelection, assignToSlot, undoLastPick,
    autoFillXI, startSeason, setAnalysis, reset,
    language, setLanguage,
  } = useGameStore();

  const t = useT();

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (mode === 'cl') document.body.classList.add('cl-mode');
    else document.body.classList.remove('cl-mode');
  }, [mode]);

  const [showKeyModal, setShowKeyModal] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  useEffect(() => {
    setApiKeyPresent(!!getApiKey());
  }, [setApiKeyPresent]);

  const teamItems = useMemo(
    () => MODES[mode].pool.map(t => ({
      key: t.id,
      label: t.shortName,
      sublabel: t.name,
      color: t.colors.primary,
    })),
    [mode],
  );
  const eraItems = useMemo(
    () => ERAS.map(e => ({ key: e.key, label: e.key, sublabel: e.label })),
    [],
  );

  const drafted = countDrafted(xi);
  const currentTeam = currentSpin ? getTeam(currentSpin.teamId) : null;
  const selectedPlayer =
    currentTeam && currentSpin && selectedPlayerIdx != null
      ? currentTeam.eras[currentSpin.era]?.players[selectedPlayerIdx] ?? null
      : null;
  const highlightedSlots = selectedPlayer
    ? eligibleSlotIndices(xi, selectedPlayer.position)
    : [];

  const diffCfg = DIFFICULTIES[difficulty];
  const rerollT = rerollTeamAvailable();
  const rerollE = rerollEraAvailable();

  async function requestAnalysis() {
    if (!season && !clResult) return;
    setAnalyzing(true);
    setAnalysisError(null);
    try {
      const apiKey = getApiKey();
      const model = getModel();
      const payload =
        mode === 'cl' && clResult
          ? clSeasonToCompactJSON(clResult)
          : season
          ? seasonToCompactJSON(season)
          : '';
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, payload, mode, language, model }),
      });
      const json = await res.json();
      if (!res.ok || !json.analysis) throw new Error(json?.error || 'Unknown error');
      setAnalysis(json.analysis);
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : String(err));
    } finally {
      setAnalyzing(false);
    }
  }

  function downloadJson() {
    if (mode === 'cl' && clResult) {
      const blob = new Blob([clSeasonToCompactJSON(clResult)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cl-${clResult.playerTeam.shortName}.json`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }
    if (!season) return;
    const blob = new Blob([seasonToCompactJSON(season)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `season-${season.playerTeam.shortName}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const inDraftingFlow =
    phase === 'idle' || phase === 'spinning' ||
    phase === 'reveal' || phase === 'placing';

  useEffect(() => {
    console.log('[FootballDraft] phase:', phase, 'season set?', !!season);
  }, [phase, season]);

  return (
    <>
      <main className="min-h-screen px-4 sm:px-8 py-6 sm:py-10 max-w-7xl mx-auto">
        <header className="flex items-center justify-between mb-6 sm:mb-8">
          <motion.button
            type="button"
            onClick={reset}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-3 group cursor-pointer"
            title="Back to start"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold to-gold-dark text-black grid place-items-center font-display text-lg shadow-lg group-hover:shadow-[0_0_25px_rgba(255,215,0,0.5)] transition-shadow">
              XI
            </div>
            <div className="text-left">
              <div className="font-display text-lg sm:text-xl leading-none group-hover:text-gold transition-colors">
                Football Draft
              </div>
              <div className="text-[10px] tracking-[0.3em] text-white/40 uppercase">
                {t.nav.tagline}
              </div>
            </div>
          </motion.button>
          <div className="flex items-center gap-2">
            {inDraftingFlow && pickIndex < TOTAL_PICKS && (
              <DraftStatusBar
                pickIndex={pickIndex}
                difficulty={difficulty}
                formation={formation}
                globalRerolls={globalRerolls}
                pickRerolls={pickRerolls}
              />
            )}
            <button
              onClick={() => setLanguage(language === 'en' ? 'es' : 'en')}
              className="btn-ghost text-xs font-display tracking-widest"
              title="Switch language / Cambiar idioma"
            >
              {language === 'en' ? 'ES' : 'EN'}
            </button>
            <button
              onClick={() => setShowKeyModal(true)}
              className="btn-ghost text-sm relative"
            >
              ⚙
              {apiKeyPresent && (
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-black" />
              )}
            </button>
          </div>
        </header>

        <div className="relative">
          {/* ============= DRAFTING ============= */}
          {inDraftingFlow && (
            <motion.section
              key="drafting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-6"
            >
              <div className="min-w-0">
                {phase === 'idle' && pickIndex === 0 && (
                  <LandingPanel
                    mode={mode}
                    difficulty={difficulty}
                    formation={formation}
                    teamName={teamName}
                    setMode={setMode}
                    setDifficulty={setDifficulty}
                    setFormation={setFormation}
                    setTeamName={setTeamName}
                    onSpin={startSpin}
                    onAutoFill={autoFillXI}
                  />
                )}
                {phase === 'idle' && pickIndex > 0 && (
                  <NextPickPanel
                    pickIndex={pickIndex}
                    onSpin={startSpin}
                    onUndo={undoLastPick}
                  />
                )}
                {phase === 'spinning' && currentSpin && (
                  <SpinningPanel
                    teamItems={teamItems}
                    eraItems={eraItems}
                    teamId={currentSpin.teamId}
                    era={currentSpin.era}
                    onComplete={finishSpin}
                  />
                )}
                {(phase === 'reveal' || phase === 'placing') && currentTeam && currentSpin && (
                  <div className="space-y-3">
                    <PoolView
                      team={currentTeam}
                      era={currentSpin.era}
                      xi={xi}
                      selectedIdx={selectedPlayerIdx}
                      onSelect={selectPlayer}
                      rerolling={rerolling}
                    />
                    <div className="flex flex-wrap items-center gap-2 justify-end">
                      {phase === 'placing' && (
                        <button onClick={cancelSelection} className="btn-ghost text-sm">
                          {t.draft.changePlayer}
                        </button>
                      )}
                      <RerollButton
                        label={t.draft.team}
                        count={diffCfg.perPick ? pickRerolls.team : globalRerolls.team}
                        disabled={!rerollT}
                        onClick={rerollTeam}
                        active={rerolling === 'team'}
                      />
                      <RerollButton
                        label={t.draft.era}
                        count={diffCfg.perPick ? pickRerolls.era : globalRerolls.era}
                        disabled={!rerollE}
                        onClick={rerollEra}
                        active={rerolling === 'era'}
                      />
                    </div>
                    {phase === 'placing' && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-gold flex items-center gap-2"
                      >
                        <span className="font-display text-base">→</span>
                        {t.draft.tapToPlace(selectedPlayer?.name ?? '')}
                      </motion.div>
                    )}
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <FantasyXIPanel
                  drafted={drafted}
                  xi={xi}
                  highlightedSlots={highlightedSlots}
                  onSlotClick={assignToSlot}
                  placing={phase === 'placing'}
                />
              </div>
            </motion.section>
          )}

          {/* ============= ROSTER COMPLETE ============= */}
          {phase === 'roster-complete' && (
            <motion.section
              key="roster"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 lg:grid-cols-[1fr_1.3fr] gap-6"
            >
              <div className="space-y-4">
                <div className="glass p-6 text-center">
                  <div className="font-display text-xs tracking-[0.4em] text-gold mb-1">
                    {t.draft.xiLockedIn}
                  </div>
                  <div className="font-display text-4xl shimmer">
                    {teamName.trim() || t.draft.defaultTeamName}
                  </div>
                  <p className="text-sm text-white/70 mt-2">
                    {mode === 'cl' ? t.draft.lockedDescCL : t.draft.lockedDescPL}
                  </p>
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    <button onClick={undoLastPick} className="btn-ghost">
                      {t.draft.changeLastPick}
                    </button>
                    <button onClick={() => startSeason(t.draft.defaultTeamName)} className="btn-primary">
                      {t.draft.startSeason}
                    </button>
                  </div>
                  {simulationError && (
                    <div className="mt-3 text-xs text-red-300">
                      {t.draft.simulationError(simulationError)}
                    </div>
                  )}
                </div>
                <div className="glass p-5">
                  <div className="text-xs tracking-[0.3em] text-white/50 uppercase mb-2">
                    {t.draft.squadOrigins}
                  </div>
                  <div className="space-y-1.5">
                    {xi.map((slot, i) => {
                      const dp = slot.player!;
                      return (
                        <div
                          key={i}
                          className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-1.5 text-sm"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-[10px] font-bold text-white/40 w-8">
                              {slot.position}
                            </span>
                            <span className="truncate">{dp.player.name}</span>
                          </div>
                          <span className="text-[10px] text-white/50 truncate">
                            {dp.sourceTeamName} · {dp.sourceEra}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div>
                <FantasyXIBoard xi={xi} />
              </div>
            </motion.section>
          )}

          {/* ============= PL SEASON PLAYBACK ============= */}
          {phase === 'simulating' && mode === 'pl' && season && (
            <motion.section
              key="simulating-pl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <FantasyTeamBanner playerTeam={season.playerTeam} mode="pl" />
              <SeasonView season={season} onDone={() => setPhase('finished')} />
            </motion.section>
          )}

          {/* ============= CL PLAYBACK ============= */}
          {phase === 'simulating' && mode === 'cl' && clResult && (
            <motion.section
              key="simulating-cl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <FantasyTeamBanner playerTeam={clResult.playerTeam} mode="cl" />
              <CLPlayback result={clResult} onDone={() => setPhase('finished')} />
            </motion.section>
          )}

          {/* ============= PL FINISHED ============= */}
          {phase === 'finished' && mode === 'pl' && season && (
            <motion.section
              key="finished-pl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <FantasyTeamBanner playerTeam={season.playerTeam} mode="pl" />
              <FinalResults
                season={season}
                onRequestAnalysis={requestAnalysis}
                analyzing={analyzing}
                analysisDisabled={!apiKeyPresent}
              />
              {!apiKeyPresent && (
                <div className="mt-3 text-center text-sm text-white/60">
                  <button onClick={() => setShowKeyModal(true)} className="underline hover:text-white">
                    {t.postSim.addKey}
                  </button>{' '}
                  {t.postSim.unlockVerdict}
                </div>
              )}
              {analysisError && (
                <div className="mt-3 text-center text-sm text-red-300">{analysisError}</div>
              )}
              <div className="mt-6 text-center text-xs text-white/40">
                <button onClick={downloadJson} className="underline hover:text-white/80">
                  {t.postSim.downloadSeason}
                </button>
              </div>
            </motion.section>
          )}

          {/* ============= CL FINISHED ============= */}
          {phase === 'finished' && mode === 'cl' && clResult && (
            <motion.section
              key="finished-cl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <FantasyTeamBanner playerTeam={clResult.playerTeam} mode="cl" />
              <CLFinalResults
                result={clResult}
                onRequestAnalysis={requestAnalysis}
                analyzing={analyzing}
                analysisDisabled={!apiKeyPresent}
              />
              {!apiKeyPresent && (
                <div className="mt-3 text-center text-sm text-white/60">
                  <button onClick={() => setShowKeyModal(true)} className="underline hover:text-white">
                    {t.postSim.addKey}
                  </button>{' '}
                  {t.postSim.unlockVerdict}
                </div>
              )}
              {analysisError && (
                <div className="mt-3 text-center text-sm text-red-300">{analysisError}</div>
              )}
              <div className="mt-6 text-center text-xs text-white/40">
                <button onClick={downloadJson} className="underline hover:text-white/80">
                  {t.postSim.downloadCampaign}
                </button>
              </div>
            </motion.section>
          )}

          {/* ============= ANALYSIS ============= */}
          {phase === 'analysis' && aiAnalysis && (
            <motion.section
              key="analysis"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {mode === 'cl' && clResult && (
                <FantasyTeamBanner playerTeam={clResult.playerTeam} mode="cl" />
              )}
              {mode === 'pl' && season && (
                <FantasyTeamBanner playerTeam={season.playerTeam} mode="pl" />
              )}
              <AIAnalysisView analysis={aiAnalysis} />
            </motion.section>
          )}
        </div>

        <footer className="mt-16 mb-4 text-center text-xs text-white/30">
          {t.nav.footer}
        </footer>
      </main>

      <ApiKeyModal open={showKeyModal} onClose={() => setShowKeyModal(false)} />
    </>
  );
}

// ---------- sub-panels ----------

function DraftStatusBar({
  pickIndex,
  difficulty,
  formation,
  pickRerolls,
  globalRerolls,
}: {
  pickIndex: number;
  difficulty: keyof typeof DIFFICULTIES;
  formation: Formation;
  pickRerolls: { team: number; era: number };
  globalRerolls: { team: number; era: number };
}) {
  const t = useT();
  const diffCfg = DIFFICULTIES[difficulty];
  return (
    <div className="hidden sm:flex items-center gap-3 mr-2">
      <div className="text-xs tracking-widest uppercase text-white/40">
        {t.draft.pick(Math.min(pickIndex + 1, TOTAL_PICKS), TOTAL_PICKS)}
      </div>
      <div className="font-display text-xs px-3 py-1 rounded-full border border-gold/40 text-gold uppercase tracking-widest">
        {t.difficulty[difficulty].label}
      </div>
      <div className="text-[10px] tracking-widest uppercase text-white/40">
        {formation}
      </div>
      {diffCfg.global && (
        <div className="text-[11px] text-white/60 flex gap-2 items-center">
          <span>🔁 T <strong className="text-white">{globalRerolls.team}</strong></span>
          <span>🔁 E <strong className="text-white">{globalRerolls.era}</strong></span>
        </div>
      )}
    </div>
  );
}

function RerollButton({
  label,
  count,
  disabled,
  active,
  onClick,
}: {
  label: string;
  count: number;
  disabled: boolean;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      animate={active ? { rotate: [0, -8, 8, -6, 6, 0], scale: [1, 1.06, 1] } : { rotate: 0, scale: 1 }}
      transition={{ duration: 0.5 }}
      className={`btn-ghost text-sm flex items-center gap-2 disabled:opacity-40 ${
        active ? 'shadow-[0_0_25px_rgba(255,215,0,0.5)] border-gold/60 text-gold' : ''
      }`}
    >
      <motion.span
        animate={active ? { rotate: 360 } : {}}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        🔁
      </motion.span>
      {label}
      <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full bg-white/15 text-[10px] font-bold">
        {Number.isFinite(count) && count < 999 ? count : '∞'}
      </span>
    </motion.button>
  );
}

function LandingPanel({
  mode,
  difficulty,
  formation,
  teamName,
  setMode,
  setDifficulty,
  setFormation,
  setTeamName,
  onSpin,
  onAutoFill,
}: {
  mode: Mode;
  difficulty: keyof typeof DIFFICULTIES;
  formation: Formation;
  teamName: string;
  setMode: (m: Mode) => void;
  setDifficulty: (d: keyof typeof DIFFICULTIES) => void;
  setFormation: (f: Formation) => void;
  setTeamName: (n: string) => void;
  onSpin: () => void;
  onAutoFill: () => void;
}) {
  const t = useT();
  const isCL = mode === 'cl';
  const ctaClass = isCL
    ? 'bg-gradient-to-r from-cl to-cl-dark text-white shadow-[0_0_30px_rgba(61,169,252,0.4)] hover:shadow-[0_0_50px_rgba(61,169,252,0.7)]'
    : 'bg-gradient-to-r from-gold to-gold-dark text-black shadow-[0_0_30px_rgba(255,215,0,0.4)] hover:shadow-[0_0_50px_rgba(255,215,0,0.7)]';
  const headlineClass = isCL ? 'cl-shimmer' : 'shimmer';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      <div className="text-center">
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="text-6xl sm:text-7xl mb-2"
        >
          {isCL ? '⭐' : '⚽'}
        </motion.div>
        <h1 className={`font-display text-4xl sm:text-6xl leading-none mb-2 ${headlineClass}`}>
          {isCL ? t.landing.headingCL : t.landing.headingPL}
        </h1>
        <p className="max-w-md mx-auto text-white/70 text-sm">
          {isCL ? t.landing.descCL : t.landing.descPL}
        </p>
      </div>

      <div>
        <div className="text-xs tracking-[0.3em] text-white/50 uppercase mb-2 pl-1">
          {t.landing.competition}
        </div>
        <ModePicker value={mode} onChange={setMode} />
      </div>

      <div>
        <div className="text-xs tracking-[0.3em] text-white/50 uppercase mb-2 pl-1">
          {t.landing.teamName}
        </div>
        <input
          type="text"
          value={teamName}
          onChange={e => setTeamName(e.target.value.slice(0, 40))}
          placeholder={t.landing.teamNamePlaceholder}
          className={`w-full rounded-xl bg-white/5 border border-white/15 px-4 py-3 text-base focus:outline-none placeholder-white/30 ${
            isCL ? 'focus:border-cl/70' : 'focus:border-gold/70'
          }`}
        />
      </div>

      <div>
        <div className="text-xs tracking-[0.3em] text-white/50 uppercase mb-2 pl-1">
          {t.landing.formation}
        </div>
        <FormationPicker value={formation} onChange={setFormation} />
      </div>

      <div>
        <div className="text-xs tracking-[0.3em] text-white/50 uppercase mb-2 pl-1">
          {t.landing.difficulty}
        </div>
        <DifficultyPicker value={difficulty} onChange={setDifficulty} />
      </div>

      <div className="flex flex-col items-center pt-2 gap-2">
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={onSpin}
          className={`px-10 py-4 rounded-full font-display text-2xl sm:text-3xl tracking-widest transition-shadow ${ctaClass}`}
        >
          {t.landing.spinPick1}
        </motion.button>
        <button
          onClick={onAutoFill}
          className="text-[11px] tracking-widest uppercase text-white/40 hover:text-white/80 underline underline-offset-4"
          title="Skip the 11 manual picks and go straight to the season — useful for testing"
        >
          {t.landing.autoFill}
        </button>
      </div>
    </motion.div>
  );
}

function FormationPicker({
  value,
  onChange,
}: {
  value: Formation;
  onChange: (f: Formation) => void;
}) {
  const t = useT();
  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
      {AVAILABLE_FORMATIONS.map(f => {
        const selected = f.id === value;
        const tagline = t.formations[f.id] ?? f.tagline;
        return (
          <button
            key={f.id}
            type="button"
            onClick={() => onChange(f.id)}
            className={`rounded-xl border p-2 text-center transition-colors ${
              selected
                ? 'border-gold bg-gold/10 shadow-[0_0_20px_rgba(255,215,0,0.3)]'
                : 'border-white/10 bg-white/5 hover:bg-white/10'
            }`}
            title={tagline}
          >
            <div className="font-display text-base sm:text-lg">{f.label}</div>
            <div className="text-[9px] text-white/40 truncate">{tagline}</div>
          </button>
        );
      })}
    </div>
  );
}

function NextPickPanel({
  pickIndex,
  onSpin,
  onUndo,
}: {
  pickIndex: number;
  onSpin: () => void;
  onUndo: () => void;
}) {
  const t = useT();
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass p-6 sm:p-8 text-center"
    >
      <div className="font-display text-xs tracking-[0.4em] text-gold mb-2">
        {t.draft.pick(pickIndex + 1, TOTAL_PICKS)}
      </div>
      <div className="font-display text-3xl sm:text-4xl mb-4">
        {t.draft.spinForPlayer(pickIndex + 1)}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <button onClick={onUndo} className="btn-ghost text-sm">
          {t.draft.undoLastPick}
        </button>
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={onSpin}
          className="px-8 py-3 rounded-full font-display text-xl tracking-widest bg-gradient-to-r from-gold to-gold-dark text-black shadow-[0_0_25px_rgba(255,215,0,0.4)]"
        >
          {t.draft.spin}
        </motion.button>
      </div>
    </motion.div>
  );
}

function SpinningPanel({
  teamItems,
  eraItems,
  teamId,
  era,
  onComplete,
}: {
  teamItems: { key: string; label: string; sublabel?: string; color?: string }[];
  eraItems: { key: string; label: string; sublabel?: string }[];
  teamId: string;
  era: string;
  onComplete: () => void;
}) {
  const t = useT();
  return (
    <div className="flex flex-col items-center pt-4">
      <div className="font-display text-xl sm:text-2xl text-white/80 mb-1">
        {t.draft.drawing}
      </div>
      <div className="text-[10px] tracking-[0.4em] text-white/40 uppercase mb-6">
        {t.draft.reelsSpinning}
      </div>
      <div className="flex gap-3 sm:gap-6">
        <SpinWheel
          items={teamItems}
          targetKey={teamId}
          spinning
          label={t.draft.team}
          height={210}
          durationMs={2800}
          onComplete={onComplete}
        />
        <SpinWheel
          items={eraItems}
          targetKey={era}
          spinning
          label={t.draft.era}
          height={210}
          durationMs={2600}
        />
      </div>
    </div>
  );
}

function FantasyXIPanel({
  drafted,
  xi,
  highlightedSlots,
  onSlotClick,
  placing,
}: {
  drafted: number;
  xi: Parameters<typeof FantasyXIBoard>[0]['xi'];
  highlightedSlots: number[];
  onSlotClick: (i: number) => void;
  placing: boolean;
}) {
  const t = useT();
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <div className="font-display text-sm tracking-[0.3em] text-white/60 uppercase">
          {t.draft.yourXI}
        </div>
        <div className="text-xs text-white/50 tabular-nums">
          {drafted} / {TOTAL_PICKS}
        </div>
      </div>
      <FantasyXIBoard
        xi={xi}
        highlightedSlots={highlightedSlots}
        onSlotClick={onSlotClick}
        placing={placing}
      />
    </div>
  );
}

function FantasyTeamBanner({
  playerTeam,
  mode,
}: {
  playerTeam: { name: string; shortName: string; formation: string; attackRating: number; defenseRating: number; overallRating: number };
  mode: Mode;
}) {
  const t = useT();
  const isCL = mode === 'cl';
  return (
    <motion.div
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`relative overflow-hidden rounded-3xl mb-2 border ${
        isCL ? 'border-cl/40' : 'border-gold/30'
      }`}
    >
      <div
        className="absolute inset-0 opacity-90"
        style={{
          background: isCL
            ? 'linear-gradient(135deg, rgba(61,169,252,0.25) 0%, rgba(12,45,82,0.4) 50%, #050b18 100%)'
            : 'linear-gradient(135deg, rgba(255,215,0,0.25) 0%, rgba(255,215,0,0.05) 50%, #0a0a0f 100%)',
        }}
      />
      {isCL && <div className="cl-stars" />}
      <div
        className="absolute inset-0"
        style={{
          background: isCL
            ? 'radial-gradient(circle at top right, rgba(61,169,252,0.3), transparent 60%)'
            : 'radial-gradient(circle at top right, rgba(255,215,0,0.25), transparent 60%)',
        }}
      />
      <div className="relative px-5 sm:px-8 py-5 sm:py-7 flex items-center gap-4 sm:gap-6">
        <div className={`w-14 h-14 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center font-display text-2xl sm:text-3xl shadow-xl bg-black/60 ${
          isCL ? 'text-cl' : 'text-gold'
        }`}>
          {playerTeam.shortName}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] sm:text-xs tracking-[0.3em] text-white/70 uppercase">
            {isCL ? t.banner.clLabel : t.banner.plLabel}
          </div>
          <div className="font-display text-2xl sm:text-4xl text-white truncate">
            {playerTeam.name}
          </div>
          <div className="text-xs text-white/70 mt-1">
            {t.banner.att} <strong className="text-white">{playerTeam.attackRating}</strong> ·
            &nbsp;{t.banner.def} <strong className="text-white">{playerTeam.defenseRating}</strong> ·
            &nbsp;{t.banner.ovr} <strong className="text-white">{playerTeam.overallRating}</strong>
          </div>
        </div>
        <div className="hidden sm:flex flex-col items-end gap-1 text-white">
          <div className="font-display text-xs tracking-widest text-white/60">{t.banner.formation}</div>
          <div className="font-display text-2xl">{playerTeam.formation}</div>
        </div>
      </div>
    </motion.div>
  );
}
