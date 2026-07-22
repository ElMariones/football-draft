'use client';

import { useMemo, useState } from 'react';
import { useCareerStore } from '@/store/careerStore';
import { NATIONS } from '@/data/career/nations';
import { careerT, Lang } from '@/lib/career/i18n';
import { PITCH_POSITIONS, positionAbbr } from '@/lib/career/format';
import type { Position } from '@/data/types';
import { Jersey } from './bits';

// Approximate national jersey colours for the preview.
const JERSEY: Record<string, [string, string]> = {
  AR: ['#6CABDD', '#ffffff'], BR: ['#FEDD00', '#009C3B'], FR: ['#001489', '#ffffff'],
  ES: ['#AA151B', '#F1BF00'], DE: ['#ffffff', '#000000'], EN: ['#ffffff', '#CF081F'],
  PT: ['#006600', '#DA020E'], NL: ['#F36C21', '#ffffff'], IT: ['#0066CC', '#ffffff'],
  BE: ['#E30613', '#FDDA24'], UY: ['#5CBFEB', '#ffffff'], HR: ['#ffffff', '#FF0000'],
  MX: ['#006847', '#ffffff'], US: ['#0A3161', '#ffffff'], JP: ['#000066', '#ffffff'],
  NG: ['#008751', '#ffffff'], MA: ['#C1272D', '#006233'], SN: ['#00853F', '#FDEF42'],
};
function jerseyColors(code: string): [string, string] {
  return JERSEY[code] ?? ['#3DA9FC', '#0C2D52'];
}

const POS_COORDS: Record<Position, [number, number]> = {
  ST: [50, 11], LW: [21, 21], RW: [79, 21], CAM: [50, 30],
  LM: [19, 44], CM: [50, 46], RM: [81, 44], CDM: [50, 60],
  LB: [18, 75], CB: [50, 76], RB: [82, 75], GK: [50, 91],
  RWB: [82, 68], LWB: [18, 68], CF: [50, 18],
};

export default function CareerWizard({ lang }: { lang: Lang }) {
  const t = careerT(lang);
  const { wizard, setNation, setIdentity, setPosition, wizardNext, wizardBack, confirmIdentity } = useCareerStore();
  const [query, setQuery] = useState('');

  const nations = useMemo(() => {
    const sorted = [...NATIONS].sort((a, b) => a[lang].localeCompare(b[lang]));
    const q = query.trim().toLowerCase();
    return q ? sorted.filter(n => n[lang].toLowerCase().includes(q)) : sorted;
  }, [query, lang]);

  const [jp, js] = jerseyColors(wizard.nationCode || 'AR');
  const stepTitle = wizard.step === 1 ? t.nationality : wizard.step === 2 ? t.identity : t.position;
  const canContinue = wizard.step === 1 ? !!wizard.nationCode : wizard.step === 2 ? wizard.surname.trim().length > 0 : !!wizard.position;

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="font-display text-3xl mb-2">{stepTitle}</h2>
      <div className="h-1.5 rounded-full bg-white/10 mb-6 overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-wc transition-all" style={{ width: `${(wizard.step / 3) * 100}%` }} />
      </div>

      {wizard.step === 1 && (
        <div>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={`🔎  ${t.searchCountry}`}
            className="w-full rounded-xl bg-white/5 border border-white/15 px-4 py-3 mb-3 focus:outline-none focus:border-wc/60 placeholder-white/30"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-[46vh] overflow-y-auto pr-1">
            {nations.map(n => (
              <button
                key={n.code}
                onClick={() => setNation(n.code)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border text-left transition-colors ${
                  wizard.nationCode === n.code ? 'border-wc bg-wc/15' : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <span className="text-xl">{n.flag}</span>
                <span className="font-semibold text-sm truncate">{n[lang]}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {wizard.step === 2 && (
        <div className="flex flex-col items-center gap-5">
          <Jersey primary={jp} secondary={js} surname={wizard.surname} number={wizard.number} />
          <div className="w-full grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[10px] tracking-widest text-white/40 uppercase">{t.surname}</span>
              <input
                value={wizard.surname}
                onChange={e => setIdentity({ surname: e.target.value.slice(0, 14), number: wizard.number, foot: wizard.foot })}
                placeholder={t.surname.toUpperCase()}
                className="w-full mt-1 rounded-xl bg-white/5 border border-white/15 px-4 py-3 uppercase focus:outline-none focus:border-wc/60 placeholder-white/30"
              />
            </label>
            <label className="block">
              <span className="text-[10px] tracking-widest text-white/40 uppercase">{t.number}</span>
              <input
                type="number" min={1} max={99}
                value={wizard.number}
                onChange={e => setIdentity({ surname: wizard.surname, number: parseInt(e.target.value || '10', 10), foot: wizard.foot })}
                className="w-full mt-1 rounded-xl bg-white/5 border border-white/15 px-4 py-3 focus:outline-none focus:border-wc/60"
              />
            </label>
          </div>
          <div className="w-full">
            <span className="text-[10px] tracking-widest text-white/40 uppercase">{t.foot}</span>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {(['left', 'right'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setIdentity({ surname: wizard.surname, number: wizard.number, foot: f })}
                  className={`rounded-xl px-4 py-3 border font-display tracking-wide transition-colors ${
                    wizard.foot === f ? 'border-wc bg-wc/15' : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  {f === 'left' ? t.left : t.right}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {wizard.step === 3 && (
        <div className="relative w-full max-w-sm mx-auto aspect-[3/4] rounded-2xl border border-white/15 overflow-hidden"
          style={{ background: 'linear-gradient(180deg,#0b3d1f,#0d5e2a)' }}>
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(180deg,transparent,transparent 24px,#fff2 24px,#fff2 48px)' }} />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border border-white/25" />
          <div className="absolute left-0 right-0 top-1/2 h-px bg-white/25" />
          {PITCH_POSITIONS.map(pos => {
            const [x, y] = POS_COORDS[pos];
            const active = wizard.position === pos;
            return (
              <button
                key={pos}
                onClick={() => setPosition(pos)}
                style={{ left: `${x}%`, top: `${y}%` }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-lg font-display text-sm tracking-wide border transition-all ${
                  active ? 'bg-wc text-black border-wc scale-110 shadow-lg' : 'bg-black/55 text-white border-white/25 hover:bg-black/75'
                }`}
              >
                {positionAbbr(pos, lang)}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex gap-3 mt-6">
        <button onClick={wizardBack} className="btn-ghost flex-1">{t.back}</button>
        <button
          disabled={!canContinue}
          onClick={() => (wizard.step === 3 ? confirmIdentity() : wizardNext())}
          className="btn-primary flex-1 disabled:opacity-40"
        >
          {wizard.step === 3 ? t.confirm : t.continue}
        </button>
      </div>
    </div>
  );
}
