'use client';

import { useState } from 'react';
import FinalResults from '@/components/FinalResults';
import CLFinalResults from '@/components/CLFinalResults';
import WCFinalResults from '@/components/WCFinalResults';
import AIAnalysisView from '@/components/AIAnalysisView';
import { useGameStore } from '@/store/gameStore';
import { useT } from '@/lib/i18n';
import { seasonToCompactJSON, type SeasonResult } from '@/lib/simulation';
import { clSeasonToCompactJSON, type CLResult } from '@/lib/championsLeague';
import { wcToCompactJSON, type WCResult } from '@/lib/worldCup';
import { getApiKey, getModel } from '@/lib/storage';

interface Props {
  mode: 'pl' | 'cl' | 'll' | 'wc';
  payload: SeasonResult | CLResult | WCResult;
}

// Read-only history view. Reuses FinalResults / CLFinalResults but feeds them the
// saved payload directly instead of pulling from the live game store.
export default function SeasonReplay({ mode, payload }: Props) {
  const setLanguage = useGameStore.getState; // touch the store so types align; not used
  void setLanguage;
  const t = useT();
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const language = useGameStore(s => s.language);

  async function requestAnalysis() {
    setAnalyzing(true);
    setAnalysisError(null);
    try {
      const payloadJson =
        mode === 'cl'
          ? clSeasonToCompactJSON(payload as CLResult)
          : mode === 'wc'
          ? wcToCompactJSON(payload as WCResult)
          : seasonToCompactJSON(payload as SeasonResult);
      const apiKey = getApiKey(); // empty for logged-in users with server-stored key — server falls back
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, payload: payloadJson, mode, language, model: getModel() }),
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

  if (analysis) {
    return <AIAnalysisView analysis={analysis} />;
  }

  return (
    <>
      {mode === 'cl' ? (
        <CLFinalResults
          result={payload as CLResult}
          onRequestAnalysis={requestAnalysis}
          analyzing={analyzing}
        />
      ) : mode === 'wc' ? (
        <WCFinalResults
          result={payload as WCResult}
          onRequestAnalysis={requestAnalysis}
          analyzing={analyzing}
        />
      ) : (
        <FinalResults
          season={payload as SeasonResult}
          onRequestAnalysis={requestAnalysis}
          analyzing={analyzing}
        />
      )}
      {analysisError && (
        <p className="text-center text-red-400 text-sm mt-4">{analysisError}</p>
      )}
    </>
  );
}
