'use client';

import { useMemo } from 'react';
import type { CareerPlayer, SeasonRecord, Title } from '@/data/career/types';
import { getClub } from '@/data/career/clubs';
import { nationName, nationFlag } from '@/data/career/nations';
import { careerT, titleLabel, scopeLabel, Lang } from '@/lib/career/i18n';
import { formatValue, positionAbbr } from '@/lib/career/format';
import { Crest, OvrBadge } from './bits';

const TITLE_WEIGHT: Record<string, number> = {
  'world-cup': 60, 'ballon-dor': 55, champions: 45, 'the-best': 40, libertadores: 30,
  'continental-cup': 30, 'golden-shoe': 25, league: 18, europa: 18, 'club-world-cup': 20,
  'best-player-continent': 22, 'world-best-keeper': 22, 'world-best-defender': 22,
  'world-best-midfielder': 22, 'world-best-forward': 22, 'world-best-young': 18,
};
function careerScore(player: CareerPlayer, trophies: Title[]): number {
  let s = player.peakOverall * 3 + player.apps * 0.2 + player.goals * 0.6 + player.assists * 0.3;
  for (const t of trophies) s += TITLE_WEIGHT[t.key] ?? 8;
  return Math.round(s);
}

function Cabinet({ titles, lang, title, empty }: { titles: Title[]; lang: Lang; title: string; empty: string }) {
  return (
    <div className="card p-4 flex-1 min-w-[200px]">
      <div className="text-[10px] tracking-[0.3em] text-white/40 uppercase mb-2">{title}</div>
      {titles.length === 0 ? (
        <div className="text-white/30 text-xs uppercase tracking-widest py-3 text-center">🏆 {empty}</div>
      ) : (
        <div className="space-y-1">
          {Object.entries(count(titles)).map(([key, n]) => (
            <div key={key} className="flex items-center justify-between text-sm">
              <span className="text-white/80">{titleLabel(key, lang)}</span>
              {n > 1 && <span className="text-gold font-display">×{n}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function count(titles: Title[]): Record<string, number> {
  const m: Record<string, number> = {};
  for (const t of titles) m[t.key] = (m[t.key] ?? 0) + 1;
  return m;
}

export default function CareerSummary({
  player, stages, trophies, lang, onReplay,
}: {
  player: CareerPlayer; stages: SeasonRecord[]; trophies: Title[]; lang: Lang; onReplay: () => void;
}) {
  const t = careerT(lang);

  const clubAgg = useMemo(() => {
    const m = new Map<string, { apps: number; goals: number; assists: number; titles: Title[] }>();
    for (const s of stages) {
      const a = m.get(s.clubId) ?? { apps: 0, goals: 0, assists: 0, titles: [] };
      a.apps += s.apps; a.goals += s.goals; a.assists += s.assists;
      a.titles.push(...s.titles.filter(tt => tt.kind === 'club'));
      m.set(s.clubId, a);
    }
    return [...m.entries()].sort((x, y) => y[1].apps - x[1].apps);
  }, [stages]);

  const clubTitles = trophies.filter(t => t.kind === 'club');
  const natTitles = trophies.filter(t => t.kind === 'national');
  const indTitles = trophies.filter(t => t.kind === 'individual');
  const score = careerScore(player, trophies);

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* header */}
      <div className="card p-5 flex flex-wrap items-center gap-5">
        <OvrBadge ovr={player.peakOverall} size="lg" />
        <div className="min-w-0">
          <div className="text-[10px] tracking-[0.3em] text-white/40 uppercase">{t.careerSummary}</div>
          <div className="font-display text-4xl leading-none flex items-center gap-2">
            {nationFlag(player.ntNationCode)} {player.surname}
          </div>
          <div className="text-white/50 text-sm mt-1">#{player.number} · {positionAbbr(player.position, lang)} · {t.peak} {formatValue(player.peakValue)}</div>
        </div>
        <div className="ml-auto flex gap-5 text-center">
          <div><div className="font-display text-2xl">{player.apps}</div><div className="text-[10px] uppercase tracking-widest text-white/40">{t.apps}</div></div>
          <div><div className="font-display text-2xl">{player.goals}</div><div className="text-[10px] uppercase tracking-widest text-white/40">{t.goals}</div></div>
          <div><div className="font-display text-2xl">{player.assists}</div><div className="text-[10px] uppercase tracking-widest text-white/40">{t.assists}</div></div>
          <div><div className="font-display text-2xl text-wc">{score}</div><div className="text-[10px] uppercase tracking-widest text-white/40">{t.careerScore}</div></div>
        </div>
      </div>

      {/* cabinets */}
      <div className="flex flex-wrap gap-3">
        <Cabinet titles={clubTitles} lang={lang} title={t.clubTitles} empty={t.emptyCabinet} />
        <div className="card p-4 flex-1 min-w-[200px]">
          <div className="text-[10px] tracking-[0.3em] text-white/40 uppercase mb-2">{t.nationalTeam}</div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">{nationFlag(player.ntNationCode)}</span>
            <span className="font-semibold">{nationName(player.ntNationCode, lang)}</span>
            <span className="ml-auto text-sm text-white/60">{player.ntCaps} {t.caps} · {player.ntGoals} {t.goals}</span>
          </div>
          {natTitles.length === 0 ? (
            <div className="text-white/30 text-xs uppercase tracking-widest py-2 text-center">🌍 {t.emptyCabinet}</div>
          ) : (
            <div className="space-y-1">
              {Object.entries(count(natTitles)).map(([key, n]) => (
                <div key={key} className="flex items-center justify-between text-sm">
                  <span className="text-white/80">{titleLabel(key, lang)}</span>{n > 1 && <span className="text-gold font-display">×{n}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* individual awards grouped by scope */}
      <div className="card p-4">
        <div className="text-[10px] tracking-[0.3em] text-white/40 uppercase mb-3">{t.individualAwards}</div>
        {indTitles.length === 0 ? (
          <div className="text-white/30 text-xs uppercase tracking-widest py-3 text-center">🥇 {t.emptyCabinet}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {(['world', 'continent', 'league', 'tournament'] as const).map(scope => {
              const items = indTitles.filter(tt => tt.scope === scope);
              if (!items.length) return null;
              return (
                <div key={scope}>
                  <div className="text-[10px] uppercase tracking-widest text-wc mb-1">{scopeLabel(scope, lang)}</div>
                  <div className="space-y-1">
                    {Object.entries(count(items)).map(([key, n]) => (
                      <div key={key} className="flex items-center justify-between text-xs">
                        <span className="text-white/75">{titleLabel(key, lang)}</span>{n > 1 && <span className="text-gold">×{n}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* per-club grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {clubAgg.map(([clubId, a]) => {
          const club = getClub(clubId);
          if (!club) return null;
          return (
            <div key={clubId} className="card p-3 flex flex-col items-center gap-1 text-center">
              <Crest clubId={clubId} size={44} />
              <div className="font-display text-sm leading-tight">{club.name}</div>
              <div className="text-[11px] text-white/60">{a.apps} · {a.goals} · {a.assists}</div>
              {a.titles.length > 0 && <div className="text-xs">{a.titles.slice(0, 6).map((_, i) => '🏆').join('')}</div>}
            </div>
          );
        })}
      </div>

      <div className="flex justify-center pt-2">
        <button onClick={onReplay} className="btn-primary text-lg">↻ {t.playAgain}</button>
      </div>
    </div>
  );
}
