'use client';

import { motion } from 'framer-motion';
import { useCareerStore } from '@/store/careerStore';
import type { CareerPlayer } from '@/data/career/types';
import { getNation, nationName, nationFlag } from '@/data/career/nations';
import { getClub } from '@/data/career/clubs';
import {
  selectionBar, selectionScore, roleLabel, reasonLabel, resultLabel, resultTone,
  tournamentThisYear, CONTINENTAL_KEY, type NtSeason,
} from '@/lib/career/international';
import { titleLabel, type Lang } from '@/lib/career/i18n';
import { TrophyIcon } from './TrophyArt';

const ROLE_STYLE: Record<string, string> = {
  star: 'border-gold/60 bg-gold/15 text-gold',
  starter: 'border-wc/50 bg-wc/15 text-wc',
  squad: 'border-cl/50 bg-cl/15 text-cl',
  fringe: 'border-white/25 bg-white/10 text-white/70',
};
const TONE: Record<string, string> = {
  bad: 'text-red-300', ok: 'text-white/60', good: 'text-cl', great: 'text-gold',
};

/** Compact status card shown alongside the career, every season. */
export function NationalTeamPanel({ lang }: { lang: Lang }) {
  const { player, lastSeason, year } = useCareerStore();
  if (!player) return null;
  const es = lang === 'es';
  const nation = getNation(player.ntNationCode);
  if (!nation) return null;

  const history = player.ntHistory ?? [];
  const last = history[history.length - 1] as NtSeason | undefined;

  // Live estimate for the season about to be played, so the panel says
  // something useful before you have ever been picked.
  const club = player.clubId ? getClub(player.clubId) : null;
  const bar = selectionBar(nation.strength);
  const estScore = lastSeason
    ? selectionScore(player, {
        apps: lastSeason.apps, goals: lastSeason.goals, assists: lastSeason.assists,
        rating: lastSeason.rating, effOverall: lastSeason.overallAtSeason,
      }, club ?? null)
    : player.overall - 6;
  const proximity = Math.max(0, Math.min(99, Math.round(100 - Math.max(0, bar - estScore) * 6)));
  const upcoming = tournamentThisYear(year);

  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="text-[10px] tracking-[0.3em] text-white/40 uppercase">
          {es ? 'Selección' : 'National team'}
        </div>
        {/* how demanding this country is — the heart of the whole system */}
        <span className="text-[9px] text-white/35 uppercase tracking-widest">
          {es ? 'Exigencia' : 'Bar'} {bar}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-3xl leading-none">{nationFlag(player.ntNationCode)}</span>
        <div className="min-w-0">
          <div className="font-display text-xl leading-none">{nationName(player.ntNationCode, lang)}</div>
          <div className="text-[11px] text-white/50 mt-0.5">
            {player.ntCaps} {es ? 'partidos' : 'caps'} · {player.ntGoals} {es ? 'goles' : 'goals'}
          </div>
        </div>
        {last?.calledUp && last.role && (
          <span className={`ml-auto text-[10px] uppercase tracking-widest px-2 py-1 rounded-full border ${ROLE_STYLE[last.role]}`}>
            {roleLabel(last.role, lang)}
          </span>
        )}
      </div>

      {/* selection status */}
      <div className="mt-3">
        {last?.calledUp ? (
          <div className="rounded-xl border border-wc/25 bg-wc/[0.07] px-3 py-2">
            <div className="text-[11px] text-wc">
              ✅ {es ? 'Convocado' : 'Called up'} · {last.caps} {es ? 'partidos' : 'caps'}
              {last.goals > 0 && <> · {last.goals} {es ? 'goles' : 'goals'}</>}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-white/12 bg-white/[0.03] px-3 py-2">
            <div className="text-[11px] text-white/60">
              {last
                ? `❌ ${reasonLabel(last.reason ?? 'level', nationName(player.ntNationCode, lang), lang)}`
                : (es ? 'Todavía no te llamaron.' : 'You have not been called up yet.')}
            </div>
            {/* how close you are */}
            <div className="mt-1.5">
              <div className="flex justify-between text-[9px] uppercase tracking-widest text-white/35">
                <span>{es ? 'Cerca de la convocatoria' : 'Close to selection'}</span>
                <span>{last?.proximity ?? proximity}%</span>
              </div>
              <div className="h-1 mt-1 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-cl to-wc"
                  initial={{ width: '0%' }}
                  animate={{ width: `${last?.proximity ?? proximity}%` }}
                  transition={{ type: 'spring', stiffness: 80, damping: 18 }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* the tournament this year, and how it went */}
      {last?.tournament && (
        <div className={`mt-2 rounded-xl border px-3 py-2 flex items-center gap-2.5 ${
          last.tournament.result === 'champion' ? 'border-gold/40 bg-gold/10'
            : last.tournament.qualified ? 'border-white/12 bg-white/[0.03]'
              : 'border-red-400/25 bg-red-500/[0.06]'
        }`}>
          <TrophyIcon
            title={{ key: last.tournament.key, kind: 'national', scope: 'national', age: last.age, nationCode: player.ntNationCode }}
            size={26}
          />
          <div className="min-w-0">
            <div className="text-[11px] text-white/70 truncate">{titleLabel(last.tournament.key, lang)}</div>
            <div className={`text-sm font-display leading-none ${TONE[resultTone(last.tournament.result)]}`}>
              {resultLabel(last.tournament.result, lang)}
            </div>
          </div>
          {last.tournament.qualified && last.tournament.caps > 0 && (
            <div className="ml-auto text-right text-[11px] text-white/50 shrink-0">
              {last.tournament.caps} {es ? 'PJ' : 'apps'}
              {last.tournament.goals > 0 && <> · <span className="text-wc">{last.tournament.goals}</span> {es ? 'G' : 'G'}</>}
            </div>
          )}
        </div>
      )}

      {upcoming && !last?.tournament && (
        <div className="mt-2 text-[11px] text-gold/80">
          🗓️ {es ? 'Este año hay ' : 'There is a '}
          {titleLabel(upcoming === 'world' ? 'world-cup' : (CONTINENTAL_KEY[nation.confed] ?? 'euro'), lang)}
          {es ? '.' : ' this year.'}
        </div>
      )}
    </div>
  );
}

/** Full year-by-year international record, for the retirement summary. */
export function NationalTeamHistory({ player, lang }: { player: CareerPlayer; lang: Lang }) {
  const es = lang === 'es';
  const history = player.ntHistory ?? [];
  const played = history.filter(h => h.calledUp);
  if (!history.length) return null;

  const tournaments = history.filter(h => h.tournament);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-3xl">{nationFlag(player.ntNationCode)}</span>
        <div>
          <div className="font-display text-xl leading-none">{nationName(player.ntNationCode, lang)}</div>
          <div className="text-white/50 text-sm mt-0.5">
            {player.ntCaps} {es ? 'partidos' : 'caps'} · {player.ntGoals} {es ? 'goles' : 'goals'} ·{' '}
            {played.length} {es ? 'temporadas convocado' : 'seasons called up'}
          </div>
        </div>
      </div>

      {/* tournaments first — these are the story */}
      {tournaments.length > 0 && (
        <div className="space-y-1.5">
          {tournaments.map(h => {
            const t = h.tournament!;
            return (
              <div key={h.year} className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 ${
                t.result === 'champion' ? 'bg-gold/10 border border-gold/25' : 'bg-white/[0.03]'
              }`}>
                <span className="text-[11px] text-white/40 w-9 shrink-0">{h.year}</span>
                <TrophyIcon
                  title={{ key: t.key, kind: 'national', scope: 'national', age: h.age, nationCode: player.ntNationCode }}
                  size={22}
                />
                <span className="text-[12px] text-white/75 truncate">{titleLabel(t.key, lang)}</span>
                <span className={`ml-auto text-[11px] shrink-0 ${TONE[resultTone(t.result)]}`}>
                  {resultLabel(t.result, lang)}
                </span>
                {t.qualified && t.caps > 0 && (
                  <span className="text-[10px] text-white/40 w-16 text-right shrink-0">
                    {t.caps} PJ · {t.goals} G
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* year-by-year */}
      <div className="max-h-56 overflow-y-auto pr-1">
        <table className="w-full text-[11px]">
          <thead className="text-white/35 uppercase tracking-widest text-[9px] sticky top-0 bg-[#0b0f14]">
            <tr>
              <th className="text-left font-normal py-1">{es ? 'Año' : 'Year'}</th>
              <th className="text-left font-normal">{es ? 'Estado' : 'Status'}</th>
              <th className="text-center font-normal">PJ</th>
              <th className="text-center font-normal">G</th>
            </tr>
          </thead>
          <tbody>
            {history.map(h => (
              <tr key={h.year} className="border-t border-white/5">
                <td className="py-1 text-white/55">{h.year}</td>
                <td>
                  {h.calledUp && h.role ? (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${ROLE_STYLE[h.role]}`}>
                      {roleLabel(h.role, lang)}
                    </span>
                  ) : (
                    <span className="text-white/30">
                      {es ? 'Sin convocatoria' : 'Not called up'}
                      <span className="text-white/20"> · {h.proximity}%</span>
                    </span>
                  )}
                </td>
                <td className="text-center text-white/70">{h.caps || '—'}</td>
                <td className="text-center text-wc">{h.goals || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
