'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCareerStore } from '@/store/careerStore';
import { getClub } from '@/data/career/clubs';
import { ATTR_KEYS, ATTR_LABEL } from '@/lib/career/attributes';
import { idolAt, idolLevel, idolCap, legacyOf, IDOL } from '@/lib/career/idolatry';
import { SHOP, itemName, canAfford } from '@/lib/career/shop';
import { mainRival } from '@/data/career/rivals';
import type { Lang } from '@/lib/career/i18n';

function money(n: number): string {
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `€${Math.round(n / 1000)}K`;
  return `€${n}`;
}

export default function LegacyPanel({ lang }: { lang: Lang }) {
  const { player, buyItem } = useCareerStore();
  const [shopOpen, setShopOpen] = useState(false);
  if (!player) return null;
  const es = lang === 'es';

  const club = player.clubId ? getClub(player.clubId) : null;
  const idol = player.clubId ? idolAt(player, player.clubId) : 0;
  const level = idolLevel(idol);
  const cap = player.clubId ? idolCap(player, player.clubId) : 100;
  const legacy = legacyOf(player);
  const rival = club ? mainRival(club.id) : null;
  const rivalClub = rival ? getClub(rival) : null;

  return (
    <div className="card p-4 sm:p-5 space-y-4">
      {/* ---- attributes ---- */}
      <div>
        <div className="text-[10px] tracking-[0.3em] text-white/40 uppercase mb-2">
          {es ? 'Atributos' : 'Attributes'}
        </div>
        <div className="space-y-1.5">
          {ATTR_KEYS.map(k => {
            const v = Math.round(player.attrs[k]);
            return (
              <div key={k} className="flex items-center gap-2">
                <span className="w-20 text-[11px] text-white/50 shrink-0">
                  {ATTR_LABEL[k][es ? 'es' : 'en']}
                </span>
                <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  {/* both keyframes must share a unit or the spring cannot interpolate */}
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-wc-dark to-wc"
                    initial={{ width: '0%' }}
                    animate={{ width: `${v}%` }}
                    transition={{ type: 'spring', stiffness: 90, damping: 18 }}
                  />
                </div>
                <motion.span
                  key={v}
                  initial={{ scale: 1.4, color: '#00DFA2' }}
                  animate={{ scale: 1, color: '#ffffff' }}
                  className="w-7 text-right font-display text-sm"
                >
                  {v}
                </motion.span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ---- idolatry at the current club ---- */}
      {club && (
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <div className="text-[10px] tracking-[0.3em] text-white/40 uppercase">
              {es ? 'Idolatría' : 'Idolatry'}
            </div>
            <span className="text-[11px] text-white/45">{club.name}</span>
          </div>
          <div className="relative h-3 rounded-full bg-white/10 overflow-hidden">
            {/* the ceiling — you cannot be an idol until you win here */}
            {cap < 100 && (
              <div
                className="absolute inset-y-0 bg-red-500/15 border-l border-red-400/40"
                style={{ left: `${cap}%`, right: 0 }}
              />
            )}
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-gold-dark via-gold to-yellow-200"
              initial={{ width: '0%' }}
              animate={{ width: `${Math.min(100, idol)}%` }}
              transition={{ type: 'spring', stiffness: 70, damping: 20 }}
            />
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className="font-display text-lg">
              {level.emoji} {es ? level.es : level.en}
            </span>
            <span className="text-[11px] text-white/45">
              {idol.toFixed(1)} / {cap}
            </span>
          </div>
          {cap === IDOL.capNoTitle && (
            <p className="text-[10px] text-amber-300/80 mt-1">
              🔒 {es
                ? 'Sin un título aquí, no pasas de 80. Gana algo con esta camiseta.'
                : 'Without a title here you cannot pass 80. Win something in this shirt.'}
            </p>
          )}
          {cap === IDOL.capTraitor && (
            <p className="text-[10px] text-red-400/90 mt-1">
              🗡️ {es ? 'Traidor. Techo 49 para siempre.' : 'Traitor. Capped at 49 forever.'}
            </p>
          )}
          {rivalClub && (
            <p className="text-[10px] text-white/35 mt-1">
              {es ? 'Clásico contra ' : 'Derby against '}<strong>{rivalClub.name}</strong>
              {es ? ' — un gol ahí vale diez.' : ' — a goal there is worth ten.'}
            </p>
          )}
        </div>
      )}

      {/* ---- money + shop ---- */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div>
          <div className="text-[10px] tracking-[0.3em] text-white/40 uppercase">
            {es ? 'Ganado' : 'Earned'}
          </div>
          <div className="font-display text-xl text-gold">{money(player.money ?? 0)}</div>
        </div>
        <motion.button
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }}
          onClick={() => setShopOpen(v => !v)}
          className="btn-ghost text-sm"
        >
          🛒 {es ? 'Tienda' : 'Shop'}
        </motion.button>
      </div>

      <AnimatePresence>
        {shopOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <p className="text-[11px] text-white/45 mb-2">
              {es
                ? 'El dinero no cuenta para la gloria: lo cambias por carrera.'
                : 'Money does not count toward glory — you trade it for career.'}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {SHOP.map(item => {
                const owned = (player.owned ?? []).includes(item.id);
                const afford = canAfford(player, item);
                return (
                  <button
                    key={item.id}
                    disabled={!afford}
                    onClick={() => buyItem(item.id)}
                    className={`rounded-xl border p-2 text-left transition-colors ${
                      owned ? 'border-wc/50 bg-wc/10'
                        : afford ? 'border-white/12 bg-white/5 hover:bg-white/10'
                          : 'border-white/5 bg-white/[0.02] opacity-40'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{item.emoji}</span>
                      <span className="text-[11px] leading-tight">{itemName(item, lang)}</span>
                    </div>
                    <div className={`text-[10px] mt-0.5 ${owned ? 'text-wc' : 'text-white/45'}`}>
                      {owned ? (es ? 'Comprado' : 'Owned') : money(item.price)}
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- best legacy across clubs ---- */}
      {legacy && legacy.clubId !== player.clubId && (
        <div className="pt-1 border-t border-white/10">
          <div className="text-[10px] text-white/40 uppercase tracking-[0.3em] mb-1">
            {es ? 'Tu mejor legado' : 'Your best legacy'}
          </div>
          <div className="text-sm">
            {legacy.level.emoji} <strong>{getClub(legacy.clubId)?.name}</strong>
            <span className="text-white/45"> · {legacy.value.toFixed(1)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
