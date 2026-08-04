// The last season.
//
// A career used to stop: the retirement roll came up, a summary screen
// appeared, and twenty years of football ended between two clicks. This is the
// season you know is the last one — a handful of scenes, each a real decision,
// picked from what your career actually was.
//
// A one-club idol is offered a testimonial in front of a full house. A
// journeyman with nine clubs and no home gets a line in a squad announcement.
// Somebody who left the club that made him at seventeen is asked whether he
// wants to go back for six months. They are not the same ending and they should
// not read like it.
import type { CareerPlayer, Title } from '@/data/career/types';
import type { Rng } from './rng';
import type { Lang } from './i18n';
import { getClub } from '@/data/career/clubs';
import { getNation } from '@/data/career/nations';
import { clamp } from './rng';
import type { CareerProfile } from './profile';

export type FarewellEffect = {
  idol?: number;          // at the club the scene is about
  idolClubId?: string;
  reputation?: number;
  morale?: number;
  money?: number;
  /** remembered by the epilogue */
  flag?: string;
};

export interface FarewellOption {
  id: string;
  en: string; es: string;
  /** the one-line consequence, shown after choosing */
  outcomeEn: string; outcomeEs: string;
  effects: FarewellEffect;
}

export interface FarewellScene {
  id: string;
  /** the club or country this is about, for the crest */
  clubId?: string;
  nationCode?: string;
  titleEn: string; titleEs: string;
  descEn: string; descEs: string;
  options: FarewellOption[];
}

interface Ctx {
  p: CareerPlayer;
  prof: CareerProfile;
  rng: Rng;
}

const name = (id?: string | null) => (id ? getClub(id)?.name ?? '' : '');

// ---- the scene pool ---------------------------------------------------------
// Each builder returns a scene or null. `when` is the whole design: a scene only
// exists if the career earned it.

type Builder = (c: Ctx) => FarewellScene | null;

/** A full house for a player the terraces actually loved. */
const testimonial: Builder = ({ prof }) => {
  if (!prof.homeClubId || prof.homeIdol < 72) return null;
  const club = name(prof.homeClubId);
  return {
    id: 'testimonial',
    clubId: prof.homeClubId,
    titleEn: 'The testimonial', titleEs: 'El partido homenaje',
    descEn: `${club} want to fill the ground for you one last time. The old teammates are already saying yes. What is the night for?`,
    descEs: `${club} quiere llenar el estadio por ti una última vez. Los viejos compañeros ya dijeron que sí. ¿Para qué es esa noche?`,
    options: [
      {
        id: 'charity',
        en: 'Give the gate to the academy', es: 'Donar la recaudación a la cantera',
        outcomeEn: 'Every euro goes to the academy that raised you. They name the training pitch after you before the year is out.',
        outcomeEs: 'Cada euro va a la cantera que te crió. Antes de que acabe el año, el campo de entrenamiento lleva tu nombre.',
        effects: { idol: 9, reputation: 6, flag: 'gaveToAcademy' },
      },
      {
        id: 'family',
        en: 'Keep it, and take your family away for a year', es: 'Quedártela y llevarte a tu familia un año',
        outcomeEn: 'Nobody begrudges you it. You are the only one who ever brings it up again.',
        outcomeEs: 'Nadie te lo reprocha. El único que lo vuelve a mencionar eres tú.',
        effects: { money: 4_000_000, idol: 2, morale: 6 },
      },
      {
        id: 'squad',
        en: 'Split it between the kit staff and the groundsmen', es: 'Repartirla entre utileros y jardineros',
        outcomeEn: 'The people who washed your shirt for fifteen years get a year of wages each. That story outlives the match.',
        outcomeEs: 'La gente que te lavó la camiseta quince años cobra un año de sueldo. Esa historia dura más que el partido.',
        effects: { idol: 7, reputation: 4, flag: 'paidTheStaff' },
      },
    ],
  };
};

/** Six months back where it began, for someone who left and never returned. */
const goHome: Builder = ({ p, prof }) => {
  if (!prof.debutClubId || prof.wentHome) return null;
  if (prof.finalClubId === prof.debutClubId) return null;
  const club = name(prof.debutClubId);
  if (!club) return null;
  return {
    id: 'go-home',
    clubId: prof.debutClubId,
    titleEn: 'One last call from home', titleEs: 'Una última llamada de casa',
    descEn: `${club} gave you your debut at ${Math.max(16, p.age - prof.seasons)}. They are asking whether you want to finish where you started — six months, no money, one last walk out of that tunnel.`,
    descEs: `${club} te hizo debutar a los ${Math.max(16, p.age - prof.seasons)}. Te preguntan si quieres terminar donde empezaste — seis meses, sin dinero, un último paseo por ese túnel.`,
    options: [
      {
        id: 'go',
        en: 'Go home', es: 'Volver a casa',
        outcomeEn: 'You sign for nothing and play eleven games. The last one is the fullest that ground has been in a decade.',
        outcomeEs: 'Firmas por nada y juegas once partidos. El último llena ese estadio como no se llenaba en diez años.',
        effects: { idol: 14, idolClubId: 'debut', morale: 10, flag: 'wentHomeToDie' },
      },
      {
        id: 'decline',
        en: 'Finish where you are', es: 'Terminar donde estás',
        outcomeEn: 'You end it in the shirt you are already wearing. It is the honest answer, and it costs you nothing but a story.',
        outcomeEs: 'Terminas con la camiseta que ya llevas. Es la respuesta honesta, y solo te cuesta una historia.',
        effects: { idol: 3 },
      },
    ],
  };
};

/** The last cap, for a player his country actually knew. */
const lastCap: Builder = ({ p, prof }) => {
  if (prof.ntCaps < 25) return null;
  const nation = getNation(p.ntNationCode);
  if (!nation) return null;
  return {
    id: 'last-cap',
    nationCode: p.ntNationCode,
    titleEn: 'The last cap', titleEs: 'La última convocatoria',
    descEn: `${nation.en} have called you up one final time — ${p.ntCaps} caps, and a friendly at home to say goodbye. The manager offers you the armband and asks how long you want.`,
    descEs: `${nation.es} te convoca una última vez — ${p.ntCaps} partidos, y un amistoso en casa para despedirte. El técnico te ofrece la cinta y te pregunta cuánto quieres jugar.`,
    options: [
      {
        id: 'full',
        en: 'Play the ninety', es: 'Jugar los noventa',
        outcomeEn: 'You last seventy-eight minutes and cannot feel your legs. You would not have swapped it.',
        outcomeEs: 'Aguantas setenta y ocho minutos y no sientes las piernas. No lo cambiarías por nada.',
        effects: { reputation: 5, morale: 8, flag: 'playedLastCapFull' },
      },
      {
        id: 'cameo',
        en: 'Twenty minutes, then let the kid on', es: 'Veinte minutos y que entre el chico',
        outcomeEn: 'You come off to a standing ovation and hand the armband to a nineteen-year-old who cannot look at you.',
        outcomeEs: 'Sales ovacionado y le das la cinta a un chico de diecinueve que no puede mirarte a los ojos.',
        effects: { reputation: 4, morale: 5, flag: 'passedTheArmband' },
      },
      {
        id: 'refuse',
        en: 'Turn it down — go out on the last real one', es: 'Rechazarlo — irte en el último de verdad',
        outcomeEn: 'No exhibition. Your last cap stays the one that mattered, which is how you wanted to be remembered.',
        outcomeEs: 'Sin exhibiciones. Tu último partido sigue siendo el que importaba, que es como querías que te recordaran.',
        effects: { reputation: 2, flag: 'refusedTheFarewellCap' },
      },
    ],
  };
};

/** Never called up, or barely. A different kind of last season entirely. */
const noCountry: Builder = ({ p, prof }) => {
  if (prof.ntCaps >= 25) return null;
  const nation = getNation(p.ntNationCode);
  return {
    id: 'no-country',
    nationCode: p.ntNationCode,
    titleEn: 'The call that never came', titleEs: 'La llamada que nunca llegó',
    descEn: prof.neverCapped
      ? `A journalist asks the question at your last press conference: ${nation?.en ?? 'your country'} never picked you, not once. Do you want to answer it?`
      : `${prof.ntCaps} caps, years ago. A journalist wants to know whether you feel your country wasted you.`,
    descEs: prof.neverCapped
      ? `Un periodista te hace la pregunta en tu última rueda de prensa: ${nation?.es ?? 'tu país'} nunca te convocó, ni una vez. ¿Quieres responderla?`
      : `${prof.ntCaps} partidos, hace años. Un periodista quiere saber si sientes que tu país te desaprovechó.`,
    options: [
      {
        id: 'bitter',
        en: 'Say what you actually think', es: 'Decir lo que de verdad piensas',
        outcomeEn: 'It leads every bulletin for two days. Half the country agrees with you and the federation never forgets it.',
        outcomeEs: 'Abre todos los informativos dos días. Medio país te da la razón y la federación no lo olvida nunca.',
        effects: { reputation: 3, morale: -4, flag: 'burnedTheFederation' },
      },
      {
        id: 'gracious',
        en: 'Say there were better players', es: 'Decir que había mejores que tú',
        outcomeEn: 'You say it without a flicker. Three managers who never picked you send messages that night.',
        outcomeEs: 'Lo dices sin que se te mueva un músculo. Tres técnicos que nunca te llamaron te escriben esa noche.',
        effects: { reputation: 5, flag: 'graciousAboutCountry' },
      },
    ],
  };
};

/** The last derby, for anyone who has one. */
const lastDerby: Builder = ({ p, prof, rng }) => {
  if (!prof.finalClubId) return null;
  if ((p.derbyGoals ?? 0) < 1 && rng.chance(0.6)) return null;
  const club = name(prof.finalClubId);
  return {
    id: 'last-derby',
    clubId: prof.finalClubId,
    titleEn: 'The last derby', titleEs: 'El último clásico',
    descEn: `One more of these. The manager says it is your call whether you start — you have not finished ninety minutes since October.`,
    descEs: `Uno más de estos. El técnico dice que tú decides si eres titular — no completas noventa minutos desde octubre.`,
    options: [
      {
        id: 'start',
        en: 'Start. Last one.', es: 'Ser titular. El último.',
        outcomeEn: 'Sixty-one minutes, one assist, and a standing ovation from three sides of the ground. The fourth side stood up too, late, when they thought nobody was looking.',
        outcomeEs: 'Sesenta y un minutos, una asistencia y ovación de tres gradas. La cuarta también se levantó, tarde, cuando creía que nadie miraba.',
        effects: { idol: 8, morale: 8, flag: 'startedLastDerby' },
      },
      {
        id: 'bench',
        en: 'Bench. Give the shirt to whoever is next.', es: 'Al banco. Que la lleve el que viene.',
        outcomeEn: 'You watch it from the bench and the kid who took your shirt scores. You are the first one off your seat.',
        outcomeEs: 'Lo ves desde el banco y el chico que heredó tu camiseta marca. Eres el primero en levantarte.',
        effects: { idol: 5, flag: 'gaveUpTheShirt' },
      },
    ],
  };
};

/** For a career with no home: the quiet version, where nobody makes a fuss. */
const quietExit: Builder = ({ prof }) => {
  if (prof.homeIdol >= 65) return null;
  const club = name(prof.finalClubId);
  return {
    id: 'quiet-exit',
    clubId: prof.finalClubId ?? undefined,
    titleEn: 'A line in the squad announcement', titleEs: 'Una línea en el comunicado',
    descEn: `${club || 'The club'} confirm the released list in July and your name is on it, fourth of six, no photograph. Nobody is planning a night for you. How do you want to leave?`,
    descEs: `${club || 'El club'} publica la lista de bajas en julio y tu nombre está ahí, el cuarto de seis, sin foto. Nadie está organizando una noche para ti. ¿Cómo quieres irte?`,
    options: [
      {
        id: 'letter',
        en: 'Write to the supporters yourself', es: 'Escribirle tú a la afición',
        outcomeEn: 'You post it at midnight with no agent and no polish. It is shared more than anything the club put out all season.',
        outcomeEs: 'Lo publicas a medianoche sin agente y sin pulir. Se comparte más que nada que el club haya publicado en toda la temporada.',
        effects: { idol: 6, reputation: 4, flag: 'wroteTheLetter' },
      },
      {
        id: 'silence',
        en: 'Say nothing at all', es: 'No decir absolutamente nada',
        outcomeEn: 'You clear your locker on a Tuesday when the training ground is empty. Some people leave the way they played.',
        outcomeEs: 'Vacías tu taquilla un martes con la ciudad deportiva vacía. Hay gente que se va como jugaba.',
        effects: { morale: -3, flag: 'leftInSilence' },
      },
      {
        id: 'onemore',
        en: 'Ring every club in the division', es: 'Llamar a todos los clubes de la categoría',
        outcomeEn: 'Two answer. Neither offers anything. You stop calling in August and that is the actual end of it.',
        outcomeEs: 'Contestan dos. Ninguno ofrece nada. Dejas de llamar en agosto y ese es el final real.',
        effects: { morale: -8, flag: 'chasedOneMoreYear' },
      },
    ],
  };
};

/** The nearly-man's scene: a lot of finals, not enough medals. */
const theFinals: Builder = ({ prof }) => {
  if (prof.finalsLost < 3) return null;
  return {
    id: 'the-finals',
    clubId: prof.finalClubId ?? undefined,
    titleEn: 'The ones that got away', titleEs: 'Las que se escaparon',
    descEn: `A documentary crew has cut together every final you lost — ${prof.finalsLost} of them — and wants you to watch it back on camera.`,
    descEs: `Un equipo de documentales montó todas las finales que perdiste — ${prof.finalsLost} — y quiere que las veas en cámara.`,
    options: [
      {
        id: 'watch',
        en: 'Watch every one of them', es: 'Verlas todas',
        outcomeEn: 'You get through four before you ask them to stop. What you say next is the only part anybody remembers.',
        outcomeEs: 'Aguantas cuatro antes de pedirles que paren. Lo que dices después es lo único que alguien recuerda.',
        effects: { reputation: 7, morale: -6, flag: 'facedTheFinals' },
      },
      {
        id: 'refuse',
        en: 'Refuse', es: 'Negarte',
        outcomeEn: 'You tell them you were there for all of them and do not need the tape. They use the quote as the title.',
        outcomeEs: 'Les dices que estuviste en todas y no necesitas la cinta. Usan la frase como título.',
        effects: { reputation: 3, flag: 'refusedTheFinals' },
      },
    ],
  };
};

/** Somebody has to be told they are taking over. */
const successor: Builder = ({ prof, rng }) => {
  if (prof.homeIdol < 55 || rng.chance(0.45)) return null;
  const club = name(prof.finalClubId ?? prof.homeClubId);
  return {
    id: 'successor',
    clubId: (prof.finalClubId ?? prof.homeClubId) ?? undefined,
    titleEn: 'The one who comes after', titleEs: 'El que viene después',
    descEn: `There is a seventeen-year-old at ${club || 'the club'} in your position who has been copying the way you take a first touch since he was nine. He has asked to speak to you.`,
    descEs: `Hay un chico de diecisiete en ${club || 'el club'} que juega en tu puesto y copia tu primer control desde que tenía nueve años. Ha pedido hablar contigo.`,
    options: [
      {
        id: 'mentor',
        en: 'Give him the whole year', es: 'Darle el año entero',
        outcomeEn: 'You train him after training, all season. In eight years he is the captain and he still calls you first.',
        outcomeEs: 'Lo entrenas después de entrenar, toda la temporada. En ocho años es el capitán y te sigue llamando a ti primero.',
        effects: { idol: 8, flag: 'mentoredTheKid' },
      },
      {
        id: 'shirt',
        en: 'Give him your number and nothing else', es: 'Darle tu dorsal y nada más',
        outcomeEn: 'A photograph, a handshake, and a number he grows into. It was more than you got.',
        outcomeEs: 'Una foto, un apretón de manos y un número que le queda grande hasta que no. Es más de lo que te dieron a ti.',
        effects: { idol: 4, flag: 'gaveTheNumber' },
      },
      {
        id: 'warn',
        en: 'Tell him what it actually costs', es: 'Contarle lo que cuesta de verdad',
        outcomeEn: 'You tell him about the knees, the moving, the birthdays missed. He signs anyway. They always do.',
        outcomeEs: 'Le hablas de las rodillas, de las mudanzas, de los cumpleaños perdidos. Firma igual. Siempre firman.',
        effects: { idol: 5, reputation: 2, flag: 'toldTheTruth' },
      },
    ],
  };
};

const POOL: Builder[] = [
  testimonial, goHome, lastCap, noCountry, lastDerby, theFinals, successor, quietExit,
];

/**
 * Two or three scenes for the last season.
 *
 * Ordered by the pool rather than shuffled: the club scene comes before the
 * country one, and the quiet exit is last because it is the fallback for a
 * career none of the others fit.
 */
export function buildFarewell(
  p: CareerPlayer, prof: CareerProfile, rng: Rng,
): FarewellScene[] {
  const ctx: Ctx = { p, prof, rng };
  const built = POOL.map(b => b(ctx)).filter((s): s is FarewellScene => !!s);

  // One scene per club. A testimonial at the club that made you, followed by an
  // invitation to come back to that same club, reads as the game forgetting
  // what it just said.
  const seen = new Set<string>();
  const unique = built.filter(s => {
    if (!s.clubId) return true;
    if (seen.has(s.clubId)) return false;
    seen.add(s.clubId);
    return true;
  });

  // Never more than three — this is a send-off, not another season.
  return unique.slice(0, 3);
}

/** Apply one chosen option. Mutates a copy the caller owns. */
export function applyFarewell(
  p: CareerPlayer, scene: FarewellScene, opt: FarewellOption,
): CareerPlayer {
  const idolatry = { ...(p.idolatry ?? {}) };
  const flags = { ...(p.flags ?? {}) };

  if (opt.effects.idol) {
    // `idolClubId: 'debut'` means the club that made him, whatever it was.
    const target = opt.effects.idolClubId === 'debut'
      ? p.debutClubId
      : opt.effects.idolClubId ?? scene.clubId ?? p.clubId;
    if (target) {
      idolatry[target] = clamp(0, 100, (idolatry[target] ?? 0) + opt.effects.idol);
    }
  }
  if (opt.effects.flag) flags[opt.effects.flag] = true;

  return {
    ...p,
    idolatry,
    flags,
    reputation: clamp(0, 100, p.reputation + (opt.effects.reputation ?? 0)),
    morale: clamp(5, 100, p.morale + (opt.effects.morale ?? 0)),
    money: (p.money ?? 0) + (opt.effects.money ?? 0),
  };
}

export const sceneTitle = (s: FarewellScene, lang: Lang) => (lang === 'es' ? s.titleEs : s.titleEn);
export const sceneDesc = (s: FarewellScene, lang: Lang) => (lang === 'es' ? s.descEs : s.descEn);
export const optLabel = (o: FarewellOption, lang: Lang) => (lang === 'es' ? o.es : o.en);
export const optOutcome = (o: FarewellOption, lang: Lang) => (lang === 'es' ? o.outcomeEs : o.outcomeEn);
