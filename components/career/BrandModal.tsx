'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useCareerStore } from '@/store/careerStore';
import BrandMark, { BrandLockup, brandAccent } from './BrandMark';
import { getBrand } from '@/data/career/brands';
import {
  dealLabel, dealBlurb, offerHook, offerSummary, fmtMoney,
  type BootOffer,
} from '@/lib/career/sponsors';
import {
  brandEventTitle, brandEventDesc, brandOptLabel, brandOptOutcome,
  fillBrandCopy, brandChips,
} from '@/lib/career/brandEvents';
import type { Lang } from '@/lib/career/i18n';

const REASON: Record<string, [string, string]> = {
  first: ['Your first boot deal', 'Tu primer contrato de botas'],
  renew: ['The deal is up', 'El contrato se acaba'],
  dropped: ['They did not renew', 'No han renovado'],
  free: ['Somebody called your agent', 'Alguien llamó a tu representante'],
};
const SUB: Record<string, [string, string]> = {
  first: ['You have not played a professional match. Somebody wants your feet anyway.',
          'No has jugado un partido profesional. Alguien quiere tus pies igualmente.'],
  renew: ['This is what the market thinks you are worth now.',
          'Esto es lo que el mercado cree que vales ahora.'],
  dropped: ['You are on the open market, and these are the calls you got.',
            'Estás libre, y estas son las llamadas que has recibido.'],
  free: ['You have no deal. That is about to change.',
         'No tienes contrato. Eso está a punto de cambiar.'],
};

function OfferCard({
  o, lang, i, onPick,
}: { o: BootOffer; lang: Lang; i: number; onPick: () => void }) {
  const b = getBrand(o.brandId);
  const es = lang === 'es';
  if (!b) return null;

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 + i * 0.08 }}
      whileHover={{ scale: 1.015, y: -2 }} whileTap={{ scale: 0.99 }}
      onClick={onPick}
      className="w-full text-left rounded-2xl border border-white/12 bg-white/[0.04] p-3.5 hover:bg-white/[0.08] hover:border-white/25 transition-colors relative overflow-hidden"
    >
      {/* a wash of the brand's own colour, so the cards are told apart at a glance */}
      <div
        className="absolute inset-y-0 left-0 w-1.5"
        style={{ background: brandAccent(b.id) }}
      />
      <div className="flex items-start gap-3 pl-1.5">
        <BrandMark brandId={b.id} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="font-display text-lg leading-none">{b.name}</span>
            {o.renewal && (
              <span className="text-[9px] uppercase tracking-widest text-wc border border-wc/40 rounded-full px-1.5 py-0.5">
                {es ? 'Renovación' : 'Renewal'}
              </span>
            )}
          </div>
          <div className="text-[11px] text-gold/90 mt-1 font-semibold">
            {dealLabel(o.tier, lang)}
          </div>
          <p className="text-[11px] text-white/50 leading-snug mt-1">{offerHook(o, lang)}</p>
        </div>
        <div className="text-right shrink-0">
          <div className="font-display text-base leading-none">
            {o.annual > 0 ? fmtMoney(o.annual) : (es ? 'Sin fijo' : 'No fee')}
          </div>
          <div className="text-[10px] text-white/40 mt-1">
            {es ? `${o.years} años` : `${o.years} yrs`}
          </div>
        </div>
      </div>
    </motion.button>
  );
}

/**
 * Everything the brands ever put on screen.
 *
 * Two shapes: a table of offers to choose from, or one thing happening under
 * the deal you already have. It steps aside for anything more important — a
 * ceremony, a minigame, a clutch moment — and comes back when they are done,
 * because the beat stays in the store until it is dismissed.
 */
export default function BrandModal({ lang }: { lang: Lang }) {
  const {
    brand, player, ceremony, miniGame, moment,
    signBootDeal, declineBootDeals, chooseBrandOption, dismissBrand,
  } = useCareerStore();
  const es = lang === 'es';

  if (!brand || !player) return null;
  if (ceremony || miniGame || moment) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[78] grid place-items-center bg-black/90 backdrop-blur-md p-4 overflow-y-auto"
      >
        <motion.div
          initial={{ scale: 0.94, y: 22 }} animate={{ scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 180, damping: 21 }}
          className="w-full max-w-lg rounded-3xl border border-white/15 bg-[#0b0f14] overflow-hidden my-auto"
        >
          {/* ============================ offers ============================ */}
          {brand.kind === 'offer' && (
            <div className="p-5 sm:p-6">
              <div className="text-[10px] tracking-[0.4em] uppercase text-wc mb-1.5">
                {es ? 'Marcas' : 'Brands'}
              </div>
              <h2 className="font-display text-2xl leading-none mb-1.5">
                {REASON[brand.reason][es ? 1 : 0]}
              </h2>
              <p className="text-white/50 text-sm leading-snug mb-4">
                {SUB[brand.reason][es ? 1 : 0]}
              </p>

              {!brand.chosen ? (
                <>
                  <div className="space-y-2.5">
                    {brand.offers.map((o, i) => (
                      <OfferCard
                        key={o.brandId} o={o} lang={lang} i={i}
                        onPick={() => signBootDeal(i)}
                      />
                    ))}
                  </div>
                  <motion.button
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                    onClick={declineBootDeals}
                    className="btn-ghost w-full mt-3 text-sm"
                  >
                    {es ? 'Ninguno — seguir sin contrato' : 'None of them — stay unsigned'}
                  </motion.button>
                </>
              ) : brand.chosen === 'declined' ? (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="rounded-2xl border border-white/15 bg-white/5 px-4 py-4 text-sm text-white/75 leading-relaxed">
                    {es
                      ? 'Sigues sin contrato. Compras tus propias botas, eliges lo que quieres y no le debes un día de verano a nadie.'
                      : 'You stay unsigned. You buy your own boots, wear what you want, and owe nobody a day of your summer.'}
                  </div>
                  <button onClick={dismissBrand} className="btn-primary w-full mt-4">
                    {es ? 'Continuar' : 'Continue'}
                  </button>
                </motion.div>
              ) : (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="rounded-2xl border border-wc/40 bg-wc/10 px-4 py-4">
                    <BrandLockup brandId={brand.chosen.brandId} size={38} />
                    <div className="text-[11px] tracking-[0.25em] uppercase text-gold mt-3 mb-1">
                      {dealLabel(brand.chosen.tier, lang)}
                    </div>
                    <p className="text-sm text-white/80 leading-relaxed">
                      {dealBlurb(brand.chosen.tier, lang)}
                    </p>
                    <div className="text-sm text-white/55 mt-2 font-display">
                      {offerSummary(brand.chosen, lang)}
                    </div>
                  </div>
                  <button onClick={dismissBrand} className="btn-primary w-full mt-4">
                    {es ? 'Firmar' : 'Sign it'}
                  </button>
                </motion.div>
              )}
            </div>
          )}

          {/* ============================ an event ============================ */}
          {brand.kind === 'event' && (() => {
            const b = getBrand(brand.brandId);
            const name = b?.name ?? '';
            const fill = (t: string) => fillBrandCopy(t, player, name, lang);
            return (
              <>
                <div className="relative px-5 sm:px-6 pt-6 pb-5 overflow-hidden">
                  <div
                    className="absolute inset-0 opacity-[0.16]"
                    style={{ background: `radial-gradient(120% 80% at 20% 0%, ${brandAccent(brand.brandId)} 0%, transparent 70%)` }}
                  />
                  <motion.div
                    initial={{ scale: 0.5, rotate: -12, opacity: 0 }}
                    animate={{ scale: 1, rotate: 0, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 210, damping: 14 }}
                    className="relative mb-3"
                  >
                    <BrandLockup brandId={brand.brandId} size={44} />
                  </motion.div>
                  <motion.h2
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="relative font-display text-2xl leading-tight"
                  >
                    {fill(brandEventTitle(brand.def, lang))}
                  </motion.h2>
                  <motion.p
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="relative text-white/65 text-sm leading-relaxed mt-2.5"
                  >
                    {fill(brandEventDesc(brand.def, lang))}
                  </motion.p>
                  {brand.lifestyleFee > 0 && (
                    <motion.div
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="relative text-[11px] text-gold mt-3 font-display tracking-wide"
                    >
                      {es ? 'Sobre la mesa: ' : 'On the table: '}
                      {fmtMoney(brand.lifestyleFee)}
                    </motion.div>
                  )}
                </div>

                <div className="border-t border-white/10 px-5 sm:px-6 py-5">
                  {!brand.chosen ? (
                    <div className="space-y-2">
                      {brand.def.options.map((o, i) => (
                        <motion.button
                          key={o.id}
                          initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.2 + i * 0.07 }}
                          whileHover={{ scale: 1.01, x: 3 }} whileTap={{ scale: 0.99 }}
                          onClick={() => chooseBrandOption(o.id)}
                          className="w-full text-left rounded-xl border border-white/12 bg-white/5 px-3.5 py-3 text-sm transition-colors hover:bg-white/10 hover:border-wc/45"
                        >
                          {fill(brandOptLabel(o, lang))}
                        </motion.button>
                      ))}
                    </div>
                  ) : (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                      <div className="rounded-xl border border-wc/35 bg-wc/10 px-3.5 py-3">
                        <div className="text-[10px] tracking-[0.25em] uppercase text-wc/70 mb-1.5">
                          {fill(brandOptLabel(brand.chosen, lang))}
                        </div>
                        <p className="text-sm leading-relaxed text-white/85">
                          {fill(brandOptOutcome(brand.chosen, lang))}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {brandChips(
                          brand.chosen.effects, lang,
                          brand.chosen.effects.takeLifestyle ? brand.lifestyleFee : 0,
                        ).map((c, i) => (
                          <motion.span
                            key={c.label}
                            initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.15 + i * 0.05, type: 'spring', stiffness: 300, damping: 18 }}
                            className={`text-[11px] px-2 py-0.5 rounded-full border font-semibold ${
                              c.delta > 0
                                ? 'border-wc/50 bg-wc/15 text-wc'
                                : 'border-red-400/50 bg-red-500/15 text-red-300'
                            }`}
                          >
                            {c.money
                              ? fmtMoney(c.delta)
                              : `${c.delta > 0 ? '+' : ''}${c.delta}${c.flag ? '%' : ''}`} {c.label}
                          </motion.span>
                        ))}
                      </div>

                      <motion.button
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        onClick={dismissBrand}
                        className="btn-primary w-full mt-4"
                      >
                        {es ? 'Continuar' : 'Continue'}
                      </motion.button>
                    </motion.div>
                  )}
                </div>
              </>
            );
          })()}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
