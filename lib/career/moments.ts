// Clutch moments — the interactive beats that break up the simulation.
//
// A season is otherwise resolved by maths; these are the three or four times a
// career where *you* decide and the whole stadium waits. Each moment is
// generated with its answer already hidden inside it (seeded), so resolving is
// pure and replayable — the UI only reveals what the engine already decided.
import type { CareerPlayer, Attrs } from '@/data/career/types';
import type { Rng } from './rng';
import type { Lang } from './i18n';
import { clamp } from './rng';
import { clutchRating } from './idolatry';

export type MomentKind = 'penalty' | 'minute90' | 'press' | 'freekick';
export type MomentStakes = 'league' | 'cup' | 'continental' | 'derby' | 'national';

export interface MomentOption {
  id: string;
  en: string; es: string;
  /** shown as a risk chip; higher risk = bigger idolatry payoff */
  risk: 'safe' | 'bold' | 'allin';
}

export interface Moment {
  kind: MomentKind;
  stakes: MomentStakes;
  clubId: string | null;
  rivalName?: string;
  year: number;
  titleEn: string; titleEs: string;
  descEn: string; descEs: string;
  options: MomentOption[];
  /** the option id that fails (penalty: keeper's corner; m90: wrong read) */
  hiddenId: string;
  /** a second chance if leadership is high — the rebound falls to you */
  rebound: boolean;
  /** visual tell the keeper/press gives away, index into options */
  tellId?: string;
  resolved: 'win' | 'lose' | null;
  chosenId: string | null;
}

const POSTS: MomentOption[] = [
  { id: 'left',   en: 'Bottom left, hard',  es: 'Abajo a la izquierda, fuerte', risk: 'safe' },
  { id: 'centre', en: 'Chip it down the middle', es: 'Picarla al centro',        risk: 'allin' },
  { id: 'right',  en: 'Bottom right, hard', es: 'Abajo a la derecha, fuerte',   risk: 'safe' },
];

const M90: MomentOption[] = [
  { id: 'shoot',  en: 'Hit it first time',   es: 'Rematar de primera', risk: 'bold' },
  { id: 'pass',   en: 'Square it to the free man', es: 'Pasársela al que está solo', risk: 'safe' },
  { id: 'dribble', en: 'Take the keeper on', es: 'Encarar al portero',    risk: 'allin' },
];

const TONES: MomentOption[] = [
  { id: 'humble', en: 'Humble and short',   es: 'Humilde y corto',     risk: 'safe' },
  { id: 'fiery',  en: 'Fire up the terraces', es: 'Encender a la afición', risk: 'bold' },
  { id: 'cheeky', en: 'Have a dig at them', es: 'Lanzar una indirecta',   risk: 'allin' },
];

const FK: MomentOption[] = [
  { id: 'over',   en: 'Over the wall, dipping', es: 'Por encima de la barrera', risk: 'bold' },
  { id: 'under',  en: 'Under the jumping wall', es: 'Por abajo de la barrera',  risk: 'allin' },
  { id: 'corner', en: 'Curl it into the corner', es: 'Al ángulo, con rosca',    risk: 'bold' },
];

function poolFor(kind: MomentKind): MomentOption[] {
  return kind === 'penalty' ? POSTS : kind === 'minute90' ? M90 : kind === 'press' ? TONES : FK;
}

const TITLES: Record<MomentKind, { en: string; es: string }> = {
  penalty:  { en: 'The penalty', es: 'El penal' },
  minute90: { en: 'Minute 90',   es: 'Minuto 90' },
  press:    { en: 'Press conference', es: 'Rueda de prensa' },
  freekick: { en: 'Free kick',   es: 'Tiro libre' },
};

function describe(kind: MomentKind, stakes: MomentStakes, rival?: string) {
  const where = {
    league: { en: 'the title decider', es: 'la definición del campeonato' },
    cup:    { en: 'the cup final', es: 'la final de la copa' },
    continental: { en: 'the continental final', es: 'la final continental' },
    derby:  { en: `the derby${rival ? ' against ' + rival : ''}`, es: `el clásico${rival ? ' contra ' + rival : ''}` },
    national: { en: 'a knockout tie with your country', es: 'una eliminatoria con la Selección' },
  }[stakes];

  if (kind === 'penalty') {
    return {
      en: `90+3 in ${where.en}. The referee points to the spot and hands you the ball. The stadium stops breathing.`,
      es: `90+3 en ${where.es}. El árbitro cobra penal y la pelota es tuya. El estadio deja de respirar.`,
    };
  }
  if (kind === 'minute90') {
    return {
      en: `Last minute of ${where.en}. The ball drops to you on the edge of the box with the keeper out of position.`,
      es: `Último minuto de ${where.es}. La pelota te queda al borde del área con el portero adelantado.`,
    };
  }
  if (kind === 'freekick') {
    return {
      en: `Free kick on the edge of the box in ${where.en}. You put the ball down yourself.`,
      es: `Tiro libre al borde del área en ${where.es}. Colocas tú mismo el balón.`,
    };
  }
  return {
    en: `The room is packed before ${where.en}. Every answer will be a headline tomorrow.`,
    es: `La sala está llena antes de ${where.es}. Cada respuesta es título de tapa mañana.`,
  };
}

export interface MomentSeed {
  kind: MomentKind;
  stakes: MomentStakes;
  clubId: string | null;
  rivalName?: string;
  year: number;
}

/** Build a moment with its outcome already decided (but hidden). */
export function createMoment(p: CareerPlayer, s: MomentSeed, rng: Rng): Moment {
  const options = poolFor(s.kind);
  const hidden = options[rng.int(options.length)];

  // Leadership/technique buy you a second chance — the rebound, or a follow-up
  // question that lets you recover a bad answer.
  const clutch = clutchRating(p.attrs);
  const rebound = rng.chance(clamp(0.05, 0.45, (clutch - 45) / 120));

  // A tell is shown when you read the game well: the keeper leans, the press
  // officer warns you. High vision/leadership sees it more often.
  const seesTell = rng.chance(clamp(0, 0.7, (p.attrs.vis + p.attrs.lea) / 260));
  const tellId = seesTell
    ? (rng.chance(0.75) ? hidden.id : options[rng.int(options.length)].id)
    : undefined;

  const d = describe(s.kind, s.stakes, s.rivalName);
  return {
    kind: s.kind, stakes: s.stakes, clubId: s.clubId, rivalName: s.rivalName, year: s.year,
    titleEn: TITLES[s.kind].en, titleEs: TITLES[s.kind].es,
    descEn: d.en, descEs: d.es,
    options, hiddenId: hidden.id, rebound, tellId,
    resolved: null, chosenId: null,
  };
}

export interface MomentResult {
  moment: Moment;
  won: boolean;
  viaRebound: boolean;
  idol: number;
  reputation: number;
  morale: number;
  form: number;
  newsEn: string; newsEs: string;
}

/** Payoff scales with the risk you took and the size of the occasion. */
function payoff(stakes: MomentStakes, risk: MomentOption['risk'], won: boolean) {
  const stakeMul = stakes === 'continental' ? 1.6 : stakes === 'cup' ? 1.2
    : stakes === 'derby' ? 1.35 : stakes === 'national' ? 1.1 : 1;
  const riskMul = risk === 'allin' ? 1.8 : risk === 'bold' ? 1.3 : 1;
  if (won) {
    return {
      idol: 6 * stakeMul * riskMul,
      reputation: 8 * stakeMul * riskMul,
      morale: 10,
      form: 12,
    };
  }
  return {
    idol: -2.5 * stakeMul * (risk === 'allin' ? 1.6 : 1),
    reputation: -5 * stakeMul,
    morale: -12,
    form: -10,
  };
}

export function resolveMoment(m: Moment, optionId: string): MomentResult {
  const opt = m.options.find(o => o.id === optionId) ?? m.options[0];
  const missed = optionId === m.hiddenId;
  const viaRebound = missed && m.rebound;
  const won = !missed || viaRebound;

  const pay = payoff(m.stakes, opt.risk, won);
  const resolved: Moment = { ...m, resolved: won ? 'win' : 'lose', chosenId: optionId };

  let newsEn: string, newsEs: string;
  if (m.kind === 'press') {
    newsEn = won ? '🎤 You said exactly the right thing. The room — and the terraces — are with you.'
                 : '🎤 The quote goes around badly. You spend a week explaining yourself.';
    newsEs = won ? '🎤 Dijiste justo lo que había que decir. La sala y la grada, contigo.'
                 : '🎤 La frase da la vuelta para mal. Te pasas una semana explicándola.';
  } else if (won && viaRebound) {
    newsEn = '⚽ The keeper got a hand to it — and the rebound fell to you. You buried it anyway.';
    newsEs = '⚽ El portero la tocó… y el rebote te quedó a ti. La mandaste a guardar igual.';
  } else if (won) {
    newsEn = '⚽ GOAL. Unstoppable. That one gets told for generations.';
    newsEs = '⚽ ¡GOL! Imposible. Ese se cuenta por generaciones.';
  } else {
    newsEn = '❌ The keeper read you. It slipped away.';
    newsEs = '❌ El portero te la adivinó. Se escapó.';
  }

  return {
    moment: resolved, won, viaRebound,
    idol: pay.idol, reputation: pay.reputation, morale: pay.morale, form: pay.form,
    newsEn, newsEs,
  };
}

export function momentTitle(m: Moment, lang: Lang) { return lang === 'es' ? m.titleEs : m.titleEn; }
export function momentDesc(m: Moment, lang: Lang) { return lang === 'es' ? m.descEs : m.descEn; }
export function optionLabel(o: MomentOption, lang: Lang) { return lang === 'es' ? o.es : o.en; }

/**
 * Should a moment fire this offseason? Big occasions only, with a cooldown so
 * they stay special (Potrero's mistake is firing them too often late on).
 */
export function shouldFireMoment(
  p: CareerPlayer, opts: { bigTitleShot: boolean; playedDerby: boolean }, rng: Rng,
): MomentKind | null {
  if ((p.momentCooldown ?? 0) > 0) return null;
  // Tuned down after a 3000-season run fired one every third season, which is
  // far too often for "the handful of times a career the stadium waits on you".
  const base = opts.bigTitleShot ? 0.3 : opts.playedDerby ? 0.14 : 0.05;
  if (!rng.chance(base)) return null;
  const roll = rng.next();
  if (roll < 0.4) return 'penalty';
  if (roll < 0.68) return 'minute90';
  if (roll < 0.86) return 'freekick';
  return 'press';
}

/** Stamina cost/regen so the attribute has a job across a season. */
export function staminaAfterSeason(p: CareerPlayer, apps: number): number {
  const drain = apps * 0.55 - p.attrs.phy * 0.18;
  return clamp(20, 100, (p.stamina ?? 70) - drain * 0.35 + 14);
}

export function clutchOdds(attrs: Attrs): number {
  return clamp(0.2, 0.85, 0.33 + (clutchRating(attrs) - 50) / 150);
}
