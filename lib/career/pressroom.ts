// The press conference.
//
// A room, a question, and four ways to answer it: arrogant, humble, funny,
// formal. The question is written for the moment you are actually in — the week
// of a derby, the morning after a Ballon d'Or, the third bad season in a row —
// and it knows things about your career, so nobody asks a 34-year-old with 300
// goals whether he is nervous about his debut.
//
// The gamble is deliberate. Each answer has its own outcome line, and then a
// *reaction* is drawn from a pool shared by that tone, which decides what it
// actually cost you. Arrogance usually buys reputation and sometimes buys a
// fine; humility usually buys the terraces and sometimes reads as weakness. The
// same answer to the same question does not always end the same way, which is
// the only honest way to model talking to journalists.
import type { CareerPlayer, Title } from '@/data/career/types';
import { getClub } from '@/data/career/clubs';
import { getNation } from '@/data/career/nations';
import { derbyBetween } from '@/data/career/derbies';
import { mainRival } from '@/data/career/rivals';
import { Rng } from './rng';
import { applyEffects, type PlayerEffects } from './effects';
import type { Lang } from './i18n';

export type PressTone = 'arrogant' | 'humble' | 'funny' | 'formal';

export const TONES: PressTone[] = ['arrogant', 'humble', 'funny', 'formal'];

export const TONE_LABEL: Record<PressTone, [string, string]> = {
  arrogant: ['Arrogant', 'Arrogante'],
  humble: ['Humble', 'Humilde'],
  funny: ['Funny', 'Gracioso'],
  formal: ['Formal', 'Formal'],
};

export const TONE_ICON: Record<PressTone, string> = {
  arrogant: '😤', humble: '🙏', funny: '😏', formal: '🎙️',
};

export type PressSituation =
  | 'preseason' | 'derby-week' | 'award' | 'title' | 'final-lost'
  | 'transfer' | 'record' | 'international' | 'slump' | 'veteran' | 'contract';

export interface PressCtx {
  p: CareerPlayer;
  situation: PressSituation;
  /** career totals, so a question can reference them */
  trophies: Title[];
  seasons: number;
  /** last season's shape */
  apps: number;
  goals: number;
  rivalId: string | null;
  /** years at the current club */
  tenure: number;
}

export interface PressAnswer {
  tone: PressTone;
  en: string; es: string;
  /** what you actually said landing in the room */
  outcomeEn: string; outcomeEs: string;
}

export interface PressQuestion {
  id: string;
  situation: PressSituation;
  when?: (c: PressCtx) => boolean;
  /** who is asking */
  askEn: string; askEs: string;
  qEn: string; qEs: string;
  answers: PressAnswer[];
}

const A = (
  tone: PressTone, en: string, es: string, outcomeEn: string, outcomeEs: string,
): PressAnswer => ({ tone, en, es, outcomeEn, outcomeEs });

// ---- who is asking ---------------------------------------------------------
// Archetypes rather than names: the man from the local paper who has covered the
// club for thirty years is a character everybody recognises.

const ASKERS: [string, string][] = [
  ['the local paper', 'el periódico local'],
  ['a national broadsheet', 'un diario nacional'],
  ['the club channel', 'el canal del club'],
  ['a television reporter', 'una reportera de televisión'],
  ['the wire agency', 'la agencia de noticias'],
  ['a radio man who never sits down', 'un tipo de la radio que nunca se sienta'],
  ['a podcast nobody has heard of', 'un pódcast que no conoce nadie'],
  ['the reporter who has covered you since you were seventeen', 'el periodista que te cubre desde los diecisiete'],
];

// ============================ the questions =================================
// Copy placeholders: {C} club, {R} rival club, {D} the derby's name, {N} your
// national team, {P} your surname, {G} career goals, {A} your age, {Y} seasons
// at this club, {T} how many trophies you have won.

export const PRESS_QUESTIONS: PressQuestion[] = [
  // ---------------------------- preseason ----------------------------
  {
    id: 'pre-expectations', situation: 'preseason',
    askEn: 'the local paper', askEs: 'el periódico local',
    qEn: 'Every summer everybody says this is the year. Is it actually the year, or is that just something we all say in July?',
    qEs: 'Todos los veranos decimos que este es el año. ¿Es de verdad el año, o es solo algo que decimos en julio?',
    answers: [
      A('arrogant', 'It is the year because I am here', 'Es el año porque estoy yo',
        'You say it flatly, without smiling, and the room stops writing for a second.',
        'Lo dices sin más, sin sonreír, y la sala deja de escribir un segundo.'),
      A('humble', 'Ask me in May', 'Pregúntame en mayo',
        'The oldest answer in football and it is still the only true one.',
        'La respuesta más vieja del fútbol y sigue siendo la única cierta.'),
      A('funny', 'It is July. In July I am also very fast', 'Es julio. En julio yo también soy rapidísimo',
        'The room actually laughs, which in preseason is close to a miracle.',
        'La sala se ríe de verdad, que en pretemporada es casi un milagro.'),
      A('formal', 'We will work hard and see where it takes us', 'Trabajaremos y veremos dónde nos lleva',
        'Eleven words nobody can print and nobody can argue with.',
        'Once palabras que nadie puede publicar y con las que nadie puede discutir.'),
    ],
  },
  {
    id: 'pre-newsigning', situation: 'preseason',
    askEn: 'a national broadsheet', askEs: 'un diario nacional',
    qEn: '{C} have spent a lot of money on somebody who plays where you play. How do you feel about that?',
    qEs: 'El {C} se ha gastado mucho dinero en alguien que juega donde juegas tú. ¿Cómo lo llevas?',
    answers: [
      A('arrogant', 'He can learn a lot watching me', 'Puede aprender mucho mirándome',
        'It gets back to him within the hour, because these things always do.',
        'Le llega en menos de una hora, porque estas cosas siempre llegan.'),
      A('humble', 'Good. The team needed it', 'Bien. El equipo lo necesitaba',
        'You mean it, and the two people in the room who know you can tell.',
        'Lo dices en serio, y las dos personas de la sala que te conocen lo notan.'),
      A('funny', 'I have asked for his shirt already, just in case', 'Ya le he pedido la camiseta, por si acaso',
        'Self-deprecating, quotable, and it takes all the tension out of the week.',
        'Autocrítico, citable, y le quita toda la tensión a la semana.'),
      A('formal', 'Competition is healthy for any squad', 'La competencia es sana para cualquier plantilla',
        'Textbook. Somebody in the third row mouths it along with you.',
        'De manual. Alguien de la tercera fila lo dice a la vez que tú.'),
    ],
  },
  {
    id: 'pre-fitness', situation: 'preseason',
    when: c => c.p.age >= 29,
    askEn: 'a television reporter', askEs: 'una reportera de televisión',
    qEn: 'You are {A} now. The legs are the first thing to go. Are they going?',
    qEs: 'Ya tienes {A} años. Las piernas son lo primero que se va. ¿Se están yendo?',
    answers: [
      A('arrogant', 'Come and run with me on Thursday', 'Ven a correr conmigo el jueves',
        'She writes it down word for word. Two of your teammates hear about the challenge and want in.',
        'Lo apunta palabra por palabra. Dos compañeros se enteran del reto y quieren apuntarse.'),
      A('humble', 'Yes. So I have had to learn other things', 'Sí. Por eso he tenido que aprender otras cosas',
        'An unusually honest answer about ageing that gets used in a long piece six months later.',
        'Una respuesta inusualmente honesta sobre la edad que acaba en un reportaje seis meses después.'),
      A('funny', 'They left years ago. Nobody noticed', 'Se fueron hace años. Nadie se dio cuenta',
        'It is the clip of the day and it is genuinely very funny.',
        'Es el vídeo del día y tiene muchísima gracia.'),
      A('formal', 'I feel physically well and that is what matters', 'Me encuentro bien físicamente y eso es lo que importa',
        'Correct, dull, and it ends the line of questioning immediately.',
        'Correcto, aburrido, y corta la pregunta al instante.'),
    ],
  },
  {
    id: 'pre-captain', situation: 'preseason',
    when: c => c.tenure >= 3,
    askEn: 'the club channel', askEs: 'el canal del club',
    qEn: 'Your {Y}th season here. Do you feel like one of the leaders in that dressing room now?',
    qEs: 'Tu temporada número {Y} aquí. ¿Te sientes ya uno de los líderes del vestuario?',
    answers: [
      A('arrogant', 'I have been the leader for two years', 'Llevo dos años siendo el líder',
        'The captain is sitting six feet away. He does not react at all, which is worse.',
        'El capitán está a dos metros. No reacciona en absoluto, que es peor.'),
      A('humble', 'That is not for me to say', 'Eso no me toca decirlo a mí',
        'Somebody senior repeats it approvingly in a different interview that week.',
        'Alguien veterano lo repite con aprobación en otra entrevista esa semana.'),
      A('funny', 'I lead the queue for lunch', 'Lidero la cola de la comida',
        'It becomes a running joke at the training ground for the entire season.',
        'Se convierte en el chiste recurrente de la ciudad deportiva toda la temporada.'),
      A('formal', 'I try to help the younger players where I can', 'Intento ayudar a los jóvenes donde puedo',
        'The right answer, delivered the right way, and three of them hear it.',
        'La respuesta correcta, dicha como toca, y tres de ellos la oyen.'),
    ],
  },

  // ---------------------------- derby week ----------------------------
  {
    id: 'derby-fear', situation: 'derby-week',
    askEn: 'a radio man who never sits down', askEs: 'un tipo de la radio que nunca se sienta',
    qEn: '{D} on Sunday. Their manager says {C} are afraid of them. Are you afraid of them?',
    qEs: '{D} el domingo. Su entrenador dice que el {C} les tiene miedo. ¿Les tenéis miedo?',
    answers: [
      A('arrogant', 'I have never been afraid of anybody in my life', 'No le he tenido miedo a nadie en mi vida',
        'It is the back page by six o\'clock and it is on a banner by Sunday.',
        'Está en la contraportada a las seis y en una pancarta el domingo.'),
      A('humble', 'They are a very good side. Fear is a strange word', 'Son un equipazo. Miedo es una palabra rara',
        'Measured, respectful, and it gives them absolutely nothing to pin up.',
        'Medido, respetuoso, y no les da absolutamente nada que colgar en el vestuario.'),
      A('funny', 'Terrified. I may not turn up', 'Aterrado. A lo mejor no me presento',
        'Delivered completely deadpan. It runs on every highlights show in the country.',
        'Dicho con cara de póker. Sale en todos los programas del país.'),
      A('formal', 'It is three points and we prepare like any other week', 'Son tres puntos y lo preparamos como cualquier semana',
        'Nobody believes it, including you, and that is fine — it is the correct thing to say.',
        'No se lo cree nadie, tú tampoco, y está bien: es lo que hay que decir.'),
    ],
  },
  {
    id: 'derby-history', situation: 'derby-week',
    askEn: 'the reporter who has covered you since you were seventeen', askEs: 'el periodista que te cubre desde los diecisiete',
    qEn: 'You have scored {G} goals in your career. Do the ones against {R} count differently?',
    qEs: 'Llevas {G} goles en tu carrera. ¿Los que le has metido al {R} cuentan distinto?',
    answers: [
      A('arrogant', 'They count double and they know it', 'Cuentan doble y ellos lo saben',
        'Your own supporters put it on a flag inside three days.',
        'Tu afición lo pone en una bandera en tres días.'),
      A('humble', 'Every goal counts the same on the sheet', 'En el acta todos valen lo mismo',
        'Then you pause and add "but you do not dream about the other ones", which is the line they print.',
        'Luego haces una pausa y añades «pero con los otros no sueñas», que es la frase que publican.'),
      A('funny', 'Only the ones I remember, and I remember all of them', 'Solo los que recuerdo, y los recuerdo todos',
        'The room enjoys it enormously and so, visibly, do you.',
        'A la sala le encanta y a ti, se nota, también.'),
      A('formal', 'A goal is a goal. The occasion does not change it', 'Un gol es un gol. La ocasión no lo cambia',
        'Nobody uses a word of it, which was probably the plan.',
        'No usan ni una palabra, que probablemente era el plan.'),
    ],
  },
  {
    id: 'derby-personal', situation: 'derby-week',
    askEn: 'a national broadsheet', askEs: 'un diario nacional',
    qEn: 'Their supporters have been singing a song about you for two years now. Does it get to you?',
    qEs: 'Su afición lleva dos años cantándote una canción. ¿Te afecta?',
    answers: [
      A('arrogant', 'They sing about me because I am the one who beats them', 'Me cantan porque soy el que les gana',
        'A sentence that will be read out to you at every press conference for a decade.',
        'Una frase que te leerán en cada rueda de prensa durante diez años.'),
      A('humble', 'It means I am doing something right', 'Significa que algo estaré haciendo bien',
        'Short, unbothered, and it lands better than anything longer would have.',
        'Corta, tranquila, y funciona mejor que cualquier respuesta más larga.'),
      A('funny', 'It is not a bad song. The rhyme is weak', 'No es mala canción. La rima es floja',
        'Their own supporters find this funnier than yours do, which is a strange kind of victory.',
        'A su propia afición le hace más gracia que a la tuya, que es una victoria rara.'),
      A('formal', 'That is part of the game and I respect it', 'Es parte del juego y lo respeto',
        'Professional to the last syllable. The follow-up question dies on the vine.',
        'Profesional hasta la última sílaba. La repregunta se muere sola.'),
    ],
  },

  // ---------------------------- awards ----------------------------
  {
    id: 'award-deserved', situation: 'award',
    askEn: 'the wire agency', askEs: 'la agencia de noticias',
    qEn: 'A lot of people think somebody else should have won it. What do you say to them?',
    qEs: 'Mucha gente cree que debería haberlo ganado otro. ¿Qué les dices?',
    answers: [
      A('arrogant', 'They can vote next year as well', 'Que voten otra vez el año que viene',
        'Ice cold. It is the headline everywhere by morning and it does not soften with time.',
        'Gélido. Es el titular en todas partes por la mañana y no se suaviza con el tiempo.'),
      A('humble', 'They might be right', 'A lo mejor tienen razón',
        'Two of the men you beat to it publicly say it is the classiest thing they have heard all year.',
        'Dos de los que quedaron por detrás dicen en público que es lo más elegante que han oído en el año.'),
      A('funny', 'I agree. I voted for him', 'Estoy de acuerdo. Yo voté por él',
        'It is not remotely true and it is the funniest thing said all evening.',
        'No es verdad en absoluto y es lo más gracioso de la noche.'),
      A('formal', 'I am grateful to everybody who voted', 'Agradezco a todos los que votaron',
        'The line every winner says. It does the job and nothing else.',
        'La frase que dice cada ganador. Cumple y nada más.'),
    ],
  },
  {
    id: 'award-next', situation: 'award',
    askEn: 'a television reporter', askEs: 'una reportera de televisión',
    qEn: 'You have {T} trophies now. Is there anything left that you actually want?',
    qEs: 'Ya tienes {T} títulos. ¿Queda algo que de verdad quieras?',
    answers: [
      A('arrogant', 'All of them. Again', 'Todos. Otra vez',
        'Two words that get made into a poster by somebody in the marketing department.',
        'Dos palabras que alguien de marketing convierte en un póster.'),
      A('humble', 'One more season without being injured', 'Una temporada más sin lesionarme',
        'The room goes quiet. It is the most human thing anybody says all night.',
        'La sala se queda en silencio. Es lo más humano que se dice en toda la noche.'),
      A('funny', 'A full night of sleep', 'Dormir una noche entera',
        'Every parent watching decides on the spot that they like you.',
        'Todos los padres que lo ven deciden en ese momento que les caes bien.'),
      A('formal', 'Whatever the team needs next', 'Lo que el equipo necesite después',
        'Correct, and completely uninteresting, and you know both of those things.',
        'Correcto, y absolutamente poco interesante, y lo sabes.'),
    ],
  },
  {
    id: 'award-teammates', situation: 'award',
    askEn: 'the club channel', askEs: 'el canal del club',
    qEn: 'An individual award in a team sport. How do you carry that back into the dressing room on Monday?',
    qEs: 'Un premio individual en un deporte de equipo. ¿Cómo vuelves con eso al vestuario el lunes?',
    answers: [
      A('arrogant', 'They should be glad one of us won it', 'Que se alegren de que lo ganara uno de nosotros',
        'Two senior players hear this. Neither says anything. Both remember it.',
        'Dos veteranos lo oyen. Ninguno dice nada. Los dos se acuerdan.'),
      A('humble', 'I bring it in and leave it on the physio bed', 'Lo llevo y lo dejo en la camilla del fisio',
        'You actually do it. Somebody photographs it and it is the best thing the club posts all year.',
        'Y lo haces de verdad. Alguien lo fotografía y es lo mejor que publica el club en el año.'),
      A('funny', 'In a bag. It is heavier than it looks', 'En una bolsa. Pesa más de lo que parece',
        'Deflating the whole thing is exactly the right instinct and the room knows it.',
        'Quitarle importancia es justo el instinto correcto y la sala lo nota.'),
      A('formal', 'This belongs to everybody at the club', 'Esto es de todo el club',
        'True, expected, and it costs you nothing at all.',
        'Cierto, esperable, y no te cuesta absolutamente nada.'),
    ],
  },

  // ---------------------------- winning something ----------------------------
  {
    id: 'title-feel', situation: 'title',
    askEn: 'the local paper', askEs: 'el periódico local',
    qEn: 'You have just won it. There are eighty thousand people outside. What is actually going through your head?',
    qEs: 'Acabas de ganarlo. Hay ochenta mil personas fuera. ¿Qué te pasa de verdad por la cabeza?',
    answers: [
      A('arrogant', 'That we should have won it sooner', 'Que deberíamos haberlo ganado antes',
        'Even now. The manager, three feet away, closes his eyes for a second.',
        'Incluso ahora. El entrenador, a un metro, cierra los ojos un segundo.'),
      A('humble', 'My father, mostly', 'Mi padre, sobre todo',
        'You do not elaborate and nobody asks you to. It is the quote of the night.',
        'No lo desarrollas y nadie te lo pide. Es la frase de la noche.'),
      A('funny', 'Whether anybody has my phone', 'Si alguien tiene mi teléfono',
        'You genuinely have lost it. It turns up in a boot four days later.',
        'Lo has perdido de verdad. Aparece dentro de una bota cuatro días después.'),
      A('formal', 'Enormous pride in this group of players', 'Un orgullo enorme por este grupo',
        'The sentence every captain has said since football began. It works because it is true.',
        'La frase que ha dicho cada capitán desde que existe el fútbol. Funciona porque es verdad.'),
    ],
  },
  {
    id: 'title-again', situation: 'title',
    when: c => c.trophies.length >= 6,
    askEn: 'a podcast nobody has heard of', askEs: 'un pódcast que no conoce nadie',
    qEn: 'Does it still feel the same as the first one, or does winning become a job?',
    qEs: '¿Se siente igual que el primero, o ganar se convierte en un trabajo?',
    answers: [
      A('arrogant', 'It feels normal. That is the point of being me', 'Se siente normal. De eso va ser yo',
        'Somebody clips those eleven words and they follow you around the internet for years.',
        'Alguien recorta esas once palabras y te persiguen por internet durante años.'),
      A('humble', 'The first one you win for yourself. After that you win them for other people',
        'El primero lo ganas para ti. A partir de ahí los ganas para otros',
        'A small, unexpectedly good answer on a podcast with four hundred listeners. It gets out anyway.',
        'Una respuesta pequeña e inesperadamente buena en un pódcast con cuatrocientos oyentes. Se difunde igual.'),
      A('funny', 'The parade route gets shorter every year', 'El recorrido de la celebración se acorta cada año',
        'Nobody at the club finds this as funny as you do.',
        'A nadie del club le hace tanta gracia como a ti.'),
      A('formal', 'Every one of them is difficult in its own way', 'Cada uno es difícil a su manera',
        'True and unremarkable, which between them cover most press conferences.',
        'Verdadero y anodino, que entre los dos cubren casi todas las ruedas de prensa.'),
    ],
  },

  // ---------------------------- losing a final ----------------------------
  {
    id: 'final-lost', situation: 'final-lost',
    askEn: 'a television reporter', askEs: 'una reportera de televisión',
    qEn: 'You are eleven minutes off the pitch and your eyes are still red. Can you even talk about this yet?',
    qEs: 'Llevas once minutos fuera del campo y todavía tienes los ojos rojos. ¿Puedes hablar de esto ya?',
    answers: [
      A('arrogant', 'We were the better team. The result is a lie', 'Fuimos mejores. El resultado es mentira',
        'Their captain is asked about it and answers with three words that are much worse for you.',
        'Le preguntan a su capitán y responde con tres palabras que te dejan mucho peor.'),
      A('humble', 'No. But you have a job and so do I', 'No. Pero tú tienes un trabajo y yo también',
        'You do the whole interview anyway. It is the most respected thing you do all year.',
        'Haces la entrevista entera igualmente. Es lo más respetado que haces en el año.'),
      A('funny', 'Ask me in a decade', 'Pregúntame dentro de diez años',
        'Not really a joke and everybody understands. She moves on immediately.',
        'No es realmente un chiste y todos lo entienden. Ella pasa a otra cosa enseguida.'),
      A('formal', 'Congratulations to them. We will come back', 'Enhorabuena a ellos. Volveremos',
        'Held together by nothing but professionalism, and it holds.',
        'Sostenido solo por profesionalidad, y se sostiene.'),
    ],
  },
  {
    id: 'final-blame', situation: 'final-lost',
    when: c => c.p.position !== 'GK',
    askEn: 'the wire agency', askEs: 'la agencia de noticias',
    qEn: 'You had the chance in the eighty-eighth minute. Have you watched it back?',
    qEs: 'Tuviste la ocasión en el minuto ochenta y ocho. ¿La has vuelto a ver?',
    answers: [
      A('arrogant', 'I have scored that a hundred times', 'Ese gol lo he metido cien veces',
        'True, and it is not what anybody wanted to hear tonight.',
        'Es verdad, y no es lo que nadie quería oír esta noche.'),
      A('humble', 'I will watch it for the rest of my life', 'La voy a ver el resto de mi vida',
        'The room stops entirely. Somebody writes a very good column about it.',
        'La sala se para del todo. Alguien escribe una columna muy buena sobre eso.'),
      A('funny', 'No, and I have deleted the internet', 'No, y he borrado internet',
        'A joke told by a man who is clearly not fine. Everybody lets him have it.',
        'Un chiste de alguien que claramente no está bien. Todos se lo permiten.'),
      A('formal', 'These things happen in a final', 'Estas cosas pasan en una final',
        'Flat, contained, and it keeps the whole thing from becoming a story about you.',
        'Plano, contenido, y evita que todo esto se convierta en una historia sobre ti.'),
    ],
  },

  // ---------------------------- a transfer ----------------------------
  {
    id: 'transfer-why', situation: 'transfer',
    askEn: 'a national broadsheet', askEs: 'un diario nacional',
    qEn: 'You have signed for {C}. Was this about football, or was it about money?',
    qEs: 'Has firmado por el {C}. ¿Esto ha sido por fútbol o por dinero?',
    answers: [
      A('arrogant', 'Both, and I have earned both', 'Las dos, y me he ganado las dos',
        'Refreshingly honest and it costs you about half the neutrals in the room.',
        'Sinceridad refrescante y te cuesta más o menos la mitad de los neutrales de la sala.'),
      A('humble', 'I wanted to be somewhere I might be needed', 'Quería estar donde pudieran necesitarme',
        'Nobody quite expected it. It reframes the whole transfer in one sentence.',
        'Nadie se lo esperaba del todo. Recoloca el fichaje entero en una frase.'),
      A('funny', 'Have you seen the training ground?', '¿Has visto la ciudad deportiva?',
        'Everybody laughs. Nobody gets an answer. It is a very effective non-answer.',
        'Todos se ríen. Nadie obtiene respuesta. Es una no-respuesta muy eficaz.'),
      A('formal', 'It was a sporting decision', 'Fue una decisión deportiva',
        'The four words that end this question everywhere in the world.',
        'Las cuatro palabras que terminan esta pregunta en todo el mundo.'),
    ],
  },
  {
    id: 'transfer-oldclub', situation: 'transfer',
    when: c => c.p.clubsPlayed.length >= 2,
    askEn: 'the reporter who has covered you since you were seventeen', askEs: 'el periodista que te cubre desde los diecisiete',
    qEn: 'The supporters you have just left are hurt. Do you owe them anything?',
    qEs: 'La afición que acabas de dejar está dolida. ¿Les debes algo?',
    answers: [
      A('arrogant', 'I gave them everything I had. We are level', 'Les di todo lo que tenía. Estamos en paz',
        'Defensible, accurate, and it reads as cold in print no matter how you say it.',
        'Defendible, exacto, y en papel suena frío digas como lo digas.'),
      A('humble', 'Everything. I will owe them for the rest of my life', 'Todo. Se lo deberé toda la vida',
        'They put it on a banner at the next home game, on the other side of the argument.',
        'Lo ponen en una pancarta en el siguiente partido en casa, del lado bueno de la discusión.'),
      A('funny', 'A goal, apparently. They have told me so', 'Un gol, por lo visto. Me lo han dicho',
        'Warm rather than dismissive, and it lands about as well as this question can.',
        'Cercano en vez de despectivo, y funciona tan bien como puede funcionar esta pregunta.'),
      A('formal', 'I will always be grateful for my time there', 'Siempre estaré agradecido por mi etapa allí',
        'The standard sentence, delivered without a flicker.',
        'La frase estándar, dicha sin pestañear.'),
    ],
  },

  // ---------------------------- a record ----------------------------
  {
    id: 'record-holder', situation: 'record',
    askEn: 'the club channel', askEs: 'el canal del club',
    qEn: 'You have just passed a man most people here grew up being told about. How does that sit?',
    qEs: 'Acabas de superar a alguien del que a casi todos aquí les hablaron de pequeños. ¿Cómo lo llevas?',
    answers: [
      A('arrogant', 'Records are made to be taken and I take them', 'Los récords están para batirlos y yo los bato',
        'The man himself is asked for a response. His is much better than yours.',
        'Le piden respuesta a él. La suya es mucho mejor que la tuya.'),
      A('humble', 'It sits badly, honestly. It was his', 'Mal, sinceramente. Era suyo',
        'Unexpected and completely sincere. His family write to you about it.',
        'Inesperado y absolutamente sincero. Su familia te escribe por eso.'),
      A('funny', 'I plan to hold it for about four years', 'Pienso tenerlo unos cuatro años',
        'A neat way of saying somebody else will come, which is the only true thing about records.',
        'Una forma elegante de decir que vendrá otro, que es lo único cierto sobre los récords.'),
      A('formal', 'It is an honour to be mentioned alongside him', 'Es un honor que me mencionen a su lado',
        'Exactly the sentence the club would have written for you.',
        'Exactamente la frase que te habría escrito el club.'),
    ],
  },

  // ---------------------------- international ----------------------------
  {
    id: 'intl-pressure', situation: 'international',
    askEn: 'a television reporter', askEs: 'una reportera de televisión',
    qEn: '{N} have not done anything at a tournament in a long time. Is that weight on you specifically?',
    qEs: '{N} lleva mucho sin hacer nada en un torneo. ¿Ese peso recae sobre ti en concreto?',
    answers: [
      A('arrogant', 'Yes, and I am the reason it is going to change', 'Sí, y soy la razón de que eso vaya a cambiar',
        'An entire country now has a specific man to blame if it does not.',
        'Un país entero tiene ahora un culpable con nombre si no cambia.'),
      A('humble', 'It is on all of us, and it should be', 'Es de todos, y así debe ser',
        'The manager repeats it almost word for word two days later.',
        'El entrenador lo repite casi palabra por palabra dos días después.'),
      A('funny', 'I was six the last time. I refuse responsibility for that one', 'Yo tenía seis años la última vez. Esa no me la cargues',
        'The room enjoys it and the follow-up never comes.',
        'A la sala le gusta y la repregunta no llega nunca.'),
      A('formal', 'We focus on the next match and nothing beyond it', 'Nos centramos en el siguiente partido y en nada más',
        'The sentence that has been said before every tournament in history.',
        'La frase que se ha dicho antes de todos los torneos de la historia.'),
    ],
  },
  {
    id: 'intl-anthem', situation: 'international',
    askEn: 'the wire agency', askEs: 'la agencia de noticias',
    qEn: 'Some people noticed you do not sing the anthem. Would you like to address that?',
    qEs: 'Hay quien se ha fijado en que no cantas el himno. ¿Quieres decir algo al respecto?',
    answers: [
      A('arrogant', 'No. Next question', 'No. Siguiente pregunta',
        'Four syllables. For four days it is a bigger story than anything you have ever done on a pitch.',
        'Cuatro sílabas. Durante cuatro días es más noticia que nada que hayas hecho en un campo.'),
      A('humble', 'I am concentrating. I will sing it if it matters that much', 'Estoy concentrado. Lo canto si tanto importa',
        'And you do, the next match, badly, and the whole thing evaporates.',
        'Y lo haces, en el siguiente partido, fatal, y todo se evapora.'),
      A('funny', 'You have not heard me sing. I am protecting everybody', 'No me has oído cantar. Os estoy protegiendo',
        'It kills the story stone dead in one sentence, which is a genuine skill.',
        'Mata la noticia de un plumazo en una frase, que es una habilidad de verdad.'),
      A('formal', 'I represent my country every time I play', 'Represento a mi país cada vez que juego',
        'Unimpeachable. Two columnists write about it anyway.',
        'Irreprochable. Dos columnistas escriben sobre ello igualmente.'),
    ],
  },

  // ---------------------------- a bad spell ----------------------------
  {
    id: 'slump-form', situation: 'slump',
    askEn: 'a national broadsheet', askEs: 'un diario nacional',
    qEn: 'It has not been going well. Do you think you are still good enough for this level?',
    qEs: 'No está yendo bien. ¿Crees que sigues dando el nivel?',
    answers: [
      A('arrogant', 'I am better than everybody who wrote that question', 'Soy mejor que todos los que escribieron esa pregunta',
        'The room goes cold. It gets replayed every time you miss for the next two years.',
        'La sala se hiela. Lo reponen cada vez que fallas durante dos años.'),
      A('humble', 'I have asked myself the same thing', 'Me he hecho la misma pregunta',
        'Startlingly open. It buys you a great deal of goodwill from people who had stopped giving you any.',
        'Sorprendentemente abierto. Te compra muchísima buena voluntad de gente que ya no te daba ninguna.'),
      A('funny', 'My mother thinks so', 'Mi madre cree que sí',
        'It takes the sting out of the room and the next question is a soft one.',
        'Le quita el veneno a la sala y la siguiente pregunta es blanda.'),
      A('formal', 'I train every day and I will keep training every day', 'Entreno cada día y voy a seguir entrenando cada día',
        'Dogged, unglamorous, and it is the answer that actually convinces the manager.',
        'Tozudo, sin brillo, y es la respuesta que de verdad convence al entrenador.'),
    ],
  },
  {
    id: 'slump-bench', situation: 'slump',
    when: c => c.apps < 24,
    askEn: 'the local paper', askEs: 'el periódico local',
    qEn: 'You have started a handful of games all season. Have you actually asked the manager why?',
    qEs: 'Has sido titular en un puñado de partidos en toda la temporada. ¿Le has preguntado de verdad al entrenador por qué?',
    answers: [
      A('arrogant', 'He knows what he is leaving out', 'Él sabe a quién está dejando fuera',
        'It reaches the manager before you reach the car park.',
        'Le llega al entrenador antes de que tú llegues al aparcamiento.'),
      A('humble', 'Yes. And his answer was fair', 'Sí. Y su respuesta fue justa',
        'Nobody expects a player to say this. It changes how the staff talk about you.',
        'Nadie espera que un jugador diga esto. Cambia cómo habla de ti el cuerpo técnico.'),
      A('funny', 'I have asked. He has a door and he closes it', 'Se lo he preguntado. Tiene una puerta y la cierra',
        'Genuinely funny and just barely on the right side of the line.',
        'Con gracia de verdad y justo en el lado bueno de la raya.'),
      A('formal', 'That is a conversation for inside the building', 'Esa es una conversación para dentro del club',
        'A complete and total wall. The staff notice that too.',
        'Un muro absoluto. El cuerpo técnico también se da cuenta.'),
    ],
  },

  // ---------------------------- the end of it ----------------------------
  {
    id: 'vet-retire', situation: 'veteran',
    when: c => c.p.age >= 33,
    askEn: 'a television reporter', askEs: 'una reportera de televisión',
    qEn: 'You are {A}. Everybody wants to know how long you are going to keep doing this.',
    qEs: 'Tienes {A} años. Todo el mundo quiere saber cuánto vas a seguir con esto.',
    answers: [
      A('arrogant', 'Longer than the people asking will be in their jobs', 'Más de lo que la gente que pregunta durará en su trabajo',
        'A very good line and a slightly cruel one. It is quoted approvingly and disapprovingly in equal measure.',
        'Una frase muy buena y un poco cruel. La citan con aprobación y con reproche a partes iguales.'),
      A('humble', 'Until they stop picking me', 'Hasta que dejen de ponerme',
        'Six words that get used in the montage when you eventually do stop.',
        'Seis palabras que usarán en el montaje cuando de verdad lo dejes.'),
      A('funny', 'Until my daughter is embarrassed by it', 'Hasta que a mi hija le dé vergüenza',
        'She is, already, and has told him so on camera at a previous event.',
        'Ya le da, y se lo dijo delante de una cámara en otro acto.'),
      A('formal', 'I take it season by season', 'Voy temporada a temporada',
        'The only sensible answer, and it has been the only sensible answer for a hundred years.',
        'La única respuesta sensata, y lleva siendo la única respuesta sensata cien años.'),
    ],
  },
  {
    id: 'vet-legacy', situation: 'veteran',
    when: c => c.p.age >= 32 && c.seasons >= 12,
    askEn: 'a podcast nobody has heard of', askEs: 'un pódcast que no conoce nadie',
    qEn: 'When it is finished, what do you want people to say about how you played?',
    qEs: 'Cuando esto acabe, ¿qué quieres que digan sobre cómo jugabas?',
    answers: [
      A('arrogant', 'They will say I was the best they saw', 'Dirán que fui el mejor que vieron',
        'Said without any hesitation at all, which is either magnificent or awful depending on the reader.',
        'Dicho sin dudar ni un segundo, que es magnífico o terrible según quién lo lea.'),
      A('humble', 'That I was hard to play against', 'Que era incómodo jugar contra mí',
        'The most professional ambition there is. Every defender who hears it nods.',
        'La ambición más profesional que existe. Todo defensa que lo oye asiente.'),
      A('funny', 'That I was quicker than I looked', 'Que era más rápido de lo que parecía',
        'You were not, and everybody including you knows it.',
        'No lo eras, y lo sabe todo el mundo, tú incluido.'),
      A('formal', 'That I gave everything for every shirt I wore', 'Que lo di todo con cada camiseta que llevé',
        'Unarguable and slightly rehearsed. It will be in your testimonial programme.',
        'Indiscutible y algo ensayado. Estará en el programa de tu partido homenaje.'),
    ],
  },

  // ---------------------------- money ----------------------------
  {
    id: 'contract-money', situation: 'contract',
    askEn: 'the wire agency', askEs: 'la agencia de noticias',
    qEn: 'Your new contract makes you one of the best-paid players here. Is anybody worth that?',
    qEs: 'Tu nuevo contrato te convierte en uno de los mejor pagados. ¿Alguien vale eso?',
    answers: [
      A('arrogant', 'Somebody is paying it, so evidently yes', 'Alguien lo paga, así que evidentemente sí',
        'Unanswerable and completely charmless. It is the pull quote in three papers.',
        'Irrebatible y sin ninguna gracia. Es el destacado en tres periódicos.'),
      A('humble', 'No. Nobody is. That is football, not me', 'No. Nadie los vale. Eso es el fútbol, no yo',
        'A rare and genuinely thoughtful answer to a question designed to trap you.',
        'Una respuesta rara y sinceramente reflexiva a una pregunta diseñada para atraparte.'),
      A('funny', 'Ask me after Saturday', 'Pregúntame después del sábado',
        'You then have a very good game, which makes the joke retroactively excellent.',
        'Luego haces un partidazo, lo que convierte el chiste en excelente a posteriori.'),
      A('formal', 'The club and I reached an agreement we are both happy with', 'El club y yo llegamos a un acuerdo con el que ambos estamos contentos',
        'Airless and perfect. Nobody can do anything with it.',
        'Sin aire y perfecto. Nadie puede hacer nada con eso.'),
    ],
  },
];

// ============================ how the room reacts ============================
// Shared per tone, so the same answer to the same question does not always end
// the same way. This is where the actual gamble in each tone lives.

export interface PressReaction {
  id: string;
  tone: PressTone;
  weight: number;
  en: string; es: string;
  effects: PlayerEffects;
}

const R = (
  id: string, tone: PressTone, weight: number, en: string, es: string, effects: PlayerEffects,
): PressReaction => ({ id, tone, weight, en, es, effects });

export const PRESS_REACTIONS: PressReaction[] = [
  // ---- arrogant: buys fame, costs goodwill, occasionally costs money ----
  R('arr-headline', 'arrogant', 1.2,
    'It is the headline on every back page in the country. Your agent calls it the best day of the month.',
    'Es el titular de todas las contraportadas del país. Tu representante lo llama el mejor día del mes.',
    { reputation: 9, morale: 4, idol: 2 }),
  R('arr-fine', 'arrogant', 0.9,
    'The club fines you for it before the week is out. They put out a statement you did not write.',
    'El club te multa antes de que acabe la semana. Sacan un comunicado que no escribiste tú.',
    { reputation: 6, money: -280_000, discipline: -8 }),
  R('arr-fuel', 'arrogant', 1,
    'Somebody pins it up in the opposition dressing room. You play the next month like a man being chased.',
    'Alguien lo cuelga en el vestuario rival. Juegas el mes siguiente como quien va perseguido.',
    { form: 8, reputation: 5, morale: -2 }),
  R('arr-room', 'arrogant', 0.9,
    'Two of your own teammates are asked about it and neither defends you. That gets back to you as well.',
    'Preguntan a dos compañeros tuyos y ninguno te defiende. Eso también te llega.',
    { reputation: 5, morale: -8, idol: -4 }),
  R('arr-icon', 'arrogant', 0.7,
    'A section of your own support decides on the spot that this is exactly what they wanted from a player.',
    'Una parte de tu afición decide en ese momento que esto es exactamente lo que querían de un jugador.',
    { idol: 9, reputation: 6, discipline: -3 }),
  R('arr-backfire', 'arrogant', 0.8,
    'You lose the next match and every single person who saw the clip makes sure you know about it.',
    'Pierdes el siguiente partido y absolutamente todos los que vieron el vídeo se aseguran de que lo sepas.',
    { reputation: -4, morale: -7, form: -4 }),

  // ---- humble: buys the terraces, occasionally reads as soft ----
  R('hum-terraces', 'humble', 1.2,
    'It goes round the supporters\' forums within an hour and not one person has a bad word about it.',
    'Da la vuelta a los foros de la afición en una hora y nadie tiene una mala palabra.',
    { idol: 8, reputation: 4, morale: 4 }),
  R('hum-quiet', 'humble', 1,
    'Nobody uses a word of it. The only people who noticed were the ones already on your side.',
    'No usan ni una palabra. Los únicos que se fijaron ya estaban de tu lado.',
    { morale: 3, idol: 3 }),
  R('hum-staff', 'humble', 0.9,
    'The manager mentions it, unprompted, in his own press conference two days later.',
    'El entrenador lo menciona, sin que nadie pregunte, en su rueda de prensa dos días después.',
    { form: 5, morale: 5, attrs: { lea: 2 } }),
  R('hum-soft', 'humble', 0.8,
    'One pundit calls it a lack of belief. It is repeated enough times that you start hearing it in your own head.',
    'Un comentarista lo llama falta de confianza. Se repite lo suficiente como para que empieces a oírlo tú mismo.',
    { morale: -6, form: -3, reputation: -2 }),
  R('hum-classy', 'humble', 0.9,
    'It ends up in one of those end-of-year lists of the things people actually said well.',
    'Acaba en una de esas listas de fin de año con las cosas que alguien dijo bien.',
    { reputation: 8, idol: 5, discipline: 3 }),
  R('hum-family', 'humble', 0.7,
    'Somebody in your family sees it and rings you about it. That is the part you remember.',
    'Alguien de tu familia lo ve y te llama por eso. Esa es la parte que recuerdas.',
    { morale: 9, form: 2 }),

  // ---- funny: buys affection, occasionally lands badly ----
  R('fun-clip', 'funny', 1.2,
    'The clip does numbers nothing you have done on a pitch has ever done.',
    'El vídeo hace unos números que no ha hecho nada de lo que has hecho en un campo.',
    { reputation: 9, morale: 6 }),
  R('fun-room', 'funny', 1,
    'Your teammates will not let it go for a month. It is the best the dressing room has felt all season.',
    'Tus compañeros no lo sueltan en un mes. Es lo mejor que ha estado el vestuario en toda la temporada.',
    { morale: 8, idol: 4, form: 3 }),
  R('fun-misread', 'funny', 0.9,
    'It is written up without the tone and reads as contempt. You spend two days explaining a joke.',
    'Lo transcriben sin el tono y suena a desprecio. Te pasas dos días explicando un chiste.',
    { reputation: -5, morale: -4, discipline: -3 }),
  R('fun-manager', 'funny', 0.8,
    'The manager did not find it funny. He tells you so, at length, on Monday morning.',
    'Al entrenador no le hizo gracia. Te lo dice, largamente, el lunes por la mañana.',
    { morale: -5, form: -3, discipline: -4 }),
  R('fun-national', 'funny', 0.8,
    'A late-night programme uses it in the opening titles for the rest of the season.',
    'Un programa nocturno lo usa en la cabecera el resto de la temporada.',
    { reputation: 11, morale: 4, idol: 2 }),
  R('fun-defuse', 'funny', 1,
    'Whatever the story was going to be, it is not a story any more. That was worth more than it looked.',
    'Fuera lo que fuera a ser la noticia, ya no es noticia. Eso valía más de lo que parecía.',
    { reputation: 4, morale: 5, discipline: 2 }),

  // ---- formal: safe, small, occasionally invisible ----
  R('for-nothing', 'formal', 1.3,
    'It is not reported anywhere. That was the entire objective and it worked perfectly.',
    'No lo publica nadie. Ese era todo el objetivo y funcionó perfectamente.',
    { discipline: 5, morale: 2 }),
  R('for-respect', 'formal', 1,
    'The senior players notice how you handled it. One of them says so on the bus.',
    'Los veteranos se fijan en cómo lo llevaste. Uno te lo dice en el autobús.',
    { attrs: { lea: 3 }, discipline: 4, morale: 3 }),
  R('for-dull', 'formal', 1,
    'A columnist uses you as an example of how boring modern players have become. It is a long column and it names you eleven times.',
    'Un columnista te usa como ejemplo de lo aburridos que se han vuelto los futbolistas. Es una columna larga y te nombra once veces.',
    { reputation: -7, morale: -3 }),
  R('for-cold', 'formal', 0.9,
    'Your own supporters read it as a man with one foot out of the door. The song they had for you gets quieter for a month.',
    'Tu propia afición lo lee como el de alguien con un pie fuera. La canción que te tenían suena más floja durante un mes.',
    { idol: -7, morale: -4 }),
  R('for-missed', 'formal', 0.8,
    'It was the moment to say something and you said nothing. You think about it, on and off, for a very long time.',
    'Era el momento de decir algo y no dijiste nada. Le das vueltas, a ratos, durante muchísimo tiempo.',
    { reputation: -3, morale: -6, form: -2 }),
  R('for-club', 'formal', 0.9,
    'The communications department is visibly relieved. That relief becomes goodwill you can spend later.',
    'El departamento de comunicación respira. Ese alivio se convierte en crédito que puedes gastar después.',
    { discipline: 6, reputation: 2, morale: 2 }),
  R('for-trust', 'formal', 0.8,
    'You are asked to do the difficult interviews from now on. It is a compliment shaped like extra work.',
    'A partir de ahora te mandan a ti las entrevistas difíciles. Es un halago con forma de trabajo extra.',
    { attrs: { lea: 3 }, reputation: 4, stamina: -3 }),
  R('for-flat', 'formal', 0.9,
    'Nobody remembers a syllable of it, including you, within about four days.',
    'Nadie recuerda ni una sílaba, tú tampoco, en unos cuatro días.',
    { discipline: 3 }),
];

/** Draw the room's reaction to a tone. */
export function pickReaction(tone: PressTone, rng: Rng): PressReaction {
  const pool = PRESS_REACTIONS.filter(r => r.tone === tone);
  const total = pool.reduce((a, r) => a + r.weight, 0);
  let x = rng.next() * total;
  for (const r of pool) { x -= r.weight; if (x <= 0) return r; }
  return pool[pool.length - 1];
}

// ---- building one ----------------------------------------------------------

export interface PressConference {
  situation: PressSituation;
  question: PressQuestion;
  askEn: string; askEs: string;
  /** filled at build time so the question cannot change under the player */
  rivalId: string | null;
  chosen: PressAnswer | null;
  reaction: PressReaction | null;
}

/**
 * Pick a question that fits the moment.
 *
 * Questions already asked this career are skipped where possible, so a
 * twenty-year career does not hear the same four questions every summer. If the
 * pool is exhausted the filter is dropped rather than returning nothing.
 */
export function buildPressConference(c: PressCtx, rng: Rng): PressConference | null {
  const forSituation = PRESS_QUESTIONS.filter(
    q => q.situation === c.situation && (!q.when || q.when(c)));
  if (!forSituation.length) return null;

  const unheard = forSituation.filter(q => !c.p.flags?.[`press:${q.id}`]);
  const pool = unheard.length ? unheard : forSituation;
  const question = pool[rng.int(pool.length)];
  const [askEn, askEs] = [question.askEn, question.askEs];

  return {
    situation: c.situation,
    question,
    askEn, askEs,
    rivalId: c.rivalId,
    chosen: null,
    reaction: null,
  };
}

/** Answer, and find out what the room did with it. */
export function answerPress(
  p: CareerPlayer, conf: PressConference, tone: PressTone, rng: Rng,
): { player: CareerPlayer; answer: PressAnswer; reaction: PressReaction } {
  const answer = conf.question.answers.find(a => a.tone === tone)!;
  const reaction = pickReaction(tone, rng);
  const flags = { ...p.flags, [`press:${conf.question.id}`]: true };
  return {
    player: { ...applyEffects(p, reaction.effects), flags },
    answer,
    reaction,
  };
}

// ---- copy ------------------------------------------------------------------

/** Fill {C} {R} {D} {N} {P} {G} {A} {Y} {T}. */
export function fillPressCopy(s: string, c: PressCtx, lang: Lang): string {
  const es = lang === 'es';
  const p = c.p;
  const club = p.clubId ? getClub(p.clubId) : null;
  const rival = c.rivalId ? getClub(c.rivalId) : null;
  const derby = p.clubId && c.rivalId ? derbyBetween(p.clubId, c.rivalId) : null;
  const nation = getNation(p.ntNationCode);
  return s
    .replace(/\{C\}/g, club?.name ?? '')
    .replace(/\{R\}/g, rival?.name ?? (es ? 'ellos' : 'them'))
    .replace(/\{D\}/g, derby ? (es ? derby.es : derby.en) : (es ? 'el clásico' : 'the derby'))
    .replace(/\{N\}/g, (es ? nation?.es : nation?.en) ?? '')
    .replace(/\{P\}/g, p.surname)
    .replace(/\{G\}/g, String(p.goals))
    .replace(/\{A\}/g, String(p.age))
    .replace(/\{Y\}/g, String(Math.max(1, c.tenure)))
    .replace(/\{T\}/g, String(c.trophies.length));
}

export const pressQuestionText = (q: PressQuestion, lang: Lang) => (lang === 'es' ? q.qEs : q.qEn);
export const pressAsker = (conf: PressConference, lang: Lang) => (lang === 'es' ? conf.askEs : conf.askEn);
export const pressAnswerText = (a: PressAnswer, lang: Lang) => (lang === 'es' ? a.es : a.en);
export const pressAnswerOutcome = (a: PressAnswer, lang: Lang) => (lang === 'es' ? a.outcomeEs : a.outcomeEn);
export const pressReactionText = (r: PressReaction, lang: Lang) => (lang === 'es' ? r.es : r.en);
export const toneLabel = (t: PressTone, lang: Lang) => TONE_LABEL[t][lang === 'es' ? 1 : 0];

export const SITUATION_LABEL: Record<PressSituation, [string, string]> = {
  preseason: ['Preseason media day', 'Día de medios de pretemporada'],
  'derby-week': ['Derby week', 'Semana de clásico'],
  award: ['After the award', 'Tras el premio'],
  title: ['After winning it', 'Tras ganarlo'],
  'final-lost': ['After the final', 'Tras la final'],
  transfer: ['Your presentation', 'Tu presentación'],
  record: ['After the record', 'Tras el récord'],
  international: ['With the national team', 'Con la selección'],
  slump: ['A difficult week', 'Una semana difícil'],
  veteran: ['The long view', 'La mirada larga'],
  contract: ['After the new contract', 'Tras la renovación'],
};

export const situationLabel = (s: PressSituation, lang: Lang) =>
  SITUATION_LABEL[s][lang === 'es' ? 1 : 0];
