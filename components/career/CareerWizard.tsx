'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useCareerStore } from '@/store/careerStore';
import { NATIONS } from '@/data/career/nations';
import { careerT, Lang } from '@/lib/career/i18n';
import { PITCH_POSITIONS, positionAbbr } from '@/lib/career/format';
import type { Position } from '@/data/types';
import { Jersey } from './bits';
import Face from './Face';

// Approximate national jersey colours for the preview.
const JERSEY: Record<string, [string, string]> = {
  AR: ['#6CABDD', '#ffffff'], BR: ['#FEDD00', '#009C3B'], FR: ['#001489', '#ffffff'],
  ES: ['#AA151B', '#F1BF00'], DE: ['#ffffff', '#000000'], EN: ['#ffffff', '#CF081F'],
  PT: ['#006600', '#DA020E'], NL: ['#F36C21', '#ffffff'], IT: ['#0066CC', '#ffffff'],
  BE: ['#E30613', '#FDDA24'], UY: ['#5CBFEB', '#ffffff'], HR: ['#ffffff', '#FF0000'],
  MX: ['#006847', '#ffffff'], US: ['#0A3161', '#ffffff'], JP: ['#000066', '#ffffff'],
  NG: ['#008751', '#ffffff'], MA: ['#C1272D', '#006233'], SN: ['#00853F', '#FDEF42'],
  CO: ['#FCD116', '#003893'], CL: ['#0039A6', '#D52B1E'], PE: ['#D91023', '#ffffff'],
  EC: ['#FFDD00', '#0033A0'], PY: ['#D52B1E', '#0038A8'], TR: ['#E30A17', '#ffffff'],
  SC: ['#005EB8', '#ffffff'], GR: ['#0D5EAF', '#ffffff'], PL: ['#DC143C', '#ffffff'],
  SE: ['#FECC00', '#006AA7'], NO: ['#BA0C2F', '#00205B'], DK: ['#C60C30', '#ffffff'],
  CH: ['#DA291C', '#ffffff'], AT: ['#ED2939', '#ffffff'], CZ: ['#D7141A', '#11457E'],
  RS: ['#C6363C', '#0C4076'], RU: ['#ffffff', '#0039A6'], UA: ['#FFD700', '#0057B7'],
  IE: ['#169B62', '#ffffff'], KR: ['#CD2E3A', '#0047A0'], EG: ['#CE1126', '#ffffff'],
  DZ: ['#006233', '#ffffff'], GH: ['#006B3F', '#FCD116'], CI: ['#F77F00', '#009E60'],
  CM: ['#007A5E', '#CE1126'], AU: ['#FFCD00', '#00843D'], CA: ['#FF0000', '#ffffff'],
  CR: ['#CE1126', '#002B7F'], SA: ['#006C35', '#ffffff'],
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

function SectionLabel({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-2.5">
      <span className="grid place-items-center w-5 h-5 rounded-full bg-wc/20 text-wc text-[11px] font-display">
        {n}
      </span>
      <span className="text-[10px] tracking-[0.3em] text-white/45 uppercase">{children}</span>
    </div>
  );
}

export default function CareerWizard({ lang }: { lang: Lang }) {
  const t = careerT(lang);
  const {
    wizard, setNation, setIdentity, setPosition, confirmIdentity, reset, rerollFace, setSeedInput,
  } = useCareerStore();
  const [query, setQuery] = useState('');
  // The shirt number is held as free text while you type, so the field can be
  // emptied and retyped. It is only committed to the store when it is a real
  // number, and "ready" below refuses to start until it is 1-99.
  const [numText, setNumText] = useState(String(wizard.number));
  const es = lang === 'es';
  const numValid = /^\d{1,2}$/.test(numText) && +numText >= 1 && +numText <= 99;

  const nations = useMemo(() => {
    const sorted = [...NATIONS].sort((a, b) => a[lang].localeCompare(b[lang]));
    const q = query.trim().toLowerCase();
    return q ? sorted.filter(n => n[lang].toLowerCase().includes(q)) : sorted;
  }, [query, lang]);

  const [jp, js] = jerseyColors(wizard.nationCode || 'AR');
  const ready = !!wizard.nationCode && wizard.surname.trim().length > 0
    && !!wizard.position && numValid;

  // What is still missing, so the disabled button explains itself.
  const missing: string[] = [];
  if (!wizard.nationCode) missing.push(es ? 'nacionalidad' : 'nationality');
  if (!wizard.surname.trim()) missing.push(es ? 'apellido' : 'surname');
  if (!wizard.position) missing.push(es ? 'posición' : 'position');
  if (!numValid) missing.push(es ? 'dorsal 1-99' : 'number 1-99');

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="font-display text-4xl sm:text-5xl leading-none">
          {es ? 'CREA TU JUGADOR' : 'CREATE YOUR PLAYER'}
        </h2>
        <p className="text-white/50 text-sm mt-1.5">
          {es ? 'Todo en una pantalla. Cuando esté listo, empieza la carrera.'
              : 'All on one screen. When it looks right, start the career.'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr_320px] gap-5 items-start">
        {/* ---- identity + live shirt ---- */}
        <div className="card p-4 order-1">
          <SectionLabel n={1}>{t.identity}</SectionLabel>
          <motion.div
            key={`${jp}${js}`}
            initial={{ scale: 0.96, opacity: 0.6 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 220, damping: 18 }}
            className="grid place-items-center py-1"
          >
            <Jersey
              primary={jp} secondary={js} surname={wizard.surname}
              number={numValid ? +numText : wizard.number} size={170}
            />
          </motion.div>

          {/* the face, rolled to suit the flag and re-rollable */}
          {wizard.face && (
            <div className="flex items-center gap-3 mt-1 rounded-2xl border border-white/10 bg-white/[0.03] p-2.5">
              <motion.div
                key={JSON.stringify(wizard.face)}
                initial={{ scale: 0.85, opacity: 0, rotate: -6 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 18 }}
              >
                {/* Shown at the age the face is fully grown in, so the beard you
                    rolled is actually visible while you are choosing it. In game
                    it still renders at your real age — clean-shaven at 16. */}
                <Face genes={wizard.face} age={26} size={64} />
              </motion.div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] tracking-widest text-white/40 uppercase">
                  {es ? 'Tu cara' : 'Your face'}
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.92, rotate: -20 }}
                onClick={rerollFace}
                className="btn-ghost text-xs shrink-0"
                title={es ? 'Otra cara' : 'Reroll face'}
              >🎲</motion.button>
            </div>
          )}

          {/* The seed is the whole world: same seed and same choices, same career.
              Blank rolls one, which is the only kind that counts as ranked. */}
          <label className="block mt-3">
            <span className="text-[10px] tracking-widest text-white/40 uppercase">
              {es ? 'Semilla' : 'Seed'}
            </span>
            <input
              value={wizard.seedInput}
              onChange={e => setSeedInput(e.target.value)}
              placeholder={es ? 'Vacío = aleatoria' : 'Blank = random'}
              spellCheck={false}
              className="w-full mt-1 rounded-xl bg-white/5 border border-white/15 px-3 py-2.5 font-mono text-sm focus:outline-none focus:border-wc/60 placeholder-white/25"
            />
            <span className={`block text-[10px] mt-1 leading-snug ${
              wizard.seedInput.trim() ? 'text-amber-300/80' : 'text-white/35'
            }`}>
              {wizard.seedInput.trim()
                ? (es
                    ? 'Partida con semilla: repetible y compartible, pero va a la tabla aparte.'
                    : 'Seeded run: repeatable and shareable, but it goes on the separate board.')
                : (es
                    ? 'Se sortea una semilla. Solo estas partidas puntúan en la tabla principal.'
                    : 'A seed will be rolled. Only these runs count on the main board.')}
            </span>
          </label>

          <div className="grid grid-cols-[1fr_84px] gap-2 mt-3">
            <label className="block">
              <span className="text-[10px] tracking-widest text-white/40 uppercase">{t.surname}</span>
              <input
                value={wizard.surname}
                onChange={e => setIdentity({ surname: e.target.value.slice(0, 14), number: wizard.number, foot: wizard.foot })}
                placeholder={t.surname.toUpperCase()}
                className="w-full mt-1 rounded-xl bg-white/5 border border-white/15 px-3 py-2.5 uppercase focus:outline-none focus:border-wc/60 placeholder-white/25"
              />
            </label>
            <label className="block">
              <span className="text-[10px] tracking-widest text-white/40 uppercase">{t.number}</span>
              <input
                type="text" inputMode="numeric" maxLength={2} placeholder="10"
                value={numText}
                onChange={e => {
                  // accept an empty field and partial input; only push a valid
                  // number through to the store
                  const raw = e.target.value.replace(/[^0-9]/g, '').slice(0, 2);
                  setNumText(raw);
                  const n = parseInt(raw, 10);
                  if (n >= 1 && n <= 99) {
                    setIdentity({ surname: wizard.surname, number: n, foot: wizard.foot });
                  }
                }}
                className={`w-full mt-1 rounded-xl bg-white/5 border px-3 py-2.5 focus:outline-none placeholder-white/25 ${
                  numText === '' || numValid
                    ? 'border-white/15 focus:border-wc/60'
                    : 'border-red-500/60'
                }`}
              />
            </label>
          </div>

          <div className="mt-3">
            <span className="text-[10px] tracking-widest text-white/40 uppercase">{t.foot}</span>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {(['left', 'right'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setIdentity({ surname: wizard.surname, number: wizard.number, foot: f })}
                  className={`rounded-xl px-3 py-2.5 border font-display tracking-wide transition-colors ${
                    wizard.foot === f ? 'border-wc bg-wc/15' : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  {f === 'left' ? t.left : t.right}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ---- nationality ---- */}
        <div className="card p-4 order-3 lg:order-2">
          <SectionLabel n={2}>{t.nationality}</SectionLabel>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={`🔎  ${t.searchCountry}`}
            className="w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2.5 mb-2.5 focus:outline-none focus:border-wc/60 placeholder-white/25"
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-[330px] overflow-y-auto pr-1">
            {nations.map(n => (
              <button
                key={n.code}
                onClick={() => setNation(n.code)}
                className={`flex items-center gap-2 rounded-lg px-2.5 py-2 border text-left transition-colors ${
                  wizard.nationCode === n.code
                    ? 'border-wc bg-wc/15'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <span className="text-lg leading-none">{n.flag}</span>
                <span className="font-semibold text-xs truncate">{n[lang]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ---- position ---- */}
        <div className="card p-4 order-2 lg:order-3">
          <SectionLabel n={3}>{t.position}</SectionLabel>
          <div
            className="relative w-full aspect-[3/4] rounded-xl border border-white/15 overflow-hidden"
            style={{ background: 'linear-gradient(180deg,#0b3d1f,#0d5e2a)' }}
          >
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(180deg,transparent,transparent 22px,#fff2 22px,#fff2 44px)' }} />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border border-white/25" />
            <div className="absolute left-0 right-0 top-1/2 h-px bg-white/25" />
            {PITCH_POSITIONS.map(pos => {
              const [x, y] = POS_COORDS[pos];
              const active = wizard.position === pos;
              return (
                <button
                  key={pos}
                  onClick={() => setPosition(pos)}
                  style={{ left: `${x}%`, top: `${y}%` }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 px-2 py-1 rounded-lg font-display text-xs tracking-wide border transition-all ${
                    active
                      ? 'bg-wc text-black border-wc scale-110 shadow-lg'
                      : 'bg-black/55 text-white border-white/25 hover:bg-black/80'
                  }`}
                >
                  {positionAbbr(pos, lang)}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-5 max-w-md mx-auto">
        <button onClick={reset} className="btn-ghost flex-1">{t.back}</button>
        <motion.button
          disabled={!ready}
          whileHover={ready ? { scale: 1.02 } : undefined}
          whileTap={ready ? { scale: 0.98 } : undefined}
          onClick={confirmIdentity}
          className="btn-primary flex-[2] disabled:opacity-40"
        >
          {ready ? t.confirm : `${es ? 'Falta' : 'Missing'}: ${missing.join(', ')}`}
        </motion.button>
      </div>
    </div>
  );
}
