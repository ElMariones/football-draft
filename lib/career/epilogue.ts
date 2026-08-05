// After.
//
// The career stopped at a summary screen. Everything needed to say what became
// of the man was already computed — idolatry per club, titles per club, finals
// lost, records, whether he ever went home — and none of it was ever used for
// anything but a score.
//
// Two decisions, then twenty years pass. A one-club idol with a statue and a
// mercenary who played for nine clubs and was loved by none of them get
// genuinely different endings, because the game already knows which one you
// were.
import type { CareerPlayer, Title } from '@/data/career/types';
import type { Rng } from './rng';
import type { Lang } from './i18n';
import { getClub } from '@/data/career/clubs';
import { getNation } from '@/data/career/nations';
import { clubRecords, clubTallies } from './recordbook';
import type { SeasonRecord } from '@/data/career/types';
import type { CareerProfile } from './profile';

// ---- what next --------------------------------------------------------------

export type PathId = 'manager' | 'pundit' | 'academy' | 'director' | 'away' | 'abroad';

export interface EpiloguePath {
  id: PathId;
  icon: string;
  en: string; es: string;
  blurbEn: string; blurbEs: string;
  /** only offered when the career supports it */
  when: (p: CareerProfile) => boolean;
}

const PATHS: EpiloguePath[] = [
  {
    id: 'manager', icon: '📋',
    en: 'Take a dugout', es: 'Sentarte en un banquillo',
    blurbEn: 'Badges, a bad first job, and a decade of other people\'s mistakes.',
    blurbEs: 'El título, un primer trabajo malo y una década de errores ajenos.',
    when: p => p.peakOverall >= 70 || p.seasons >= 12,
  },
  {
    id: 'pundit', icon: '🎙️',
    en: 'Go into television', es: 'Irte a la televisión',
    blurbEn: 'A chair, an earpiece, and an opinion on everybody who came after you.',
    blurbEs: 'Una silla, un pinganillo y una opinión sobre todos los que vinieron después.',
    when: p => p.tier !== 'forgotten',
  },
  {
    id: 'academy', icon: '🌱',
    en: 'Coach the academy', es: 'Entrenar en la cantera',
    blurbEn: 'Fourteen-year-olds, a cold pitch, and nobody watching. Where it all comes from.',
    blurbEs: 'Chicos de catorce, un campo helado y nadie mirando. De donde sale todo.',
    when: () => true,
  },
  {
    id: 'director', icon: '🏛️',
    en: 'Run a club', es: 'Dirigir un club',
    blurbEn: 'A desk, a budget, and every decision you used to complain about.',
    blurbEs: 'Un despacho, un presupuesto y todas las decisiones de las que te quejabas.',
    when: p => p.homeIdol >= 60 || p.bigTitles >= 3,
  },
  {
    id: 'abroad', icon: '✈️',
    en: 'Chase one more contract abroad', es: 'Buscar un contrato más lejos',
    blurbEn: 'Somewhere warm, somewhere small, one more season of being paid to play.',
    blurbEs: 'Un sitio cálido, un sitio pequeño, una temporada más cobrando por jugar.',
    when: p => p.tier === 'journeyman' || p.tier === 'forgotten' || p.tier === 'solid',
  },
  {
    id: 'away', icon: '🚪',
    en: 'Walk away from it entirely', es: 'Alejarte del fútbol por completo',
    blurbEn: 'No badges, no microphone, no phone. Some people never watch a game again.',
    blurbEs: 'Sin títulos de entrenador, sin micrófono, sin teléfono. Hay gente que no vuelve a ver un partido.',
    when: () => true,
  },
];

export function offeredPaths(prof: CareerProfile): EpiloguePath[] {
  return PATHS.filter(p => p.when(prof));
}

export function pathLabel(p: EpiloguePath, lang: Lang) { return lang === 'es' ? p.es : p.en; }
export function pathBlurb(p: EpiloguePath, lang: Lang) { return lang === 'es' ? p.blurbEs : p.blurbEn; }

/** How the chosen life actually went. Seeded, so a career has one answer. */
export function pathOutcome(id: PathId, prof: CareerProfile, rng: Rng, lang: Lang): string {
  const es = lang === 'es';
  const pick = <T,>(a: T[]) => a[rng.int(a.length)];
  const home = getClub(prof.homeClubId ?? '')?.name ?? '';

  switch (id) {
    case 'manager':
      return pick(es ? [
        `Te fue mal dos años en un club pequeño, y luego bien durante mucho tiempo. Ganaste menos como técnico de lo que ganaste jugando, y te dolió más.`,
        `Nunca llegaste a un banquillo grande. Doce temporadas en la categoría de abajo y cuatro ascensos, que es más de lo que consiguen casi todos.`,
        prof.bigTitles >= 3
          ? `Volviste a ${home || 'tu club'} como entrenador siete años después. Duraste dieciocho meses y te fuiste peor de lo que llegaste.`
          : `Aguantaste seis años entre segundas divisiones y te retiraste del banquillo sin ruido, que es como se retira casi todo el mundo.`,
      ] : [
        `Two bad years at a small club, then a long good spell. You won less as a manager than you did as a player, and it hurt more.`,
        `You never got a big job. Twelve seasons in the division below and four promotions, which is more than most of them manage.`,
        prof.bigTitles >= 3
          ? `You went back to ${home || 'your club'} as manager seven years later. You lasted eighteen months and left worse than you arrived.`
          : `Six years in the lower leagues, then you stepped away from the dugout quietly, which is how nearly everybody goes.`,
      ]);
    case 'pundit':
      return pick(es ? [
        `Resultaste ser bueno. Directo sin ser cruel, que es más raro de lo que parece. Veinte años en pantalla y una generación entera que te conoce solo por eso.`,
        `Duraste cuatro temporadas y lo odiaste cada semana. Lo dejaste en directo, sin avisar a nadie, y no volviste.`,
        `Te hiciste famoso por una frase sobre un penalti que ni siquiera recordabas haber dicho.`,
      ] : [
        `You turned out to be good at it. Blunt without being cruel, which is rarer than it sounds. Twenty years on screen and a whole generation who know you only for that.`,
        `You lasted four seasons and hated every week of it. You quit live on air without warning anybody, and never went back.`,
        `You became famous for one line about a penalty that you did not even remember saying.`,
      ]);
    case 'academy':
      return pick(es ? [
        `Doce años con los sub-16. Cuatro de tus chicos llegaron a primera y uno jugó un Mundial. Ninguno de los cuatro habla de ti en las entrevistas, y a ti te parece bien.`,
        `Descubriste que se te daba mejor esto que jugar. La gente del club lo supo antes que tú.`,
        `Un chico al que entrenaste te rompió un récord que tú tenías. Estabas en la grada, de pie, antes que nadie.`,
      ] : [
        `Twelve years with the under-16s. Four of your boys reached the first team and one played at a World Cup. None of the four mention you in interviews, and you are fine with that.`,
        `You turned out to be better at this than you were at playing. The people at the club knew it before you did.`,
        `A boy you coached broke a record you held. You were in the stand, on your feet, before anybody else.`,
      ]);
    case 'director':
      return pick(es ? [
        `Firmaste a cuarenta jugadores. Acertaste con nueve, que en ese trabajo es una carrera excelente.`,
        `Duraste tres años y te echaron por una decisión que resultó ser la correcta dos temporadas después.`,
        `Reconstruiste ${home || 'el club'} desde el descenso hasta Europa. Nadie escribe canciones sobre los directores deportivos.`,
      ] : [
        `You signed forty players. You got nine of them right, which in that job is an excellent career.`,
        `You lasted three years and were sacked over a decision that turned out to be correct two seasons later.`,
        `You rebuilt ${home || 'the club'} from relegation to Europe. Nobody writes songs about sporting directors.`,
      ]);
    case 'abroad':
      return pick(es ? [
        `Dos temporadas más en una liga que nadie de tu país ve, cobrando bien y jugando todo. Fueron los años más felices.`,
        `Un año, once partidos y una rodilla que dijo basta en un campo a cinco mil kilómetros de casa.`,
        `Te quedaste a vivir allí. Sigues allí.`,
      ] : [
        `Two more seasons in a league nobody at home watches, paid well and playing every week. They were the happiest years.`,
        `One year, eleven games, and a knee that finally said no on a pitch five thousand miles from home.`,
        `You stayed. You are still there.`,
      ]);
    case 'away':
      return pick(es ? [
        `No volviste a pisar un estadio en once años. Cuando volviste fue de la mano de tu hija, y ella no sabía que la grada te iba a reconocer.`,
        `Montaste un negocio que no tenía nada que ver con el fútbol y funcionó. Casi nadie de tu vida nueva sabe a qué te dedicabas.`,
        `Desapareciste tan bien que un periódico publicó un reportaje titulado "¿Dónde está?" catorce años después.`,
      ] : [
        `You did not set foot in a stadium for eleven years. When you finally did it was holding your daughter's hand, and she had no idea the stand was going to recognise you.`,
        `You started a business with nothing to do with football and it worked. Almost nobody in your new life knows what you used to do.`,
        `You disappeared so completely that a newspaper ran a "where is he now?" feature fourteen years later.`,
      ]);
  }
}

// ---- twenty years later -----------------------------------------------------

export interface EpilogueBeat {
  icon: string;
  en: string;
  es: string;
  tone: 'gold' | 'good' | 'neutral' | 'cold';
}

export interface Epilogue {
  /** the closing verdict, the largest line on the card */
  headlineEn: string; headlineEs: string;
  beats: EpilogueBeat[];
  /** the last line of all */
  codaEn: string; codaEs: string;
}

const B = (icon: string, tone: EpilogueBeat['tone'], en: string, es: string): EpilogueBeat =>
  ({ icon, tone, en, es });

/**
 * One beat, drawn from a pool.
 *
 * Every beat used to be a single fixed sentence, so two careers that both
 * earned a statue got the identical statue paragraph, word for word — and a
 * player who reads six of these in a row notices immediately. Each slot now has
 * several ways of saying it, chosen off the career's own seed so it stays the
 * same every time that career is re-read.
 */
function pickBeat(
  rng: Rng, icon: string, tone: EpilogueBeat['tone'], lines: [string, string][],
): EpilogueBeat {
  const [en, es] = lines[rng.int(lines.length)];
  return { icon, tone, en, es };
}

/**
 * Twenty years on.
 *
 * Each beat is earned by something specific — the statue needs idolatry the
 * terraces would actually pay for, the retired number needs a title at that
 * club, the broken record needs the record to have been yours in the first
 * place. Nothing here is decoration.
 */
export function buildEpilogue(
  p: CareerPlayer, stages: SeasonRecord[], trophies: Title[],
  prof: CareerProfile, path: PathId, rng: Rng,
): Epilogue {
  // Mulberry32's first outputs are correlated for seeds that differ in a
  // structured way, and the epilogue is always seeded from `careerSeed ^ k`. The
  // first two beats — the statue and the shirt number — came out identical
  // across every career until the stream was warmed up.
  for (let i = 0; i < 8; i++) rng.next();

  const beats: EpilogueBeat[] = [];
  const home = getClub(prof.homeClubId ?? '')?.name ?? '';
  const nation = getNation(p.ntNationCode);

  // ---- the ground ----
  if (prof.homeIdol >= 88 && prof.bigTitles >= 2) {
    beats.push(pickBeat(rng, '🗿', 'gold', [
      [`There is a bronze of you outside ${home}. You hated the photograph they worked from and said so, once, and never again.`,
       `Hay un bronce tuyo fuera de ${home}. Odiabas la foto de la que partieron y lo dijiste una vez, y nunca más.`],
      [`They unveiled the statue while you were still young enough to be embarrassed by it. Children climb on it every matchday.`,
       `Inauguraron la estatua cuando todavía eras lo bastante joven como para pasar vergüenza. Los niños se suben a ella cada día de partido.`],
      [`The bronze outside ${home} got your left foot wrong and the whole city knows it. Nobody has ever asked for it to be fixed.`,
       `Al bronce de ${home} le salió mal el pie izquierdo y toda la ciudad lo sabe. Nadie ha pedido nunca que lo arreglen.`],
      [`Away supporters have thrown things at your statue four times. It is cleaned by volunteers, every time, before the next home game.`,
       `A tu estatua le han tirado cosas cuatro veces. La limpian voluntarios, siempre, antes del siguiente partido en casa.`],
    ]));
  } else if (prof.homeIdol >= 78) {
    beats.push(pickBeat(rng, '🚪', 'gold', [
      [`They named a stand entrance after you at ${home}. Forty thousand people walk under your name on a Saturday without looking up, which is exactly right.`,
       `Le pusieron tu nombre a un acceso del estadio en ${home}. Cuarenta mil personas pasan bajo tu nombre un sábado sin levantar la vista, que es justo como debe ser.`],
      [`There is a bar behind the ${home} ground with your name on the sign and a photograph of you at twenty-three above the till.`,
       `Hay un bar detrás del estadio de ${home} con tu nombre en el cartel y una foto tuya a los veintitrés encima de la caja.`],
      [`The road to the ${home} training ground carries your name. The sign is stolen roughly once a year.`,
       `La calle que lleva a la ciudad deportiva de ${home} tiene tu nombre. Roban el cartel más o menos una vez al año.`],
      [`${home} put a mural of you on the wall of the south end. It has been repainted twice and touched up more often than that.`,
       `${home} pintó un mural tuyo en la pared del fondo sur. Lo han repintado dos veces y retocado muchas más.`],
    ]));
  } else if (prof.homeIdol >= 62) {
    beats.push(pickBeat(rng, '🖼️', 'good', [
      [`Your shirt is framed in the corridor at ${home}, between two players nobody under thirty remembers.`,
       `Tu camiseta está enmarcada en el pasillo de ${home}, entre dos jugadores que nadie menor de treinta recuerda.`],
      [`${home} still use a photograph of you in the season-ticket brochure. It is nineteen years old.`,
       `${home} todavía usa una foto tuya en el folleto de abonos. Tiene diecinueve años.`],
      [`You are on the wall of the ${home} boot room, in the row of people who were there a long time.`,
       `Estás en la pared del vestuario de ${home}, en la fila de los que estuvieron mucho tiempo.`],
    ]));
  } else if (prof.mercenary) {
    beats.push(pickBeat(rng, '📦', 'cold', [
      [`${prof.clubCount} clubs, and not one of them has anything of yours on a wall. You were paid extremely well for that.`,
       `${prof.clubCount} clubes, y ninguno tiene nada tuyo en una pared. Te pagaron muy bien por eso.`],
      [`${prof.clubCount} sets of supporters remember you as a season. None of them as a player.`,
       `${prof.clubCount} aficiones te recuerdan como una temporada. Ninguna como un jugador.`],
      [`A quiz question uses you as the answer to "which player turned out for all of these?" You are a piece of trivia.`,
       `Una pregunta de concurso te usa como respuesta a "¿qué jugador pasó por todos estos?". Eres un dato curioso.`],
    ]));
  }

  // ---- the number ----
  const titlesAtHome = prof.homeClubId ? (p.titlesByClub?.[prof.homeClubId] ?? 0) : 0;
  if (prof.homeIdol >= 85 && titlesAtHome >= 2) {
    beats.push(pickBeat(rng, '🔢', 'gold', [
      [`${home} have not given out the number ${p.number} since. Two managers have asked. Both were told no.`,
       `${home} no volvió a dar el dorsal ${p.number}. Dos entrenadores lo pidieron. A los dos les dijeron que no.`],
      [`The ${p.number} shirt is retired at ${home}. A signing asked for it once and the kitman just laughed at him.`,
       `El dorsal ${p.number} está retirado en ${home}. Un fichaje lo pidió una vez y el utillero se rió en su cara.`],
      [`No ${home} player has worn ${p.number} since you took it off. There was never a ceremony; it simply stopped being available.`,
       `Ningún jugador de ${home} lleva el ${p.number} desde que te lo quitaste. Nunca hubo ceremonia: dejó de estar disponible y ya.`],
    ]));
  } else if (prof.homeIdol >= 70) {
    beats.push(pickBeat(rng, '🔢', 'good', [
      [`A boy at ${home} wears your old ${p.number} now and gets asked about it in every interview.`,
       `Un chico de ${home} lleva ahora tu antiguo ${p.number} y le preguntan por él en cada entrevista.`],
      [`Whoever takes the ${p.number} at ${home} is compared to you within a month. Two of them have asked to change it.`,
       `Al que coge el ${p.number} en ${home} lo comparan contigo en un mes. Dos han pedido cambiarlo.`],
    ]));
  }

  // ---- the records ----
  if (prof.records > 0) {
    const stillHeld = describeRecords(p, stages, prof, rng);
    if (stillHeld) beats.push(stillHeld);
  }

  // ---- the songs, and the grudges ----
  if (prof.traitor) {
    beats.push(pickBeat(rng, '🗡️', 'cold', [
      [`One set of supporters still boos your name in a montage twenty years on. You knew what it would cost when you signed, and you signed.`,
       `Una afición todavía silba tu nombre en los vídeos de recuerdo veinte años después. Sabías lo que costaba cuando firmaste, y firmaste.`],
      [`There is a pub in one city where your name is still not said out loud. You have been told this and you believe it.`,
       `Hay un bar en una ciudad donde tu nombre todavía no se dice en voz alta. Te lo han contado y te lo crees.`],
      [`A generation of children in one city were taught your name as a warning rather than as a player.`,
       `A una generación de niños de una ciudad les enseñaron tu nombre como advertencia, no como jugador.`],
    ]));
  } else if (prof.homeIdol >= 80) {
    beats.push(pickBeat(rng, '🎵', 'gold', [
      [`They still sing it. Not often — three or four times a season, usually when they are losing.`,
       `Todavía lo cantan. No siempre — tres o cuatro veces por temporada, casi siempre cuando van perdiendo.`],
      [`The song about you outlived the tune it was stolen from. Nobody under twenty-five knows the original.`,
       `La canción sobre ti sobrevivió a la melodía de la que la robaron. Nadie menor de veinticinco conoce la original.`],
      [`Away ends sing your song sarcastically. The home end sings it back, louder, and means it.`,
       `Las aficiones visitantes cantan tu canción con sorna. La grada local la devuelve más fuerte, y en serio.`],
    ]));
  } else if (prof.oneClubMan) {
    beats.push(pickBeat(rng, '🏠', 'good', [
      [`One badge, a whole career. There are fewer of those every year and the ones who did it get asked about it constantly.`,
       `Un solo escudo, una carrera entera. Cada año quedan menos, y a los que lo hicieron les preguntan por ello sin parar.`],
      [`You are used as the example whenever somebody argues that loyalty is dead. You have stopped correcting the details.`,
       `Te usan de ejemplo cada vez que alguien discute que la lealtad murió. Dejaste de corregir los detalles.`],
    ]));
  }

  // ---- the country ----
  if (prof.worldCups > 0) {
    beats.push(pickBeat(rng, '🏆', 'gold', [
      [`A country that watched you lift it will show that tournament every four years for as long as there is television.`,
       `Un país que te vio levantarla va a repetir ese torneo cada cuatro años mientras exista la televisión.`],
      [`Children who were not born when you won it can name the starting eleven. You are third or fourth in the list, every time.`,
       `Niños que no habían nacido cuando la ganaste se saben el once. Sales tercero o cuarto en la lista, siempre.`],
      [`There is a national holiday in the calendar that exists because of a month you spent working.`,
       `Hay una fiesta nacional en el calendario que existe por un mes que pasaste trabajando.`],
    ]));
  } else if (prof.ntLegend) {
    beats.push(pickBeat(rng, '🌍', 'good', [
      [`${prof.ntCaps} caps for ${nation?.en ?? ''}. You are on the wall at the federation, among the players who passed a hundred.`,
       `${prof.ntCaps} partidos con ${nation?.es ?? ''}. Estás en la pared de la federación, entre los que pasaron de cien.`],
      [`Only a handful of people have worn that shirt more often than you did. Two of them are on the coaching staff now.`,
       `Solo un puñado de personas vistió esa camiseta más veces que tú. Dos están ahora en el cuerpo técnico.`],
      [`Every squad announcement for a decade began with somebody asking whether you were in it.`,
       `Durante una década, cada convocatoria empezaba con alguien preguntando si estabas.`],
    ]));
  } else if (prof.neverCapped) {
    beats.push(pickBeat(rng, '📵', 'cold', [
      [`Your country never called, not once, and that is the first thing written about you every time your name comes up.`,
       `Tu país no te llamó nunca, ni una vez, y es lo primero que se escribe sobre ti cada vez que sale tu nombre.`],
      [`Two managers admitted years later that they should have picked you. Neither of them did when it would have counted.`,
       `Dos seleccionadores admitieron años después que debieron convocarte. Ninguno lo hizo cuando servía.`],
      [`You are the standard example, in one country, of a player the federation forgot about.`,
       `Eres el ejemplo típico, en un país, del jugador del que la federación se olvidó.`],
    ]));
  }

  // ---- the nearly ----
  if (prof.finalsLost >= 4 && prof.bigTitles === 0) {
    beats.push(pickBeat(rng, '🥈', 'cold', [
      [`${prof.finalsLost} finals and seconds, no medals. There is a generation who will argue you deserved better and a generation who will say that is what finals are for.`,
       `${prof.finalsLost} finales y segundos puestos, ninguna medalla. Hay una generación que dirá que merecías más y otra que dirá que para eso están las finales.`],
      [`${prof.finalsLost} times you were one game away and lost it. That is the entry. It is short.`,
       `${prof.finalsLost} veces estuviste a un partido y lo perdiste. Esa es la entrada. Es corta.`],
    ]));
  } else if (prof.finalsLost >= 4) {
    beats.push(pickBeat(rng, '🥈', 'neutral', [
      [`${prof.finalsLost} times you finished second. Nobody lists those, but you can still name all of them in order.`,
       `${prof.finalsLost} veces terminaste segundo. Nadie las enumera, pero tú todavía las dices todas en orden.`],
      [`For every trophy there is a season you lost by a point or a goal. You remember those ones better.`,
       `Por cada título hay una temporada que perdiste por un punto o un gol. Esas las recuerdas mejor.`],
    ]));
  }

  // ---- the numbers a career leaves behind ----
  if (prof.goals >= 250) {
    beats.push(pickBeat(rng, '⚽', 'good', [
      [`${prof.goals} goals. Somebody has uploaded all of them in one video and it is four hours long.`,
       `${prof.goals} goles. Alguien los subió todos en un vídeo y dura cuatro horas.`],
      [`${prof.goals} goals across ${prof.apps} games. The ratio is the part that gets quoted, not the total.`,
       `${prof.goals} goles en ${prof.apps} partidos. Lo que se cita es la media, no el total.`],
    ]));
  } else if (prof.assists >= 150) {
    beats.push(pickBeat(rng, '🅰️', 'good', [
      [`${prof.assists} assists. A generation of forwards owe a chunk of their careers to your passing and about half of them have said so.`,
       `${prof.assists} asistencias. Una generación de delanteros le debe parte de su carrera a tus pases y la mitad lo ha dicho.`],
      [`Nobody kept count of assists properly when you started. By the time they did, you were the reason they bothered.`,
       `Cuando empezaste nadie contaba bien las asistencias. Para cuando lo hicieron, tú eras el motivo de que se molestaran.`],
    ]));
  } else if (prof.apps >= 600) {
    beats.push(pickBeat(rng, '🦵', 'good', [
      [`${prof.apps} professional games. You have had both knees operated on and you would do it again.`,
       `${prof.apps} partidos como profesional. Te operaron las dos rodillas y lo volverías a hacer.`],
      [`${prof.apps} appearances over ${prof.seasons} seasons. Availability was the talent nobody put on a highlight reel.`,
       `${prof.apps} partidos en ${prof.seasons} temporadas. Estar siempre disponible fue el talento que nadie puso en un resumen.`],
    ]));
  }

  // ---- the Ballon d'Or, and the almost ----
  if (prof.ballon >= 3) {
    beats.push(pickBeat(rng, '🥇', 'gold', [
      [`${prof.ballon} Ballons d'Or. The argument about who was the best of your era begins and ends with a comparison to you.`,
       `${prof.ballon} Balones de Oro. La discusión sobre quién fue el mejor de tu época empieza y acaba comparándose contigo.`],
      [`You are the reason a whole decade is named after a rivalry. The other man is asked about you more than about himself.`,
       `Eres el motivo de que una década entera lleve el nombre de una rivalidad. Al otro le preguntan más por ti que por él.`],
    ]));
  } else if (prof.ballon === 0 && prof.individual >= 8) {
    beats.push(pickBeat(rng, '🥇', 'neutral', [
      [`Every award except the one. It comes up in every profile written about you, always in the second paragraph.`,
       `Todos los premios menos ese. Sale en cada perfil que escriben sobre ti, siempre en el segundo párrafo.`],
      [`You were second in the voting twice. Both winners have said, publicly, that they thought it should have been you.`,
       `Quedaste segundo en la votación dos veces. Los dos ganadores dijeron en público que creían que debía ser tuyo.`],
    ]));
  }

  // ---- what the farewell decided ----
  if (p.flags?.gaveToAcademy) {
    beats.push(pickBeat(rng, '🌱', 'gold', [
      [`The academy your testimonial paid for has produced eleven professionals. Every one of them knows whose night bought the pitches.`,
       `La cantera que pagó tu homenaje sacó once profesionales. Todos saben de quién fue la noche que pagó esos campos.`],
      [`The pitches your testimonial paid for are still there, still busy, still with your name on the gate.`,
       `Los campos que pagó tu homenaje siguen ahí, siguen llenos y siguen con tu nombre en la puerta.`],
    ]));
  }
  if (p.flags?.paidTheStaff) {
    beats.push(pickBeat(rng, '🧺', 'gold', [
      [`The kitman you gave a year's wages to was at your fiftieth birthday. He brought the shirt you wore in your last game.`,
       `El utillero al que le diste un año de sueldo estuvo en tu cincuenta cumpleaños. Trajo la camiseta de tu último partido.`],
    ]));
  }
  if (p.flags?.mentoredTheKid) {
    beats.push(pickBeat(rng, '👥', 'gold', [
      [`The boy you trained after training captained the club for six years and named you in his own retirement speech.`,
       `El chico al que entrenabas después de entrenar fue capitán seis años y te nombró en su propio discurso de retirada.`],
      [`He went further than you did, and says in every interview that he was taught by you. You correct him every time.`,
       `Llegó más lejos que tú, y dice en cada entrevista que lo formaste tú. Tú se lo corriges siempre.`],
    ]));
  }
  if (p.flags?.wentHomeToDie) {
    beats.push(pickBeat(rng, '🏡', 'gold', [
      [`Going back for those last six months is the part they tell first. Not the trophies — the going back.`,
       `Volver esos últimos seis meses es la parte que cuentan primero. No los títulos: la vuelta.`],
      [`Eleven games at the end, for nothing, at the club that made you. It is on the wall there, framed, above everything you won elsewhere.`,
       `Once partidos al final, gratis, en el club que te hizo. Está enmarcado ahí, encima de todo lo que ganaste fuera.`],
    ]));
  }
  if (p.flags?.leftInSilence) {
    beats.push(pickBeat(rng, '🤫', 'cold', [
      [`You never said goodbye and nobody ever asked you to. It is the cleanest exit in this book and the loneliest.`,
       `Nunca te despediste y nadie te lo pidió. Es la salida más limpia de este libro y la más solitaria.`],
      [`There is no last interview, no last photograph, no last anything. You just stopped turning up.`,
       `No hay última entrevista, ni última foto, ni último nada. Simplemente dejaste de aparecer.`],
    ]));
  }
  if (p.flags?.chasedOneMoreYear) {
    beats.push(pickBeat(rng, '📞', 'cold', [
      [`You told an interviewer years later that the hardest part was not the last game. It was the August afterwards, waiting for a phone that had stopped.`,
       `Le dijiste a un periodista años después que lo más duro no fue el último partido. Fue el agosto siguiente, esperando un teléfono que ya no sonaba.`],
      [`You kept your boots in the car until Christmas, in case anybody rang. Nobody did.`,
       `Guardaste las botas en el coche hasta Navidad, por si alguien llamaba. No llamó nadie.`],
    ]));
  }
  if (p.flags?.burnedTheFederation) {
    beats.push(pickBeat(rng, '🔥', 'neutral', [
      [`The federation never invited you to anything again. You have been asked about that answer in every interview since and you have never taken it back.`,
       `La federación no volvió a invitarte a nada. Te han preguntado por esa respuesta en cada entrevista desde entonces y nunca te has retractado.`],
      [`Your quote is printed on a banner that appears at qualifiers, usually when things are going badly.`,
       `Tu frase está impresa en una pancarta que aparece en las eliminatorias, casi siempre cuando las cosas van mal.`],
    ]));
  }
  if (p.flags?.startedLastDerby) {
    beats.push(pickBeat(rng, '🔥', 'good', [
      [`Starting that last derby is the photograph they use whenever your name comes up. You are exhausted in it.`,
       `Ser titular en ese último clásico es la foto que usan cada vez que sale tu nombre. Sales agotado.`],
    ]));
  }
  if (p.flags?.graciousAboutCountry) {
    beats.push(pickBeat(rng, '🕊️', 'good', [
      [`The answer you gave about never being picked is quoted at coaching courses. It is the least bitter thing anybody said that decade.`,
       `La respuesta que diste sobre no ser convocado se cita en los cursos de entrenadores. Fue lo menos amargo que dijo nadie esa década.`],
    ]));
  }

  // ---- money, and the shape of the rest of it ----
  if ((p.money ?? 0) > 60_000_000 && prof.homeIdol < 60) {
    beats.push(pickBeat(rng, '💰', 'neutral', [
      [`You are worth more than most of the clubs you played for. It comes up more often than the football does.`,
       `Vales más que casi todos los clubes en los que jugaste. Sale en la conversación más veces que el fútbol.`],
      [`The money outlasted the reputation. Both of your children went to schools you could not have pointed to at nineteen.`,
       `El dinero duró más que la fama. Tus dos hijos fueron a colegios que a los diecinueve no habrías sabido ni señalar.`],
    ]));
  }
  if (prof.clutchWon >= 4) {
    beats.push(pickBeat(rng, '🎯', 'good', [
      [`When it was tight, it went to you. ${prof.clutchWon} times it came off, and those are the ones anybody remembers.`,
       `Cuando estaba apretado, iba para ti. ${prof.clutchWon} veces salió bien, y esas son las que recuerda todo el mundo.`],
      [`Somebody worked out that you scored or made the winner in ${prof.clutchWon} matches that decided something. It is on a graphic every anniversary.`,
       `Alguien calculó que marcaste o diste el gol decisivo en ${prof.clutchWon} partidos que decidían algo. Sale en un gráfico cada aniversario.`],
    ]));
  }
  if (prof.wentHome && !p.flags?.wentHomeToDie) {
    beats.push(pickBeat(rng, '↩️', 'good', [
      [`You left and you came back, which is the thing supporters forgive fastest and remember longest.`,
       `Te fuiste y volviste, que es lo que las aficiones perdonan más rápido y recuerdan más tiempo.`],
    ]));
  }

  const headline = verdict(prof, p, rng);
  const closing = coda(prof, path, rng);
  return {
    headlineEn: headline.en, headlineEs: headline.es,
    beats: beats.slice(0, 6),
    codaEn: closing.en,
    codaEs: closing.es,
  };
}

/** Whether the marks you set were still standing. */
function describeRecords(
  p: CareerPlayer, stages: SeasonRecord[], prof: CareerProfile, rng: Rng,
): EpilogueBeat | null {
  const home = prof.homeClubId;
  if (!home) return null;
  const club = getClub(home);
  const rec = clubRecords(home);
  const mine = clubTallies(stages).get(home);
  if (!club || !mine) return null;

  const heldGoals = mine.goals > rec.goals;
  const heldApps = mine.apps > rec.apps;
  if (!heldGoals && !heldApps) return null;

  // A record eventually falls, or it does not. The bigger the margin you set it
  // by, the likelier it is still standing twenty years on.
  const margin = heldGoals ? mine.goals - rec.goals : mine.apps - rec.apps;
  const survives = rng.chance(Math.min(0.85, 0.3 + margin / 120));
  const what = heldGoals
    ? { en: 'scoring record', es: 'récord de goles' }
    : { en: 'appearance record', es: 'récord de partidos' };
  const n = heldGoals ? mine.goals : mine.apps;

  if (survives) {
    return pickBeat(rng, '📖', 'gold', [
      [`Your ${club.name} ${what.en} still stands at ${n}. Two players have got within thirty and both left.`,
       `Tu ${what.es} en ${club.name} sigue en pie con ${n}. Dos jugadores llegaron a treinta y ambos se fueron.`],
      [`Nobody has come near ${n} at ${club.name}. The club puts the number on a graphic every time somebody has a good season.`,
       `Nadie se ha acercado a ${n} en ${club.name}. El club saca ese número en un gráfico cada vez que alguien hace una buena temporada.`],
      [`${n}. The board in the ${club.name} corridor has not been reprinted since you left it.`,
       `${n}. El panel del pasillo de ${club.name} no se ha reimpreso desde que lo dejaste ahí.`],
      [`Two players have been signed specifically to beat your ${club.name} ${what.en}. Neither got past two thirds of it.`,
       `Han fichado a dos jugadores expresamente para batir tu ${what.es} en ${club.name}. Ninguno pasó de dos tercios.`],
    ]);
  }
  return pickBeat(rng, '📖', 'neutral', [
    [`A boy born the year you set it took your ${club.name} ${what.en} off you. You were in the directors' box and stood up before the home end did.`,
     `Un chico nacido el año que lo lograste te quitó el ${what.es} de ${club.name}. Estabas en el palco y te levantaste antes que la grada local.`],
    [`Your ${club.name} ${what.en} lasted eleven years. The man who broke it phoned you the same night, and you answered.`,
     `Tu ${what.es} en ${club.name} duró once años. El que lo batió te llamó esa misma noche, y contestaste.`],
    [`They took ${n} off you eventually. You had the number long enough that a generation thought it was permanent.`,
     `Al final te quitaron los ${n}. Lo tuviste tanto tiempo que una generación creyó que era para siempre.`],
  ]);
}

function verdict(prof: CareerProfile, p: CareerPlayer, rng: Rng): { en: string; es: string } {
  const home = getClub(prof.homeClubId ?? '')?.name ?? '';
  const pick = (a: { en: string; es: string }[]) => a[rng.int(a.length)];
  switch (prof.tier) {
    case 'immortal':
      return pick([
        { en: `They do not argue about you. That is the rarest thing in football.`,
          es: `Sobre ti no se discute. Es lo más raro que hay en el fútbol.` },
        { en: `Every list has you on it, and nobody writes an article about why.`,
          es: `Estás en todas las listas, y nadie escribe un artículo explicando por qué.` },
        { en: `You are not compared to your generation. Your generation is compared to you.`,
          es: `A ti no te comparan con tu generación. A tu generación la comparan contigo.` },
        { en: `Whatever the argument is, you are the thing both sides agree on.`,
          es: `Sea cual sea la discusión, tú eres en lo que están de acuerdo los dos bandos.` },
      ]);
    case 'legend':
      if (prof.oneClubMan) {
        return pick([
          { en: `At ${home}, you are not a player they had. You are part of what the club is.`,
            es: `En ${home} no eres un jugador que tuvieron. Eres parte de lo que el club es.` },
          { en: `One badge and a cabinet. ${home} measure their good years against yours.`,
            es: `Un solo escudo y una vitrina. En ${home} miden sus buenos años contra los tuyos.` },
        ]);
      }
      return pick([
        { en: `A career that has to be explained with a list, and the list is long.`,
          es: `Una carrera que hay que explicar con una lista, y la lista es larga.` },
        { en: `Great almost everywhere you went, which is harder than being great in one place.`,
          es: `Grande en casi todos los sitios donde estuviste, que es más difícil que serlo en uno solo.` },
        { en: `You won enough that people forget the years you were merely very good.`,
          es: `Ganaste lo suficiente como para que se olviden los años en que solo eras muy bueno.` },
      ]);
    case 'great':
      if (prof.finalsLost >= 3) {
        return pick([
          { en: `Very good, for a very long time, and unlucky at the exact moments that get remembered.`,
            es: `Muy bueno, durante muchísimo tiempo, y con mala suerte justo en los momentos que se recuerdan.` },
          { en: `A career decided by about four hours of football spread over fifteen years.`,
            es: `Una carrera decidida por unas cuatro horas de fútbol repartidas en quince años.` },
        ]);
      }
      return pick([
        { en: `Good enough for long enough that people forget how good you were.`,
          es: `Lo bastante bueno durante el tiempo suficiente como para que se olvide lo bueno que eras.` },
        { en: `The kind of career other players describe accurately and supporters underrate.`,
          es: `De esas carreras que los jugadores describen con precisión y las aficiones infravaloran.` },
        { en: `You were the second name on the teamsheet for a decade. Nobody builds statues for that and everybody needs it.`,
          es: `Fuiste el segundo nombre de la alineación durante una década. Nadie hace estatuas de eso y todo el mundo lo necesita.` },
      ]);
    case 'solid':
      if (prof.homeIdol >= 65) {
        return pick([
          { en: `One set of supporters will defend you to anybody, forever. That is more than most careers get.`,
            es: `Una afición te va a defender ante quien sea, para siempre. Es más de lo que consigue casi nadie.` },
          { en: `You mattered enormously in one place and not at all anywhere else, which is how most love works.`,
            es: `Importaste muchísimo en un sitio y nada en el resto, que es como funciona casi todo el cariño.` },
        ]);
      }
      return pick([
        { en: `A professional footballer for ${prof.seasons} years. Almost nobody manages that, and almost nobody says so.`,
          es: `Futbolista profesional durante ${prof.seasons} años. Casi nadie lo consigue, y casi nadie lo dice.` },
        { en: `${prof.apps} games. Not a story anybody tells, and a life most people would take.`,
          es: `${prof.apps} partidos. No es una historia que nadie cuente, y es una vida que casi todos firmarían.` },
      ]);
    case 'journeyman':
      // A man who did it all at one club is not described by a club count.
      if (prof.clubCount === 1) {
        return {
          en: `${prof.apps} games, one badge, nothing in the cabinet. ${home} know exactly who you were.`,
          es: `${prof.apps} partidos, un solo escudo, la vitrina vacía. En ${home} saben perfectamente quién eras.`,
        };
      }
      return {
        en: `${prof.clubCount} clubs, ${prof.apps} games, and a living made out of the thing you would have done for free.`,
        es: `${prof.clubCount} clubes, ${prof.apps} partidos y una vida ganada con lo que habrías hecho gratis.`,
      };
    default:
      return {
        en: `It was short, and it was still further than everyone you grew up playing with.`,
        es: `Fue corta, y aun así llegaste más lejos que todos los que jugaban contigo de niño.`,
      };
  }
}

/**
 * The last line, in both languages from a single draw.
 *
 * Drawing per language would have consumed two rolls and produced a Spanish
 * closing line that was not a translation of the English one — flip the toggle
 * and the ending would quietly say something else.
 */
function coda(prof: CareerProfile, path: PathId, rng: Rng): { en: string; es: string } {
  const home = getClub(prof.homeClubId ?? '')?.name ?? '';

  // Built from what is actually true about this career, then one is drawn. The
  // old version had three lines and every ending closed on one of them.
  const pool: [string, string][] = [];

  if (prof.homeIdol >= 75) {
    pool.push([`When you go back to ${home} it still takes you forty minutes to cross the car park.`,
               `Cuando vuelves a ${home}, todavía tardas cuarenta minutos en cruzar el aparcamiento.`]);
    pool.push([`You have signed the same photograph perhaps nine thousand times. You have never once said no to it.`,
               `Habrás firmado la misma foto unas nueve mil veces. Nunca te has negado ni una.`]);
  } else {
    pool.push([`When you go back to the ground, you buy a ticket like everybody else.`,
               `Cuando vuelves al estadio, compras la entrada como todo el mundo.`]);
  }

  if (path === 'away') {
    pool.push([`Somebody recognises you at a petrol station about once a year and it takes you a second to remember why.`,
               `Alguien te reconoce en una gasolinera una vez al año y tardas un segundo en acordarte de por qué.`]);
    pool.push([`Your boots are in a box in a garage. You know which box. You have not opened it.`,
               `Tus botas están en una caja en un garaje. Sabes en cuál. No la has abierto.`]);
  } else {
    pool.push([`You are still in the game. It is not the same and you knew that from the first day.`,
               `Sigues dentro del fútbol. Ya no es lo mismo y lo sabes desde el primer día.`]);
  }

  if (prof.neverWon) {
    pool.push([`You won nothing. You played ${prof.apps} games as a professional, which is the part you forget to mention.`,
               `No ganaste nada. Jugaste ${prof.apps} partidos como profesional, que es la parte que se te olvida contar.`]);
  } else {
    pool.push([`The medals are in a box, not a cabinet. You know exactly which box.`,
               `Las medallas están en una caja, no en una vitrina. Sabes exactamente en qué caja.`]);
  }

  if (prof.finalsLost >= 3) {
    pool.push([`You still watch one of those finals back, on your own, maybe once a year.`,
               `Todavía vuelves a ver una de esas finales, tú solo, quizá una vez al año.`]);
  }
  if (prof.clubCount >= 6) {
    pool.push([`You can still name every landlord and every wrong turning in ${prof.clubCount} cities.`,
               `Todavía te acuerdas de cada casero y cada calle equivocada en ${prof.clubCount} ciudades.`]);
  }
  if (prof.oneClubMan) {
    pool.push([`One city, one badge, one life. You have been asked whether you regret it and the honest answer bores people.`,
               `Una ciudad, un escudo, una vida. Te han preguntado si te arrepientes y la respuesta honesta aburre a la gente.`]);
  }
  if (prof.ntCaps > 0 && prof.worldCups === 0) {
    pool.push([`Every four years you watch the tournament you never won and say nothing for ninety minutes.`,
               `Cada cuatro años ves el torneo que nunca ganaste y no dices nada durante noventa minutos.`]);
  }
  if (prof.seasons >= 18) {
    pool.push([`${prof.seasons} seasons. You cannot remember the first one clearly and you can describe the last one minute by minute.`,
               `${prof.seasons} temporadas. La primera no la recuerdas bien y la última la puedes contar minuto a minuto.`]);
  }
  pool.push([`Somebody asks what you did before, now and again. You always take a second before answering.`,
             `De vez en cuando alguien te pregunta a qué te dedicabas antes. Siempre tardas un segundo en contestar.`]);

  const [en, es] = pool[rng.int(pool.length)];
  return { en, es };
}

export const epilogueHeadline = (e: Epilogue, lang: Lang) => (lang === 'es' ? e.headlineEs : e.headlineEn);
export const epilogueCoda = (e: Epilogue, lang: Lang) => (lang === 'es' ? e.codaEs : e.codaEn);
export const beatText = (b: EpilogueBeat, lang: Lang) => (lang === 'es' ? b.es : b.en);
