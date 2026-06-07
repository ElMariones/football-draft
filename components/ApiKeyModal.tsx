'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { getApiKey, setApiKey, clearApiKey, getModel, setModel } from '@/lib/storage';
import { useGameStore } from '@/store/gameStore';
import { useT } from '@/lib/i18n';

interface Props {
  open: boolean;
  onClose: () => void;
}

const MODELS = [
  { id: 'gpt-4o-mini',  label: 'GPT-4o mini',  note: 'Fast · cheap',        recommended: true },
  { id: 'gpt-4o',       label: 'GPT-4o',        note: 'Best quality',        recommended: false },
  { id: 'gpt-4.1-nano', label: 'GPT-4.1 nano',  note: 'Fastest · cheapest', recommended: false },
  { id: 'gpt-4.1-mini', label: 'GPT-4.1 mini',  note: 'Balanced',           recommended: false },
  { id: 'gpt-4.1',      label: 'GPT-4.1',       note: 'Most capable',       recommended: false },
] as const;

export default function ApiKeyModal({ open, onClose }: Props) {
  const setApiKeyPresent = useGameStore(s => s.setApiKeyPresent);
  const t = useT();
  const [value, setValue] = useState('');
  const [model, setModelState] = useState('gpt-4o-mini');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (open) {
      setValue(getApiKey());
      setModelState(getModel());
    }
  }, [open]);

  function handleSave() {
    setApiKey(value.trim());
    setModel(model);
    setApiKeyPresent(!!value.trim());
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 700);
  }

  function handleClear() {
    clearApiKey();
    setValue('');
    setApiKeyPresent(false);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            onClick={e => e.stopPropagation()}
            className="glass w-full max-w-md p-6"
          >
            <h3 className="font-display text-2xl mb-1">{t.apiKey.title}</h3>
            <p className="text-sm text-white/70 mb-4">{t.apiKey.description}</p>
            <input
              type="password"
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder={t.apiKey.placeholder}
              className="w-full rounded-lg bg-black/50 border border-white/15 px-3 py-2 text-sm focus:outline-none focus:border-gold/70"
            />

            <div className="mt-5">
              <div className="text-xs tracking-[0.25em] text-white/50 uppercase mb-2">
                {t.apiKey.modelLabel}
              </div>
              <div className="space-y-1.5">
                {MODELS.map(m => {
                  const selected = model === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setModelState(m.id)}
                      className={`w-full flex items-center justify-between rounded-lg px-3 py-2 border text-sm transition-colors ${
                        selected
                          ? 'border-gold/60 bg-gold/10 text-white'
                          : 'border-white/10 bg-white/5 hover:bg-white/10 text-white/70'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-3 h-3 rounded-full border flex-shrink-0 transition-colors ${
                          selected ? 'border-gold bg-gold' : 'border-white/30'
                        }`} />
                        <span className="font-display text-sm">{m.label}</span>
                        {m.recommended && (
                          <span className="text-[9px] tracking-widest uppercase text-gold/70 border border-gold/30 rounded-full px-1.5 py-0.5">
                            default
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-white/40">{m.note}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-white/35 mt-2">{t.apiKey.modelHint}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-5 justify-end">
              <button onClick={handleClear} className="btn-ghost text-sm">
                {t.apiKey.clear}
              </button>
              <button onClick={onClose} className="btn-ghost text-sm">
                {t.apiKey.cancel}
              </button>
              <button onClick={handleSave} className="btn-primary text-sm">
                {saved ? t.apiKey.saved : t.apiKey.save}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
