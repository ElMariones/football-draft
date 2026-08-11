// The second life.
//
// Hanging up the boots used to be one button and one randomly drawn sentence:
// you became a manager and a coin decided whether it went well. Forty years of
// a man's life resolved in eleven words, with nothing to play and nothing that
// referred to the career you had just spent an hour building.
//
// This is that life played out. Three chapters, each a real decision with a
// cost, tracked against three meters that pull against each other:
//
//   standing  — how well the job itself went
//   respect   — what the game thinks of you now
//   peace     — whether any of it made you happy
//
// You cannot max all three. A manager who wins everything is rarely at peace, a
// man who walks away entirely keeps his peace and loses his standing, and the
// ending you get is the shape those three make together — not a dice roll.
import type { CareerPlayer } from '@/data/career/types';
import { getClub } from '@/data/career/clubs';
import { getNation } from '@/data/career/nations';
import { Rng, clamp } from './rng';
import type { CareerProfile } from './profile';
import type { PathId } from './epilogue';
import type { Lang } from './i18n';

export interface AfterlifeEffects {
  standing?: number;
  respect?: number;
  peace?: number;
  /** money, in the same units as the career's wallet */
  wealth?: number;
  /** years this decision added to the second life */
  years?: number;
  /** a concrete thing that happened, listed in the dossier */
  achieveEn?: string;
  achieveEs?: string;
}

export interface AfterlifeOption {
  id: string;
  en: string; es: string;
  outcomeEn: string; outcomeEs: string;
  effects: AfterlifeEffects;
}

export interface AfterlifeChapter {
  id: string;
  path: PathId;
  /** only offered when the playing career supports it */
  when?: (p: CareerProfile) => boolean;
  titleEn: string; titleEs: string;
  descEn: string; descEs: string;
  options: AfterlifeOption[];
}

/** What happened, once the chapters are done. */
export interface Afterlife {
  path: PathId;
  standing: number;
  respect: number;
  peace: number;
  wealth: number;
  years: number;
  /** chapters drawn for this run, in order */
  chapters: AfterlifeChapter[];
  /** index of the chapter being played */
  idx: number;
  /** what has been chosen so far, aligned with `chapters` */
  choices: (AfterlifeOption | null)[];
  achievements: { en: string; es: string }[];
}

const O = (
  id: string, en: string, es: string, outcomeEn: string, outcomeEs: string,
  effects: AfterlifeEffects,
): AfterlifeOption => ({ id, en, es, outcomeEn, outcomeEs, effects });

// Copy placeholders: {H} your home club, {N} your country, {P} your surname,
// {G} career goals, {S} seasons played, {C} number of clubs.

// ============================ the decks ====================================

export const AFTERLIFE_CHAPTERS: AfterlifeChapter[] = [
  // ------------------------------ manager ------------------------------
  {
    id: 'mgr-first', path: 'manager',
    titleEn: 'The first job', titleEs: 'El primer trabajo',
    descEn: 'Second division, eleven points from safety, a squad that has not been paid on time since October. They are offering it to you because nobody else will take it.',
    descEs: 'Segunda división, a once puntos de la salvación, una plantilla que no cobra a tiempo desde octubre. Te lo ofrecen porque no lo quiere nadie más.',
    options: [
      O('take', 'Take it and go down with them', 'Cogerlo y bajar con ellos',
        'You go down. You also learn more in five months than in the previous five years, and every manager who watched knows exactly what you inherited.',
        'Bajáis. También aprendes más en cinco meses que en los cinco años anteriores, y todos los entrenadores que lo vieron saben lo que heredaste.',
        { standing: 8, respect: 12, peace: -8, years: 1 }),
      O('wait', 'Wait for something better', 'Esperar algo mejor',
        'Fourteen months of badges, coffees and no phone call. The something better does eventually come, and it is smaller than you had imagined.',
        'Catorce meses de cursos, cafés y ningún teléfono que suena. Lo mejor acaba llegando, y es más pequeño de lo que imaginabas.',
        { standing: -4, peace: 4, years: 2 }),
      O('assistant', 'Take an assistant job under somebody good', 'Ser ayudante de alguien bueno',
        'Three years of watching a serious manager work. You are nobody\'s headline and you come out of it able to do the job properly.',
        'Tres años viendo trabajar a un entrenador serio. No eres el titular de nadie y sales de ahí sabiendo hacer el trabajo de verdad.',
        { standing: 14, respect: 6, peace: 6, years: 3 }),
    ],
  },
  {
    id: 'mgr-star', path: 'manager',
    titleEn: 'A player exactly like you were', titleEs: 'Un jugador exactamente como eras tú',
    descEn: 'Brilliant, late for everything, and openly of the opinion that the manager is an obstacle. You recognise every single thing he is doing, because you did it.',
    descEs: 'Brillante, tarde a todo y con la opinión abierta de que el entrenador es un estorbo. Reconoces cada cosa que hace, porque tú las hacías.',
    options: [
      O('drop', 'Drop him, publicly', 'Dejarlo fuera, en público',
        'Six weeks of a very cold dressing room and then a player who runs. The squad watched all of it and decided you meant what you said.',
        'Seis semanas de vestuario helado y luego un jugador que corre. La plantilla lo vio entero y decidió que hablabas en serio.',
        { standing: 12, respect: 8, peace: -6 }),
      O('talk', 'Tell him what nobody told you', 'Decirle lo que a ti no te dijo nadie',
        'Two hours in a car park. He does not change immediately and he changes eventually, and he mentions the conversation in his own retirement interview.',
        'Dos horas en un aparcamiento. No cambia enseguida y acaba cambiando, y menciona esa conversación en su propia retirada.',
        { standing: 8, respect: 10, peace: 12,
          achieveEn: 'Turned a player nobody else could reach', achieveEs: 'Enderezó a un jugador al que nadie llegaba' }),
      O('sell', 'Get him sold', 'Conseguir que lo vendan',
        'Clean, quiet and effective. He is excellent somewhere else for six years and you are asked about it every single time.',
        'Limpio, discreto y eficaz. Es excelente en otro sitio durante seis años y te preguntan por ello cada vez.',
        { standing: -4, respect: -6, peace: 4, wealth: 0 }),
    ],
  },
  {
    id: 'mgr-sack', path: 'manager',
    titleEn: 'You are going to be sacked', titleEs: 'Te van a echar',
    descEn: 'Four defeats, a bad run of fixtures ahead and a chairman who has stopped returning calls. There is a press conference tomorrow and everybody in the room will know before you say a word.',
    descEs: 'Cuatro derrotas, un calendario feo por delante y un presidente que ha dejado de coger el teléfono. Mañana hay rueda de prensa y todos en la sala lo sabrán antes de que abras la boca.',
    options: [
      O('fight', 'Go in fighting', 'Ir a pelearlo',
        'You take the press conference apart and win the next two. It buys you nine weeks, which you spend knowing exactly how it ends.',
        'Desmontas la rueda de prensa y ganas los dos siguientes. Te compra nueve semanas, que pasas sabiendo perfectamente cómo acaba.',
        { standing: 4, respect: 8, peace: -12, years: 1 }),
      O('resign', 'Resign before they can do it', 'Dimitir antes de que puedan',
        'You keep the compensation and the dignity, and lose the argument about whose fault it was, permanently.',
        'Te quedas la indemnización y la dignidad, y pierdes para siempre la discusión sobre de quién fue la culpa.',
        { standing: -6, respect: 4, peace: 8, wealth: 900_000 }),
      O('players', 'Say it was the players', 'Decir que fueron los jugadores',
        'One sentence, entirely true, and it follows you into every interview you ever have again. Two squads refuse to sign for you because of it.',
        'Una frase, absolutamente cierta, y te acompaña a cada entrevista que tengas. Dos plantillas se niegan a ficharte por eso.',
        { standing: -10, respect: -14, peace: -4 }),
    ],
  },
  {
    id: 'mgr-home', path: 'manager',
    when: p => !!p.homeClubId && p.homeIdol >= 55,
    titleEn: '{H} want you', titleEs: 'El {H} te quiere',
    descEn: 'The club you were an idol at, in trouble, calling the one man the supporters will give time to. Everybody who has ever done this has regretted it.',
    descEs: 'El club donde fuiste ídolo, en problemas, llamando al único hombre al que la afición le dará tiempo. Todos los que han hecho esto se han arrepentido.',
    options: [
      O('yes', 'Go home', 'Volver a casa',
        'Eighteen months, one good half-season, and a group of supporters who now sing your name with an asterisk on it. You would do it again.',
        'Dieciocho meses, media temporada buena, y una afición que ahora canta tu nombre con un asterisco. Lo volverías a hacer.',
        { standing: -4, respect: 6, peace: -10, years: 2,
          achieveEn: 'Managed the club you were an idol at', achieveEs: 'Dirigiste al club donde fuiste ídolo' }),
      O('no', 'Say no, and say why', 'Decir que no, y decir por qué',
        'You explain publicly that you would rather be remembered as a player there. It is the most quoted thing you say in your whole second career.',
        'Explicas en público que prefieres que te recuerden allí como jugador. Es lo más citado de toda tu segunda carrera.',
        { respect: 14, peace: 14, standing: -2 }),
      O('later', 'Tell them not yet', 'Decirles que todavía no',
        'You go five years later, better at the job, and it works. Almost nobody manages that timing.',
        'Vas cinco años después, mejor en el oficio, y funciona. Casi nadie acierta ese momento.',
        { standing: 16, respect: 10, peace: 6, years: 5,
          achieveEn: 'Went home at the right time, and it worked', achieveEs: 'Volviste a casa en el momento justo, y salió' }),
    ],
  },
  {
    id: 'mgr-intl', path: 'manager',
    when: p => p.ntCaps >= 20 && p.bigTitles >= 1,
    titleEn: '{N} call', titleEs: 'Llama {N}',
    descEn: 'The national job. Six games a year, an entire country\'s opinion, and a tournament that decides how the whole thing is remembered.',
    descEs: 'La selección. Seis partidos al año, la opinión de un país entero y un torneo que decide cómo se recuerda todo.',
    options: [
      O('take', 'Take it', 'Cogerlo',
        'A quarter-final and a penalty shoot-out. For four weeks you are the most discussed man in {N} and then, mercifully, you are not.',
        'Unos cuartos y una tanda de penaltis. Durante cuatro semanas eres el hombre más comentado de {N} y luego, misericordiosamente, ya no.',
        { standing: 12, respect: 12, peace: -10, years: 4,
          achieveEn: 'Managed your country', achieveEs: 'Dirigiste a tu selección' }),
      O('club', 'Stay in club football', 'Quedarte en clubes',
        'You want to work on a training ground every day, not six weekends a year. It is the correct decision and it is never written up as one.',
        'Quieres trabajar en un campo cada día, no seis fines de semana al año. Es la decisión correcta y nunca la cuentan como tal.',
        { standing: 8, peace: 8 }),
      O('assistant', 'Go as the assistant', 'Ir de segundo',
        'All of the tournament and none of the blame. You learn how a federation actually works, which turns out to be worth a great deal later.',
        'Todo el torneo y nada de la culpa. Aprendes cómo funciona de verdad una federación, que resulta valer muchísimo después.',
        { standing: 6, respect: 4, peace: 4, years: 4 }),
    ],
  },

  // ------------------------------ pundit ------------------------------
  {
    id: 'pun-take', path: 'pundit',
    titleEn: 'The take', titleEs: 'La frase',
    descEn: 'You said something on air about a manager under pressure that was harder than you meant it. It has been clipped, captioned and watched nine million times by lunchtime.',
    descEs: 'Dijiste en directo algo sobre un entrenador presionado que sonó más duro de lo que querías. Está recortado, subtitulado y visto nueve millones de veces a la hora de comer.',
    options: [
      O('double', 'Double down', 'Reafirmarte',
        'Numbers go up, invitations go up, and two people you liked stop speaking to you. That is roughly the exchange rate.',
        'Suben las audiencias, suben las invitaciones y dos personas que te caían bien dejan de hablarte. Ese es más o menos el tipo de cambio.',
        { standing: 14, respect: -8, peace: -8, wealth: 400_000 }),
      O('apologise', 'Apologise to him privately', 'Pedirle perdón en privado',
        'You ring him. He is decent about it and neither of you ever mentions it publicly, which is why it works.',
        'Le llamas. Se porta bien y ninguno de los dos lo menciona nunca en público, que es por lo que funciona.',
        { respect: 12, peace: 10, standing: -4 }),
      O('onair', 'Take it back on air', 'Rectificar en directo',
        'Ninety seconds of a former player admitting he got it wrong. It is the least-watched clip of the week and the one people remember about you.',
        'Noventa segundos de un exjugador admitiendo que se equivocó. Es el vídeo menos visto de la semana y el que la gente recuerda de ti.',
        { respect: 16, peace: 6, standing: 2,
          achieveEn: 'Corrected yourself on live television', achieveEs: 'Rectificaste en directo' }),
    ],
  },
  {
    id: 'pun-friend', path: 'pundit',
    titleEn: 'They want you to bury a friend', titleEs: 'Quieren que entierres a un amigo',
    descEn: 'A man you played with for six years is having the worst season of his life, and you are booked on the programme that is going to spend an hour on it.',
    descEs: 'Un hombre con el que jugaste seis años está haciendo la peor temporada de su vida, y estás en el programa que le va a dedicar una hora.',
    options: [
      O('honest', 'Be honest about the football', 'Ser honesto sobre el fútbol',
        'You say what is true and you say it without enjoying it. He does not speak to you for two years and then he does, and he says you were right.',
        'Dices lo que es cierto y lo dices sin disfrutarlo. No te habla en dos años y luego sí, y te dice que tenías razón.',
        { standing: 10, respect: 10, peace: -6 }),
      O('defend', 'Defend him', 'Defenderle',
        'You are visibly the only person in the studio doing it. Your credibility takes a small, permanent dent and he never forgets it.',
        'Eres visiblemente el único del plató que lo hace. Tu credibilidad se lleva una muesca pequeña y permanente y él no lo olvida jamás.',
        { standing: -8, respect: 4, peace: 12 }),
      O('pull', 'Pull out of the programme', 'Caerte del programa',
        'You ring in sick, everybody knows why, and the channel notes it. It costs you the good slot for a season.',
        'Llamas diciendo que estás malo, todos saben por qué, y el canal toma nota. Te cuesta la buena franja una temporada.',
        { standing: -10, respect: 6, peace: 8 }),
    ],
  },
  {
    id: 'pun-money', path: 'pundit',
    titleEn: 'A much larger cheque', titleEs: 'Un cheque mucho mayor',
    descEn: 'A rival network wants you, for roughly triple, on a show built entirely around arguing. They are very clear about what they are buying.',
    descEs: 'Una cadena rival te quiere, por más o menos el triple, en un programa construido enteramente sobre discutir. Tienen clarísimo qué están comprando.',
    options: [
      O('take', 'Take it', 'Cogerlo',
        'Extremely well paid and, within two years, you do not enjoy a single Sunday. You are also more famous than you ever were as a player.',
        'Pagadísimo y, en dos años, no disfrutas ni un domingo. También eres más famoso de lo que fuiste como jugador.',
        { standing: 16, respect: -10, peace: -14, wealth: 4_200_000, years: 6 }),
      O('stay', 'Stay where you are', 'Quedarte donde estás',
        'Less money and a job you can do without becoming somebody you would not have liked at thirty.',
        'Menos dinero y un trabajo que puedes hacer sin convertirte en alguien que no te habría caído bien a los treinta.',
        { standing: 4, respect: 8, peace: 12, years: 8 }),
      O('own', 'Go and do your own thing', 'Montar lo tuyo',
        'A podcast in a spare room that nobody expects to work. Four years later it is bigger than the show you left.',
        'Un pódcast en un cuarto que nadie espera que funcione. Cuatro años después es más grande que el programa que dejaste.',
        { standing: 12, respect: 10, peace: 8, wealth: 2_000_000, years: 7,
          achieveEn: 'Built something of your own that outgrew the network', achieveEs: 'Montaste algo tuyo que superó a la cadena' }),
    ],
  },
  {
    id: 'pun-young', path: 'pundit',
    titleEn: 'The boy you were hard on', titleEs: 'El chico con el que fuiste duro',
    descEn: 'You spent a season saying a nineteen-year-old was not good enough. He was not, then. He is twenty-three now and he is very good, and he has been asked about you on camera.',
    descEs: 'Te pasaste una temporada diciendo que un chico de diecinueve no daba el nivel. Entonces no lo daba. Ahora tiene veintitrés, es muy bueno, y le han preguntado por ti delante de una cámara.',
    options: [
      O('admit', 'Say on air that you were wrong', 'Decir en directo que te equivocaste',
        'Unreservedly, using his name, on the main programme. He posts it himself. It is the single best thing you do in television.',
        'Sin reservas, con su nombre, en el programa principal. Él mismo lo comparte. Es lo mejor que haces en televisión.',
        { respect: 18, peace: 12, standing: 6,
          achieveEn: 'Publicly admitted you were wrong about a player', achieveEs: 'Admitiste en público que te equivocaste con un jugador' }),
      O('context', 'Explain that you were right at the time', 'Explicar que entonces tenías razón',
        'Also true, and it reads as a man who cannot say four words. The clip that circulates is the defensive one.',
        'También es cierto, y suena a alguien incapaz de decir cuatro palabras. El vídeo que circula es el defensivo.',
        { standing: 2, respect: -6, peace: -4 }),
      O('private', 'Write to him instead', 'Escribirle a él',
        'A letter nobody else ever sees. He keeps it. Twelve years later he mentions it in an interview and you have no idea it is coming.',
        'Una carta que no ve nadie más. Él la guarda. Doce años después la menciona en una entrevista y no te lo esperas en absoluto.',
        { respect: 8, peace: 16 }),
    ],
  },
  {
    id: 'pun-chair', path: 'pundit',
    when: p => p.bigTitles >= 2 || p.ntCaps >= 40,
    titleEn: 'The main chair', titleEs: 'La silla principal',
    descEn: 'The lead role on the biggest football programme in the country. It is the job every one of them wants and it means being on air every single week, forever.',
    descEs: 'El papel principal del mayor programa de fútbol del país. Es el trabajo que quieren todos y significa estar en antena cada semana, para siempre.',
    options: [
      O('take', 'Take the chair', 'Coger la silla',
        'Fifteen years as the voice of the sport in your country. Your grandchildren know you entirely as a man on television.',
        'Quince años como la voz del deporte en tu país. Tus nietos te conocen enteramente como un señor de la televisión.',
        { standing: 20, respect: 8, peace: -6, wealth: 5_500_000, years: 15,
          achieveEn: 'Fronted the country\'s main football programme', achieveEs: 'Presentaste el principal programa de fútbol del país' }),
      O('share', 'Only on your own terms', 'Solo en tus condiciones',
        'Half the weeks, half the money, and the half you do is noticeably better than the half you do not.',
        'La mitad de las semanas, la mitad del dinero, y la mitad que haces es notablemente mejor que la que no.',
        { standing: 10, respect: 10, peace: 10, wealth: 2_400_000, years: 12 }),
      O('pass', 'Let somebody else have it', 'Que se la quede otro',
        'You suggest a name. He is superb in it for a decade and says so, publicly, every time anybody asks how he got there.',
        'Propones un nombre. Es magnífico en ella durante una década y lo dice, en público, cada vez que le preguntan cómo llegó.',
        { respect: 14, peace: 14, standing: -6 }),
    ],
  },

  // ------------------------------ academy ------------------------------
  {
    id: 'aca-one', path: 'academy',
    titleEn: 'There is one', titleEs: 'Hay uno',
    descEn: 'Fourteen years old, quicker than everybody, and doing something with his first touch that cannot be taught. You have watched three hundred of these and this is the first one.',
    descEs: 'Catorce años, más rápido que todos, y hace algo con el primer control que no se enseña. Has visto trescientos de estos y este es el primero.',
    options: [
      O('protect', 'Protect him from all of it', 'Protegerle de todo',
        'You keep him out of the newspapers for three years and fight the club about it twice. He gets to be a child, and then he gets to be a footballer.',
        'Le mantienes fuera de los periódicos tres años y peleas con el club dos veces por ello. Llega a ser niño, y luego llega a ser futbolista.',
        { standing: 12, respect: 10, peace: 14,
          achieveEn: 'Brought a generational talent through, quietly', achieveEs: 'Sacaste un talento generacional, en silencio' }),
      O('push', 'Push him up two age groups', 'Subirle dos categorías',
        'He is playing men at fifteen. It works, and it takes eighteen months off the back end of his career, and nobody can prove that.',
        'Juega contra hombres a los quince. Funciona, y le quita dieciocho meses al final de su carrera, y eso no lo puede demostrar nadie.',
        { standing: 16, respect: 4, peace: -8 }),
      O('sell', 'Tell the club to cash in early', 'Decirle al club que lo venda pronto',
        'Nine million for a sixteen-year-old keeps the academy open for a decade. He is a full international by twenty and it was not your name on him.',
        'Nueve millones por un chico de dieciséis mantienen la cantera abierta una década. Es internacional a los veinte y no fue tu nombre el que quedó.',
        { standing: 8, respect: -4, peace: -6, wealth: 0 }),
    ],
  },
  {
    id: 'aca-parent', path: 'academy',
    titleEn: 'The father', titleEs: 'El padre',
    descEn: 'He is at every session. He shouts through all of them. His son is a good player who has started looking at the touchline before he looks at the ball.',
    descEs: 'Está en cada entrenamiento. Grita en todos. Su hijo es un buen jugador que ha empezado a mirar a la banda antes que al balón.',
    options: [
      O('ban', 'Ban him from the training ground', 'Prohibirle la entrada',
        'A furious month and a complaint to the club. The boy plays with his head up for the first time in two years.',
        'Un mes furioso y una queja al club. El chico juega con la cabeza levantada por primera vez en dos años.',
        { standing: 8, peace: 6, respect: 4 }),
      O('talk', 'Sit him down and tell him about your own father', 'Sentarle y hablarle de tu propio padre',
        'You tell him something you have told about four people. He goes quiet for a season and turns into the most useful parent at the club.',
        'Le cuentas algo que le has contado a unas cuatro personas. Se calla una temporada y se convierte en el padre más útil del club.',
        { respect: 8, peace: 14,
          achieveEn: 'Turned the worst parent at the club into the best one', achieveEs: 'Convertiste al peor padre del club en el mejor' }),
      O('nothing', 'Say nothing and manage around it', 'No decir nada y gestionarlo',
        'The path of least resistance. The boy is released at seventeen and you are fairly sure you know why.',
        'El camino fácil. Al chico lo sueltan a los diecisiete y estás bastante seguro de por qué.',
        { standing: -4, peace: -10 }),
    ],
  },
  {
    id: 'aca-cut', path: 'academy',
    titleEn: 'Telling him no', titleEs: 'Decirle que no',
    descEn: 'Sixteen, been here since he was nine, and not good enough. His family have rearranged their entire lives around this and you have to do it on a Thursday.',
    descEs: 'Dieciséis años, aquí desde los nueve, y no da el nivel. Su familia ha reorganizado su vida entera alrededor de esto y te toca a ti hacerlo un jueves.',
    options: [
      O('honest', 'Do it yourself, in person, with time', 'Hacerlo tú, en persona, con tiempo',
        'Forty minutes, both parents, and every question answered. He is a PE teacher now and he sends you a message every year on the anniversary.',
        'Cuarenta minutos, los dos padres y todas las preguntas respondidas. Ahora es profesor de educación física y te escribe cada año en la fecha.',
        { respect: 10, peace: 12,
          achieveEn: 'Released a boy properly, and he never forgot it', achieveEs: 'Diste una baja como se debe, y no lo olvidó nunca' }),
      O('place', 'Spend a month finding him a club', 'Pasar un mes buscándole club',
        'Fourteen phone calls to get a sixteen-year-old a trial two divisions down. He plays four hundred games as a professional.',
        'Catorce llamadas para conseguirle una prueba dos categorías más abajo. Juega cuatrocientos partidos como profesional.',
        { standing: 6, respect: 12, peace: 10,
          achieveEn: 'Found a released boy a career', achieveEs: 'Le encontraste carrera a un chico descartado' }),
      O('delegate', 'Let the club\'s welfare officer do it', 'Que lo haga el responsable de bienestar',
        'It is what the role is for and it is entirely reasonable. You think about the boy\'s face at intervals for the next twenty years.',
        'Para eso está el puesto y es absolutamente razonable. Piensas en la cara de ese chico a ratos durante veinte años.',
        { peace: -12, standing: 2 }),
    ],
  },
  {
    id: 'aca-budget', path: 'academy',
    titleEn: 'They are going to close it', titleEs: 'La van a cerrar',
    descEn: 'The club has done the arithmetic and the academy loses money. There is a board meeting in nine days and you are allowed to speak at it for ten minutes.',
    descEs: 'El club ha hecho las cuentas y la cantera pierde dinero. Hay junta en nueve días y te dejan hablar diez minutos.',
    options: [
      O('numbers', 'Beat them with their own numbers', 'Ganarles con sus propios números',
        'You spend nine days building a case about transfer fees and wage bills. It stays open. You are asked to present it again every three years, forever.',
        'Pasas nueve días construyendo un argumento sobre traspasos y masa salarial. Sigue abierta. Te piden repetirlo cada tres años, para siempre.',
        { standing: 16, respect: 8, peace: -4,
          achieveEn: 'Saved the academy from being closed', achieveEs: 'Salvaste la cantera del cierre' }),
      O('money', 'Fund it yourself for three years', 'Financiarla tú tres años',
        'A genuinely painful amount of your own money to keep eleven staff in work. Nobody outside the building ever finds out.',
        'Una cantidad sinceramente dolorosa de tu propio dinero para mantener a once personas trabajando. Fuera del edificio no se entera nadie.',
        { wealth: -3_500_000, respect: 6, peace: 14, standing: 8,
          achieveEn: 'Paid for an academy out of your own pocket', achieveEs: 'Pagaste una cantera de tu bolsillo' }),
      O('leave', 'Let it close and walk out', 'Dejar que cierre e irte',
        'You cannot win it and you refuse to preside over it. Four of the staff follow you to the next place.',
        'No puedes ganarlo y te niegas a presidirlo. Cuatro del cuerpo técnico se van contigo al siguiente sitio.',
        { standing: -8, respect: 6, peace: -6 }),
    ],
  },
  {
    id: 'aca-poach', path: 'academy',
    titleEn: 'A very big club wants your best one', titleEs: 'Un club muy grande quiere al mejor',
    descEn: 'They have spoken to the family before they spoke to you, which tells you everything. He is fifteen and the money would rebuild your entire facility.',
    descEs: 'Han hablado con la familia antes que contigo, lo que te dice todo. Tiene quince años y el dinero reconstruiría toda la instalación.',
    options: [
      O('fight', 'Fight to keep him', 'Pelear por quedártelo',
        'You lose. You always lose these. But you lose slowly enough that he finishes his schooling here and he says so publicly at twenty-two.',
        'Pierdes. Estas se pierden siempre. Pero pierdes lo bastante despacio como para que acabe el colegio aquí y él lo dice en público a los veintidós.',
        { respect: 12, peace: 8, standing: -4 }),
      O('deal', 'Make sure the club gets paid properly', 'Asegurarte de que el club cobre lo que vale',
        'You negotiate like somebody who has been on the other side of it, because you have. The facility gets rebuilt.',
        'Negocias como alguien que ha estado al otro lado, porque lo has estado. La instalación se reconstruye.',
        { standing: 14, respect: 4, peace: 2,
          achieveEn: 'Rebuilt the academy from one transfer', achieveEs: 'Reconstruiste la cantera con un traspaso' }),
      O('advise', 'Tell the boy honestly not to go yet', 'Decirle honestamente que no vaya todavía',
        'Against your club\'s interest and your own. He stays two more years and is a better player for it, and everybody involved knows what it cost you.',
        'En contra del interés de tu club y del tuyo. Se queda dos años más y es mejor jugador por ello, y todos saben lo que te costó.',
        { respect: 16, peace: 12, standing: -6 }),
    ],
  },

  // ------------------------------ director ------------------------------
  {
    id: 'dir-sack', path: 'director',
    titleEn: 'You have to sack him', titleEs: 'Tienes que echarle',
    descEn: 'A decent man, ten months in, and it is not working. You have done this from the other side of the desk and you remember exactly how it felt.',
    descEs: 'Un buen tipo, diez meses en el cargo, y no funciona. Has estado al otro lado de esa mesa y recuerdas perfectamente cómo se sentía.',
    options: [
      O('face', 'Do it face to face, first thing', 'Hacerlo cara a cara, a primera hora',
        'No leak, no statement before he has told his family, and a handshake. He recommends you for a job four years later.',
        'Sin filtraciones, sin comunicado antes de que se lo diga a su familia, y un apretón de manos. Te recomienda para un puesto cuatro años después.',
        { standing: 8, respect: 14, peace: 6,
          achieveEn: 'Sacked a manager without humiliating him', achieveEs: 'Destituiste a un entrenador sin humillarle' }),
      O('wait', 'Give him until the winter', 'Darle hasta el invierno',
        'Loyal, defensible and eleven points more expensive than doing it now. You go down by two.',
        'Leal, defendible y once puntos más caro que hacerlo ahora. Descendéis por dos.',
        { standing: -14, respect: 8, peace: -6 }),
      O('leak', 'Let it come out in the papers first', 'Dejar que salga antes en la prensa',
        'Cheaper, easier and it means somebody else delivers the news. He finds out from his phone in a car park.',
        'Más barato, más fácil y significa que la noticia la da otro. Se entera por el móvil en un aparcamiento.',
        { standing: 4, respect: -16, peace: -10 }),
    ],
  },
  {
    id: 'dir-sell', path: 'director',
    titleEn: 'Sell him or keep him', titleEs: 'Venderle o quedártelo',
    descEn: 'Your best player, one year left, and an offer that would fund three seasons. He has told the supporters he is staying and he has told you he is not.',
    descEs: 'Tu mejor jugador, un año de contrato y una oferta que financiaría tres temporadas. A la afición le ha dicho que se queda y a ti que no.',
    options: [
      O('sell', 'Sell', 'Vender',
        'The right decision, taken in public, in the week the supporters least want to hear it. Two years later it is obviously the right decision.',
        'La decisión correcta, tomada en público, la semana en que la afición menos quiere oírla. Dos años después es obviamente la decisión correcta.',
        { standing: 14, respect: 6, peace: -6, wealth: 0 }),
      O('keep', 'Keep him for the season', 'Quedártelo la temporada',
        'You finish fourth and he leaves for nothing. You would rather have had the season, and the accountant would not.',
        'Acabáis cuartos y se va gratis. Tú prefieres haber tenido la temporada; el contable no.',
        { standing: -10, respect: 10, peace: 6 }),
      O('renew', 'Break the wage structure to keep him', 'Romper la escala salarial para retenerle',
        'It works for eighteen months. Then four other players find out what he earns and the dressing room never fully recovers.',
        'Funciona dieciocho meses. Luego otros cuatro se enteran de lo que cobra y el vestuario no se recupera del todo.',
        { standing: -4, respect: -4, peace: -8, wealth: 0 }),
    ],
  },
  {
    id: 'dir-owner', path: 'director',
    titleEn: 'The owner has an idea', titleEs: 'El propietario tiene una idea',
    descEn: 'He wants to change the crest, the colours and the name of the stand your own shirt hangs in. He has explained that it is about international markets.',
    descEs: 'Quiere cambiar el escudo, los colores y el nombre de la grada donde cuelga tu camiseta. Ha explicado que es por los mercados internacionales.',
    options: [
      O('fight', 'Fight him in the boardroom', 'Pelearlo en la junta',
        'You lose the crest and save the colours and the stand. It costs you the relationship and, eventually, the job.',
        'Pierdes el escudo y salvas los colores y la grada. Te cuesta la relación y, con el tiempo, el puesto.',
        { standing: -10, respect: 18, peace: 4,
          achieveEn: 'Stopped an owner from renaming the ground', achieveEs: 'Impediste que un propietario renombrara el campo' }),
      O('resign', 'Resign over it', 'Dimitir por ello',
        'A statement of eleven lines that the supporters print onto a banner within a week. You never work at that level again.',
        'Un comunicado de once líneas que la afición convierte en pancarta en una semana. No vuelves a trabajar a ese nivel.',
        { standing: -20, respect: 22, peace: 8 }),
      O('manage', 'Manage it quietly from the inside', 'Gestionarlo desde dentro, en silencio',
        'Three of the four ideas die in committees you arranged. Nobody ever knows you did it, which is the entire job.',
        'Tres de las cuatro ideas mueren en comisiones que montaste tú. Nadie sabe nunca que fuiste tú, que es el trabajo entero.',
        { standing: 12, respect: -2, peace: -4 }),
    ],
  },
  {
    id: 'dir-fans', path: 'director',
    titleEn: 'They want you out', titleEs: 'Quieren que te vayas',
    descEn: 'Two bad windows and your name on a banner at your own ground, in the stand you used to score in front of.',
    descEs: 'Dos mercados malos y tu nombre en una pancarta en tu propio estadio, en la grada delante de la que marcabas.',
    options: [
      O('meet', 'Go and meet the supporters\' groups', 'Ir a reunirte con las peñas',
        'Three hours in a room above a pub with people who paid to watch you play. You do not win them all and you win enough.',
        'Tres horas en una sala encima de un bar con gente que pagó por verte jugar. No los convences a todos y convences a bastantes.',
        { standing: 8, respect: 12, peace: 4 }),
      O('ignore', 'Ignore it and do the job', 'Ignorarlo y hacer el trabajo',
        'The next two windows are good and the banner comes down on its own. You never mention it and neither do they.',
        'Los dos mercados siguientes son buenos y la pancarta baja sola. Tú no lo mencionas nunca y ellos tampoco.',
        { standing: 12, peace: -8 }),
      O('go', 'Go, before it gets worse', 'Irte, antes de que empeore',
        'You leave a club in better shape than you found it and almost nobody says so for six years.',
        'Dejas un club mejor de lo que lo encontraste y casi nadie lo dice hasta seis años después.',
        { standing: -6, respect: 4, peace: 12 }),
    ],
  },
  {
    id: 'dir-ground', path: 'director',
    titleEn: 'The old ground', titleEs: 'El campo viejo',
    descEn: 'A new stadium, thirty thousand more seats and a car park where the old one is. You played two hundred games on that pitch.',
    descEs: 'Un estadio nuevo, treinta mil asientos más y un aparcamiento donde está el viejo. Tú jugaste doscientos partidos en ese campo.',
    options: [
      O('build', 'Build it, and keep one thing', 'Construirlo, y conservar una cosa',
        'The new ground is superb. The centre circle of the old pitch is cut out and set into the floor of the new entrance, and every supporter walks over it.',
        'El estadio nuevo es magnífico. El círculo central del campo viejo se recorta y se empotra en el suelo de la entrada nueva, y todos pasan por encima.',
        { standing: 18, respect: 10, peace: 8,
          achieveEn: 'Built a new stadium without losing the old one', achieveEs: 'Construiste un estadio nuevo sin perder el viejo' }),
      O('stay', 'Refuse to leave', 'Negarte a irse',
        'Romantic, and it costs the club a decade of revenue it never recovers. Everybody who agrees with you agrees very loudly.',
        'Romántico, y le cuesta al club una década de ingresos que no recupera. Todos los que te dan la razón lo hacen muy alto.',
        { standing: -14, respect: 14, peace: 10 }),
      O('build-cold', 'Build it and move on', 'Construirlo y pasar página',
        'The correct commercial decision, executed well. Something about the first game there does not sit right with you and never does.',
        'La decisión comercial correcta, bien ejecutada. Algo del primer partido allí no te encaja y no te encaja nunca.',
        { standing: 16, respect: -4, peace: -10 }),
    ],
  },

  // ------------------------------ abroad ------------------------------
  {
    id: 'abr-level', path: 'abroad',
    titleEn: 'The football is worse than you were told', titleEs: 'El fútbol es peor de lo que te dijeron',
    descEn: 'Pitches you would not have trained on, flights on a Tuesday, and you are comfortably the best player anybody here has seen in years.',
    descEs: 'Campos en los que no habrías entrenado, vuelos en martes, y eres cómodamente el mejor jugador que han visto aquí en años.',
    options: [
      O('serious', 'Take it as seriously as anything you ever did', 'Tomártelo tan en serio como cualquier otra cosa',
        'You are the first one in for eleven months. Two of their young players get moves to Europe because of what they learned watching you.',
        'Eres el primero en llegar durante once meses. Dos de sus jóvenes se van a Europa por lo que aprendieron viéndote.',
        { standing: 12, respect: 16, peace: 10, years: 2,
          achieveEn: 'Left a league better than you found it', achieveEs: 'Dejaste una liga mejor de lo que la encontraste' }),
      O('coast', 'Do the minimum and take the money', 'Hacer lo mínimo y cobrar',
        'Nobody complains, because nobody expected anything else, and that is the part that gets to you.',
        'Nadie se queja, porque nadie esperaba otra cosa, y esa es la parte que te toca.',
        { wealth: 3_800_000, peace: -12, respect: -10, years: 2 }),
      O('leave', 'Break the contract and go home', 'Romper el contrato y volver',
        'Six weeks in and you cannot do it. You pay your own way out and tell nobody why.',
        'A las seis semanas no puedes más. Te pagas la rescisión y no le cuentas a nadie por qué.',
        { wealth: -900_000, peace: 6, standing: -8 }),
    ],
  },
  {
    id: 'abr-crowd', path: 'abroad',
    titleEn: 'Four thousand people who cannot believe you are here',
    titleEs: 'Cuatro mil personas que no se creen que estés aquí',
    descEn: 'They sing your name from the warm-up. Children wait two hours after the final whistle. You have not been wanted like this since you were twenty-four.',
    descEs: 'Cantan tu nombre desde el calentamiento. Los niños esperan dos horas después del pitido final. No te querían así desde los veinticuatro.',
    options: [
      O('stay', 'Stay an extra two years', 'Quedarte dos años más',
        'Well past the point where your body agrees. You are the best thing that ever happened to that club and they name the training pitch after you.',
        'Mucho más allá de lo que tu cuerpo aconseja. Eres lo mejor que le ha pasado a ese club y le ponen tu nombre al campo de entrenamiento.',
        { peace: 16, respect: 10, standing: 6, years: 2,
          achieveEn: 'A training pitch on another continent carries your name', achieveEs: 'Un campo de entrenamiento en otro continente lleva tu nombre' }),
      O('give', 'Sign every shirt, every week', 'Firmar cada camiseta, cada semana',
        'You stay behind after all of it, for a whole season. Twenty years later there are grown adults in that city with a framed shirt.',
        'Te quedas después de todo, una temporada entera. Veinte años después hay adultos en esa ciudad con una camiseta enmarcada.',
        { peace: 14, respect: 8 }),
      O('professional', 'Keep a professional distance', 'Mantener la distancia profesional',
        'Sensible, and you regret it almost immediately, and you do not change it.',
        'Sensato, y te arrepientes casi al instante, y no lo cambias.',
        { peace: -8, standing: 4 }),
    ],
  },
  {
    id: 'abr-body', path: 'abroad',
    titleEn: 'Your body has stopped negotiating', titleEs: 'Tu cuerpo ha dejado de negociar',
    descEn: 'The knee that was manageable is not manageable. There is an injection that gets you through Sunday and a doctor who would rather you did not.',
    descEs: 'La rodilla que se llevaba ya no se lleva. Hay una infiltración que te saca el domingo y un médico que preferiría que no.',
    options: [
      O('inject', 'Take the injection, finish the season', 'Infiltrarte y acabar la temporada',
        'You finish it. You also walk badly for the rest of your life, and on cold mornings you think about that specific Sunday.',
        'La acabas. También cojeas el resto de tu vida, y en las mañanas frías piensas en ese domingo concreto.',
        { standing: 8, peace: -14, respect: 6 }),
      O('stop', 'Stop, that week', 'Parar, esa misma semana',
        'No farewell game, no announcement, just a man who does not come back after the international break. It is the most private thing you ever do.',
        'Sin partido de despedida, sin anuncio, solo un hombre que no vuelve tras el parón. Es lo más íntimo que haces nunca.',
        { peace: 14, standing: -6 }),
      O('manage', 'Play forty minutes a week and nothing more', 'Jugar cuarenta minutos por semana y nada más',
        'Honest with everybody about exactly what is left. You get another season and a half out of it, and every minute of it is deliberate.',
        'Honesto con todos sobre lo que queda. Sacas otra temporada y media, y cada minuto es deliberado.',
        { standing: 6, peace: 8, respect: 8, years: 2 }),
    ],
  },
  {
    id: 'abr-coach', path: 'abroad',
    titleEn: 'They want you to stay and coach', titleEs: 'Quieren que te quedes a entrenar',
    descEn: 'A country that is not yours, a federation that wants a technical director, and a job that would matter far more here than the same job would at home.',
    descEs: 'Un país que no es el tuyo, una federación que quiere un director deportivo y un trabajo que aquí importaría muchísimo más que el mismo trabajo en casa.',
    options: [
      O('stay', 'Stay, and build something', 'Quedarte, y construir algo',
        'Nine years. Two age-group qualifications that had never happened before and a generation of coaches who learned the job from you.',
        'Nueve años. Dos clasificaciones de categorías inferiores que no habían pasado nunca y una generación de entrenadores que aprendió el oficio contigo.',
        { standing: 16, respect: 14, peace: 10, years: 9,
          achieveEn: 'Built a football structure in a country not your own', achieveEs: 'Construiste una estructura de fútbol en un país que no era el tuyo' }),
      O('home', 'Go home', 'Volver a casa',
        'Your family have been waiting three years for this sentence. Everything after it is easier.',
        'Tu familia lleva tres años esperando esta frase. Todo lo que viene después es más fácil.',
        { peace: 16, standing: -4 }),
      O('consult', 'Do it two months a year', 'Hacerlo dos meses al año',
        'A compromise that works far better than compromises usually do. You are genuinely useful and you are home for Christmas.',
        'Un acuerdo que funciona mucho mejor de lo que suelen funcionar. Eres útil de verdad y estás en casa por Navidad.',
        { standing: 8, respect: 6, peace: 12, years: 6 }),
    ],
  },
  {
    id: 'abr-home', path: 'abroad',
    titleEn: 'The last flight', titleEs: 'El último vuelo',
    descEn: 'It is finished. There is a plane home and a life you have not lived in for years waiting on the other end of it.',
    descEs: 'Se acabó. Hay un avión a casa y una vida que llevas años sin vivir esperando al otro lado.',
    options: [
      O('quiet', 'Go home and say nothing to anybody', 'Volver y no decírselo a nadie',
        'No announcement, no interview. Your old club find out you retired from somebody else, three weeks later.',
        'Sin anuncio, sin entrevista. Tu antiguo club se entera de que te retiraste por otro, tres semanas después.',
        { peace: 12, respect: -4, standing: -4 }),
      O('final', 'Ask your first club for one last game', 'Pedirle a tu primer club un último partido',
        'Forty-five minutes in front of nine thousand people on a Tuesday. It is the correct ending and you knew it would be.',
        'Cuarenta y cinco minutos ante nueve mil personas un martes. Es el final correcto y sabías que lo sería.',
        { peace: 18, respect: 10,
          achieveEn: 'Finished where you started', achieveEs: 'Terminaste donde empezaste' }),
      O('one-more', 'Look for one more contract', 'Buscar un contrato más',
        'There is always one more. You take it, you are not able to do it any more, and you find that out in public.',
        'Siempre hay uno más. Lo coges, ya no puedes, y te enteras en público.',
        { peace: -14, standing: -8, respect: -6, wealth: 700_000, years: 1 }),
    ],
  },

  // ------------------------------ away ------------------------------
  {
    id: 'awa-anon', path: 'away',
    titleEn: 'Nobody here knows', titleEs: 'Aquí no lo sabe nadie',
    descEn: 'A new town, a normal street, and a neighbour who has asked what you used to do. You have about two seconds to decide how you answer that for the next twenty years.',
    descEs: 'Un pueblo nuevo, una calle normal, y un vecino que te ha preguntado a qué te dedicabas. Tienes unos dos segundos para decidir cómo respondes eso los próximos veinte años.',
    options: [
      O('truth', 'Tell him', 'Decírselo',
        'He is delighted, the whole street knows by Sunday, and it is fine, and it is never quite a normal street again.',
        'Se pone contentísimo, la calle entera lo sabe el domingo, y está bien, y ya no vuelve a ser del todo una calle normal.',
        { peace: -4, respect: 4 }),
      O('vague', 'Say you worked in sport', 'Decir que trabajabas en el deporte',
        'Technically true and completely useless as an answer. He works it out in about four months and, to his enormous credit, never says a word.',
        'Técnicamente cierto y absolutamente inútil como respuesta. Lo descubre en unos cuatro meses y, con muchísimo mérito, no dice nada.',
        { peace: 14 }),
      O('lie', 'Change the subject entirely', 'Cambiar de tema del todo',
        'It works. It keeps working. Eleven years later you realise you have friends who do not know the largest thing about you.',
        'Funciona. Sigue funcionando. Once años después te das cuenta de que tienes amigos que no saben lo más grande de ti.',
        { peace: 8, respect: -6 }),
    ],
  },
  {
    id: 'awa-invite', path: 'away',
    when: p => p.homeIdol >= 45,
    titleEn: '{H} have written to you', titleEs: 'El {H} te ha escrito',
    descEn: 'An anniversary, a full house and a list of names from your era. You have not been back since the day you left and they have asked four times.',
    descEs: 'Un aniversario, un lleno y una lista de nombres de tu época. No has vuelto desde el día que te fuiste y te lo han pedido cuatro veces.',
    options: [
      O('go', 'Go', 'Ir',
        'You get to the tunnel and cannot go further for about a minute. Thirty thousand people wait, quite happily, for you to manage it.',
        'Llegas al túnel y no puedes avanzar durante un minuto. Treinta mil personas esperan, encantadas, a que puedas.',
        { peace: 18, respect: 12,
          achieveEn: 'Went back, finally', achieveEs: 'Volviste, por fin' }),
      O('quiet', 'Go, but sit in the stand', 'Ir, pero sentarte en la grada',
        'You buy a ticket like everybody else and stand up when they read your name out. Four people around you work out who you are.',
        'Compras una entrada como todos y te levantas cuando leen tu nombre. Cuatro personas a tu alrededor caen en quién eres.',
        { peace: 14, respect: 4 }),
      O('no', 'Write back and say no', 'Contestar que no',
        'A short, kind letter explaining that you would rather leave it where it is. They read part of it out on the day and the ground applauds anyway.',
        'Una carta corta y amable explicando que prefieres dejarlo donde está. Leen un trozo ese día y el estadio aplaude igualmente.',
        { peace: 8, respect: 6 }),
    ],
  },
  {
    id: 'awa-child', path: 'away',
    titleEn: 'Your child wants to play', titleEs: 'Tu hijo quiere jugar',
    descEn: 'Eleven years old, genuinely good, and being watched by people whose interest has very little to do with an eleven-year-old.',
    descEs: 'Once años, bueno de verdad, y observado por gente cuyo interés tiene poco que ver con un niño de once años.',
    options: [
      O('block', 'Keep them out of it entirely', 'Mantenerle fuera de todo eso',
        'No academy, no agents, just Sunday football. They are furious at fifteen and thank you at twenty-six.',
        'Sin cantera, sin representantes, solo fútbol de domingo. Está furioso a los quince y te lo agradece a los veintiséis.',
        { peace: 12, standing: -2 }),
      O('coach', 'Coach the team yourself', 'Entrenar tú al equipo',
        'Six years of Sunday mornings under a different surname on the team sheet. It is the happiest you have been since you were a player.',
        'Seis años de domingos por la mañana bajo otro apellido en el acta. Es lo más feliz que has estado desde que jugabas.',
        { peace: 20, respect: 6,
          achieveEn: 'Coached your own child\'s team for six years', achieveEs: 'Entrenaste al equipo de tu hijo seis años' }),
      O('open', 'Let them use your name', 'Dejar que use tu apellido',
        'Doors open that should not open that fast. They are a professional at nineteen and they never find out which parts they earned.',
        'Se abren puertas que no deberían abrirse tan rápido. Es profesional a los diecinueve y nunca sabe qué partes se ganó.',
        { standing: 6, peace: -12, respect: -4 }),
    ],
  },
  {
    id: 'awa-call', path: 'away',
    titleEn: 'One of them is in trouble', titleEs: 'Uno de ellos está mal',
    descEn: 'A teammate from years ago. Money gone, marriage gone, and he has called you at eleven at night because you are the only number he still has.',
    descEs: 'Un compañero de hace años. Sin dinero, sin matrimonio, y te ha llamado a las once de la noche porque eres el único número que le queda.',
    options: [
      O('drive', 'Get in the car', 'Coger el coche',
        'Four hours each way, that night. You do it eleven more times over two years and he is still here.',
        'Cuatro horas de ida y cuatro de vuelta, esa noche. Lo repites once veces en dos años y sigue aquí.',
        { peace: 16, respect: 10,
          achieveEn: 'Drove through the night for a teammate, repeatedly', achieveEs: 'Condujiste de noche por un compañero, muchas veces' }),
      O('money', 'Send money', 'Mandarle dinero',
        'It helps and it is not what he rang for. You both know that and neither of you says it.',
        'Ayuda y no es para lo que llamaba. Los dos lo sabéis y ninguno lo dice.',
        { wealth: -600_000, peace: -4 }),
      O('network', 'Put him in touch with the right people', 'Ponerle en contacto con quien puede ayudarle',
        'The professional answer, and the effective one. He gets properly helped by people who know how, and he never quite forgives you for not coming yourself.',
        'La respuesta profesional, y la eficaz. Le ayuda gente que sabe hacerlo, y nunca te perdona del todo no haber ido tú.',
        { standing: 4, peace: -6, respect: 4 }),
    ],
  },
  {
    id: 'awa-film', path: 'away',
    when: p => p.tier === 'immortal' || p.tier === 'legend' || p.tier === 'great',
    titleEn: 'Somebody wants to make a film about you', titleEs: 'Alguien quiere hacer una película sobre ti',
    descEn: 'A serious director, a serious budget, and eleven years of you refusing to talk to anybody. They want the whole thing, including the parts you do not discuss.',
    descEs: 'Un director serio, un presupuesto serio y once años tuyos sin hablar con nadie. Lo quieren todo, incluidas las partes de las que no hablas.',
    options: [
      O('all', 'Give them everything', 'Dárselo todo',
        'It is far better and far more painful than you expected. A generation who never saw you play understand exactly what you were.',
        'Es mucho mejor y mucho más doloroso de lo que esperabas. Una generación que no te vio jugar entiende exactamente lo que fuiste.',
        { respect: 18, standing: 8, peace: -8, wealth: 1_800_000,
          achieveEn: 'A film about you that told the truth', achieveEs: 'Una película sobre ti que contó la verdad' }),
      O('football', 'Only the football', 'Solo el fútbol',
        'Ninety minutes of what you were on a pitch and nothing else. It is beautiful and everybody notices what is missing.',
        'Noventa minutos de lo que eras en un campo y nada más. Es preciosa y todos notan lo que falta.',
        { respect: 8, peace: 4, wealth: 1_200_000 }),
      O('no', 'Refuse, and keep refusing', 'Negarte, y seguir negándote',
        'They make it anyway, without you, and it is worse. You have never seen it and you never will.',
        'La hacen igualmente, sin ti, y es peor. No la has visto y no la verás nunca.',
        { peace: 6, respect: -4 }),
    ],
  },
];

// ---- running one -----------------------------------------------------------

/** The three chapters this second life will be made of. */
export function drawChapters(path: PathId, prof: CareerProfile, rng: Rng): AfterlifeChapter[] {
  const pool = AFTERLIFE_CHAPTERS.filter(c => c.path === path && (!c.when || c.when(prof)));
  const out: AfterlifeChapter[] = [];
  const bag = [...pool];
  while (out.length < Math.min(3, pool.length) && bag.length) {
    out.push(...bag.splice(rng.int(bag.length), 1));
  }
  return out;
}

/**
 * Where the second life starts.
 *
 * Not from zero: what you were as a player opens and closes doors. A legend
 * walks into a dugout with credit he has not earned yet, and a man nobody
 * remembers has to build all of it from nothing.
 */
export function startAfterlife(path: PathId, prof: CareerProfile, chapters: AfterlifeChapter[]): Afterlife {
  const fame = clamp(0, 26, prof.peakOverall - 66)
    + Math.min(10, prof.bigTitles * 2)
    + Math.min(6, prof.ballon * 3);
  return {
    path,
    standing: clamp(10, 70, 34 + fame * 0.5),
    respect: clamp(10, 70, 30 + fame * 0.6),
    // A career that ended badly does not hand you a peaceful retirement.
    peace: clamp(15, 70, 50 + (prof.neverWon ? -10 : 4) + (prof.oneClubMan ? 8 : 0) - prof.finalsLost * 2),
    wealth: 0,
    // How long the second life runs before the chapters add to it. Walking away
    // is the rest of your life, not a three-year gap.
    years: path === 'away' ? 22 : path === 'abroad' ? 2 : 4,
    chapters,
    idx: 0,
    choices: chapters.map(() => null),
    achievements: [],
  };
}

export function applyAfterlifeChoice(a: Afterlife, opt: AfterlifeOption): Afterlife {
  const e = opt.effects;
  const choices = [...a.choices];
  choices[a.idx] = opt;
  const achievements = [...a.achievements];
  if (e.achieveEn && e.achieveEs) achievements.push({ en: e.achieveEn, es: e.achieveEs });
  return {
    ...a,
    standing: clamp(0, 100, a.standing + (e.standing ?? 0)),
    respect: clamp(0, 100, a.respect + (e.respect ?? 0)),
    peace: clamp(0, 100, a.peace + (e.peace ?? 0)),
    wealth: a.wealth + (e.wealth ?? 0),
    years: a.years + (e.years ?? 0),
    choices,
    achievements,
  };
}

export const afterlifeDone = (a: Afterlife) => a.idx >= a.chapters.length;

// ---- how it turned out -----------------------------------------------------

export type AfterlifeTier = 'triumph' | 'fulfilled' | 'steady' | 'hollow' | 'lost';

/**
 * The shape the three meters make.
 *
 * `hollow` is checked before the averages on purpose: a man who succeeded at
 * the job and hated every year of it has not had a middling second life, he has
 * had a specific and quite sad one, and the ending should say so.
 */
export function afterlifeTier(a: Afterlife): AfterlifeTier {
  const avg = (a.standing + a.respect + a.peace) / 3;
  if (a.standing >= 60 && a.peace < 34) return 'hollow';
  if (a.standing >= 68 && a.respect >= 60 && a.peace >= 52) return 'triumph';
  if (a.peace >= 68 && avg >= 50) return 'fulfilled';
  if (avg >= 46) return 'steady';
  return 'lost';
}

export const TIER_LABEL: Record<AfterlifeTier, [string, string]> = {
  triumph: ['A second career as big as the first', 'Una segunda carrera tan grande como la primera'],
  fulfilled: ['You got the years right', 'Acertaste con los años'],
  steady: ['A working life, quietly done', 'Una vida de trabajo, hecha sin ruido'],
  hollow: ['You won, and it cost you the whole of it', 'Ganaste, y te costó todo lo demás'],
  lost: ['It never quite took', 'Nunca terminó de cuajar'],
};

/**
 * What the second life was, in one paragraph.
 *
 * Built from the path *and* how it went *and* how long it lasted, rather than
 * drawn at random — the old ending picked one of three fixed sentences per
 * path, so "you became a manager and it did not work out" arrived regardless of
 * anything the player had done.
 */
export function secondLifeSummary(
  a: Afterlife, prof: CareerProfile, lang: Lang,
): string {
  const es = lang === 'es';
  const tier = afterlifeTier(a);
  const yrs = a.years;

  const JOB: Record<PathId, [string, string]> = {
    manager: ['in a dugout', 'en un banquillo'],
    pundit: ['in a television studio', 'en un plató'],
    academy: ['on an academy pitch', 'en un campo de cantera'],
    director: ['behind a desk at a football club', 'en un despacho de un club'],
    abroad: ['still playing, a long way from home', 'todavía jugando, lejos de casa'],
    away: ['out of the game entirely', 'fuera del fútbol por completo'],
  };
  const job = JOB[a.path][es ? 1 : 0];

  const open = es
    ? `Pasaste ${yrs} año${yrs === 1 ? '' : 's'} ${job}.`
    : `You spent ${yrs} year${yrs === 1 ? '' : 's'} ${job}.`;

  const END: Record<AfterlifeTier, [string, string]> = {
    triumph: [
      'It worked, and it kept working, and there are people who know your name only from this half of it.',
      'Funcionó, y siguió funcionando, y hay gente que conoce tu nombre solo por esta mitad.',
    ],
    fulfilled: [
      'You will not be remembered for any of it outside the building, and you would make every one of those choices again.',
      'Fuera de ese edificio no te recordarán por nada de esto, y volverías a tomar cada una de esas decisiones.',
    ],
    steady: [
      'Some of it went well and some of it did not, which is what a working life looks like from the inside.',
      'Parte salió bien y parte no, que es como se ve una vida de trabajo desde dentro.',
    ],
    hollow: [
      'By every measure anybody keeps, you were a success at it. You did not want to be there for most of it.',
      'Según cualquier medida que alguien lleve, fue un éxito. La mayor parte del tiempo no querías estar allí.',
    ],
    lost: [
      'It never really started. You were good at one thing and this was not it, and you found that out slowly.',
      'Nunca llegó a arrancar. Eras bueno en una cosa y no era esta, y lo descubriste despacio.',
    ],
  };

  const parts = [open, END[tier][es ? 1 : 0]];

  // the money, only when it moved enough to be part of the story
  if (Math.abs(a.wealth) >= 1_000_000) {
    parts.push(a.wealth > 0
      ? (es ? 'Y pagó bien.' : 'And it paid well.')
      : (es ? 'Y te costó dinero, que era la idea.' : 'And it cost you money, which was the point.'));
  }
  return parts.join(' ');
}

// ---- copy ------------------------------------------------------------------

export function fillAfterlifeCopy(
  s: string, p: CareerPlayer, prof: CareerProfile, lang: Lang,
): string {
  const es = lang === 'es';
  const home = getClub(prof.homeClubId ?? '');
  const nation = getNation(p.ntNationCode);
  return s
    .replace(/\{H\}/g, home?.name ?? (es ? 'tu club' : 'your club'))
    .replace(/\{N\}/g, (es ? nation?.es : nation?.en) ?? '')
    .replace(/\{P\}/g, p.surname)
    .replace(/\{G\}/g, String(p.goals))
    .replace(/\{S\}/g, String(prof.seasons))
    .replace(/\{C\}/g, String(prof.clubCount));
}

export const chapterTitle = (c: AfterlifeChapter, lang: Lang) => (lang === 'es' ? c.titleEs : c.titleEn);
export const chapterDesc = (c: AfterlifeChapter, lang: Lang) => (lang === 'es' ? c.descEs : c.descEn);
export const optLabel = (o: AfterlifeOption, lang: Lang) => (lang === 'es' ? o.es : o.en);
export const optOutcome = (o: AfterlifeOption, lang: Lang) => (lang === 'es' ? o.outcomeEs : o.outcomeEn);
export const tierLabel = (t: AfterlifeTier, lang: Lang) => TIER_LABEL[t][lang === 'es' ? 1 : 0];

export const METER_LABEL: Record<'standing' | 'respect' | 'peace', [string, string]> = {
  standing: ['Standing', 'Posición'],
  respect: ['Respect', 'Respeto'],
  peace: ['Peace', 'Paz'],
};
