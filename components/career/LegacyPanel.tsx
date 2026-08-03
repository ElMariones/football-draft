'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCareerStore } from '@/store/careerStore';
import { getClub } from '@/data/career/clubs';
import { ATTR_KEYS, ATTR_LABEL } from '@/lib/career/attributes';
import { idolAt, idolLevel, idolCap, legacyOf, IDOL } from '@/lib/career/idolatry';
import type { ShopKind } from '@/lib/career/shop';
import ShopModal from './ShopModal';
import { mainRival } from '@/data/career/rivals';
import type { Lang } from '@/lib/career/i18n';

const clampPct = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

function money(n: number): string {
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `€${Math.round(n / 1000)}K`;
  return `€${n}`;
}

export default function LegacyPanel({ lang }: { lang: Lang }) {
  const { player } = useCareerStore();
  const [shopOpen, setShopOpen] = useState(false);
  const [shopTab, setShopTab] = useState<ShopKind>('staff');
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

      {/* ---- condition: the four hidden stats that actually drive the sim ----
          Estado and Resistencia decide how much of the season you are available
          for, Fama gates which clubs will call, and Minutos is the standing the
          manager gives you. They were invisible before, which made the cards
          and shop items that move them feel arbitrary. */}
      <div>
        <div className="text-[10px] tracking-[0.3em] text-white/40 uppercase mb-2">
          {es ? 'Condición' : 'Condition'}
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          {([
            ['Estado', 'Fitness', Math.round(player.fitness), 'bg-emerald-400',
              es ? 'Sube tus minutos' : 'Raises your minutes'],
            ['Resistencia', 'Stamina', Math.round(player.stamina ?? 70), 'bg-cl',
              es ? 'Bajo = te pierdes partidos' : 'Low = you miss games'],
            ['Fama', 'Fame', Math.round(player.reputation), 'bg-gold',
              es ? 'Abre clubes y premios' : 'Unlocks clubs and awards'],
            ['Minutos', 'Standing', Math.round(50 + player.roleBias * 4), 'bg-purple-400',
              es ? 'Tu sitio en el once' : 'Your place in the XI'],
          ] as const).map(([esL, enL, v, bar, hint]) => (
            <div key={enL} title={hint}>
              <div className="flex justify-between text-[10px] text-white/50">
                <span>{es ? esL : enL}</span>
                <span className="text-white/70">{clampPct(v)}</span>
              </div>
              <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${bar}`}
                  initial={{ width: '0%' }}
                  animate={{ width: `${clampPct(v)}%` }}
                  transition={{ type: 'spring', stiffness: 90, damping: 18 }}
                />
              </div>
            </div>
          ))}
        </div>
        {player.rolePromise && player.rolePromiseYears > 0 && (
          <p className="text-[10px] text-wc/80 mt-1.5">
            📄 {es ? 'El club te prometió ser ' : 'The club promised you '}
            <strong>
              {player.rolePromise === 'starter' ? (es ? 'titular' : 'a starter')
                : player.rolePromise === 'rotation' ? (es ? 'rotación' : 'rotation')
                  : (es ? 'promesa' : 'a prospect')}
            </strong>
            {es ? ` — se respeta ${player.rolePromiseYears} temporada(s) más.`
                : ` — honoured for ${player.rolePromiseYears} more season(s).`}
          </p>
        )}
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
          onClick={() => setShopOpen(true)}
          className="btn-ghost text-sm"
        >
          🛒 {es ? 'Tienda' : 'Shop'}
        </motion.button>
      </div>



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
      <ShopModal
        open={shopOpen}
        onClose={() => setShopOpen(false)}
        lang={lang}
        tab={shopTab}
        setTab={setShopTab}
      />
    </div>
  );
}
