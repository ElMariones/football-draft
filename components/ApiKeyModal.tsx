'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { getApiKey, setApiKey, clearApiKey } from '@/lib/storage';
import { useGameStore } from '@/store/gameStore';
import { useT } from '@/lib/i18n';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ApiKeyModal({ open, onClose }: Props) {
  const setApiKeyPresent = useGameStore(s => s.setApiKeyPresent);
  const t = useT();
  const [value, setValue] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (open) setValue(getApiKey());
  }, [open]);

  function handleSave() {
    setApiKey(value.trim());
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
            <div className="flex flex-wrap items-center gap-2 mt-4 justify-end">
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
