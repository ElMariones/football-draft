'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useT } from '@/lib/i18n';
import { useGameStore } from '@/store/gameStore';

interface Question {
  journalist: string;
  outlet: string;
  question: string;
  options: string[];
}

interface Props {
  payload: string;
  mode: 'pl' | 'cl' | 'll';
  onDone: (summary: string) => void;
}

type Stage = 'loading' | 'questioning' | 'summarizing' | 'error';

export default function PressConference({ payload, mode, onDone }: Props) {
  const language = useGameStore(s => s.language);
  const t = useT();

  const [stage, setStage] = useState<Stage>('loading');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<{ question: string; answer: string }[]>([]);
  const [customText, setCustomText] = useState('');
  const [error, setError] = useState('');
  const [started, setStarted] = useState(false);

  async function startConference() {
    setStarted(true);
    setStage('loading');
    setError('');
    try {
      const { getApiKey, getModel } = await import('@/lib/storage');
      const res = await fetch('/api/press-conference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 'questions',
          payload,
          apiKey: getApiKey(),
          mode,
          language,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to generate questions');
      if (!json.questions || json.questions.length < 4) throw new Error('Invalid AI response');
      setQuestions(json.questions.slice(0, 4));
      setStage('questioning');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStage('error');
    }
  }

  function selectAnswer(text: string) {
    const newAnswers = [...answers, { question: questions[currentQ].question, answer: text }];
    setAnswers(newAnswers);
    setCustomText('');

    if (currentQ < 3) {
      setCurrentQ(currentQ + 1);
    } else {
      generateSummary(newAnswers);
    }
  }

  function submitCustom() {
    if (!customText.trim()) return;
    selectAnswer(customText.trim());
  }

  async function generateSummary(finalAnswers: { question: string; answer: string }[]) {
    setStage('summarizing');
    try {
      const { getApiKey } = await import('@/lib/storage');
      const res = await fetch('/api/press-conference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 'summary',
          payload,
          apiKey: getApiKey(),
          mode,
          language,
          answers: finalAnswers,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to generate summary');
      onDone(json.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStage('error');
    }
  }

  if (!started) {
    return (
      <motion.button
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        onClick={startConference}
        className="btn-ghost text-sm flex items-center gap-2"
      >
        <span className="text-base">🎙</span>
        {t.press.startButton}
      </motion.button>
    );
  }

  const isCL = mode === 'cl';
  const accentColor = isCL ? '#3DA9FC' : mode === 'll' ? '#C8102E' : '#FFD700';

  return (
    <AnimatePresence mode="wait">
      {stage === 'loading' && (
        <motion.div
          key="loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="glass p-8 text-center"
        >
          <div className="text-4xl mb-3 animate-pulse">🎙</div>
          <div className="font-display text-lg text-white/80">{t.press.preparing}</div>
          <div className="text-xs text-white/40 mt-1">{t.press.preparingSub}</div>
        </motion.div>
      )}

      {stage === 'questioning' && questions[currentQ] && (
        <motion.div
          key={`q-${currentQ}`}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.3 }}
          className="glass p-6 sm:p-8"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎙</span>
              <div className="font-display text-xs tracking-[0.3em] uppercase" style={{ color: accentColor }}>
                {t.press.title}
              </div>
            </div>
            <div className="text-xs text-white/40 font-display">
              {currentQ + 1} / 4
            </div>
          </div>

          {/* Progress dots */}
          <div className="flex gap-1.5 mb-6">
            {[0, 1, 2, 3].map(i => (
              <div
                key={i}
                className="h-1 flex-1 rounded-full transition-colors"
                style={{
                  background: i <= currentQ ? accentColor : 'rgba(255,255,255,0.1)',
                }}
              />
            ))}
          </div>

          {/* Journalist info */}
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-white/10 grid place-items-center text-sm font-display flex-shrink-0">
              {questions[currentQ].journalist[0]}
            </div>
            <div>
              <div className="text-sm font-bold text-white">
                {questions[currentQ].journalist}
              </div>
              <div className="text-[10px] text-white/50">
                {questions[currentQ].outlet}
              </div>
            </div>
          </div>

          {/* Question */}
          <div className="text-lg sm:text-xl text-white mb-6 leading-relaxed">
            &ldquo;{questions[currentQ].question}&rdquo;
          </div>

          {/* Answer options */}
          <div className="space-y-2 mb-4">
            {questions[currentQ].options.map((opt, i) => (
              <motion.button
                key={i}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => selectAnswer(opt)}
                className="w-full text-left px-4 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/30 transition-all text-sm"
              >
                {opt}
              </motion.button>
            ))}
          </div>

          {/* Custom answer */}
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/10">
            <input
              type="text"
              value={customText}
              onChange={e => setCustomText(e.target.value.slice(0, 150))}
              placeholder={t.press.customPlaceholder}
              maxLength={150}
              className="flex-1 bg-white/5 border border-white/15 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-white/40 placeholder-white/30"
              onKeyDown={e => { if (e.key === 'Enter') submitCustom(); }}
            />
            <button
              onClick={submitCustom}
              disabled={!customText.trim()}
              className="px-4 py-2.5 rounded-xl font-display text-sm transition-all disabled:opacity-30"
              style={{ background: accentColor, color: '#000' }}
            >
              →
            </button>
          </div>
          <div className="text-[10px] text-white/30 mt-1.5 text-right">
            {customText.length}/150
          </div>
        </motion.div>
      )}

      {stage === 'summarizing' && (
        <motion.div
          key="summarizing"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="glass p-8 text-center"
        >
          <div className="text-4xl mb-3 animate-pulse">📝</div>
          <div className="font-display text-lg text-white/80">{t.press.writing}</div>
          <div className="text-xs text-white/40 mt-1">{t.press.writingSub}</div>
        </motion.div>
      )}

      {stage === 'error' && (
        <motion.div
          key="error"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="glass p-6 text-center"
        >
          <div className="text-red-400 text-sm mb-3">{error}</div>
          <button onClick={startConference} className="btn-ghost text-sm">
            {t.press.retry}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
