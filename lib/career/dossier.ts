// The last page.
//
// The ending used to close on one randomly drawn sentence, which is a strange
// way to finish something the player has spent an hour building. Everything
// needed to write a real obituary is already in the save — every season, every
// club, every derby, every record, the boot deal, who loved him and who never
// forgave him — and none of it was being read back.
//
// This assembles that: a verdict written from the actual numbers, the career in
// hard figures, what the second life became, what the world kept, and a closing
// line that could only belong to this save.
import type { CareerPlayer, SeasonRecord, Title } from '@/data/career/types';
import { getClub } from '@/data/career/clubs';
import { getLeague } from '@/data/career/leagues';
import { getNation } from '@/data/career/nations';
import { getBrand } from '@/data/career/brands';
import { derbyBetween } from '@/data/career/derbies';
import { titleName } from './competitions';
import { playedRivalries } from './rivalry';
import { fmtMoney } from './effects';
import type { CareerProfile } from './profile';
import type { Afterlife, AfterlifeTier } from './afterlife';
import { afterlifeTier, tierLabel } from './afterlife';
import type { EpilogueBeat } from './epilogue';
import type { Lang } from './i18n';

export interface DossierStat {
  labelEn: string; labelEs: string;
  value: string;
  /** small line under the number */
  subEn?: string; subEs?: string;
  gold?: boolean;
}

export interface DossierLine {
  icon: string;
  en: string; es: string;
}

export interface Dossier {
  headlineEn: string; headlineEs: string;
  /** the paragraph that reads the career back, in numbers */
  verdictEn: string; verdictEs: string;
  stats: DossierStat[];
  /** honours, grouped and counted */
  honours: { name: string; n: number }[];
  /** the clubs, in order, with what you did at each */
  spells: { clubId: string; seasons: number; goals: number; apps: number; idol: number }[];
  /** what the second life was */
  secondEn: string; secondEs: string;
  tier: AfterlifeTier;
  achievements: { en: string; es: string }[];
  /** things about you that outlived you */
  beats: EpilogueBeat[];
  /** notes drawn from systems the summary never mentions */
  footnotes: DossierLine[];
  codaEn: string; codaEs: string;
}

const RECORD_KEYS = new Set([
  'club-top-scorer', 'club-most-apps', 'nation-top-scorer', 'nation-most-caps',
]);

/** "612" / "1.2K" — big numbers stay readable in a small tile. */
const n = (v: number) => (v >= 10_000 ? `${(v / 1000).toFixed(1)}K` : String(v));

// ---- the verdict paragraph ---------------------------------------------------

/**
 * Read the career back in its own numbers.
 *
 * Assembled rather than drawn from a pool: every clause is only present because
 * the career earned it, so no two saves produce the same paragraph unless they
 * genuinely had the same career.
 */
function verdict(
  p: CareerPlayer, prof: CareerProfile, trophies: Title[], lang: Lang,
): string {
  const es = lang === 'es';
  const parts: string[] = [];
  const home = getClub(prof.homeClubId ?? '')?.name;
  const nation = getNation(p.ntNationCode);
  const nat = (es ? nation?.es : nation?.en) ?? '';

  // opening: how long, how much. A goalkeeper's career does not open with the
  // number of goals he did not score.
  if (p.position === 'GK') {
    parts.push(es
      ? `${prof.seasons} temporadas, ${prof.apps} partidos, ${p.cleanSheets} porterías a cero.`
      : `${prof.seasons} seasons, ${prof.apps} games, ${p.cleanSheets} clean sheets.`);
  } else {
    parts.push(es
      ? `${prof.seasons} temporadas, ${prof.apps} partidos, ${prof.goals} goles.`
      : `${prof.seasons} seasons, ${prof.apps} games, ${prof.goals} goals.`);
  }

  // the shape of the career
  if (prof.oneClubMan && home) {
    parts.push(es
      ? `Casi todo en una sola camiseta, la del ${home}.`
      : `Nearly all of it in one shirt, at ${home}.`);
  } else if (prof.mercenary) {
    parts.push(es
      ? `${prof.clubCount} clubes y ninguna casa.`
      : `${prof.clubCount} clubs and no home.`);
  } else if (prof.wentHome && home) {
    parts.push(es
      ? `Te fuiste del ${home} y volviste, que es lo más difícil de hacer bien.`
      : `You left ${home} and went back, which is the hardest thing to get right.`);
  } else if (home) {
    parts.push(es
      ? `${prof.clubCount} clubes, y el ${home} por encima de todos.`
      : `${prof.clubCount} clubs, and ${home} above all of them.`);
  }

  // silverware — team trophies only. Counting the individual awards in here
  // produced "59 trophies: 10 leagues, 1 World Cup", which reads as a typo.
  if (prof.teamTitles === 0) {
    parts.push(es
      ? 'Ni un título. Hay carreras enteras así y no son peores carreras.'
      : 'Not one trophy. Whole careers go like that and they are not lesser careers.');
  } else {
    const big: string[] = [];
    if (prof.leagues) big.push(es ? `${prof.leagues} liga${prof.leagues > 1 ? 's' : ''}` : `${prof.leagues} league${prof.leagues > 1 ? 's' : ''}`);
    if (prof.continental) big.push(es ? `${prof.continental} continental${prof.continental > 1 ? 'es' : ''}` : `${prof.continental} continental`);
    if (prof.worldCups) big.push(es ? `${prof.worldCups} Mundial${prof.worldCups > 1 ? 'es' : ''}` : `${prof.worldCups} World Cup${prof.worldCups > 1 ? 's' : ''}`);
    if (big.length) {
      parts.push(es
        ? `${prof.teamTitles} títulos: ${big.join(', ')}.`
        : `${prof.teamTitles} trophies: ${big.join(', ')}.`);
    } else {
      parts.push(es ? `${prof.teamTitles} títulos.` : `${prof.teamTitles} trophies.`);
    }
    if (prof.individual >= 3) {
      parts.push(es
        ? `Y ${prof.individual} premios individuales.`
        : `And ${prof.individual} individual awards.`);
    }
  }
  if (prof.ballon > 0) {
    parts.push(es
      ? `${prof.ballon} Balón${prof.ballon > 1 ? 'es' : ''} de Oro.`
      : `${prof.ballon} Ballon${prof.ballon > 1 ? 's' : ''} d'Or.`);
  }
  if (prof.finalsLost >= 3) {
    parts.push(es
      ? `Y ${prof.finalsLost} finales perdidas, que también cuentan.`
      : `And ${prof.finalsLost} finals lost, which count too.`);
  }

  // country
  if (prof.neverCapped) {
    parts.push(es
      ? `${nat} no te llamó nunca.`
      : `${nat} never called.`);
  } else if (prof.ntLegend) {
    parts.push(es
      ? (p.position === 'GK'
        ? `${prof.ntCaps} internacionalidades con ${nat}.`
        : `${prof.ntCaps} internacionalidades con ${nat}, ${prof.ntGoals} goles.`)
      : (p.position === 'GK'
        ? `${prof.ntCaps} caps for ${nat}.`
        : `${prof.ntCaps} caps for ${nat}, ${prof.ntGoals} goals.`));
  } else {
    parts.push(es
      ? `${prof.ntCaps} partidos con ${nat}.`
      : `${prof.ntCaps} games for ${nat}.`);
  }

  // records
  const recs = trophies.filter(t => RECORD_KEYS.has(t.key)).length;
  if (recs > 0) {
    parts.push(es
      ? `${recs} récord${recs > 1 ? 's' : ''} histórico${recs > 1 ? 's' : ''} a tu nombre.`
      : `${recs} all-time record${recs > 1 ? 's' : ''} in your name.`);
  }

  return parts.join(' ');
}

// ---- the closing line --------------------------------------------------------

function coda(
  p: CareerPlayer, prof: CareerProfile, a: Afterlife, tier: AfterlifeTier, lang: Lang,
): string {
  const es = lang === 'es';
  const home = getClub(prof.homeClubId ?? '')?.name ?? '';
  const total = prof.seasons + a.years;

  // The line is chosen by how the two halves relate, not by either alone.
  if (tier === 'hollow') {
    return es
      ? `${total} años dentro del fútbol, ${prof.seasons} de ellos jugando. Ganaste en las dos mitades y solo disfrutaste una, y no fue la segunda.`
      : `${total} years inside the game, ${prof.seasons} of them playing. You won in both halves and enjoyed one, and it was not the second.`;
  }
  if (tier === 'lost' && prof.tier === 'immortal') {
    return es
      ? `Fuiste una de las mejores cosas que vio tu generación durante ${prof.seasons} años, y después no encontraste qué hacer con el resto. Las dos cosas son verdad a la vez.`
      : `You were one of the best things your generation saw for ${prof.seasons} years, and then never worked out what to do with the rest. Both of those are true at once.`;
  }
  if (tier === 'lost') {
    return es
      ? `${prof.seasons} temporadas jugando y ${a.years} años buscando en qué convertirte. Casi todo el mundo acaba así y casi nadie lo cuenta.`
      : `${prof.seasons} seasons playing and ${a.years} years looking for what to become. Almost everybody ends like this and almost nobody says so.`;
  }
  if (tier === 'triumph') {
    return es
      ? `${total} años en el fútbol y dos carreras que aguantan por separado. Muy poca gente consigue la segunda, y quien la consigue casi nunca fue bueno en la primera.`
      : `${total} years in the game and two careers that stand up on their own. Very few manage the second, and the ones who do were rarely any good at the first.`;
  }
  if (tier === 'fulfilled') {
    return prof.oneClubMan && home
      ? (es
        ? `Una camiseta, ${prof.apps} partidos y ${a.years} años después haciendo algo pequeño y bien hecho. En ${home} eso se entiende perfectamente.`
        : `One shirt, ${prof.apps} games, and ${a.years} years afterwards doing something small and doing it properly. At ${home} that is understood perfectly.`)
      : (es
        ? `${prof.apps} partidos y luego ${a.years} años eligiendo bien. La segunda parte es la que casi nadie acierta.`
        : `${prof.apps} games, then ${a.years} years of choosing well. The second part is the one hardly anybody gets right.`);
  }
  return es
    ? `${total} años dentro de esto: ${prof.seasons} jugando y ${a.years} de lo que viniera después. No es una mala forma de gastar una vida.`
    : `${total} years inside it: ${prof.seasons} playing and ${a.years} of whatever came next. That is not a bad way to spend a life.`;
}

// ---- footnotes ---------------------------------------------------------------
// Things the summary screen never mentioned, pulled from the systems that
// generate them, so the report closes over the whole game and not half of it.

function footnotes(
  p: CareerPlayer, prof: CareerProfile, stages: SeasonRecord[],
): DossierLine[] {
  const out: DossierLine[] = [];

  // the derby you spent a career in
  const rivalries = playedRivalries(p);
  const top = rivalries[0];
  if (top) {
    const club = getClub(top.rivalId);
    const played = top.rec.w + top.rec.d + top.rec.l;
    const derby = p.clubId ? derbyBetween(p.clubId, top.rivalId) : null;
    const nameEn = derby ? derby.en : club?.name ?? '';
    const nameEs = derby ? derby.es : club?.name ?? '';
    if (club && played >= 6) {
      out.push({
        icon: '⚔️',
        en: `${nameEn}: ${played} played, ${top.rec.w} won, ${top.rec.goals} scored. ${
          top.rec.w > top.rec.l
            ? `${club.name} did not enjoy your career.`
            : `${club.name} had the better of it, and they still mention it.`}`,
        es: `${nameEs}: ${played} jugados, ${top.rec.w} ganados, ${top.rec.goals} goles. ${
          top.rec.w > top.rec.l
            ? `Al ${club.name} no le gustó tu carrera.`
            : `El ${club.name} salió mejor parado, y todavía lo menciona.`}`,
      });
    }
  }

  // the boot deal
  const spells = [...(p.sponsorHistory ?? [])];
  if (p.sponsor) {
    spells.push({
      brandId: p.sponsor.brandId, from: p.sponsor.signedYear,
      to: stages[stages.length - 1]?.year ?? p.sponsor.signedYear,
      tier: p.sponsor.tier, earned: p.sponsor.earned, signature: p.sponsor.signature,
    });
  }
  if (spells.length) {
    const earned = spells.reduce((x, s) => x + s.earned, 0);
    const sig = spells.find(s => s.signature);
    const longest = spells.reduce((a, b) => (b.to - b.from > a.to - a.from ? b : a));
    const brand = getBrand(longest.brandId)?.name ?? '';
    if (sig) {
      const sb = getBrand(sig.brandId)?.name ?? '';
      out.push({
        icon: '👟',
        en: `${sb} put your name on a boot. The deals paid ${fmtMoney(earned)} across ${spells.length} contract${spells.length > 1 ? 's' : ''}.`,
        es: `${sb} le puso tu nombre a una bota. Los contratos pagaron ${fmtMoney(earned)} en ${spells.length} acuerdo${spells.length > 1 ? 's' : ''}.`,
      });
    } else if (earned > 0) {
      out.push({
        icon: '👟',
        en: `${brand} kept you in boots for most of it. ${fmtMoney(earned)}, and never your own shoe.`,
        es: `${brand} te calzó casi toda la carrera. ${fmtMoney(earned)}, y nunca una bota tuya.`,
      });
    }
  }

  // the one number that is hardest to argue with
  const best = [...stages].sort((x, y) => (y.goals + y.assists) - (x.goals + x.assists))[0];
  if (best && best.goals + best.assists >= 12) {
    const club = getClub(best.clubId)?.name ?? '';
    out.push({
      icon: '📈',
      en: `Your best season was ${best.year} at ${club}: ${best.goals} goals, ${best.assists} assists in ${best.apps} games, aged ${best.age}.`,
      es: `Tu mejor temporada fue ${best.year} en el ${club}: ${best.goals} goles, ${best.assists} asistencias en ${best.apps} partidos, con ${best.age} años.`,
    });
  }

  // the money
  if ((p.money ?? 0) > 0) {
    out.push({
      icon: '💰',
      en: `You finished with ${fmtMoney(p.money)} to your name.`,
      es: `Terminaste con ${fmtMoney(p.money)} a tu nombre.`,
    });
  }

  return out;
}

// ---- assembling --------------------------------------------------------------

export function buildDossier(
  p: CareerPlayer, stages: SeasonRecord[], trophies: Title[],
  prof: CareerProfile, a: Afterlife, beats: EpilogueBeat[],
  secondEn: string, secondEs: string,
): Dossier {
  const tier = afterlifeTier(a);

  // honours, grouped by what they actually are
  const byName = new Map<string, number>();
  for (const t of trophies) {
    if (RECORD_KEYS.has(t.key)) continue;
    const name = titleName(t, 'en');
    byName.set(name, (byName.get(name) ?? 0) + 1);
  }
  const honours = [...byName.entries()]
    .map(([name, count]) => ({ name, n: count }))
    .sort((x, y) => y.n - x.n)
    .slice(0, 10);

  // one row per club, merged across spells
  const spellMap = new Map<string, { seasons: number; goals: number; apps: number }>();
  for (const s of stages) {
    const cur = spellMap.get(s.clubId) ?? { seasons: 0, goals: 0, apps: 0 };
    cur.seasons++; cur.goals += s.goals; cur.apps += s.apps;
    spellMap.set(s.clubId, cur);
  }
  const spells = [...spellMap.entries()]
    .map(([clubId, v]) => ({ clubId, ...v, idol: Math.round(p.idolatry?.[clubId] ?? 0) }))
    .sort((x, y) => y.seasons - x.seasons);

  const nation = getNation(p.ntNationCode);
  const stats: DossierStat[] = [
    { labelEn: 'Seasons', labelEs: 'Temporadas', value: String(prof.seasons) },
    { labelEn: 'Games', labelEs: 'Partidos', value: n(prof.apps) },
    p.position === 'GK'
      ? { labelEn: 'Clean sheets', labelEs: 'Porterías a cero', value: n(p.cleanSheets) }
      : { labelEn: 'Goals', labelEs: 'Goles', value: n(prof.goals) },
    p.position === 'GK'
      ? { labelEn: 'Goals', labelEs: 'Goles', value: n(prof.goals) }
      : { labelEn: 'Assists', labelEs: 'Asistencias', value: n(prof.assists) },
    {
      labelEn: 'Trophies', labelEs: 'Títulos', value: String(prof.teamTitles),
      gold: prof.teamTitles > 0,
      subEn: prof.individual ? `+${prof.individual} indiv.` : undefined,
      subEs: prof.individual ? `+${prof.individual} indiv.` : undefined,
    },
    {
      labelEn: 'Caps', labelEs: 'Internacionalidades', value: String(prof.ntCaps),
      subEn: (nation?.en ?? ''), subEs: (nation?.es ?? ''),
    },
    { labelEn: 'Peak', labelEs: 'Techo', value: String(prof.peakOverall) },
    { labelEn: 'Clubs', labelEs: 'Clubes', value: String(prof.clubCount) },
  ];

  return {
    headlineEn: `${p.surname}`,
    headlineEs: `${p.surname}`,
    verdictEn: verdict(p, prof, trophies, 'en'),
    verdictEs: verdict(p, prof, trophies, 'es'),
    stats,
    honours,
    spells,
    secondEn, secondEs,
    tier,
    achievements: a.achievements,
    beats,
    footnotes: footnotes(p, prof, stages),
    codaEn: coda(p, prof, a, tier, 'en'),
    codaEs: coda(p, prof, a, tier, 'es'),
  };
}

export const dossierVerdict = (d: Dossier, lang: Lang) => (lang === 'es' ? d.verdictEs : d.verdictEn);
export const dossierSecond = (d: Dossier, lang: Lang) => (lang === 'es' ? d.secondEs : d.secondEn);
export const dossierCoda = (d: Dossier, lang: Lang) => (lang === 'es' ? d.codaEs : d.codaEn);
export const statLabel = (s: DossierStat, lang: Lang) => (lang === 'es' ? s.labelEs : s.labelEn);
export const statSub = (s: DossierStat, lang: Lang) => (lang === 'es' ? s.subEs : s.subEn);
export const lineText = (l: DossierLine, lang: Lang) => (lang === 'es' ? l.es : l.en);
export { tierLabel };
