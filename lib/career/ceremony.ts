// The nights that are only ever announced.
//
// Two things happened in this game without anybody noticing them happen: the
// first international call-up, which arrived as a row in a panel, and breaking
// a club or country record, which arrived as one line in a ticker. Both are the
// kind of thing a player remembers for the rest of his life, and both went past
// in a second.
//
// A ceremony is the announcement — a flag or a crest, a headline — followed by
// one decision drawn from a pool of what happens to you *afterwards*: the
// journalist with the question, the sponsor with the offer, the family who all
// want tickets. The events are the point; the animation is just the door.
import type { CareerPlayer } from '@/data/career/types';
import type { Rng } from './rng';
import type { Lang } from './i18n';
import { clamp } from './rng';
import { getClub } from '@/data/career/clubs';
import { getNation } from '@/data/career/nations';
import type { Attrs } from '@/data/career/types';

export type CeremonyKind = 'first-callup' | 'record';

export interface CeremonyEffects {
  reputation?: number;
  morale?: number;
  form?: number;
  money?: number;
  stamina?: number;
  discipline?: number;
  idol?: number;
  attrs?: Partial<Attrs>;
}

export interface CeremonyOption {
  id: string;
  en: string; es: string;
  outcomeEn: string; outcomeEs: string;
  effects: CeremonyEffects;
}

export interface CeremonyEvent {
  id: string;
  /** 'both' events fit either occasion */
  fits: CeremonyKind | 'both';
  titleEn: string; titleEs: string;
  descEn: string; descEs: string;
  options: CeremonyOption[];
}

export interface Ceremony {
  kind: CeremonyKind;
  nationCode?: string;
  clubId?: string;
  /** the big line under the flag */
  headlineEn: string; headlineEs: string;
  subEn: string; subEs: string;
  event: CeremonyEvent;
  chosen: CeremonyOption | null;
}

const O = (
  id: string, en: string, es: string, outcomeEn: string, outcomeEs: string,
  effects: CeremonyEffects,
): CeremonyOption => ({ id, en, es, outcomeEn, outcomeEs, effects });

// ---- the pool ----------------------------------------------------------------
// Twenty-two of them. Every one costs something or risks something: an event
// where every branch is an upgrade is a menu, not a decision.

export const CEREMONY_EVENTS: CeremonyEvent[] = [
  {
    id: 'the-question', fits: 'both',
    titleEn: 'The question', titleEs: 'La pregunta',
    descEn: 'A journalist who has been covering this for thirty years asks whether you ever doubted you would get here.',
    descEs: 'Un periodista que lleva treinta años cubriendo esto te pregunta si alguna vez dudaste de que llegarías.',
    options: [
      O('honest', 'Tell him you doubted it constantly', 'Decirle que dudaste todo el tiempo',
        'You say it plainly and the room goes quiet. It is the most-shared clip of the week and half the messages you get are from people who needed to hear it.',
        'Lo dices sin adornos y la sala se calla. Es el vídeo más compartido de la semana y la mitad de los mensajes que recibes son de gente que necesitaba oírlo.',
        { reputation: 6, morale: 5 }),
      O('never', 'Tell him you always knew', 'Decirle que siempre lo supiste',
        'It reads as arrogance in print, which is not how it sounded. Two pundits use it all season.',
        'En papel suena a arrogancia, que no es como sonó. Dos comentaristas lo usan toda la temporada.',
        { reputation: 3, morale: -3, discipline: -2 }),
      O('deflect', 'Talk about your family instead', 'Hablar de tu familia',
        'A safe answer nobody prints. Your mother has it framed.',
        'Una respuesta segura que nadie publica. Tu madre la tiene enmarcada.',
        { morale: 7 }),
    ],
  },
  {
    id: 'the-tickets', fits: 'both',
    titleEn: 'Everybody wants to be there', titleEs: 'Todos quieren estar',
    descEn: 'Your phone has not stopped. Cousins you have not seen since school, a teacher, two agents. You have four tickets.',
    descEs: 'El teléfono no para. Primos que no ves desde el colegio, un profesor, dos representantes. Tienes cuatro entradas.',
    options: [
      O('family', 'Family only, and nobody argues', 'Solo familia, y no se discute',
        'Four seats, four people who were there when it was not going well. The rest get over it.',
        'Cuatro asientos, cuatro personas que estaban cuando no iba bien. Los demás lo superan.',
        { morale: 8 }),
      O('coach', 'One goes to the coach who started you at nine', 'Una para el entrenador que te empezó a los nueve',
        'He cries in the stand and denies it afterwards. The photograph goes round your whole home town.',
        'Llora en la grada y luego lo niega. La foto da la vuelta a tu pueblo entero.',
        { morale: 6, reputation: 4, idol: 3 }),
      O('buy', 'Buy out a whole block, sort it later', 'Comprar un bloque entero y ya verás',
        'Sixty people, an enormous bill and a night nobody in your family will shut up about.',
        'Sesenta personas, una factura enorme y una noche de la que tu familia no va a callarse nunca.',
        { money: -180_000, morale: 10, reputation: 2 }),
    ],
  },
  {
    id: 'boot-offer', fits: 'both',
    titleEn: 'A brand calls the same night', titleEs: 'Una marca llama esa misma noche',
    descEn: 'They want you before anybody else does, and they are offering serious money for a four-year deal.',
    descEs: 'Te quieren antes que nadie, y ofrecen dinero serio por cuatro años.',
    options: [
      O('sign', 'Sign it tonight', 'Firmar esta noche',
        'The money is real and immediate. So is the shoot schedule that eats your next three summers.',
        'El dinero es real e inmediato. También el calendario de rodajes que se come tus tres próximos veranos.',
        { money: 2_400_000, stamina: -8, reputation: 5 }),
      O('wait', 'Wait and see what you are worth in a year', 'Esperar a ver cuánto vales en un año',
        'Your agent is furious. Twelve months later the same brand comes back with more.',
        'Tu representante está furioso. Doce meses después la misma marca vuelve con más.',
        { money: 400_000, morale: -2 }),
      O('local', 'Sign with the small local maker instead', 'Firmar con la marca pequeña de tu ciudad',
        'A fraction of the money and a factory of eighty people who now make your boots by name.',
        'Una fracción del dinero y una fábrica de ochenta personas que ahora hacen tus botas con tu nombre.',
        { money: 300_000, idol: 5, reputation: 3, morale: 4 }),
    ],
  },
  {
    id: 'the-shirt', fits: 'first-callup',
    titleEn: 'They hand you the shirt', titleEs: 'Te dan la camiseta',
    descEn: 'A kitman with forty years in the job holds it out and asks what you want on the back.',
    descEs: 'Un utillero con cuarenta años en el oficio te la ofrece y pregunta qué quieres en la espalda.',
    options: [
      O('surname', 'Your surname, like everybody else', 'Tu apellido, como todos',
        'The ordinary choice, and the one you never regret. It is the name on the wall at home.',
        'La elección normal, y la que nunca lamentas. Es el nombre que está en la pared de tu casa.',
        { morale: 5 }),
      O('mother', "Your mother's surname", 'El apellido de tu madre',
        'Nobody asks about it for two years and then everybody does. She never once mentions it to you directly.',
        'Nadie pregunta durante dos años y luego preguntan todos. Ella no te lo menciona ni una sola vez.',
        { morale: 9, reputation: 3 }),
      O('nickname', 'The nickname from the street', 'El apodo del barrio',
        'Half the country finds it funny and the other half finds it disrespectful. It sticks either way.',
        'A medio país le hace gracia y al otro medio le parece una falta de respeto. Se queda igual.',
        { reputation: 5, discipline: -3, morale: 3 }),
    ],
  },
  {
    id: 'the-anthem', fits: 'first-callup',
    titleEn: 'The anthem', titleEs: 'El himno',
    descEn: 'You are told the cameras hold on the line for the whole thing. Somebody asks, half joking, whether you know the words.',
    descEs: 'Te avisan de que las cámaras aguantan sobre la fila todo el himno. Alguien pregunta, medio en broma, si te sabes la letra.',
    options: [
      O('learn', 'Spend the night learning every word', 'Pasarte la noche aprendiéndotela entera',
        'You sing all of it, badly, with your eyes shut. It is the picture they use for the next decade.',
        'La cantas entera, mal, con los ojos cerrados. Es la foto que usan la década siguiente.',
        { reputation: 5, morale: 6 }),
      O('mouth', 'Mouth along and hope', 'Mover los labios y confiar',
        'Somebody on television notices. It is a small story for a small week and it never fully goes away.',
        'Alguien en televisión se da cuenta. Es una historia pequeña de una semana pequeña, y nunca desaparece del todo.',
        { reputation: -3, morale: -2 }),
      O('silent', 'Stand still and say nothing', 'Quedarte quieto y no decir nada',
        'You explain, once, that you were trying not to cry. Nobody asks again.',
        'Explicas, una vez, que intentabas no llorar. Nadie te vuelve a preguntar.',
        { morale: 4, reputation: 2 }),
    ],
  },
  {
    id: 'the-veteran', fits: 'first-callup',
    titleEn: 'The captain finds you', titleEs: 'El capitán te busca',
    descEn: 'A hundred-cap veteran sits down next to you at dinner and says the first one is the only one you get to be nervous for.',
    descEs: 'Un veterano de cien partidos se sienta contigo en la cena y te dice que el primero es el único en el que puedes estar nervioso.',
    options: [
      O('listen', 'Ask him everything', 'Preguntarle todo',
        'Two hours. You use about four sentences of it for the next fifteen years.',
        'Dos horas. Usas unas cuatro frases de eso durante los siguientes quince años.',
        { attrs: { lea: 3, vis: 2 }, morale: 5 }),
      O('quiet', 'Nod and keep to yourself', 'Asentir y quedarte en lo tuyo',
        'You get through the week without saying much. Nobody holds it against you and nobody remembers you either.',
        'Pasas la semana sin decir gran cosa. Nadie te lo reprocha y tampoco nadie se acuerda de ti.',
        { form: 4, morale: -3 }),
      O('joke', 'Tell him you are not nervous at all', 'Decirle que no estás nervioso para nada',
        'He laughs at you, kindly, and tells the story at your testimonial twenty years later.',
        'Se ríe de ti, con cariño, y cuenta la anécdota en tu homenaje veinte años después.',
        { morale: 6, reputation: 2 }),
    ],
  },
  {
    id: 'hometown', fits: 'both',
    titleEn: 'Your home town wants to do something', titleEs: 'Tu pueblo quiere hacer algo',
    descEn: 'The mayor rings. They want to put your name on the municipal pitch you grew up on.',
    descEs: 'Llama el alcalde. Quieren ponerle tu nombre al campo municipal donde te criaste.',
    options: [
      O('accept', 'Accept, and go to the unveiling', 'Aceptar e ir a la inauguración',
        'Four hundred people on a Tuesday morning. You sign everything anybody puts in front of you.',
        'Cuatrocientas personas un martes por la mañana. Firmas todo lo que te pongan delante.',
        { reputation: 5, morale: 7 }),
      O('pay', 'Accept, and quietly pay for a new surface', 'Aceptar y pagar en silencio el césped nuevo',
        'It costs a lot and never makes the papers. The kids who play on it have no idea.',
        'Cuesta mucho y no sale en ningún periódico. Los chavales que juegan ahí no tienen ni idea.',
        { money: -350_000, morale: 9, reputation: 3 }),
      O('decline', 'Ask them not to, not yet', 'Pedirles que no, todavía no',
        'You tell them to wait until you have actually done something. They wait. It reads well.',
        'Les dices que esperen a que hayas hecho algo de verdad. Esperan. Queda bien.',
        { reputation: 4, morale: -2 }),
    ],
  },
  {
    id: 'old-friend', fits: 'both',
    titleEn: 'The one who did not make it', titleEs: 'El que no llegó',
    descEn: 'The best player in your youth team was not you. He messages to congratulate you and you have not spoken in six years.',
    descEs: 'El mejor de tu equipo juvenil no eras tú. Te escribe para felicitarte y no habláis desde hace seis años.',
    options: [
      O('call', 'Call him instead of replying', 'Llamarle en vez de contestar',
        'You talk for an hour about nothing. He comes to games for the rest of your career.',
        'Habláis una hora de nada. Va a verte jugar el resto de tu carrera.',
        { morale: 9, attrs: { lea: 2 } }),
      O('job', 'Offer him something — anything', 'Ofrecerle algo, lo que sea',
        'He takes it, then quits in four months because it was charity and both of you knew it.',
        'Lo acepta, y lo deja a los cuatro meses porque era caridad y los dos lo sabíais.',
        { money: -120_000, morale: -3 }),
      O('reply', 'Send a nice message and leave it there', 'Mandarle un mensaje amable y dejarlo ahí',
        'It is the honest amount of contact for what you are to each other now. It still sits badly.',
        'Es la cantidad honesta de contacto para lo que sois ahora. Aun así se te queda mal cuerpo.',
        { morale: -4, form: 3 }),
    ],
  },
  {
    id: 'the-agent', fits: 'both',
    titleEn: 'Your agent has plans', titleEs: 'Tu representante tiene planes',
    descEn: 'He wants to use this. A bigger club, a renegotiation, a move he has been setting up for a year.',
    descEs: 'Quiere aprovecharlo. Un club más grande, una renegociación, una operación que lleva un año preparando.',
    options: [
      O('push', 'Let him push', 'Dejarle apretar',
        'The new terms are much better. The dressing room hears about it before you tell them.',
        'Las condiciones nuevas son mucho mejores. El vestuario se entera antes de que se lo cuentes.',
        { money: 900_000, idol: -4, morale: 3 }),
      O('hold', 'Tell him to leave it for a season', 'Decirle que lo deje una temporada',
        'You play the year without the noise. It is the best football you have played.',
        'Juegas el año sin ruido. Es el mejor fútbol que has jugado.',
        { form: 9, idol: 4 }),
      O('fire', 'Get a new agent', 'Cambiar de representante',
        'Six weeks of paperwork and a bill. The new one is better and you should have done it earlier.',
        'Seis semanas de papeleo y una factura. El nuevo es mejor y deberías haberlo hecho antes.',
        { money: -400_000, reputation: 2, morale: -3 }),
    ],
  },
  {
    id: 'the-doubters', fits: 'both',
    titleEn: 'The pundit who wrote you off', titleEs: 'El comentarista que te enterró',
    descEn: 'Two years ago he said, on air, that you were not good enough. He is in the room tonight and he wants a word.',
    descEs: 'Hace dos años dijo en directo que no dabas el nivel. Está en la sala esta noche y quiere hablar contigo.',
    options: [
      O('gracious', 'Shake his hand and say nothing about it', 'Darle la mano y no mencionarlo',
        'He brings it up himself, publicly, a week later. You come out of it far better than he does.',
        'Lo saca él mismo, en público, una semana después. Sales mucho mejor parado que él.',
        { reputation: 7, morale: 4 }),
      O('remind', 'Remind him, word for word', 'Recordárselo, palabra por palabra',
        'Deeply satisfying for about four hours. He spends the next four years looking for reasons.',
        'Enormemente satisfactorio durante unas cuatro horas. Él se pasa los cuatro años siguientes buscando motivos.',
        { morale: 8, reputation: -5 }),
      O('avoid', 'Walk past him', 'Pasar de largo',
        'Nothing happens. You think about it more than he does.',
        'No pasa nada. Tú le das más vueltas que él.',
        { morale: -2 }),
    ],
  },
  {
    id: 'sleep', fits: 'both',
    titleEn: 'You cannot sleep', titleEs: 'No puedes dormir',
    descEn: 'It is four in the morning and you have training at nine.',
    descEs: 'Son las cuatro de la mañana y entrenas a las nueve.',
    options: [
      O('walk', 'Go for a walk', 'Salir a caminar',
        'Two hours around a city that is asleep. You arrive at training wrecked and playing beautifully.',
        'Dos horas por una ciudad dormida. Llegas al entrenamiento destrozado y jugando de maravilla.',
        { stamina: -6, form: 7, morale: 4 }),
      O('film', 'Watch it back on your phone until it stops feeling real', 'Verlo una y otra vez hasta que deje de parecer real',
        'You have the clip memorised by dawn. You are useless all day.',
        'Te sabes el vídeo de memoria al amanecer. Estás inútil todo el día.',
        { stamina: -8, morale: 6, form: -3 }),
      O('pill', 'Take something and force it', 'Tomarte algo y forzarlo',
        'You sleep. You are groggy for two days and the doctor is not impressed.',
        'Duermes. Estás atontado dos días y al médico no le hace gracia.',
        { stamina: 4, form: -5 }),
    ],
  },
  {
    id: 'charity-call', fits: 'both',
    titleEn: 'A hospital asks for an afternoon', titleEs: 'Un hospital te pide una tarde',
    descEn: "A children's ward has been asking your club for months. Today they finally got a yes from somebody.",
    descEs: 'Una planta infantil lleva meses pidiéndoselo al club. Hoy por fin alguien les dijo que sí.',
    options: [
      O('go', 'Go, no cameras', 'Ir, sin cámaras',
        'Nobody outside that building ever knows. You go back eleven more times over your career.',
        'Nadie fuera de ese edificio se entera nunca. Vuelves once veces más a lo largo de tu carrera.',
        { morale: 10, idol: 3 }),
      O('cameras', 'Go, with the club photographer', 'Ir, con el fotógrafo del club',
        'It does enormous good for the ward and a little good for you, and you are not sure how to feel about the second part.',
        'Le hace muchísimo bien a la planta y un poco de bien a ti, y no sabes bien cómo sentirte con lo segundo.',
        { reputation: 6, morale: 4, idol: 2 }),
      O('money', 'Send money instead', 'Mandar dinero en su lugar',
        'More useful to them than an afternoon, and it costs you nothing you will miss.',
        'Les sirve más que una tarde, y no te cuesta nada que vayas a echar de menos.',
        { money: -250_000, morale: 2 }),
    ],
  },
  {
    id: 'the-rival-callup', fits: 'first-callup',
    titleEn: 'Somebody lost their place for you', titleEs: 'Alguien perdió su sitio por ti',
    descEn: 'A player with thirty caps was left out to fit you in. He is in the same hotel.',
    descEs: 'Dejaron fuera a un jugador con treinta partidos para meterte a ti. Está en el mismo hotel.',
    options: [
      O('speak', 'Knock on his door', 'Llamar a su puerta',
        'Awkward for ninety seconds and fine after that. He is the first to congratulate you when you debut.',
        'Incómodo noventa segundos y bien después. Es el primero en felicitarte cuando debutas.',
        { attrs: { lea: 3 }, morale: 4 }),
      O('nothing', 'Say nothing — it is not your decision', 'No decir nada, no es decisión tuya',
        'True, and it does not help. You avoid the same lift for a week.',
        'Es cierto, y no ayuda. Evitas el mismo ascensor durante una semana.',
        { morale: -3, form: 2 }),
      O('press', 'Say publicly that he should have been picked', 'Decir en público que debía estar él',
        'The manager does not enjoy reading it. The dressing room notices that you said it.',
        'Al seleccionador no le gusta leerlo. El vestuario se fija en que lo dijiste.',
        { reputation: 3, morale: 3, form: -4 }),
    ],
  },
  {
    id: 'record-holder', fits: 'record',
    titleEn: 'The man whose record it was', titleEs: 'El hombre del que era el récord',
    descEn: 'He held it for longer than you have been alive. He is at the ground, and he has asked to see you.',
    descEs: 'Lo tuvo más años de los que tú llevas vivo. Está en el estadio y ha pedido verte.',
    options: [
      O('respect', 'Give him the match ball, signed', 'Darle el balón del partido, firmado',
        'He keeps it on a shelf and tells the story at every dinner for the rest of his life.',
        'Lo guarda en una estantería y cuenta la historia en cada cena el resto de su vida.',
        { reputation: 6, idol: 5, morale: 5 }),
      O('ask', 'Ask him how long he thinks yours will last', 'Preguntarle cuánto cree que durará el tuyo',
        'He says eight years. He is nearly right, and neither of you finds that funny at the time.',
        'Dice ocho años. Casi acierta, y en ese momento a ninguno de los dos le hace gracia.',
        { morale: 3, attrs: { lea: 2 } }),
      O('brief', 'Handshake and back to the dressing room', 'Un apretón de manos y al vestuario',
        'It is fine. He tells a journalist you seemed like you were in a hurry.',
        'Está bien. Le dice a un periodista que parecías tener prisa.',
        { reputation: -3, form: 3 }),
    ],
  },
  {
    id: 'record-shirt', fits: 'record',
    titleEn: 'They want the shirt for the museum', titleEs: 'Quieren la camiseta para el museo',
    descEn: 'The club asks for the one you were wearing. So does a collector, and he has brought a number.',
    descEs: 'El club te pide la que llevabas puesta. Un coleccionista también, y ha traído una cifra.',
    options: [
      O('museum', 'The museum gets it', 'Que se la quede el museo',
        'It is behind glass within a month, with a card that has your name and the date on it.',
        'Está tras un cristal en un mes, con una cartela con tu nombre y la fecha.',
        { idol: 7, reputation: 4 }),
      O('sell', 'Take the collector\'s number', 'Aceptar la cifra del coleccionista',
        'A great deal of money for a piece of cloth. The club never asks you for anything again.',
        'Muchísimo dinero por un trozo de tela. El club no vuelve a pedirte nada nunca.',
        { money: 700_000, idol: -8 }),
      O('keep', 'Keep it', 'Quedártela',
        'It is in a drawer at your parents\' house, unwashed, exactly where you left it.',
        'Está en un cajón de casa de tus padres, sin lavar, exactamente donde la dejaste.',
        { morale: 8 }),
    ],
  },
  {
    id: 'record-doubt', fits: 'record',
    titleEn: 'Somebody does the maths differently', titleEs: 'Alguien hace la cuenta de otra manera',
    descEn: 'A historian argues in print that two of those do not count, and that the record is not yours yet.',
    descEs: 'Un historiador argumenta por escrito que dos de esos no cuentan, y que el récord todavía no es tuyo.',
    options: [
      O('ignore', 'Say nothing and score again', 'No decir nada y volver a hacerlo',
        'Two months later the argument is academic. You never mention him.',
        'Dos meses después la discusión es académica. No lo mencionas nunca.',
        { form: 8, reputation: 4 }),
      O('argue', 'Argue back, in detail', 'Responderle, con detalle',
        'You are correct and it makes you look small. That is usually how it goes.',
        'Tienes razón y quedas mal. Suele funcionar así.',
        { reputation: -4, morale: -3 }),
      O('concede', 'Agree with him publicly', 'Darle la razón en público',
        'Nobody expected that. It becomes the thing people liked most about the whole business.',
        'Nadie se lo esperaba. Acaba siendo lo que más le gustó a la gente de todo el asunto.',
        { reputation: 8, morale: -2 }),
    ],
  },
  {
    id: 'record-party', fits: 'record',
    titleEn: 'The dressing room wants a night out', titleEs: 'El vestuario quiere salir',
    descEn: 'Everybody is going. There is a game in four days.',
    descEs: 'Van todos. Hay partido en cuatro días.',
    options: [
      O('go', 'Go, and stay late', 'Ir y quedarte hasta tarde',
        'The best night of the season and the worst training week of it.',
        'La mejor noche de la temporada y la peor semana de entrenamientos.',
        { morale: 10, idol: 4, stamina: -12, form: -4 }),
      O('brief', 'Show your face for an hour', 'Aparecer una hora',
        'Long enough that nobody says anything, short enough that you are fine on Saturday.',
        'Lo bastante para que nadie diga nada, lo bastante poco para llegar bien al sábado.',
        { morale: 5, idol: 2, stamina: -3 }),
      O('skip', 'Skip it entirely', 'No ir',
        'You are the sharpest man on the pitch at the weekend. Two of them mention it, and not kindly.',
        'Eres el más enchufado del campo el fin de semana. Dos lo comentan, y no con cariño.',
        { form: 7, idol: -4 }),
    ],
  },
  {
    id: 'the-boot-room', fits: 'both',
    titleEn: 'The staff put something on your peg', titleEs: 'El cuerpo técnico te deja algo en la percha',
    descEn: 'A framed photograph, and a note from people whose names are not in any programme.',
    descEs: 'Una foto enmarcada y una nota de gente cuyos nombres no salen en ningún programa.',
    options: [
      O('thanks', 'Thank every one of them by name', 'Darles las gracias a cada uno por su nombre',
        'It takes twenty minutes and you get it slightly wrong twice. They talk about it for years.',
        'Tardas veinte minutos y te equivocas un par de veces. Lo comentan durante años.',
        { idol: 6, morale: 5, attrs: { lea: 2 } }),
      O('gift', 'Buy them all something expensive', 'Comprarles algo caro a todos',
        'Generous, appreciated, and slightly less meaningful than the twenty minutes would have been.',
        'Generoso, agradecido y un poco menos importante de lo que habrían sido veinte minutos.',
        { money: -200_000, idol: 3 }),
      O('quiet', 'Put it in your bag and say nothing', 'Guardártela en la bolsa y no decir nada',
        'It is on your wall for the next thirty years. They never find out how much it meant.',
        'Está en tu pared los treinta años siguientes. Ellos nunca se enteran de cuánto significó.',
        { morale: 6 }),
    ],
  },
  {
    id: 'the-superstition', fits: 'both',
    titleEn: 'Somebody suggests a superstition', titleEs: 'Alguien te propone una manía',
    descEn: 'Half the squad has one. You have never had one, and now feels like the moment to start.',
    descEs: 'La mitad de la plantilla tiene una. Tú nunca has tenido, y este parece el momento de empezar.',
    options: [
      O('adopt', 'Adopt one and never break it', 'Adoptar una y no romperla nunca',
        'Fifteen years of putting the left one on first. You know it is nothing. You do it anyway.',
        'Quince años poniéndote primero la izquierda. Sabes que no es nada. Lo haces igual.',
        { form: 5, morale: 4 }),
      O('refuse', 'Refuse — you are not that person', 'Negarte, tú no eres de esos',
        'A teammate calls you a robot, warmly. You take it as a compliment.',
        'Un compañero te llama robot, con cariño. Te lo tomas como un cumplido.',
        { attrs: { vis: 2 }, form: 2 }),
      O('mock', 'Invent an absurd one to wind them up', 'Inventarte una absurda para picarlos',
        'It gets out of hand within a month and you are stuck with it for a decade.',
        'Se te va de las manos en un mes y te la comes durante una década.',
        { morale: 6, idol: 3, form: -2 }),
    ],
  },
  {
    id: 'the-documentary', fits: 'both',
    titleEn: 'A crew wants to follow you', titleEs: 'Un equipo quiere seguirte',
    descEn: 'Full access for a season. They are offering money and they are very good at what they do.',
    descEs: 'Acceso total una temporada. Ofrecen dinero y son muy buenos en lo suyo.',
    options: [
      O('yes', 'Let them in', 'Dejarles entrar',
        'It is excellent television. Two teammates stop speaking to you for a while.',
        'Es una televisión excelente. Dos compañeros dejan de hablarte una temporada.',
        { money: 800_000, reputation: 8, idol: -5 }),
      O('limited', 'Match days only, nothing private', 'Solo días de partido, nada privado',
        'Less interesting and much less trouble. Everybody stays comfortable.',
        'Menos interesante y muchos menos problemas. Todos siguen cómodos.',
        { money: 300_000, reputation: 3 }),
      O('no', 'No', 'No',
        'They make it about somebody else. It is very good and you do not watch it.',
        'Lo hacen sobre otro. Queda muy bien y tú no lo ves.',
        { form: 4, morale: 2 }),
    ],
  },
  {
    id: 'the-tattoo', fits: 'both',
    titleEn: 'The date, permanently', titleEs: 'La fecha, para siempre',
    descEn: 'Somebody suggests marking it. You are twenty-two and it seems like an excellent idea at two in the morning.',
    descEs: 'Alguien propone marcarlo. Tienes veintidós y a las dos de la mañana parece una idea excelente.',
    options: [
      O('date', 'Just the date', 'Solo la fecha',
        'Small, on the inside of the arm. You are still happy with it at forty.',
        'Pequeña, en la cara interna del brazo. A los cuarenta te sigue gustando.',
        { morale: 6 }),
      O('big', 'The whole crest, across your back', 'El escudo entero, en la espalda',
        'Nine hours and a great deal of pain. When you leave that club it becomes a running joke.',
        'Nueve horas y muchísimo dolor. Cuando te vas de ese club se convierte en un chiste recurrente.',
        { idol: 6, morale: 4, money: -60_000 }),
      O('none', 'Go to bed', 'Irte a dormir',
        'The most sensible thing anybody did that night. Nobody is impressed.',
        'Lo más sensato que hizo nadie esa noche. No impresionas a nadie.',
        { stamina: 5, form: 2 }),
    ],
  },
  {
    id: 'the-return', fits: 'both',
    titleEn: 'Back at the club on Monday', titleEs: 'De vuelta al club el lunes',
    descEn: 'Everybody knows. Some of them are pleased for you and some of them are working out what it means for them.',
    descEs: 'Lo sabe todo el mundo. A algunos les alegra y otros están calculando qué significa para ellos.',
    options: [
      O('normal', 'Train exactly as you always do', 'Entrenar exactamente igual que siempre',
        'The staff notice, which is the only audience that matters that week.',
        'El cuerpo técnico se da cuenta, que es el único público que importa esa semana.',
        { form: 6, idol: 3 }),
      O('lead', 'Take charge of the session', 'Tomar el mando de la sesión',
        'Some of them love it. One senior player decides, permanently, that he does not.',
        'A algunos les encanta. Un veterano decide, para siempre, que a él no.',
        { attrs: { lea: 4 }, idol: 2, morale: -2 }),
      O('quiet', 'Keep your head down all week', 'Pasar la semana con la cabeza baja',
        'Nobody can accuse you of anything. Nobody notices you either.',
        'Nadie puede reprocharte nada. Tampoco nadie se fija en ti.',
        { form: 3, morale: 2 }),
    ],
  },
];

/** Draw an event that fits the occasion. */
export function pickCeremonyEvent(kind: CeremonyKind, rng: Rng): CeremonyEvent {
  const pool = CEREMONY_EVENTS.filter(e => e.fits === kind || e.fits === 'both');
  return pool[rng.int(pool.length)];
}

// ---- building one ------------------------------------------------------------

export function buildCallup(p: CareerPlayer, rng: Rng): Ceremony {
  const nation = getNation(p.ntNationCode);
  return {
    kind: 'first-callup',
    nationCode: p.ntNationCode,
    headlineEn: `You are in the ${nation?.en ?? ''} squad`,
    headlineEs: `Estás en la lista de ${nation?.es ?? ''}`,
    subEn: 'The first one. There is only ever one first one.',
    subEs: 'La primera. Primera solo hay una.',
    event: pickCeremonyEvent('first-callup', rng),
    chosen: null,
  };
}

export function buildRecordCeremony(
  p: CareerPlayer, o: { kind: string; clubId?: string; nationCode?: string; holder: string; n: number },
  rng: Rng,
): Ceremony {
  const club = o.clubId ? getClub(o.clubId) : null;
  const nation = o.nationCode ? getNation(o.nationCode) : null;
  const who = club?.name ?? (nation ? nation.en : '');
  const whoEs = club?.name ?? (nation ? nation.es : '');
  const goals = o.kind === 'club-goals' || o.kind === 'nation-goals';

  return {
    kind: 'record',
    clubId: o.clubId,
    nationCode: o.nationCode,
    headlineEn: goals ? `${who}'s all-time top scorer` : `${who}'s appearance record`,
    headlineEs: goals ? `Máximo goleador histórico de ${whoEs}` : `Récord de partidos de ${whoEs}`,
    subEn: `${o.n}. You passed ${o.holder}, and the board in the corridor has to be reprinted.`,
    subEs: `${o.n}. Superaste a ${o.holder}, y hay que reimprimir el panel del pasillo.`,
    event: pickCeremonyEvent('record', rng),
    chosen: null,
  };
}

// ---- applying ----------------------------------------------------------------

export function applyCeremony(p: CareerPlayer, opt: CeremonyOption, clubId: string | null): CareerPlayer {
  const e = opt.effects;
  const idolatry = { ...(p.idolatry ?? {}) };
  if (e.idol && clubId) {
    idolatry[clubId] = clamp(0, 100, (idolatry[clubId] ?? 0) + e.idol);
  }
  const attrs = { ...p.attrs };
  for (const [k, v] of Object.entries(e.attrs ?? {})) {
    attrs[k as keyof Attrs] = clamp(1, 99, attrs[k as keyof Attrs] + (v as number));
  }
  return {
    ...p,
    idolatry,
    attrs,
    reputation: clamp(0, 100, p.reputation + (e.reputation ?? 0)),
    morale: clamp(5, 100, p.morale + (e.morale ?? 0)),
    form: clamp(15, 99, p.form + (e.form ?? 0)),
    stamina: clamp(20, 100, (p.stamina ?? 70) + (e.stamina ?? 0)),
    discipline: clamp(0, 100, p.discipline + (e.discipline ?? 0)),
    money: Math.max(0, (p.money ?? 0) + (e.money ?? 0)),
  };
}

export const ceremonyHeadline = (c: Ceremony, lang: Lang) => (lang === 'es' ? c.headlineEs : c.headlineEn);
export const ceremonySub = (c: Ceremony, lang: Lang) => (lang === 'es' ? c.subEs : c.subEn);
export const eventTitle = (e: CeremonyEvent, lang: Lang) => (lang === 'es' ? e.titleEs : e.titleEn);
export const eventDesc = (e: CeremonyEvent, lang: Lang) => (lang === 'es' ? e.descEs : e.descEn);
export const ceremonyOptLabel = (o: CeremonyOption, lang: Lang) => (lang === 'es' ? o.es : o.en);
export const ceremonyOptOutcome = (o: CeremonyOption, lang: Lang) => (lang === 'es' ? o.outcomeEs : o.outcomeEn);

/** The chips shown after choosing, so the numbers are not silent. */
export function effectChips(e: CeremonyEffects, lang: Lang): { label: string; delta: number; money?: boolean }[] {
  const es = lang === 'es';
  const out: { label: string; delta: number; money?: boolean }[] = [];
  const add = (label: string, v?: number) => { if (v) out.push({ label, delta: v }); };
  add(es ? 'Fama' : 'Fame', e.reputation);
  add(es ? 'Ánimo' : 'Morale', e.morale);
  add(es ? 'Forma' : 'Form', e.form);
  add(es ? 'Resistencia' : 'Stamina', e.stamina);
  add(es ? 'Disciplina' : 'Discipline', e.discipline);
  add(es ? 'Idolatría' : 'Idolatry', e.idol);
  const L: Record<string, [string, string]> = {
    tec: ['Technique', 'Técnica'], pac: ['Pace', 'Velocidad'], phy: ['Physical', 'Físico'],
    vis: ['Vision', 'Visión'], lea: ['Leadership', 'Liderazgo'],
  };
  for (const [k, v] of Object.entries(e.attrs ?? {})) {
    if (v) out.push({ label: L[k][es ? 1 : 0], delta: v as number });
  }
  if (e.money) out.push({ label: es ? 'Dinero' : 'Money', delta: e.money, money: true });
  return out;
}
