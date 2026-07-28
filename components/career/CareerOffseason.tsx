'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCareerStore } from '@/store/careerStore';
import type { ClubOffer, Title } from '@/data/career/types';
import { getClub } from '@/data/career/clubs';
import { getLeague, leagueName } from '@/data/career/leagues';
import { careerT, titleLabel, Lang } from '@/lib/career/i18n';
import { offerFlavor, seasonFlavor } from '@/lib/career/flavor';
import { Crest } from './bits';
import { LeagueBadge } from './crests';
import { areRivals } from '@/data/career/rivals';

function roleLabel(role: string, t: ReturnType<typeof careerT>) {
  return role === 'starter' ? t.roleStarter : role === 'rotation' ? t.roleRotation : t.roleProspect;
}

function OfferCard({
  offer, chosen, onClick, lang, t, verbLabel, flavor, betrayal,
}: {
  offer: ClubOffer; chosen: boolean; onClick: () => void; lang: Lang;
  t: ReturnType<typeof careerT>; verbLabel: string; flavor: string; betrayal?: boolean;
}) {
  const club = getClub(offer.clubId);
  if (!club) return null;
  const league = getLeague(club.leagueId);
  return (
    <motion.button
      layout
      onClick={onClick}
      whileHover={{ scale: chosen ? 1.02 : 1.04, y: -2 }}
      whileTap={{ scale: 0.97 }}
      animate={chosen ? { scale: 1.02 } : { scale: 1 }}
      className={`flex flex-col items-center text-center gap-2 rounded-2xl border px-3 py-4 transition-colors ${
        chosen ? 'border-wc bg-wc/15 shadow-[0_0_25px_rgba(0,223,162,0.25)]'
          : betrayal ? 'border-red-500/40 bg-red-500/5 hover:bg-red-500/10'
            : 'border-white/10 bg-white/5 hover:bg-white/10'
      }`}
    >
      <div className="text-[10px] tracking-widest text-white/40 uppercase">{verbLabel}</div>
      {/* Signing for a direct rival is permanent and brutal — never let it be a
          surprise, because the idolatry cap it applies can never be undone. */}
      {betrayal && (
        <span className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-400/50">
          {lang === 'es' ? '🗡️ Clásico rival' : '🗡️ Arch rival'}
        </span>
      )}
      {/* the club that made you, asking for one last chapter */}
      {offer.homecoming && (
        <span className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-wc/20 text-wc border border-wc/50">
          {lang === 'es' ? '🏡 La vuelta a casa' : '🏡 Homecoming'}
        </span>
      )}
      {/* the rare out-of-region suitor, called out so it reads as a story beat */}
      {offer.wildcard && (
        <span className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-gold/20 text-gold border border-gold/40">
          {lang === 'es' ? '✦ Oferta sorpresa' : '✦ Surprise bid'}
        </span>
      )}
      <div className="font-display text-lg leading-tight">{club.name}</div>
      <Crest clubId={club.id} size={52} />
      <div className="flex items-center gap-1 text-[10px] text-white/45">
        {league && <LeagueBadge leagueId={league.id} size={14} />}
        {league ? leagueName(league.id, lang) : ''}
      </div>
      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10">{t.role}: {roleLabel(offer.role, t)}</span>
      <span className="text-[10px] text-wc/80 italic leading-tight">{flavor}</span>
    </motion.button>
  );
}

function EventZone({ lang }: { lang: Lang }) {
  const t = careerT(lang);
  const { offseason, resolveEvent } = useCareerStore();
  // The dice-roll: when an option has more than one possible outcome we spin
  // through them for a beat before the engine's answer is revealed, so the
  // randomness is something you watch happen rather than a number that
  // silently appears.
  const [rolling, setRolling] = useState<number | null>(null);
  const [spin, setSpin] = useState(0);

  const pickOption = (i: number, outcomeCount: number) => {
    if (!offseason || offseason.eventResolved || rolling !== null) return;
    if (outcomeCount < 2) { resolveEvent(i); return; }
    setRolling(i);
    let ticks = 0;
    const id = window.setInterval(() => {
      ticks += 1;
      setSpin(s => s + 1);
      // ease out: slow the cycling down before it stops
      if (ticks > 16) {
        window.clearInterval(id);
        setRolling(null);
        resolveEvent(i);
      }
    }, 70);
  };

  if (!offseason) return null;
  const ev = offseason.event;

  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-4 sm:p-5">
      <div className="text-[10px] tracking-[0.3em] text-white/40 uppercase mb-3">{t.eventZone}</div>
      {!ev ? (
        <div className="text-white/50 text-sm py-6 text-center italic">{t.noNews}</div>
      ) : (
        <>
          <h3 className="font-display text-2xl mb-1">{ev.title}</h3>
          <p className="text-sm text-white/60 mb-4">{ev.desc}</p>
          <div className="grid grid-cols-2 gap-3">
            {ev.options.map((opt, i) => {
              const total = opt.outcomes.reduce((a, o) => a + o.weight, 0);
              const chosen = offseason.eventOptionChosen === i;
              const disabled = offseason.eventResolved;
              return (
                <motion.button
                  key={i}
                  whileHover={disabled ? undefined : { scale: 1.03, y: -2 }}
                  whileTap={disabled ? undefined : { scale: 0.97 }}
                  disabled={disabled || rolling !== null}
                  onClick={() => pickOption(i, opt.outcomes.length)}
                  className={`rounded-2xl border px-3 py-3 text-left transition-colors ${
                    chosen ? 'border-wc bg-wc/15'
                      : disabled ? 'border-white/5 bg-white/5 opacity-40'
                        : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="font-display text-lg mb-2 flex items-center gap-2">
                    {opt.label}
                    {rolling === i && (
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.45, repeat: Infinity, ease: 'linear' }}
                        className="text-sm"
                      >🎲</motion.span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {opt.outcomes.map((o, j) => {
                      const pct = Math.round((o.weight / total) * 100);
                      const highlight = chosen && offseason.eventBadges.includes(o.badge);
                      // while this option is rolling, one chip lights up at a
                      // time so you can see the dice turning over
                      const spinning = rolling === i && spin % opt.outcomes.length === j;
                      return (
                        <motion.span key={j}
                          animate={
                            highlight ? { scale: [1, 1.15, 1] }
                              : spinning ? { scale: 1.12 } : { scale: 1 }
                          }
                          transition={{ duration: highlight ? 0.5 : 0.07 }}
                          className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                            highlight ? 'border-emerald-400 bg-emerald-400/25 text-emerald-200 shadow-[0_0_14px_rgba(52,211,153,0.5)]'
                              : spinning ? 'border-gold bg-gold/25 text-gold shadow-[0_0_14px_rgba(255,215,0,0.5)]'
                                : 'border-white/15 bg-white/5 text-white/70'
                          }`}>
                          {o.badge}{opt.outcomes.length > 1 ? ` · ${pct}%` : ''}
                        </motion.span>
                      );
                    })}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </>
      )}
    </motion.div>
  );
}

function ForcedBoard({ lang }: { lang: Lang }) {
  const t = careerT(lang);
  const { player, forced, forcedToggleLock, forcedReroll, forcedAccept, closeForced } = useCareerStore();
  if (!forced || !player) return null;
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
      className="mt-4 rounded-2xl border border-amber-400/30 bg-amber-400/5 p-4 overflow-hidden"
    >
      <div className="flex items-center justify-between mb-1">
        <h4 className="font-display text-lg">{t.forcedTitle}</h4>
        <button onClick={closeForced} className="text-xs text-white/50 hover:text-white/80 underline underline-offset-2">{t.cancel}</button>
      </div>
      <p className="text-xs text-white/50 mb-3">{t.forcedDesc}</p>
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1">
          <div className="flex justify-between text-[9px] uppercase tracking-widest text-white/40 mb-1">
            <span>{t.desperation}</span><span>{forced.desperation}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <motion.div className="h-full rounded-full bg-red-500" animate={{ width: `${forced.desperation}%` }} transition={{ type: 'spring', stiffness: 120, damping: 18 }} />
          </div>
        </div>
        <motion.button
          whileTap={{ scale: 0.9, rotate: -15 }}
          disabled={forced.rerollsLeft <= 0}
          onClick={forcedReroll}
          className="btn-ghost text-sm disabled:opacity-30"
        >
          🎲 {t.reroll} ({forced.rerollsLeft})
        </motion.button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {forced.slots.map((slot, i) => {
          const club = getClub(slot.clubId);
          if (!club) return null;
          const league = getLeague(club.leagueId);
          return (
            <AnimatePresence mode="popLayout" key={i}>
              <motion.div
                key={slot.clubId + (slot.locked ? '-l' : '')}
                initial={{ opacity: 0, rotateY: 90 }} animate={{ opacity: 1, rotateY: 0 }} exit={{ opacity: 0, rotateY: -90 }}
                transition={{ duration: 0.3 }}
                className={`rounded-xl border p-2 flex flex-col items-center gap-1.5 ${slot.locked ? 'border-gold bg-gold/10' : 'border-white/10 bg-white/5'}`}
              >
                <Crest clubId={club.id} size={40} />
                <div className="font-display text-sm text-center leading-tight">{club.name}</div>
                <div className="text-[9px] text-white/45">{league ? leagueName(league.id, lang) : ''}</div>
                <div className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/10">{roleLabel(slot.role, t)}</div>
                <div className="flex gap-1 w-full mt-1">
                  <button onClick={() => forcedToggleLock(i)} className={`flex-1 text-[10px] py-1 rounded-md ${slot.locked ? 'bg-gold text-black' : 'bg-white/10 hover:bg-white/20'}`}>
                    {slot.locked ? '🔒 ' + t.locked : '🔓 ' + t.lock}
                  </button>
                  <button onClick={() => forcedAccept(i)} className="flex-1 text-[10px] py-1 rounded-md bg-wc text-black font-semibold">{t.accept}</button>
                </div>
              </motion.div>
            </AnimatePresence>
          );
        })}
      </div>
    </motion.div>
  );
}

function TransferZone({ lang }: { lang: Lang }) {
  const t = careerT(lang);
  const { player, offseason, forced, chooseOffer, stay, openForced } = useCareerStore();
  if (!offseason || !player) return null;

  const verbLabelFor = (o: ClubOffer) => (o.verb === 'loan' ? t.loanTo : t.signFor);

  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-4 sm:p-5">
      <div className="text-[10px] tracking-[0.3em] text-white/40 uppercase mb-1">
        {offseason.isYouth ? (lang === 'es' ? 'Oferta de cantera' : 'Youth offers') : t.transferZone}
      </div>
      {offseason.flavor && <p className="text-sm text-white/60 italic mb-3">{offseason.flavor}</p>}

      {offseason.offers.length === 0 && !offseason.canStay ? (
        <div className="text-white/50 text-sm py-4 text-center">{t.noOffers}</div>
      ) : (
        <div className={`grid gap-3 ${offseason.canStay || offseason.offers.length >= 3 ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2'}`}>
          {offseason.offers.map((o, i) => (
            <OfferCard
              key={o.clubId + i}
              offer={o}
              chosen={offseason.chosenClubId === o.clubId && offseason.chosenVerb !== 'stay'}
              onClick={() => chooseOffer(i)}
              lang={lang} t={t} verbLabel={verbLabelFor(o)} flavor={offerFlavor(player, o, lang)}
              betrayal={o.verb === 'sign' && areRivals(player.clubId, o.clubId)}
            />
          ))}
          {offseason.canStay && player.clubId && (
            <OfferCard
              offer={{ clubId: player.clubId, verb: 'stay', role: 'starter' }}
              chosen={offseason.chosenVerb === 'stay'}
              onClick={stay}
              lang={lang} t={t} verbLabel={t.stayAt}
              flavor={offerFlavor(player, { clubId: player.clubId, verb: 'stay', role: 'starter' }, lang)}
            />
          )}
        </div>
      )}

      {!offseason.isYouth && !forced && (
        <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={openForced}
          className="mt-3 w-full rounded-xl border border-amber-400/30 bg-amber-400/5 py-2.5 text-sm text-amber-200 hover:bg-amber-400/10 transition-colors">
          🔁 {t.requestTransfer}
        </motion.button>
      )}
      <AnimatePresence>{forced && <ForcedBoard lang={lang} />}</AnimatePresence>
    </motion.div>
  );
}

function LastSeasonRecap({ lang }: { lang: Lang }) {
  const t = careerT(lang);
  const { lastSeason } = useCareerStore();
  if (!lastSeason) return null;
  const club = getClub(lastSeason.clubId);
  const titleTxt = lastSeason.titles.map((tt: Title) => titleLabel(tt.key, lang)).join(' · ');
  return (
    <motion.div
      key={lastSeason.year}
      initial={{ opacity: 0, y: -12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
      className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 flex items-center gap-3 text-sm flex-wrap"
    >
      <span className="text-white/40 text-xs uppercase tracking-widest">{lastSeason.year}</span>
      {club && <Crest clubId={club.id} size={24} />}
      <span className="font-semibold">{club?.name}</span>
      <span className="text-white/60">{lastSeason.apps} {t.apps} · {lastSeason.goals} {t.goals} · {lastSeason.assists} {t.assists}</span>
      <motion.span initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300 }} className="ml-auto font-display text-lg">{lastSeason.rating.toFixed(1)}</motion.span>
      <span className="w-full text-white/45 text-xs italic">{seasonFlavor(lastSeason, lang)}</span>
      {titleTxt && <span className="w-full text-gold text-xs">🏆 {titleTxt}</span>}
    </motion.div>
  );
}

export default function CareerOffseason({ lang }: { lang: Lang }) {
  const { offseason, playSeason } = useCareerStore();
  const [simulating, setSimulating] = useState(false);
  if (!offseason) return null;
  // A season cannot start until the event is resolved, a club is chosen, and
  // the preseason card is taken (when one was dealt).
  const cardReady = offseason.cards.length === 0 || !!offseason.cardChosen;
  const ready = offseason.eventResolved && !!offseason.chosenClubId && cardReady;
  // A dead button with no reason is the worst kind: name what is still missing.
  const es = lang === 'es';
  const missing: string[] = [];
  if (!cardReady) missing.push(es ? 'elige una carta' : 'pick a card');
  if (!offseason.eventResolved) missing.push(es ? 'resuelve el evento' : 'resolve the event');
  if (!offseason.chosenClubId) missing.push(es ? 'elige club' : 'pick a club');

  const play = () => {
    if (!ready || simulating) return;
    setSimulating(true);
    window.setTimeout(() => {
      playSeason();
      setSimulating(false);
      // scrolling to the top is handled centrally in app/carrera/page.tsx, so
      // every transition (moment, retirement, new season) behaves the same
    }, 850);
  };

  return (
    <div className="space-y-4 relative">
      <LastSeasonRecap lang={lang} />
      {!offseason.isYouth && <EventZone lang={lang} />}
      <TransferZone lang={lang} />
      <motion.button
        whileHover={ready ? { scale: 1.02 } : undefined}
        whileTap={ready ? { scale: 0.98 } : undefined}
        animate={ready && !simulating ? { boxShadow: ['0 0 0px rgba(255,215,0,0)', '0 0 24px rgba(255,215,0,0.5)', '0 0 0px rgba(255,215,0,0)'] } : {}}
        transition={{ duration: 1.8, repeat: Infinity }}
        disabled={!ready || simulating}
        onClick={play}
        className="btn-primary w-full text-xl disabled:opacity-40"
      >
        {ready
          ? (es ? 'Jugar temporada ▶' : 'Play season ▶')
          : `${es ? 'Falta' : 'Missing'}: ${missing.join(' · ')}`}
      </motion.button>

      <AnimatePresence>
        {simulating && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-black/75 backdrop-blur-sm"
          >
            <div className="flex flex-col items-center gap-4">
              <motion.div
                animate={{ rotate: 360, y: [0, -18, 0] }}
                transition={{ rotate: { duration: 0.7, repeat: Infinity, ease: 'linear' }, y: { duration: 0.5, repeat: Infinity, ease: 'easeInOut' } }}
                className="text-6xl"
              >⚽</motion.div>
              <motion.div
                animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.2, repeat: Infinity }}
                className="font-display text-2xl tracking-wide"
              >
                {lang === 'es' ? 'Jugando la temporada…' : 'Playing the season…'}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
