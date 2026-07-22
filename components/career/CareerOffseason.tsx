'use client';

import { useCareerStore } from '@/store/careerStore';
import type { CareerEvent, ClubOffer, Title } from '@/data/career/types';
import { getClub } from '@/data/career/clubs';
import { getLeague, leagueName } from '@/data/career/leagues';
import { careerT, titleLabel, Lang } from '@/lib/career/i18n';
import { Crest } from './bits';

function roleLabel(role: string, t: ReturnType<typeof careerT>) {
  return role === 'starter' ? t.roleStarter : role === 'rotation' ? t.roleRotation : t.roleProspect;
}

function OfferCard({
  offer, chosen, onClick, lang, t, verbLabel,
}: {
  offer: ClubOffer; chosen: boolean; onClick: () => void; lang: Lang;
  t: ReturnType<typeof careerT>; verbLabel: string;
}) {
  const club = getClub(offer.clubId);
  if (!club) return null;
  const league = getLeague(club.leagueId);
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center text-center gap-2 rounded-2xl border px-3 py-4 transition-all ${
        chosen ? 'border-wc bg-wc/15 scale-[1.02]' : 'border-white/10 bg-white/5 hover:bg-white/10'
      }`}
    >
      <div className="text-[10px] tracking-widest text-white/40 uppercase">{verbLabel}</div>
      <div className="font-display text-lg leading-tight">{club.name}</div>
      <Crest clubId={club.id} size={52} />
      <div className="text-[10px] text-white/45">{league ? leagueName(league.id, lang) : ''}</div>
      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10">{t.role}: {roleLabel(offer.role, t)}</span>
    </button>
  );
}

function EventZone({ lang }: { lang: Lang }) {
  const t = careerT(lang);
  const { offseason, resolveEvent } = useCareerStore();
  if (!offseason) return null;
  const ev = offseason.event;

  return (
    <div className="card p-4 sm:p-5">
      <div className="text-[10px] tracking-[0.3em] text-white/40 uppercase mb-3">{t.eventZone}</div>
      {!ev ? (
        <div className="text-white/50 text-sm py-6 text-center">{t.noNews}</div>
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
                <button
                  key={i}
                  disabled={disabled}
                  onClick={() => resolveEvent(i)}
                  className={`rounded-2xl border px-3 py-3 text-left transition-all ${
                    chosen ? 'border-wc bg-wc/15'
                      : disabled ? 'border-white/5 bg-white/5 opacity-40'
                        : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="font-display text-lg mb-2">{opt.label}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {opt.outcomes.map((o, j) => {
                      const pct = Math.round((o.weight / total) * 100);
                      const highlight = chosen && offseason.eventBadges.includes(o.badge);
                      return (
                        <span key={j}
                          className={`text-[11px] px-2 py-0.5 rounded-full border ${
                            highlight ? 'border-emerald-400 bg-emerald-400/20 text-emerald-200'
                              : 'border-white/15 bg-white/5 text-white/70'
                          }`}>
                          {o.badge}{opt.outcomes.length > 1 ? ` · ${pct}%` : ''}
                        </span>
                      );
                    })}
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function ForcedBoard({ lang }: { lang: Lang }) {
  const t = careerT(lang);
  const { forced, forcedToggleLock, forcedReroll, forcedAccept, closeForced } = useCareerStore();
  if (!forced) return null;
  return (
    <div className="mt-4 rounded-2xl border border-amber-400/30 bg-amber-400/5 p-4">
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
            <div className="h-full rounded-full bg-red-500 transition-all" style={{ width: `${forced.desperation}%` }} />
          </div>
        </div>
        <button
          disabled={forced.rerollsLeft <= 0}
          onClick={forcedReroll}
          className="btn-ghost text-sm disabled:opacity-30"
        >
          🎲 {t.reroll} ({forced.rerollsLeft})
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {forced.slots.map((slot, i) => {
          const club = getClub(slot.clubId);
          if (!club) return null;
          const league = getLeague(club.leagueId);
          return (
            <div key={i} className={`rounded-xl border p-2 flex flex-col items-center gap-1.5 ${slot.locked ? 'border-gold bg-gold/10' : 'border-white/10 bg-white/5'}`}>
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
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TransferZone({ lang }: { lang: Lang }) {
  const t = careerT(lang);
  const { player, offseason, forced, chooseOffer, stay, openForced } = useCareerStore();
  if (!offseason || !player) return null;

  const verbLabelFor = (o: ClubOffer) =>
    o.verb === 'loan' ? t.loanTo : t.signFor;

  return (
    <div className="card p-4 sm:p-5">
      <div className="text-[10px] tracking-[0.3em] text-white/40 uppercase mb-3">
        {offseason.isYouth ? (lang === 'es' ? 'Oferta de cantera' : 'Youth offers') : t.transferZone}
      </div>

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
              lang={lang} t={t} verbLabel={verbLabelFor(o)}
            />
          ))}
          {offseason.canStay && player.clubId && (
            <OfferCard
              offer={{ clubId: player.clubId, verb: 'stay', role: 'starter' }}
              chosen={offseason.chosenVerb === 'stay'}
              onClick={stay}
              lang={lang} t={t} verbLabel={t.stayAt}
            />
          )}
        </div>
      )}

      {!offseason.isYouth && !forced && (
        <button onClick={openForced} className="mt-3 w-full rounded-xl border border-amber-400/30 bg-amber-400/5 py-2.5 text-sm text-amber-200 hover:bg-amber-400/10 transition-colors">
          🔁 {t.requestTransfer}
        </button>
      )}
      <ForcedBoard lang={lang} />
    </div>
  );
}

function LastSeasonRecap({ lang }: { lang: Lang }) {
  const t = careerT(lang);
  const { lastSeason } = useCareerStore();
  if (!lastSeason) return null;
  const club = getClub(lastSeason.clubId);
  const titleTxt = lastSeason.titles.map((tt: Title) => titleLabel(tt.key, lang)).join(' · ');
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 flex items-center gap-3 text-sm flex-wrap">
      <span className="text-white/40 text-xs uppercase tracking-widest">{lastSeason.year}</span>
      {club && <Crest clubId={club.id} size={24} />}
      <span className="font-semibold">{club?.name}</span>
      <span className="text-white/60">{lastSeason.apps} {t.apps} · {lastSeason.goals} {t.goals} · {lastSeason.assists} {t.assists}</span>
      <span className="ml-auto font-display text-lg">{lastSeason.rating.toFixed(1)}</span>
      {titleTxt && <span className="w-full text-gold text-xs">🏆 {titleTxt}</span>}
    </div>
  );
}

export default function CareerOffseason({ lang }: { lang: Lang }) {
  const t = careerT(lang);
  const { offseason, playSeason } = useCareerStore();
  if (!offseason) return null;
  const ready = offseason.eventResolved && !!offseason.chosenClubId;

  return (
    <div className="space-y-4">
      <LastSeasonRecap lang={lang} />
      {!offseason.isYouth && <EventZone lang={lang} />}
      <TransferZone lang={lang} />
      <button
        disabled={!ready}
        onClick={playSeason}
        className="btn-primary w-full text-xl disabled:opacity-40"
      >
        {lang === 'es' ? 'Jugar temporada ▶' : 'Play season ▶'}
      </button>
    </div>
  );
}
