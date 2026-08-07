'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCareerStore } from '@/store/careerStore';
import BrandMark, { brandAccent } from './BrandMark';
import { getBrand, CAT_LABEL } from '@/data/career/brands';
import {
  marketability, marketLabel, dealLabel, sponsorIncome, fmtMoney,
} from '@/lib/career/sponsors';
import type { Lang } from '@/lib/career/i18n';

/**
 * The brand rail.
 *
 * Three things, in the order you care about them: who is on your feet and how
 * that is going, what the market thinks you are worth, and everything else with
 * your name on it. The past deals are folded away — they matter at the end of a
 * career, not in the middle of one.
 */
export default function SponsorPanel({ lang }: { lang: Lang }) {
  const { player, trophies } = useCareerStore();
  const [openPast, setOpenPast] = useState(false);
  if (!player) return null;
  const es = lang === 'es';

  const sp = player.sponsor;
  const brand = sp ? getBrand(sp.brandId) : null;
  const m = marketability(player, trophies);
  const held = (player.endorsements ?? []).map(getBrand).filter(Boolean);
  const past = player.sponsorHistory ?? [];
  const lifetime = past.reduce((a, x) => a + x.earned, 0) + (sp?.earned ?? 0);

  return (
    <div className="card p-4 sm:p-5 space-y-4">
      <div className="flex items-baseline justify-between">
        <div className="text-[10px] tracking-[0.3em] text-white/40 uppercase">
          {es ? 'Marcas' : 'Brands'}
        </div>
        {lifetime > 0 && (
          <div className="text-[10px] text-gold/80 font-display">{fmtMoney(lifetime)}</div>
        )}
      </div>

      {/* ---- the boot deal ---- */}
      {sp && brand ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 relative overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 w-1"
            style={{ background: brandAccent(brand.id) }}
          />
          <div className="flex items-center gap-2.5 pl-1.5 mb-2">
            <BrandMark brandId={brand.id} size={30} />
            <div className="min-w-0">
              <div className="font-display text-sm leading-none truncate">{brand.name}</div>
              <div className="text-[10px] text-gold/85 mt-1 leading-none">
                {dealLabel(sp.tier, lang)}
                {sp.signature && ' ★'}
              </div>
            </div>
            <div className="ml-auto text-right shrink-0">
              <div className="font-display text-sm leading-none">
                {sp.annual > 0 ? fmtMoney(sponsorIncome(sp)) : '—'}
              </div>
              <div className="text-[9px] text-white/35 mt-1">
                {es ? `${sp.yearsLeft} año${sp.yearsLeft === 1 ? '' : 's'}` : `${sp.yearsLeft} yr${sp.yearsLeft === 1 ? '' : 's'}`}
              </div>
            </div>
          </div>

          {/* how the brand feels about you — the number that decides renewals */}
          <div className="pl-1.5">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[9px] uppercase tracking-wider text-white/35">
                {es ? 'Con la marca' : 'With the brand'}
              </span>
              <span className={`ml-auto text-[10px] font-display ${
                sp.standing >= 70 ? 'text-wc' : sp.standing >= 40 ? 'text-white/70' : 'text-red-300'
              }`}>
                {Math.round(sp.standing)}
              </span>
            </div>
            <div className="h-1 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${
                  sp.standing >= 70 ? 'bg-wc' : sp.standing >= 40 ? 'bg-white/50' : 'bg-red-400'
                }`}
                initial={{ width: '0%' }} animate={{ width: `${Math.round(sp.standing)}%` }}
                transition={{ type: 'spring', stiffness: 90, damping: 20 }}
              />
            </div>
            {sp.standing < 38 && (
              <p className="text-[10px] text-red-300/80 mt-1.5 leading-snug">
                {es ? 'No están contentos. Esto no se renueva solo.'
                    : 'They are not happy. This does not renew itself.'}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-white/12 px-3 py-3 text-center">
          <div className="text-lg leading-none mb-1.5 opacity-40">👟</div>
          <p className="text-[11px] text-white/45 leading-snug">
            {es ? 'Sin contrato de botas. Compras las tuyas.'
                : 'No boot deal. You buy your own.'}
          </p>
        </div>
      )}

      {/* ---- what the market sees ---- */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[9px] uppercase tracking-wider text-white/35">
            {es ? 'Mercado' : 'Market'}
          </span>
          <span className="ml-auto text-[10px] text-white/70 font-display">{marketLabel(m, lang)}</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-gold/60 to-gold"
            initial={{ width: '0%' }} animate={{ width: `${m}%` }}
            transition={{ type: 'spring', stiffness: 90, damping: 18 }}
          />
        </div>
      </div>

      {/* ---- everything else with your name on it ---- */}
      {held.length > 0 && (
        <div>
          <div className="text-[9px] uppercase tracking-wider text-white/35 mb-1.5">
            {es ? 'Otros acuerdos' : 'Other deals'}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {held.map((b, i) => (
              <motion.div
                key={b!.id}
                initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 18 }}
                title={`${b!.name} — ${b!.cat ? CAT_LABEL[b!.cat][es ? 1 : 0] : ''}`}
                className="flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.04] pl-1 pr-2 py-1"
              >
                <BrandMark brandId={b!.id} size={16} />
                <span className="text-[10px] text-white/65 leading-none">{b!.name}</span>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* ---- the ones that ended ---- */}
      {past.length > 0 && (
        <div>
          <button
            onClick={() => setOpenPast(v => !v)}
            className="w-full flex items-center gap-2 text-[9px] uppercase tracking-wider text-white/35 hover:text-white/60 transition-colors"
          >
            {es ? 'Contratos anteriores' : 'Past deals'}
            <span className="ml-auto">{openPast ? '▴' : `▾ ${past.length}`}</span>
          </button>
          <AnimatePresence initial={false}>
            {openPast && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="space-y-1.5 pt-2">
                  {past.map((x, i) => {
                    const b = getBrand(x.brandId);
                    if (!b) return null;
                    return (
                      <div key={`${x.brandId}-${x.from}-${i}`} className="flex items-center gap-2">
                        <BrandMark brandId={b.id} size={16} />
                        <span className="text-[11px] text-white/60 truncate">{b.name}</span>
                        {x.signature && <span className="text-[10px] text-gold">★</span>}
                        <span className="ml-auto text-[10px] text-white/30 shrink-0">
                          {x.from}–{x.to}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
