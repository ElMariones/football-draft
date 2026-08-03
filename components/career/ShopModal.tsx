'use client';

// The shop, as a real dialog.
//
// It used to expand inline inside the left rail, which on a 290px column meant
// two-across cards with no room to say what anything actually did — so money
// was a number you spent blind. As a modal it gets the whole screen: tabs by
// category, the effect spelled out on every card, and what you already own kept
// visible so a long career reads as a collection.
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCareerStore } from '@/store/careerStore';
import {
  SHOP, SHOP_KINDS, KIND_LABEL, KIND_BLURB, itemName, canAfford, owns, isUnlocked,
  injuryResistOf, wageMultiplierOf, type ShopItem, type ShopKind,
} from '@/lib/career/shop';
import { ATTR_LABEL, type AttrKey } from '@/lib/career/attributes';
import type { Lang } from '@/lib/career/i18n';

function money(n: number): string {
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `€${Math.round(n / 1_000)}K`;
  return `€${n}`;
}

/** Every effect an item has, as short chips — so nothing is bought blind. */
function effectChips(i: ShopItem, es: boolean): string[] {
  const out: string[] = [];
  for (const [k, v] of Object.entries(i.attrs ?? {})) {
    out.push(`+${v} ${ATTR_LABEL[k as AttrKey][es ? 'es' : 'en']}`);
  }
  if (i.fitness) out.push(`+${i.fitness} ${es ? 'Estado' : 'Fitness'}`);
  if (i.stamina) out.push(`+${i.stamina} ${es ? 'Resistencia' : 'Stamina'}`);
  if (i.morale) out.push(`+${i.morale} ${es ? 'Ánimo' : 'Morale'}`);
  if (i.reputation) out.push(`+${i.reputation} ${es ? 'Fama' : 'Fame'}`);
  if (i.idol) out.push(`+${i.idol} ${es ? 'Idolatría' : 'Idolatry'}`);
  if (i.injuryResist) out.push(`−${Math.round(i.injuryResist * 100)}% ${es ? 'lesiones' : 'injuries'}`);
  if (i.wageBoost) out.push(`+${Math.round(i.wageBoost * 100)}% ${es ? 'sueldo' : 'wages'}`);
  return out;
}

export default function ShopModal({
  open, onClose, lang, tab, setTab,
}: {
  open: boolean; onClose: () => void; lang: Lang;
  tab: ShopKind; setTab: (k: ShopKind) => void;
}) {
  const { player, buyItem } = useCareerStore();
  const es = lang === 'es';

  // Escape closes it, and the page behind must not scroll while it is up.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!player) return null;
  const items = SHOP.filter(i => i.kind === tab);
  const ownedCount = (player.owned ?? []).length;
  const resist = injuryResistOf(player);
  const wageMul = wageMultiplierOf(player);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          // clicking the backdrop closes; the click is stopped inside the panel
          onClick={onClose}
          className="fixed inset-0 z-[80] grid place-items-center bg-black/80 backdrop-blur-sm p-3 sm:p-6"
        >
          <motion.div
            initial={{ scale: 0.94, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 10 }}
            transition={{ type: 'spring', stiffness: 200, damping: 22 }}
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            className="w-full max-w-3xl max-h-[88vh] flex flex-col rounded-3xl border border-white/15 bg-[#0b0f14] overflow-hidden"
          >
            {/* header: what you have to spend, and the way out */}
            <div className="flex items-center gap-3 px-4 sm:px-5 py-3 border-b border-white/10">
              <span className="text-2xl">🛒</span>
              <div className="min-w-0 flex-1">
                <div className="font-display text-xl leading-none">
                  {es ? 'Tienda' : 'Shop'}
                </div>
                <div className="text-[11px] text-white/45 mt-0.5">
                  {ownedCount} {es ? 'comprados' : 'owned'}
                  {resist > 0 && <> · −{Math.round(resist * 100)}% {es ? 'lesiones' : 'injuries'}</>}
                  {wageMul > 1 && <> · +{Math.round((wageMul - 1) * 100)}% {es ? 'sueldo' : 'wages'}</>}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[9px] uppercase tracking-widest text-white/35">
                  {es ? 'Ganado' : 'Earned'}
                </div>
                <div className="font-display text-xl text-gold leading-none">
                  {money(player.money ?? 0)}
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label={es ? 'Cerrar' : 'Close'}
                className="ml-1 w-9 h-9 shrink-0 rounded-full border border-white/15 bg-white/5 hover:bg-white/15 grid place-items-center text-white/60 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* tabs */}
            <div className="flex gap-1 px-3 sm:px-5 pt-3 overflow-x-auto">
              {SHOP_KINDS.map(k => {
                const n = SHOP.filter(i => i.kind === k && owns(player, i.id)).length;
                return (
                  <button
                    key={k}
                    onClick={() => setTab(k)}
                    className={`relative px-3 py-1.5 text-xs font-display tracking-wide whitespace-nowrap rounded-lg transition-colors ${
                      tab === k ? 'bg-white/10 text-white' : 'text-white/45 hover:text-white/75'
                    }`}
                  >
                    {KIND_LABEL[k][es ? 'es' : 'en']}
                    {n > 0 && <span className="ml-1.5 text-[10px] text-wc">{n}</span>}
                  </button>
                );
              })}
            </div>
            <p className="px-4 sm:px-5 pt-2 pb-1 text-[11px] text-white/40">
              {KIND_BLURB[tab][es ? 'es' : 'en']}
            </p>

            {/* items */}
            <div className="flex-1 overflow-y-auto px-3 sm:px-5 pb-4 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {items.map(item => {
                  const owned = owns(player, item.id);
                  const locked = !isUnlocked(player, item);
                  const afford = canAfford(player, item);
                  const chips = effectChips(item, es);
                  return (
                    <button
                      key={item.id}
                      disabled={!afford}
                      onClick={() => buyItem(item.id)}
                      className={`rounded-2xl border p-3 text-left transition-colors ${
                        owned
                          ? 'border-wc/45 bg-wc/10'
                          : locked
                            ? 'border-white/8 bg-white/[0.02] opacity-55 cursor-not-allowed'
                            : afford
                              ? 'border-white/15 bg-white/5 hover:bg-white/10 hover:border-gold/50'
                              : 'border-white/8 bg-white/[0.02] opacity-55 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="text-2xl leading-none shrink-0">{item.emoji}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-2">
                            <span className="font-display text-base leading-tight truncate">
                              {itemName(item, lang)}
                            </span>
                            {owned && <span className="text-[10px] text-wc shrink-0">✓</span>}
                          </div>
                          {(item.effEn || item.legacyEn) && (
                            <p className="text-[11px] text-white/45 leading-snug mt-0.5">
                              {es
                                ? (item.effEs ?? item.legacyEs)
                                : (item.effEn ?? item.legacyEn)}
                            </p>
                          )}
                        </div>
                        <span className={`font-display text-sm shrink-0 ${
                          owned ? 'text-white/30' : afford ? 'text-gold' : 'text-white/35'
                        }`}>
                          {owned ? (es ? 'Tuyo' : 'Owned') : money(item.price)}
                        </span>
                      </div>

                      {chips.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {chips.map(c => (
                            <span key={c}
                              className="text-[10px] px-1.5 py-0.5 rounded-full border border-wc/30 bg-wc/10 text-wc/90">
                              {c}
                            </span>
                          ))}
                        </div>
                      )}

                      {locked && !owned && (
                        <div className="text-[10px] text-amber-300/80 mt-2">
                          🔒 {es
                            ? `Necesitas ${item.minReputation} de fama (tienes ${Math.round(player.reputation)})`
                            : `Needs ${item.minReputation} fame (you have ${Math.round(player.reputation)})`}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
