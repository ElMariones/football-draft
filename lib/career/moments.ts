// Clutch moments — the interactive beats that break up the simulation.
//
// A season is otherwise resolved by maths; these are the three or four times a
// career where *you* decide and the whole stadium waits. Each moment is
// generated with its answer already hidden inside it (seeded), so resolving is
// pure and replayable — the UI only reveals what the engine already decided.
import type { Position } from '@/data/types';
import type { CareerPlayer, Attrs } from '@/data/career/types';
import type { Rng } from './rng';
import type { Lang } from './i18n';
import { clamp } from './rng';
import { clutchRating } from './idolatry';

export type MomentKind = 'penalty' | 'minute90' | 'press' | 'freekick';
export type MomentStakes = 'league' | 'cup' | 'continental' | 'derby' | 'national';

/**
 * Whose moment this is.
 *
 * Every moment used to be written for a centre-forward: a goalkeeper was handed
 * the ball on the penalty spot, told the ball had dropped to him on the edge of
 * the box, and asked which way he would curl the free kick. The mechanic is
 * fine — three choices, one of them wrong — so the fix is not new machinery but
 * the right occasion for the player who is actually living it.
 */
export type MomentRole = 'gk' | 'def' | 'mid' | 'att';

export function momentRole(pos: Position): MomentRole {
  if (pos === 'GK') return 'gk';
  if (pos === 'CB' || pos === 'LB' || pos === 'RB' || pos === 'LWB' || pos === 'RWB') return 'def';
  if (pos === 'CDM' || pos === 'CM' || pos === 'LM' || pos === 'RM') return 'mid';
  return 'att';
}

export interface MomentOption {
  id: string;
  en: string; es: string;
  /** shown as a risk chip; higher risk = bigger idolatry payoff */
  risk: 'safe' | 'bold' | 'allin';
}

export interface Moment {
  kind: MomentKind;
  /** whose night this is — decides the options, the framing and the headline */
  role: MomentRole;
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

// ---- option pools -----------------------------------------------------------
// Outfielders take the penalty; the keeper faces it. Same three-way guess, two
// completely different nights.

const POSTS: MomentOption[] = [
  { id: 'left',   en: 'Bottom left, hard',  es: 'Abajo a la izquierda, fuerte', risk: 'safe' },
  { id: 'centre', en: 'Chip it down the middle', es: 'Picarla al centro',        risk: 'allin' },
  { id: 'right',  en: 'Bottom right, hard', es: 'Abajo a la derecha, fuerte',   risk: 'safe' },
];

const DIVES: MomentOption[] = [
  { id: 'left',   en: 'Go early to your left',  es: 'Salir pronto a tu izquierda', risk: 'safe' },
  { id: 'centre', en: 'Stand still and wait',   es: 'Quedarte parado y esperar',   risk: 'allin' },
  { id: 'right',  en: 'Go early to your right', es: 'Salir pronto a tu derecha',   risk: 'safe' },
];

const M90_ATT: MomentOption[] = [
  { id: 'shoot',  en: 'Hit it first time',   es: 'Rematar de primera', risk: 'bold' },
  { id: 'pass',   en: 'Square it to the free man', es: 'Pasársela al que está solo', risk: 'safe' },
  { id: 'dribble', en: 'Take the keeper on', es: 'Encarar al portero',    risk: 'allin' },
];

const M90_MID: MomentOption[] = [
  { id: 'thread', en: 'Thread it through the middle', es: 'Filtrarla por el medio', risk: 'bold' },
  { id: 'switch', en: 'Switch it wide and wait',      es: 'Cambiar de banda y esperar', risk: 'safe' },
  { id: 'drive',  en: 'Drive at them yourself',       es: 'Conducir tú mismo',      risk: 'allin' },
];

const M90_DEF: MomentOption[] = [
  { id: 'jockey', en: 'Jockey him to the touchline', es: 'Llevarlo hacia la banda', risk: 'safe' },
  { id: 'block',  en: 'Throw your body in front',    es: 'Meter el cuerpo',         risk: 'bold' },
  { id: 'tackle', en: 'Go to ground and take it',    es: 'Barrerse y sacarla',      risk: 'allin' },
];

const M90_GK: MomentOption[] = [
  { id: 'hold',  en: 'Hold your line and set',    es: 'Quedarte en la línea y armarte', risk: 'safe' },
  { id: 'punch', en: 'Come and punch it clear',   es: 'Salir a despejar de puños',      risk: 'bold' },
  { id: 'claim', en: 'Come and claim it, both hands', es: 'Salir a atraparla con las dos manos', risk: 'allin' },
];

const TONES: MomentOption[] = [
  { id: 'humble', en: 'Humble and short',   es: 'Humilde y corto',     risk: 'safe' },
  { id: 'fiery',  en: 'Fire up the terraces', es: 'Encender a la afición', risk: 'bold' },
  { id: 'cheeky', en: 'Have a dig at them', es: 'Lanzar una indirecta',   risk: 'allin' },
];

const FK_TAKE: MomentOption[] = [
  { id: 'over',   en: 'Over the wall, dipping', es: 'Por encima de la barrera', risk: 'bold' },
  { id: 'under',  en: 'Under the jumping wall', es: 'Por abajo de la barrera',  risk: 'allin' },
  { id: 'corner', en: 'Curl it into the corner', es: 'Al ángulo, con rosca',    risk: 'bold' },
];

const FK_DEF: MomentOption[] = [
  { id: 'near',  en: 'Attack the near post',     es: 'Atacar el primer palo',  risk: 'bold' },
  { id: 'back',  en: 'Peel to the back post',    es: 'Escaparte al segundo palo', risk: 'safe' },
  { id: 'edge',  en: 'Hang at the edge for the drop', es: 'Esperar el rechace al borde', risk: 'allin' },
];

const FK_GK: MomentOption[] = [
  { id: 'wall',   en: 'Add a man to the wall',      es: 'Sumar un hombre a la barrera', risk: 'safe' },
  { id: 'gap',    en: 'Leave the near side and cover it yourself', es: 'Dejar tu palo y cubrirlo tú', risk: 'allin' },
  { id: 'charge', en: 'Set the wall to charge it',  es: 'Mandar la barrera a achicar',  risk: 'bold' },
];

function poolFor(kind: MomentKind, role: MomentRole): MomentOption[] {
  if (kind === 'press') return TONES;
  if (kind === 'penalty') return role === 'gk' ? DIVES : POSTS;
  if (kind === 'minute90') {
    return role === 'gk' ? M90_GK : role === 'def' ? M90_DEF : role === 'mid' ? M90_MID : M90_ATT;
  }
  return role === 'gk' ? FK_GK : role === 'def' ? FK_DEF : FK_TAKE;
}

const TITLES: Record<MomentKind, Record<MomentRole, { en: string; es: string }>> = {
  penalty: {
    gk:  { en: 'The penalty', es: 'El penal' },
    def: { en: 'The penalty', es: 'El penal' },
    mid: { en: 'The penalty', es: 'El penal' },
    att: { en: 'The penalty', es: 'El penal' },
  },
  minute90: {
    gk:  { en: 'The last cross', es: 'El último centro' },
    def: { en: 'The last attack', es: 'El último ataque' },
    mid: { en: 'Minute 90', es: 'Minuto 90' },
    att: { en: 'Minute 90', es: 'Minuto 90' },
  },
  press: {
    gk:  { en: 'Press conference', es: 'Rueda de prensa' },
    def: { en: 'Press conference', es: 'Rueda de prensa' },
    mid: { en: 'Press conference', es: 'Rueda de prensa' },
    att: { en: 'Press conference', es: 'Rueda de prensa' },
  },
  freekick: {
    gk:  { en: 'The wall', es: 'La barrera' },
    def: { en: 'The set piece', es: 'La pelota parada' },
    mid: { en: 'Free kick', es: 'Tiro libre' },
    att: { en: 'Free kick', es: 'Tiro libre' },
  },
};

function describe(kind: MomentKind, role: MomentRole, stakes: MomentStakes, rival?: string) {
  const where = {
    league: { en: 'the title decider', es: 'la definición del campeonato' },
    cup:    { en: 'the cup final', es: 'la final de la copa' },
    continental: { en: 'the continental final', es: 'la final continental' },
    derby:  { en: `the derby${rival ? ' against ' + rival : ''}`, es: `el clásico${rival ? ' contra ' + rival : ''}` },
    national: { en: 'a knockout tie with your country', es: 'una eliminatoria con la Selección' },
  }[stakes];

  if (kind === 'penalty') {
    if (role === 'gk') {
      return {
        en: `90+3 in ${where.en}, and they have a penalty. You are the last thing between them and it. He places the ball and will not look at you.`,
        es: `90+3 en ${where.es} y les dan penal. Eres lo último que queda entre ellos y todo. Coloca la pelota y no te mira.`,
      };
    }
    return {
      en: `90+3 in ${where.en}. The referee points to the spot and hands you the ball. The stadium stops breathing.`,
      es: `90+3 en ${where.es}. El árbitro cobra penal y la pelota es tuya. El estadio deja de respirar.`,
    };
  }

  if (kind === 'minute90') {
    if (role === 'gk') {
      return {
        en: `Last minute of ${where.en}. The cross hangs up into a crowded six-yard box and everyone in it is bigger than the ball.`,
        es: `Último minuto de ${where.es}. El centro queda colgado en un área chica llena de gente y todos son más grandes que la pelota.`,
      };
    }
    if (role === 'def') {
      return {
        en: `Last minute of ${where.en}. They break away and it is you against him, with the whole season behind you.`,
        es: `Último minuto de ${where.es}. Salen de contra y es él contra ti, con toda la temporada a tu espalda.`,
      };
    }
    if (role === 'mid') {
      return {
        en: `Last minute of ${where.en}. The ball is at your feet in the middle and everyone in front of you is running.`,
        es: `Último minuto de ${where.es}. La tienes tú en el medio y todos los de adelante están corriendo.`,
      };
    }
    return {
      en: `Last minute of ${where.en}. The ball drops to you on the edge of the box with the keeper out of position.`,
      es: `Último minuto de ${where.es}. La pelota te queda al borde del área con el portero adelantado.`,
    };
  }

  if (kind === 'freekick') {
    if (role === 'gk') {
      return {
        en: `Free kick on the edge of your box in ${where.en}. The wall is yours to set, and so is the blame.`,
        es: `Tiro libre al borde de tu área en ${where.es}. La barrera la armas tú, y la culpa también es tuya.`,
      };
    }
    if (role === 'def') {
      return {
        en: `A free kick swings into their box in ${where.en}. You go up for it — this is what you are in the side for.`,
        es: `Un tiro libre llega al área rival en ${where.es}. Subes tú — para eso estás en el equipo.`,
      };
    }
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
  const role = momentRole(p.position);
  const options = poolFor(s.kind, role);
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

  const d = describe(s.kind, role, s.stakes, s.rivalName);
  return {
    kind: s.kind, role, stakes: s.stakes, clubId: s.clubId, rivalName: s.rivalName, year: s.year,
    titleEn: TITLES[s.kind][role].en, titleEs: TITLES[s.kind][role].es,
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

/**
 * The headline. A keeper who wins his moment has not scored — he has saved one,
 * claimed one, or read a free kick, and the ticker has to say so or the whole
 * beat lands as somebody else's story.
 */
function momentNews(m: Moment, won: boolean, viaRebound: boolean): { newsEn: string; newsEs: string } {
  const P = (en: string, es: string) => ({ newsEn: en, newsEs: es });

  if (m.kind === 'press') {
    return won
      ? P('🎤 You said exactly the right thing. The room — and the terraces — are with you.',
          '🎤 Dijiste justo lo que había que decir. La sala y la grada, contigo.')
      : P('🎤 The quote goes around badly. You spend a week explaining yourself.',
          '🎤 La frase da la vuelta para mal. Te pasas una semana explicándola.');
  }

  if (m.role === 'gk') {
    if (won && viaRebound) {
      return P('🧤 You went the wrong way — and got a trailing hand to it anyway. Somehow, it stayed out.',
               '🧤 Te fuiste para el otro lado… y llegaste con la mano de atrás. De alguna forma, no entró.');
    }
    if (won) {
      const w: Record<MomentKind, [string, string]> = {
        penalty:  ['🧤 SAVED. You read him the whole way. The net never moved.',
                   '🧤 ¡ATAJADA! Se la adivinaste desde el principio. La red ni se movió.'],
        minute90: ['🧤 You came through a forest of bodies and took it clean. Game over.',
                   '🧤 Saliste entre un bosque de piernas y la sacaste limpia. Se acabó.'],
        freekick: ['🧤 The wall held and you had the corner covered. Routine, from the outside.',
                   '🧤 La barrera aguantó y tú tenías el palo cubierto. Rutina, visto de afuera.'],
        press:    ['', ''],
      };
      return P(w[m.kind][0], w[m.kind][1]);
    }
    const l: Record<MomentKind, [string, string]> = {
      penalty:  ['❌ He waited for you to move, and you moved. In off the post.',
                 '❌ Esperó a que te movieras, y te moviste. Adentro, pegada al palo.'],
      minute90: ['❌ You came and did not get there. The header went in behind you.',
                 '❌ Saliste y no llegaste. El cabezazo entró a tu espalda.'],
      freekick: ['❌ It went exactly where you left the gap. Everyone saw it but you.',
                 '❌ Fue justo por donde dejaste el hueco. Lo vio todo el mundo menos tú.'],
      press:    ['', ''],
    };
    return P(l[m.kind][0], l[m.kind][1]);
  }

  if (m.role === 'def' && m.kind === 'minute90') {
    if (won && viaRebound) {
      return P('🛡️ He got past you — and you recovered and hooked it away on the line.',
               '🛡️ Te pasó… y volviste a recuperar para sacarla sobre la línea.');
    }
    return won
      ? P('🛡️ You stood him up and took the ball. Nothing else was ever going to happen.',
          '🛡️ Lo aguantaste y le sacaste la pelota. No iba a pasar nada más.')
      : P('❌ He went past you and finished it. That one replays all summer.',
          '❌ Te pasó y la definió. Ese se repite todo el verano.');
  }

  if (m.role === 'def' && m.kind === 'freekick') {
    return won
      ? P('⚽ You rose above everybody and buried the header. A defender, in the biggest minute.',
          '⚽ Saltaste por encima de todos y la clavaste de cabeza. Un defensa, en el minuto más grande.')
      : P('❌ You attacked it and got nothing on it. The chance is gone.',
          '❌ Fuiste a buscarla y no le llegaste. La ocasión se fue.');
  }

  if (m.role === 'mid' && m.kind === 'minute90') {
    return won
      ? P('🎯 The pass split them open and the finish was a formality. Yours was the moment before.',
          '🎯 El pase los partió al medio y el gol fue un trámite. Tuyo fue el instante anterior.')
      : P('❌ You picked the wrong ball and it broke straight back at you.',
          '❌ Elegiste mal el pase y la jugada volvió de inmediato.');
  }

  // outfield shooters
  if (won && viaRebound) {
    return P('⚽ The keeper got a hand to it — and the rebound fell to you. You buried it anyway.',
             '⚽ El portero la tocó… y el rebote te quedó a ti. La mandaste a guardar igual.');
  }
  return won
    ? P('⚽ GOAL. Unstoppable. That one gets told for generations.',
        '⚽ ¡GOL! Imposible. Ese se cuenta por generaciones.')
    : P('❌ The keeper read you. It slipped away.',
        '❌ El portero te la adivinó. Se escapó.');
}

export function resolveMoment(m: Moment, optionId: string): MomentResult {
  const opt = m.options.find(o => o.id === optionId) ?? m.options[0];
  const missed = optionId === m.hiddenId;
  const viaRebound = missed && m.rebound;
  const won = !missed || viaRebound;

  const pay = payoff(m.stakes, opt.risk, won);
  const resolved: Moment = { ...m, resolved: won ? 'win' : 'lose', chosenId: optionId };

  const { newsEn, newsEs } = momentNews(m, won, viaRebound);

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
