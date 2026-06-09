'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
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
  const { data: session } = useSession();
  const signedIn = !!session?.user;
  const t = useT();
  const [value, setValue] = useState('');
  const [model, setModelState] = useState('gpt-4o-mini');
  const [saved, setSaved] = useState(false);
  // Whether the signed-in user already has a key stored server-side.
  // When true we render a masked placeholder rather than the empty input.
  const [stored, setStored] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (signedIn) {
      // Logged in: fetch presence + model from server. Never read the key itself.
      fetch('/api/user/api-key')
        .then(r => (r.ok ? r.json() : null))
        .then(json => {
          setStored(!!json?.present);
          setModelState(json?.model || getModel());
          setValue(''); // never pre-fill the actual key
        })
        .catch(() => {
          setStored(false);
          setModelState(getModel());
        });
    } else {
      setStored(false);
      setValue(getApiKey());
      setModelState(getModel());
    }
  }, [open, signedIn]);

  async function handleSave() {
    if (signedIn) {
      const body: { apiKey?: string; model?: string } = { model };
      const trimmed = value.trim();
      // Only update the key if the user typed something. Empty input + already stored = keep stored key.
      if (trimmed) body.apiKey = trimmed;
      const res = await fetch('/api/user/api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setApiKeyPresent(trimmed ? true : stored);
        setModel(model); // mirror selected model in localStorage too for guest-mode fallback
        setSaved(true);
        setTimeout(() => {
          setSaved(false);
          onClose();
        }, 700);
      }
      return;
    }
    // Guest: localStorage only.
    setApiKey(value.trim());
    setModel(model);
    setApiKeyPresent(!!value.trim());
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 700);
  }

  async function handleClear() {
    if (signedIn) {
      await fetch('/api/user/api-key', { method: 'DELETE' });
      setStored(false);
      setValue('');
      setApiKeyPresent(false);
      return;
    }
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
            className="glass w-full max-w-md p-6 max-h-[85dvh] overflow-y-auto"
          >
            <h3 className="font-display text-2xl mb-1">{t.apiKey.title}</h3>
            <p className="text-sm text-white/70 mb-4">
              {signedIn ? t.apiKey.descriptionSignedIn : t.apiKey.description}
            </p>
            <input
              type="password"
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder={signedIn && stored ? t.apiKey.placeholderStored : t.apiKey.placeholder}
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
