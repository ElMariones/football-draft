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
  const beats: EpilogueBeat[] = [];
  const home = getClub(prof.homeClubId ?? '')?.name ?? '';
  const nation = getNation(p.ntNationCode);

  // ---- the ground ----
  if (prof.homeIdol >= 88 && prof.bigTitles >= 2) {
    beats.push(B('🗿', 'gold',
      `There is a bronze of you outside ${home}. You hated the photograph they worked from and said so, once, and never again.`,
      `Hay un bronce tuyo fuera de ${home}. Odiabas la foto de la que partieron y lo dijiste una vez, y nunca más.`));
  } else if (prof.homeIdol >= 78) {
    beats.push(B('🚪', 'gold',
      `They named a stand entrance after you at ${home}. Forty thousand people walk under your name on a Saturday without looking up, which is exactly right.`,
      `Le pusieron tu nombre a un acceso del estadio en ${home}. Cuarenta mil personas pasan bajo tu nombre un sábado sin levantar la vista, que es justo como debe ser.`));
  } else if (prof.homeIdol >= 62) {
    beats.push(B('🖼️', 'good',
      `Your shirt is framed in the corridor at ${home}, between two players nobody under thirty remembers.`,
      `Tu camiseta está enmarcada en el pasillo de ${home}, entre dos jugadores que nadie menor de treinta recuerda.`));
  } else if (prof.mercenary) {
    beats.push(B('📦', 'cold',
      `${prof.clubCount} clubs, and not one of them has anything of yours on a wall. You were paid extremely well for that.`,
      `${prof.clubCount} clubes, y ninguno tiene nada tuyo en una pared. Te pagaron muy bien por eso.`));
  }

  // ---- the number ----
  const titlesAtHome = prof.homeClubId ? (p.titlesByClub?.[prof.homeClubId] ?? 0) : 0;
  if (prof.homeIdol >= 85 && titlesAtHome >= 2) {
    beats.push(B('🔢', 'gold',
      `${home} have not given out your number since. Two managers have asked. Both were told no.`,
      `${home} no volvió a dar tu dorsal. Dos entrenadores lo pidieron. A los dos les dijeron que no.`));
  } else if (prof.homeIdol >= 70) {
    beats.push(B('🔢', 'good',
      `A boy at ${home} wears your old number now and gets asked about it in every interview.`,
      `Un chico de ${home} lleva ahora tu antiguo dorsal y le preguntan por él en cada entrevista.`));
  }

  // ---- the records ----
  if (prof.records > 0) {
    const stillHeld = describeRecords(p, stages, prof, rng);
    if (stillHeld) beats.push(stillHeld);
  }

  // ---- the songs ----
  if (prof.traitor) {
    beats.push(B('🗡️', 'cold',
      `One set of supporters still boos your name in a montage twenty years on. You knew what it would cost when you signed, and you signed.`,
      `Una afición todavía silba tu nombre en los vídeos de recuerdo veinte años después. Sabías lo que costaba cuando firmaste, y firmaste.`));
  } else if (prof.homeIdol >= 80) {
    beats.push(B('🎵', 'gold',
      `They still sing it. Not often — three or four times a season, usually when they are losing.`,
      `Todavía lo cantan. No siempre — tres o cuatro veces por temporada, casi siempre cuando van perdiendo.`));
  } else if (prof.oneClubMan) {
    beats.push(B('🏠', 'good',
      `One badge, a whole career. There are fewer of those every year and the ones who did it get asked about it constantly.`,
      `Un solo escudo, una carrera entera. Cada año quedan menos, y a los que lo hicieron les preguntan por ello sin parar.`));
  }

  // ---- the country ----
  if (prof.worldCups > 0) {
    beats.push(B('🏆', 'gold',
      `A country that watched you lift it will show that tournament every four years for as long as there is television.`,
      `Un país que te vio levantarla va a repetir ese torneo cada cuatro años mientras exista la televisión.`));
  } else if (prof.ntLegend) {
    beats.push(B('🌍', 'good',
      `${prof.ntCaps} caps for ${nation?.en ?? ''}. You are on the wall at the federation, among the players who passed a hundred.`,
      `${prof.ntCaps} partidos con ${nation?.es ?? ''}. Estás en la pared de la federación, en la fila de los que pasaron de cien.`));
  } else if (prof.neverCapped) {
    beats.push(B('📵', 'cold',
      `Your country never called, not once, and that is the first thing written about you every time your name comes up.`,
      `Tu país no te llamó nunca, ni una vez, y es lo primero que se escribe sobre ti cada vez que sale tu nombre.`));
  }

  // ---- the nearly ----
  if (prof.finalsLost >= 4 && prof.bigTitles === 0) {
    beats.push(B('🥈', 'cold',
      `${prof.finalsLost} finals and seconds, no medals. It is the whole entry. There is a generation who will argue you deserved better and a generation who will say that is what finals are for.`,
      `${prof.finalsLost} finales y segundos puestos, ninguna medalla. Es la entrada entera. Hay una generación que dirá que merecías más y otra que dirá que para eso están las finales.`));
  } else if (prof.finalsLost >= 4) {
    beats.push(B('🥈', 'neutral',
      `${prof.finalsLost} times you finished second. Nobody lists those, but you can still name all of them in order.`,
      `${prof.finalsLost} veces terminaste segundo. Nadie las enumera, pero tú todavía las dices todas en orden.`));
  }

  // ---- what the farewell decided ----
  if (p.flags?.gaveToAcademy) {
    beats.push(B('🌱', 'gold',
      `The academy your testimonial paid for has produced eleven professionals. Every one of them knows whose night bought the pitches.`,
      `La cantera que pagó tu homenaje sacó once profesionales. Todos saben de quién fue la noche que pagó esos campos.`));
  }
  if (p.flags?.mentoredTheKid) {
    beats.push(B('👥', 'gold',
      `The boy you trained after training captained the club for six years and named you in his own retirement speech.`,
      `El chico al que entrenabas después de entrenar fue capitán seis años y te nombró en su propio discurso de retirada.`));
  }
  if (p.flags?.wentHomeToDie) {
    beats.push(B('🏡', 'gold',
      `Going back for those last six months is the part they tell first. Not the trophies — the going back.`,
      `Volver esos últimos seis meses es la parte que cuentan primero. No los títulos: la vuelta.`));
  }
  if (p.flags?.leftInSilence) {
    beats.push(B('🤫', 'cold',
      `You never said goodbye and nobody ever asked you to. It is the cleanest exit in this book and the loneliest.`,
      `Nunca te despediste y nadie te lo pidió. Es la salida más limpia de este libro y la más solitaria.`));
  }
  if (p.flags?.chasedOneMoreYear) {
    beats.push(B('📞', 'cold',
      `You told an interviewer years later that the hardest part was not the last game. It was the August afterwards, waiting for a phone that had stopped.`,
      `Le dijiste a un periodista años después que lo más duro no fue el último partido. Fue el agosto siguiente, esperando un teléfono que ya no sonaba.`));
  }
  if (p.flags?.burnedTheFederation) {
    beats.push(B('🔥', 'neutral',
      `The federation never invited you to anything again. You have been asked about that answer in every interview since and you have never taken it back.`,
      `La federación no volvió a invitarte a nada. Te han preguntado por esa respuesta en cada entrevista desde entonces y nunca te has retractado.`));
  }

  // ---- money ----
  if ((p.money ?? 0) > 60_000_000 && prof.homeIdol < 60) {
    beats.push(B('💰', 'neutral',
      `You are worth more than most of the clubs you played for. It comes up more often than the football does.`,
      `Vales más que casi todos los clubes en los que jugaste. Sale en la conversación más veces que el fútbol.`));
  }

  const headline = verdict(prof, p);
  return {
    headlineEn: headline.en, headlineEs: headline.es,
    beats: beats.slice(0, 6),
    codaEn: coda(prof, path, 'en', rng),
    codaEs: coda(prof, path, 'es', rng),
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
    return B('📖', 'gold',
      `Your ${club.name} ${what.en} still stands at ${n}. Two players have got within thirty and both left.`,
      `Tu ${what.es} en ${club.name} sigue en pie con ${n}. Dos jugadores llegaron a treinta y ambos se fueron.`);
  }
  return B('📖', 'neutral',
    `A boy born the year you set it took your ${club.name} ${what.en} off you. You were in the directors' box and stood up before the home end did.`,
    `Un chico nacido el año que lo lograste te quitó el ${what.es} de ${club.name}. Estabas en el palco y te levantaste antes que la grada local.`);
}

function verdict(prof: CareerProfile, p: CareerPlayer): { en: string; es: string } {
  const home = getClub(prof.homeClubId ?? '')?.name ?? '';
  switch (prof.tier) {
    case 'immortal':
      return {
        en: `They do not argue about you. That is the rarest thing in football.`,
        es: `Sobre ti no se discute. Es lo más raro que hay en el fútbol.`,
      };
    case 'legend':
      return prof.oneClubMan
        ? { en: `At ${home}, you are not a player they had. You are part of what the club is.`,
            es: `En ${home} no eres un jugador que tuvieron. Eres parte de lo que el club es.` }
        : { en: `A career that has to be explained with a list, and the list is long.`,
            es: `Una carrera que hay que explicar con una lista, y la lista es larga.` };
    case 'great':
      return prof.finalsLost >= 3
        ? { en: `Very good, for a very long time, and unlucky at the exact moments that get remembered.`,
            es: `Muy bueno, durante muchísimo tiempo, y con mala suerte justo en los momentos que se recuerdan.` }
        : { en: `Good enough for long enough that people forget how good you were.`,
            es: `Lo bastante bueno durante el tiempo suficiente como para que se olvide lo bueno que eras.` };
    case 'solid':
      return prof.homeIdol >= 65
        ? { en: `One set of supporters will defend you to anybody, forever. That is more than most careers get.`,
            es: `Una afición te va a defender ante quien sea, para siempre. Es más de lo que consigue casi nadie.` }
        : { en: `A professional footballer for ${prof.seasons} years. Almost nobody manages that, and almost nobody says so.`,
            es: `Futbolista profesional durante ${prof.seasons} años. Casi nadie lo consigue, y casi nadie lo dice.` };
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

function coda(prof: CareerProfile, path: PathId, lang: 'en' | 'es', rng: Rng): string {
  const es = lang === 'es';
  const home = getClub(prof.homeClubId ?? '')?.name ?? '';
  const pool = es ? [
    prof.homeIdol >= 75
      ? `Cuando vuelves a ${home}, todavía tardas cuarenta minutos en cruzar el aparcamiento.`
      : `Cuando vuelves al estadio, compras la entrada como todo el mundo.`,
    path === 'away'
      ? `Alguien te reconoce en una gasolinera una vez al año y tardas un segundo en acordarte de por qué.`
      : `Sigues dentro del fútbol. Ya no es lo mismo y lo sabes desde el primer día.`,
    prof.neverWon
      ? `No ganaste nada. Jugaste ${prof.apps} partidos como profesional, que es la parte que se te olvida contar.`
      : `Las medallas están en una caja, no en una vitrina. Sabes exactamente en qué caja.`,
  ] : [
    prof.homeIdol >= 75
      ? `When you go back to ${home} it still takes you forty minutes to cross the car park.`
      : `When you go back to the ground, you buy a ticket like everybody else.`,
    path === 'away'
      ? `Somebody recognises you at a petrol station about once a year and it takes you a second to remember why.`
      : `You are still in the game. It is not the same and you knew that from the first day.`,
    prof.neverWon
      ? `You won nothing. You played ${prof.apps} games as a professional, which is the part you forget to mention.`
      : `The medals are in a box, not a cabinet. You know exactly which box.`,
  ];
  return pool[rng.int(pool.length)];
}

export const epilogueHeadline = (e: Epilogue, lang: Lang) => (lang === 'es' ? e.headlineEs : e.headlineEn);
export const epilogueCoda = (e: Epilogue, lang: Lang) => (lang === 'es' ? e.codaEs : e.codaEn);
export const beatText = (b: EpilogueBeat, lang: Lang) => (lang === 'es' ? b.es : b.en);
