// What the brands actually ask you to do.
//
// A sponsorship that only pays money is a number going up. These are the things
// that happen *around* the deal: the boot that splits in a semi-final, the
// colourway named after the town you grew up in, the rival brand that turns up
// with an obscene cheque while you are under contract, the tour of Japan that
// eats three weeks of your summer.
//
// Everything is gated on `when`. This is the part that has to be right: a squad
// player in the Argentine second division does not get flown to Tokyo, and a
// thirty-two-year-old at a mid-table club is not made the face of a World Cup.
// Where an event is only plausible for one kind of career, it is only offered to
// that kind of career.
//
// Copy carries placeholders rather than being rebuilt per player: {B} brand,
// {C} club, {N} your national team, {P} your surname, {H} your home country.
import type { CareerPlayer, Attrs } from '@/data/career/types';
import type { Brand, LifestyleCat } from '@/data/career/brands';
import { TIER_RANK } from '@/data/career/brands';
import { getClub } from '@/data/career/clubs';
import { getNation } from '@/data/career/nations';
import { Rng, clamp } from './rng';
import {
  DEAL_RANK, lifestyleFor, lifestyleMoney,
  type SponsorState, type BootOffer,
} from './sponsors';
import type { Lang } from './i18n';

export interface BrandEffects {
  reputation?: number;
  morale?: number;
  form?: number;
  money?: number;
  stamina?: number;
  discipline?: number;
  idol?: number;
  attrs?: Partial<Attrs>;
  /** how the brand feels about you afterwards */
  standing?: number;
  /** unlocks the boot with your name on it */
  signature?: boolean;
  /** permanent change to the guaranteed annual */
  annualPct?: number;
  /** the deal ends here */
  endDeal?: boolean;
  /** years added to the current deal */
  yearsDelta?: number;
  /** you pick up the lifestyle brand this event is about */
  takeLifestyle?: boolean;
}

export interface BrandOption {
  id: string;
  en: string; es: string;
  outcomeEn: string; outcomeEs: string;
  effects: BrandEffects;
}

export interface BrandCtx {
  p: CareerPlayer;
  /** marketability 0-100 */
  m: number;
  sp: SponsorState | null;
  brand: Brand | null;
  clubStrength: number;
  leagueTier: number;
  /** things that happened in the season just played */
  wonBallon: boolean;
  inTournament: boolean;
  wonBig: boolean;
  brokeRecord: boolean;
  apps: number;
  held: string[];
}

export interface BrandEventDef {
  id: string;
  family: 'boot' | 'lifestyle';
  /** lifestyle events draw a brand of this category */
  cat?: LifestyleCat;
  weight: number;
  /**
   * How often this can ever happen. 'deal' means once per boot contract — a new
   * brand really would build you a new signature boot — and 'career' means once
   * in a lifetime, surviving every change of brand.
   */
  once?: 'deal' | 'career';
  /** fires the moment it is eligible rather than waiting to win the draw */
  milestone?: boolean;
  when: (c: BrandCtx) => boolean;
  titleEn: string; titleEs: string;
  descEn: string; descEs: string;
  options: BrandOption[];
}

const O = (
  id: string, en: string, es: string, outcomeEn: string, outcomeEs: string,
  effects: BrandEffects,
): BrandOption => ({ id, en, es, outcomeEn, outcomeEs, effects });

// shorthand gates
const hasDeal = (c: BrandCtx) => !!c.sp && !!c.brand;
const rung = (c: BrandCtx) => (c.sp ? DEAL_RANK[c.sp.tier] : -1);
const brandRank = (c: BrandCtx) => (c.brand ? TIER_RANK[c.brand.tier] : 0);
const isGk = (c: BrandCtx) => c.p.position === 'GK';

// ---- the deck ----------------------------------------------------------------

export const BRAND_EVENTS: BrandEventDef[] = [
  // ============================ boots: the small end ============================
  {
    id: 'first-box', family: 'boot', weight: 1, once: 'career',
    when: c => hasDeal(c) && rung(c) <= 1 && c.m < 46,
    titleEn: 'A box arrives at the training ground',
    titleEs: 'Llega una caja al entrenamiento',
    descEn: 'Six pairs of {B}, your size, your name on the tongue in cheap thread. The kit man puts them in your slot and says nothing. It is the first time anybody has given you anything for playing football.',
    descEs: 'Seis pares de {B}, de tu número, con tu nombre en la lengüeta en hilo barato. El utillero los deja en tu sitio y no dice nada. Es la primera vez que alguien te regala algo por jugar al fútbol.',
    options: [
      O('wear', 'Wear a pair the next match, obviously', 'Estrenar un par el próximo partido, obviamente',
        'You play the whole game thinking about your feet. Two people notice. You notice for a month.',
        'Juegas el partido entero pensando en tus pies. Dos personas se dan cuenta. Tú te das cuenta durante un mes.',
        { morale: 8, form: 3 }),
      O('give', 'Give four pairs to the youth team', 'Regalar cuatro pares al juvenil',
        'They are worn to pieces inside a month by boys who cannot believe their luck. One of them still has his.',
        'Los destrozan en un mes chavales que no se lo pueden creer. Uno de ellos todavía los conserva.',
        { idol: 5, morale: 4, standing: -2 }),
      O('sell', 'Quietly sell five pairs', 'Vender cinco pares por lo bajo',
        'It pays a month of rent. Somebody in the dressing room works it out and it follows you for two seasons.',
        'Paga un mes de alquiler. Alguien del vestuario lo descubre y te persigue durante dos temporadas.',
        { money: 9_000, reputation: -3, standing: -6 }),
    ],
  },
  {
    id: 'boots-late', family: 'boot', weight: 0.6, once: 'career',
    when: c => hasDeal(c),
    titleEn: 'The samples have not arrived',
    titleEs: 'No han llegado las muestras',
    descEn: 'Your {B} boots are in a warehouse somewhere and the game is on Saturday. The pair you have left are a season old and the studs are down to nothing.',
    descEs: 'Tus botas de {B} están en un almacén y el partido es el sábado. El par que te queda tiene una temporada y los tacos están gastados.',
    options: [
      O('old', 'Play in the old pair', 'Jugar con las viejas',
        'They are shaped like your feet, which is more than the new ones ever are. You have a good game.',
        'Tienen la forma de tus pies, que es más de lo que tienen nunca las nuevas. Haces un buen partido.',
        { form: 4, morale: 2 }),
      O('blank', "Black out somebody else's boots", 'Pintar de negro unas de otra marca',
        'A tin of paint and a nervous hour. Somebody photographs your feet in the tunnel and the brand sees it.',
        'Un bote de pintura y una hora de nervios. Alguien fotografía tus pies en el túnel y la marca lo ve.',
        { standing: -12, form: 3, money: 0 }),
      O('complain', 'Ring them and make it their problem', 'Llamarles y que sea problema suyo',
        'A courier turns up at eleven at night with three boxes and an apology. Somebody at {B} has a bad week because of you.',
        'Un mensajero aparece a las once de la noche con tres cajas y una disculpa. Alguien en {B} tiene una mala semana por tu culpa.',
        { standing: -4, morale: 3, reputation: 2 }),
    ],
  },
  {
    id: 'teammate-rival', family: 'boot', weight: 0.6, once: 'career',
    when: c => hasDeal(c) && c.apps >= 12,
    titleEn: 'Your left-back signs with the enemy',
    titleEs: 'Tu lateral izquierdo firma con la competencia',
    descEn: 'He has a rival deal and he will not stop talking about it. There is now a small, extremely stupid war in the dressing room about which boots are better.',
    descEs: 'Tiene un contrato con la competencia y no para de hablar de ello. Hay ahora una guerra pequeña y absolutamente estúpida en el vestuario sobre qué botas son mejores.',
    options: [
      O('bet', 'Bet him a month of wages on goals', 'Apostarle un mes de sueldo a goles',
        'The whole squad takes sides. You train like it matters, which is the only reason it works.',
        'La plantilla entera toma partido. Entrenas como si importara, que es la única razón por la que funciona.',
        { form: 7, morale: 4, money: -40_000 }),
      O('post', 'Post something about it', 'Publicar algo al respecto',
        '{B} love it and repost it everywhere. Your teammate does not speak to you for eleven days.',
        'A {B} le encanta y lo comparten por todas partes. Tu compañero no te habla durante once días.',
        { standing: 9, reputation: 4, morale: -3 }),
      O('ignore', 'Refuse to have the argument', 'Negarte a tener la discusión',
        'The most boring available answer. It dies out in a week and you keep a friend.',
        'La respuesta más aburrida posible. Se apaga en una semana y conservas un amigo.',
        { morale: 3, attrs: { lea: 1 } }),
    ],
  },

  // ============================ boots: the middle ===============================
  {
    id: 'grassroots-pitch', family: 'boot', weight: 1.1, once: 'career',
    when: c => hasDeal(c) && c.m >= 45,
    titleEn: 'They want to resurface the pitch you grew up on',
    titleEs: 'Quieren rehacer el campo donde creciste',
    descEn: '{B} will lay a full artificial pitch where you learned, with your name on the gate. It costs them very little and it will mean a great deal at home. They want you there for the opening, in front of cameras.',
    descEs: '{B} pondrá un campo de césped artificial donde aprendiste, con tu nombre en la puerta. A ellos les cuesta poquísimo y en casa significará muchísimo. Te quieren allí en la inauguración, delante de las cámaras.',
    options: [
      O('go', 'Go, and bring the whole family', 'Ir, y llevar a toda la familia',
        'Four hundred people in a place that holds two hundred. Your first coach cannot get a word out. The photographs are used by {B} for years.',
        'Cuatrocientas personas en un sitio para doscientas. Tu primer entrenador no puede articular palabra. {B} usa las fotos durante años.',
        { idol: 6, morale: 12, reputation: 6, standing: 10 }),
      O('nocam', 'Say yes, but no cameras', 'Aceptar, pero sin cámaras',
        'The pitch gets built. The brand is quietly annoyed and the town is quietly delighted, which is the correct way round.',
        'El campo se construye. La marca se molesta discretamente y el pueblo se alegra discretamente, que es el orden correcto.',
        { morale: 9, idol: 4, standing: -6 }),
      O('pay', 'Pay for it yourself and let them keep their logo', 'Pagarlo tú y que se queden su logo',
        'It costs you a genuinely painful amount. Nobody outside the town ever finds out, which was the point.',
        'Te cuesta una cantidad sinceramente dolorosa. Nadie fuera del pueblo se entera nunca, que era la idea.',
        { money: -900_000, morale: 14, idol: 8, standing: -3 }),
    ],
  },
  {
    id: 'colourway', family: 'boot', weight: 1.1,
    when: c => hasDeal(c) && rung(c) >= 2 && c.m >= 55,
    titleEn: 'A colourway of your own',
    titleEs: 'Un color propio',
    descEn: '{B} are giving you a limited run of the boot in colours you choose. Two thousand pairs. They want the story behind it to be usable.',
    descEs: '{B} te da una serie limitada de la bota en los colores que elijas. Dos mil pares. Quieren que la historia detrás se pueda contar.',
    options: [
      O('home', 'The colours of your first club', 'Los colores de tu primer club',
        'They sell out in a morning, mostly in one postcode. Your old club sells more replica shirts that month than in the previous two years.',
        'Se agotan en una mañana, casi todas en un código postal. Tu antiguo club vende más camisetas ese mes que en los dos años anteriores.',
        { idol: 7, standing: 6, money: 240_000, morale: 5 }),
      O('nation', 'Your country, on the anniversary of something', 'Tu país, en el aniversario de algo',
        'A federation lawyer spends a fortnight on it. It works, and it is the first time your name is on something a stranger would buy.',
        'Un abogado de la federación pasa quince días con ello. Funciona, y es la primera vez que tu nombre está en algo que compraría un desconocido.',
        { reputation: 7, standing: 8, money: 380_000 }),
      O('loud', 'Something nobody has ever worn on a pitch', 'Algo que nadie ha llevado nunca a un campo',
        'They are extraordinary and they are hideous. Two pundits build a whole week around them. They sell out twice.',
        'Son extraordinarias y son horrendas. Dos comentaristas construyen una semana entera con ellas. Se agotan dos veces.',
        { reputation: 10, standing: 10, money: 520_000, morale: -2 }),
    ],
  },
  {
    id: 'stud-failure', family: 'boot', weight: 0.7, once: 'deal',
    when: c => hasDeal(c) && rung(c) >= 1 && c.apps >= 15,
    titleEn: 'The sole splits in a game that mattered',
    titleEs: 'La suela se abre en un partido importante',
    descEn: 'Forty minutes in, in front of everybody, the sole of your {B} boot comes away and you go down without being touched. It is on every highlight package that night. They would like you to say it was the surface.',
    descEs: 'Al minuto cuarenta, delante de todos, la suela de tu bota de {B} se despega y te caes sin que nadie te toque. Sale en todos los resúmenes esa noche. Les gustaría que dijeras que fue el terreno de juego.',
    options: [
      O('cover', 'Say it was the pitch', 'Decir que fue el campo',
        'They are enormously grateful and they show it. The groundsman at your own club reads it and does not forget.',
        'Están enormemente agradecidos y lo demuestran. El encargado del césped de tu propio club lo lee y no lo olvida.',
        { standing: 16, money: 300_000, idol: -4, discipline: -2 }),
      O('truth', 'Say the boot broke, because it did', 'Decir que la bota se rompió, porque se rompió',
        'It is the honest answer and it costs you. Somebody at {B} calls it "unhelpful" in an email that later leaks.',
        'Es la respuesta honesta y te cuesta. Alguien en {B} lo llama «poco útil» en un correo que después se filtra.',
        { standing: -18, reputation: 6, morale: 3 }),
      O('joke', 'Make a joke of it and move on', 'Tomártelo a broma y seguir',
        'The clip becomes a joke instead of a story, which is the only way these ever go away.',
        'El vídeo se convierte en un chiste en vez de en una noticia, que es la única forma en que estas cosas desaparecen.',
        { standing: 4, reputation: 3, morale: 2 }),
    ],
  },
  {
    id: 'goal-bonus', family: 'boot', weight: 1.1, once: 'deal',
    when: c => hasDeal(c) && rung(c) >= 1 && !isGk(c) && c.m >= 48,
    titleEn: 'They want to change how you are paid',
    titleEs: 'Quieren cambiar cómo te pagan',
    descEn: '{B} are offering to cut the guaranteed money and pay you per goal instead. They have run the numbers and they think it favours them. You have seen the numbers too.',
    descEs: '{B} propone recortar el fijo y pagarte por gol. Han hecho los números y creen que les favorece. Tú también has visto los números.',
    options: [
      O('take', 'Take the bet on yourself', 'Apostar por ti mismo',
        'Less arrives every summer and a great deal more arrives in the good years. It also means every goal is worth money, which does something strange to how you play.',
        'Llega menos cada verano y muchísimo más en los buenos años. También significa que cada gol vale dinero, lo que hace algo raro con tu manera de jugar.',
        { annualPct: -0.3, money: 400_000, form: 5, morale: -3 }),
      O('keep', 'Keep the guarantee', 'Quedarte con el fijo',
        'Boring, safe, and exactly what your agent tells you to do. They respect it slightly less than they say they do.',
        'Aburrido, seguro y exactamente lo que te dice tu representante. Lo respetan algo menos de lo que dicen.',
        { standing: -3 }),
      O('both', 'Demand both and see what happens', 'Exigir las dos cosas y ver qué pasa',
        'Six weeks of silence, then they agree to a smaller version of it. Your agent is delighted with himself.',
        'Seis semanas de silencio y luego aceptan una versión más pequeña. Tu representante está encantado consigo mismo.',
        { annualPct: 0.12, standing: -8, money: 150_000 }),
    ],
  },
  {
    id: 'academy-camp', family: 'boot', weight: 1,
    when: c => hasDeal(c) && c.m >= 50,
    titleEn: 'Three days with a hundred kids',
    titleEs: 'Tres días con cien niños',
    descEn: '{B} run summer camps and want you at one. It is three days of your close season, it pays properly, and you will be asked the same four questions two hundred times.',
    descEs: '{B} organiza campus de verano y te quiere en uno. Son tres días de tu pretemporada, paga bien, y te harán las mismas cuatro preguntas doscientas veces.',
    options: [
      O('full', 'Do the three days properly', 'Hacer los tres días en serio',
        'You are wrecked by Sunday and you remember four of their names for the rest of your life.',
        'Acabas destrozado el domingo y recuerdas cuatro de sus nombres el resto de tu vida.',
        { money: 320_000, stamina: -10, standing: 9, morale: 6, reputation: 3 }),
      O('one', 'Turn up for one afternoon', 'Aparecer una tarde',
        'Photographs taken, hands shaken, gone by six. Everybody gets what they came for and nobody is thrilled.',
        'Fotos hechas, manos estrechadas, fuera a las seis. Todos consiguen lo que venían a buscar y nadie está encantado.',
        { money: 110_000, stamina: -2, standing: 2 }),
      O('skip', 'Say no and rest', 'Decir que no y descansar',
        'Your summer stays yours. Somebody less famous does it and does it better.',
        'Tu verano sigue siendo tuyo. Lo hace alguien menos famoso y lo hace mejor.',
        { stamina: 8, standing: -7 }),
    ],
  },
  {
    id: 'store-tour', family: 'boot', weight: 0.9,
    when: c => hasDeal(c) && rung(c) >= 1 && c.m >= 42,
    titleEn: 'Six shops in four days',
    titleEs: 'Seis tiendas en cuatro días',
    descEn: 'An appearance-fee tour of {B} stores. Queues round the block in two cities and eleven people in another. It pays per appearance and it is exhausting in a way that football is not.',
    descEs: 'Una gira de apariciones pagadas por tiendas de {B}. Colas de una manzana en dos ciudades y once personas en otra. Pagan por aparición y agota de una forma en que el fútbol no agota.',
    options: [
      O('all', 'Do all six', 'Hacer las seis',
        'By the fourth you are signing your own name wrong. The cheque is very large.',
        'Para la cuarta estás firmando tu propio nombre mal. El cheque es enorme.',
        { money: 480_000, stamina: -12, reputation: 5, standing: 8 }),
      O('big', 'Only the two big cities', 'Solo las dos ciudades grandes',
        'The sensible half. The store in the small town had put up a banner with your face on it.',
        'La mitad sensata. La tienda del pueblo pequeño había colgado una pancarta con tu cara.',
        { money: 210_000, stamina: -5, standing: 2, morale: -2 }),
      O('small', 'Only the small town, and stay all day', 'Solo el pueblo pequeño, y quedarte todo el día',
        'Eleven people become four hundred by the afternoon. It is on the front of the local paper for a week.',
        'Once personas se convierten en cuatrocientas por la tarde. Sale en la portada del periódico local una semana.',
        { money: 90_000, stamina: -4, idol: 6, morale: 8, standing: -2 }),
    ],
  },
  {
    id: 'photoshoot-clash', family: 'boot', weight: 0.9,
    when: c => hasDeal(c) && rung(c) >= 2,
    titleEn: 'The shoot is the day after the derby',
    titleEs: 'La sesión es el día después del clásico',
    descEn: 'Fourteen hours in a studio in another country, starting nine hours after the final whistle. The contract says you do four of these a year and this is the fourth.',
    descEs: 'Catorce horas en un estudio en otro país, empezando nueve horas después del pitido final. El contrato dice que haces cuatro al año y esta es la cuarta.',
    options: [
      O('go', 'Get on the plane', 'Coger el avión',
        'You are photographed looking powerful and well rested, which is a considerable achievement.',
        'Te fotografían con aspecto poderoso y descansado, lo cual es un logro considerable.',
        { standing: 7, stamina: -12, form: -4 }),
      O('move', 'Make them move it', 'Hacer que la cambien',
        'It costs them a studio booking and a crew. They move it, and they mention it more than once.',
        'Les cuesta la reserva del estudio y un equipo entero. La cambian, y lo mencionan más de una vez.',
        { standing: -9, stamina: 4, form: 2 }),
      O('half', 'Do half of it and leave', 'Hacer la mitad e irte',
        'They get enough. Everybody is mildly unsatisfied, which is how most professional arrangements end.',
        'Consiguen lo suficiente. Todos quedan medianamente insatisfechos, que es como acaban casi todos los acuerdos profesionales.',
        { standing: -2, stamina: -6 }),
    ],
  },
  {
    id: 'keeper-gloves', family: 'boot', weight: 1.6, once: 'deal',
    when: c => hasDeal(c) && isGk(c) && rung(c) >= 2,
    titleEn: 'A glove with your palm in it',
    titleEs: 'Un guante con la palma de tu mano',
    descEn: '{B} want to scan your hands and build a glove around them. Nobody outside the goalkeepers\' union will ever care, and every goalkeeper alive will know exactly what it is.',
    descEs: '{B} quiere escanear tus manos y construir un guante a partir de ellas. A nadie fuera del gremio de porteros le importará nunca, y todos los porteros del mundo sabrán exactamente lo que es.',
    options: [
      O('own', 'Build it exactly how you want it', 'Construirlo exactamente como tú quieres',
        'Ugly, thick and enormous, and the best thing you have ever had on your hands. Sales are terrible. You do not care.',
        'Feo, grueso y enorme, y lo mejor que has tenido nunca en las manos. Se vende fatal. No te importa.',
        { attrs: { tec: 3 }, form: 6, standing: -4, money: 180_000 }),
      O('sell', 'Let them design it to sell', 'Dejar que lo diseñen para vender',
        'Bright, thin and photogenic. It sells extremely well and you wear a different pair in games.',
        'Llamativo, fino y fotogénico. Se vende muy bien y tú usas otro par en los partidos.',
        { money: 900_000, standing: 12, form: -2 }),
      O('both', 'One to sell, one to play in', 'Uno para vender, otro para jugar',
        'Slightly dishonest and entirely standard. Every goalkeeper who has ever had a glove line has done this.',
        'Ligeramente deshonesto y absolutamente normal. Lo ha hecho todo portero que haya tenido una línea de guantes.',
        { money: 620_000, standing: 6, attrs: { tec: 1 } }),
    ],
  },
  {
    id: 'laceless', family: 'boot', weight: 0.9, once: 'deal',
    when: c => hasDeal(c) && rung(c) >= 2 && !isGk(c),
    titleEn: 'A prototype nobody has played in',
    titleEs: 'Un prototipo con el que nadie ha jugado',
    descEn: '{B} have built something with no laces at all and they want it worn in a competitive match before anybody else does it. Their own testers say it is fine. Their own testers are not playing on Saturday.',
    descEs: '{B} ha fabricado algo sin cordones y quiere que se estrene en partido oficial antes que nadie. Sus probadores dicen que va bien. Sus probadores no juegan el sábado.',
    options: [
      O('wear', 'Wear them Saturday', 'Ponértelas el sábado',
        'They are extraordinary for sixty minutes and then one of them starts sliding. You get away with it and the pictures are everywhere.',
        'Son extraordinarias durante sesenta minutos y luego una empieza a bailar. Sales bien parado y las fotos están en todas partes.',
        { standing: 18, reputation: 6, money: 400_000, form: -3 }),
      O('friendly', 'Wear them in a friendly first', 'Probarlas antes en un amistoso',
        'The professional answer. They are visibly disappointed and they use somebody else for the launch.',
        'La respuesta profesional. Se les nota decepcionados y usan a otro para el lanzamiento.',
        { standing: -6, form: 2 }),
      O('no', 'Refuse outright', 'Negarte en redondo',
        'You have played in the same boot for nine years and you are not stopping for a marketing calendar.',
        'Llevas nueve años con la misma bota y no vas a cambiar por un calendario de marketing.',
        { standing: -12, form: 4, morale: 3 }),
    ],
  },

  // ============================ boots: the top ==================================
  {
    id: 'signature-launch', family: 'boot', weight: 2, once: 'deal', milestone: true,
    when: c => hasDeal(c) && rung(c) >= 3 && !c.sp!.signature,
    titleEn: 'A boot with your name on the box',
    titleEs: 'Una bota con tu nombre en la caja',
    descEn: '{B} are building you a signature boot. There are maybe twenty players alive with one. They need a name for it, and whatever you choose will be on shelves in ninety countries.',
    descEs: '{B} te está construyendo una bota propia. Habrá veinte jugadores vivos con una. Necesitan un nombre, y lo que elijas estará en estanterías de noventa países.',
    options: [
      O('surname', 'Your surname, and nothing else', 'Tu apellido, y nada más',
        'The {P}. It is on the wall of every sports shop you walk past for the rest of your career, and you never once get used to it.',
        'La {P}. Está en la pared de cada tienda de deporte por la que pasas el resto de tu carrera, y no te acostumbras jamás.',
        { signature: true, reputation: 14, money: 2_600_000, morale: 12, standing: 10 }),
      O('number', 'Your number', 'Tu número',
        'Cleaner, colder, and it will outlive you at the brand — they can put somebody else in it in ten years without changing the mould.',
        'Más limpio, más frío, y sobrevivirá a tu paso por la marca: en diez años pueden meter a otro sin cambiar el molde.',
        { signature: true, reputation: 10, money: 3_200_000, standing: 14 }),
      O('street', 'What they called you on your street', 'Como te llamaban en tu calle',
        'Nobody at the brand understands it and they run with it anyway. At home it means everything and the launch video is filmed there.',
        'En la marca no lo entiende nadie y aun así tiran para adelante. En casa significa todo y el vídeo de lanzamiento se rueda allí.',
        { signature: true, reputation: 9, money: 2_100_000, idol: 10, morale: 14 }),
    ],
  },
  {
    id: 'ballon-campaign', family: 'boot', weight: 3, milestone: true,
    when: c => hasDeal(c) && c.wonBallon,
    titleEn: 'They have been waiting for this',
    titleEs: 'Llevaban esperando esto',
    descEn: 'The Ballon d\'Or was on Monday. {B} had the campaign shot and edited in three versions before the vote, and by Thursday your face is on the side of a building in six cities.',
    descEs: 'El Balón de Oro fue el lunes. {B} tenía la campaña rodada y montada en tres versiones antes de la votación, y para el jueves tu cara está en la fachada de un edificio en seis ciudades.',
    options: [
      O('everything', 'Give them everything for a month', 'Dárselo todo durante un mes',
        'A month you barely remember and a cheque that changes what your family can do forever. Also a hamstring that never quite forgives you.',
        'Un mes que apenas recuerdas y un cheque que cambia para siempre lo que tu familia puede hacer. También un isquiotibial que no te lo perdona del todo.',
        { money: 8_500_000, reputation: 16, stamina: -18, standing: 22, annualPct: 0.2 }),
      O('one', 'One film, one day, done properly', 'Una película, un día, bien hecha',
        'Ninety seconds, shot in your home town in the rain, and it is the only one of these anybody remembers ten years later.',
        'Noventa segundos, rodados en tu pueblo bajo la lluvia, y es la única de todas estas que alguien recuerda diez años después.',
        { money: 3_400_000, reputation: 12, idol: 8, standing: 12, morale: 8 }),
      O('team', 'Insist the whole team is in it', 'Insistir en que salga el equipo entero',
        'The brand hates it and does it. Your teammates never let you pay for anything again.',
        'A la marca le horroriza y lo hace. Tus compañeros no te dejan pagar nada nunca más.',
        { money: 2_200_000, idol: 12, morale: 12, attrs: { lea: 4 }, standing: -4 }),
    ],
  },
  {
    id: 'world-cup-face', family: 'boot', weight: 2.4,
    when: c => hasDeal(c) && c.inTournament && brandRank(c) >= 3 && c.m >= 70,
    titleEn: 'The face of the tournament',
    titleEs: 'La cara del torneo',
    descEn: '{B} sponsor half the teams at this World Cup and they have to choose one player to build it around. They have chosen you. Your own {N} kit is not made by them, which they consider a detail.',
    descEs: '{B} patrocina a media mitad de las selecciones de este Mundial y tiene que elegir a un jugador para construirlo todo alrededor. Te han elegido a ti. Tu camiseta de {N} no la hacen ellos, lo cual consideran un detalle.',
    options: [
      O('lead', 'Front the whole campaign', 'Encabezar la campaña entera',
        'Airports, billboards, the opening titles. You arrive at the tournament as the most photographed man in it, and every defender you face knows it.',
        'Aeropuertos, vallas, la cabecera. Llegas al torneo como el hombre más fotografiado y cada defensa que te enfrenta lo sabe.',
        { money: 6_800_000, reputation: 18, standing: 20, form: -4, stamina: -8 }),
      O('share', 'Only if it is shared with two others', 'Solo si se comparte con otros dos',
        'Less money, less noise, and you land in the tournament as a footballer rather than a poster.',
        'Menos dinero, menos ruido, y llegas al torneo como futbolista y no como cartel.',
        { money: 3_100_000, reputation: 8, standing: 6, form: 3 }),
      O('after', 'Tell them to come back after the tournament', 'Decirles que vuelvan después del torneo',
        'They are not used to being told this. It costs you a fortune and you play the best football of your life that summer.',
        'No están acostumbrados a que les digan esto. Te cuesta una fortuna y juegas el mejor fútbol de tu vida ese verano.',
        { standing: -10, form: 9, morale: 6, stamina: 6 }),
    ],
  },
  {
    id: 'japan-tour', family: 'boot', weight: 2.4,
    when: c => hasDeal(c) && brandRank(c) >= 3 && c.m >= 80 && c.clubStrength >= 80,
    titleEn: 'Eleven days in Japan',
    titleEs: 'Once días en Japón',
    descEn: 'Tokyo, Osaka, Nagoya. Store openings, a clinic with four hundred children, three television appearances and a queue outside the Shibuya shop that starts the night before. {B} are paying a number your agent reads twice.',
    descEs: 'Tokio, Osaka, Nagoya. Aperturas de tiendas, un clinic con cuatrocientos niños, tres apariciones en televisión y una cola en la tienda de Shibuya que empieza la noche anterior. {B} paga una cifra que tu representante lee dos veces.',
    options: [
      O('all', 'Do the whole eleven days', 'Hacer los once días enteros',
        'You come home unable to speak and richer than the year you signed your first professional contract. Japan does not forget you.',
        'Vuelves a casa sin poder hablar y más rico que el año en que firmaste tu primer contrato profesional. Japón no te olvida.',
        { money: 5_200_000, stamina: -20, reputation: 12, standing: 20, form: -5 }),
      O('short', 'Four days, Tokyo only', 'Cuatro días, solo Tokio',
        'Enough to be worth it and short enough to recover from. Osaka is told you were injured.',
        'Suficiente para que merezca la pena y corto para poder recuperarte. A Osaka le dicen que estabas lesionado.',
        { money: 2_000_000, stamina: -8, reputation: 5, standing: 5 }),
      O('preseason', 'Only if the club comes too', 'Solo si va también el club',
        'You turn it into the club\'s preseason tour. {B} pay for everything, your teammates get a holiday, and the manager owes you one.',
        'Lo conviertes en la gira de pretemporada del club. {B} paga todo, tus compañeros se van de vacaciones y el entrenador te debe una.',
        { money: 3_000_000, stamina: -12, idol: 9, morale: 8, standing: 10, attrs: { lea: 3 } }),
    ],
  },
  {
    id: 'poach', family: 'boot', weight: 2,
    when: c => hasDeal(c) && c.sp!.yearsLeft >= 2 && c.m >= 70,
    titleEn: 'Somebody else has made an offer',
    titleEs: 'Otra marca ha hecho una oferta',
    descEn: 'A rival brand has put a number in front of your agent that is roughly double what {B} pay you, and they will cover the buyout themselves. You are two years from the end of your contract.',
    descEs: 'Una marca rival ha puesto delante de tu representante una cifra que es más o menos el doble de lo que te paga {B}, y se hace cargo de la cláusula. Te quedan dos años de contrato.',
    options: [
      O('take', 'Take the money and go', 'Coger el dinero e irte',
        'Everybody in the industry knows within an hour. {B} say nothing publicly and remember it permanently.',
        'Todo el sector se entera en una hora. {B} no dice nada en público y no lo olvida jamás.',
        { money: 7_000_000, endDeal: true, reputation: 4, standing: -30 }),
      O('leverage', 'Take it to {B} and ask them to match', 'Llevárselo a {B} y pedir que igualen',
        'They match about two-thirds of it, and something in the relationship changes that never entirely changes back.',
        'Igualan más o menos dos tercios, y algo en la relación cambia y nunca vuelve del todo.',
        { annualPct: 0.55, standing: -12, yearsDelta: 1 }),
      O('stay', 'Say no without telling anyone', 'Decir que no sin contárselo a nadie',
        'Nobody ever knows you turned it down except the two people in the room. One of them tells {B} anyway, and it is worth more than the money.',
        'Nadie sabe nunca que lo rechazaste salvo las dos personas de la sala. Una de ellas se lo cuenta a {B} igualmente, y vale más que el dinero.',
        { standing: 28, morale: 5, attrs: { lea: 2 } }),
    ],
  },
  {
    id: 'documentary', family: 'boot', weight: 1.1, once: 'career',
    when: c => hasDeal(c) && c.m >= 74,
    titleEn: 'They want to film your life',
    titleEs: 'Quieren rodar tu vida',
    descEn: 'Three episodes. A crew in your house, your mother interviewed, the street you grew up on, and a director who keeps asking about the year it nearly did not happen.',
    descEs: 'Tres episodios. Un equipo en tu casa, tu madre entrevistada, la calle donde creciste, y un director que insiste en preguntar por el año en que casi no sale.',
    options: [
      O('open', 'Let them film everything', 'Dejarles rodarlo todo',
        'It is far more honest than anybody expected and it is the reason a generation of people at home know your name.',
        'Es mucho más honesto de lo que nadie esperaba y es la razón por la que toda una generación en casa sabe tu nombre.',
        { money: 2_400_000, reputation: 14, idol: 6, morale: -4, standing: 14 }),
      O('control', 'Approve every frame', 'Aprobar cada plano',
        'Handsome, flattering and completely forgettable. It does its job and nothing more.',
        'Elegante, halagador y absolutamente olvidable. Cumple su función y nada más.',
        { money: 1_800_000, reputation: 6, standing: 6 }),
      O('family', 'Leave your family out of it', 'Dejar a tu familia fuera',
        'Half the story is missing and everybody involved understands why. Your mother rings to say thank you.',
        'Falta la mitad de la historia y todos los implicados entienden por qué. Tu madre llama para darte las gracias.',
        { money: 1_200_000, reputation: 4, morale: 9, standing: -2 }),
    ],
  },
  {
    id: 'price-point', family: 'boot', weight: 2.2,
    when: c => hasDeal(c) && !!c.sp?.signature && c.m >= 68,
    titleEn: 'A cheap version, for kids',
    titleEs: 'Una versión barata, para niños',
    descEn: 'Your boot costs more than a week of most people\'s wages. {B} want to put your name on a version at a fifth of the price, made differently, sold in supermarkets. It will sell in numbers the real one never will.',
    descEs: 'Tu bota cuesta más que una semana de sueldo de mucha gente. {B} quiere poner tu nombre en una versión a un quinto del precio, fabricada de otra forma, vendida en supermercados. Venderá cifras que la de verdad no verá nunca.',
    options: [
      O('yes', 'Say yes, and insist it is actually good', 'Decir que sí, e insistir en que sea buena de verdad',
        'You spend two days arguing about a sole unit with people who did not expect you to turn up. It is the boot half a country grows up in.',
        'Pasas dos días discutiendo sobre una suela con gente que no esperaba que aparecieras. Es la bota con la que crece medio país.',
        { money: 2_800_000, idol: 8, reputation: 7, standing: 12, stamina: -3 }),
      O('no', 'Refuse — it is not the same boot', 'Negarte: no es la misma bota',
        'Purist, defensible, and it means a lot of children wear somebody else\'s name instead.',
        'Purista, defendible, y significa que muchos niños llevan el nombre de otro.',
        { standing: -12, reputation: 2 }),
      O('free', 'Only if they give away fifty thousand pairs', 'Solo si regalan cincuenta mil pares',
        'It costs them a fortune and they agree because the story is worth more. The pictures from that giveaway are used for a decade.',
        'Les cuesta una fortuna y aceptan porque la historia vale más. Las fotos de ese reparto se usan durante una década.',
        { money: 900_000, idol: 14, reputation: 10, standing: 6, morale: 8 }),
    ],
  },
  {
    id: 'counterfeit', family: 'boot', weight: 1.8,
    when: c => hasDeal(c) && !!c.sp?.signature,
    titleEn: 'Fakes, in your own home town',
    titleEs: 'Falsificaciones, en tu propio pueblo',
    descEn: 'There is a market stall at home selling your boot for eleven euros. They are not very good and they are not exactly bad. {B} have lawyers on it and want a statement from you.',
    descEs: 'Hay un puesto en el mercado de tu pueblo vendiendo tu bota por once euros. No son muy buenas y tampoco son exactamente malas. {B} tiene abogados en ello y quiere una declaración tuya.',
    options: [
      O('lawyers', 'Back the lawyers', 'Apoyar a los abogados',
        'The stall goes. The man who ran it has a son in the youth team at your first club, and you hear about that afterwards.',
        'El puesto desaparece. El hombre que lo llevaba tiene un hijo en el juvenil de tu primer club, y te enteras después.',
        { standing: 14, money: 200_000, idol: -8, morale: -5 }),
      O('nothing', 'Refuse to say anything at all', 'Negarte a decir nada',
        'The brand handles it without you and notes that you were no help. At home, quietly, it is understood.',
        'La marca lo resuelve sin ti y toma nota de que no ayudaste. En casa, en voz baja, se entiende.',
        { standing: -10, idol: 6 }),
      O('buy', 'Buy the entire stall', 'Comprar el puesto entero',
        'Four hundred pairs of fake boots in a garage and a photograph of you handing them out at a school. {B} decide it is brilliant after about a week.',
        'Cuatrocientos pares de botas falsas en un garaje y una foto tuya repartiéndolas en un colegio. {B} decide que es genial más o menos una semana después.',
        { money: -140_000, idol: 12, reputation: 8, standing: 6, morale: 7 }),
    ],
  },
  {
    id: 'kit-clash', family: 'boot', weight: 1.1, once: 'deal',
    when: c => hasDeal(c) && (c.p.ntCaps ?? 0) >= 10 && rung(c) >= 2,
    titleEn: 'Your country is sponsored by somebody else',
    titleEs: 'Tu selección la viste otra marca',
    descEn: '{N} are supplied by a rival, and their contract says the players front their campaign at the tournament. Your contract says you front nobody\'s but {B}\'s. Two sets of lawyers are now discussing your feet.',
    descEs: 'A {N} la viste una rival, y su contrato dice que los jugadores encabezan su campaña en el torneo. Tu contrato dice que no encabezas la de nadie salvo la de {B}. Dos equipos de abogados están discutiendo ahora sobre tus pies.',
    options: [
      O('brand', 'Side with {B}', 'Ponerte del lado de {B}',
        'You are quietly left out of the federation\'s campaign. A photographer notices and writes about it, which helps nobody.',
        'Te dejan discretamente fuera de la campaña de la federación. Un fotógrafo se da cuenta y lo escribe, lo cual no ayuda a nadie.',
        { standing: 16, money: 300_000, reputation: -4, morale: -4 }),
      O('country', 'Side with your country', 'Ponerte del lado de tu selección',
        'You do the federation shoot in their kit and your brand fines you for it. You would do it again.',
        'Haces la sesión de la federación con su equipación y tu marca te multa por ello. Lo volverías a hacer.',
        { standing: -16, money: -400_000, reputation: 8, morale: 8 }),
      O('lawyers', 'Let the lawyers sort it out', 'Que lo arreglen los abogados',
        'Eight weeks, a compromise nobody likes, and you are photographed with your feet deliberately out of shot.',
        'Ocho semanas, un acuerdo que no gusta a nadie, y te fotografían con los pies deliberadamente fuera de plano.',
        { standing: -3, morale: -2 }),
    ],
  },
  {
    id: 'boot-museum', family: 'boot', weight: 2.4, once: 'career',
    when: c => hasDeal(c) && c.brokeRecord && rung(c) >= 2,
    titleEn: 'They want the boots',
    titleEs: 'Quieren las botas',
    descEn: 'The pair you were wearing when you broke it. {B} have a room in their headquarters with about forty pairs in it and they would like yours in a case on the wall.',
    descEs: 'El par que llevabas cuando lo batiste. {B} tiene una sala en su sede con unos cuarenta pares y le gustaría poner los tuyos en una vitrina.',
    options: [
      O('give', 'Give them the boots', 'Darles las botas',
        'They are behind glass in a building in another country, next to boots you had posters of. You visit once and say almost nothing.',
        'Están tras un cristal en un edificio de otro país, al lado de botas de las que tuviste pósters. Vas una vez y no dices casi nada.',
        { standing: 16, reputation: 6, morale: 6 }),
      O('club', 'Give them to your club instead', 'Dárselas a tu club',
        'They go in the case by the tunnel where everybody who plays for that club walks past them every day.',
        'Van a la vitrina del túnel por la que pasa cada día todo el que juega en ese club.',
        { idol: 12, morale: 8, standing: -6 }),
      O('keep', 'Keep them', 'Quedártelas',
        'They are in a box in your house and they will be in a box in your house in forty years. Nobody else understands.',
        'Están en una caja en tu casa y seguirán en una caja en tu casa dentro de cuarenta años. Nadie más lo entiende.',
        { morale: 10, standing: -4 }),
    ],
  },
  {
    id: 'retro-relaunch', family: 'boot', weight: 2.4, once: 'career',
    when: c => hasDeal(c) && c.p.age >= 30 && !!c.sp?.signature,
    titleEn: 'They are bringing the old one back',
    titleEs: 'Van a recuperar la vieja',
    descEn: 'The boot from your first signature run, remade exactly, in the original colours. The people buying it are thirty years old and were twelve when it came out.',
    descEs: 'La bota de tu primera serie propia, rehecha exactamente igual, en los colores originales. Los que la compran tienen treinta años y tenían doce cuando salió.',
    options: [
      O('wear', 'Wear them in a real match', 'Ponértelas en un partido de verdad',
        'You are thirty-two years old playing in your own boot from a decade ago and it is on every screen in the country.',
        'Tienes treinta y dos años jugando con tu propia bota de hace una década y sale en todas las pantallas del país.',
        { reputation: 10, money: 1_600_000, standing: 16, morale: 10, form: 3 }),
      O('signed', 'Sign every pair of the first thousand', 'Firmar los mil primeros pares',
        'Eleven hours across three days and a hand that does not work properly for a week. They sell for four times the price within a year.',
        'Once horas en tres días y una mano que no funciona bien durante una semana. Se revenden por cuatro veces su precio en un año.',
        { money: 2_200_000, standing: 12, stamina: -6, form: -2 }),
      O('quiet', 'Let it happen without you', 'Dejar que salga sin ti',
        'It sells perfectly well. Something about it being remade while you are still playing sits oddly with you.',
        'Se vende perfectamente bien. Algo de que la rehagan mientras sigues jugando te sienta raro.',
        { money: 700_000, standing: -4, morale: -2 }),
    ],
  },
  {
    id: 'loyalty-small', family: 'boot', weight: 1.6, once: 'deal',
    when: c => hasDeal(c) && brandRank(c) <= 2 && c.m >= 72,
    titleEn: 'They cannot afford you any more',
    titleEs: 'Ya no pueden pagarte',
    descEn: '{B} signed you when nobody else was calling. They are now, honestly and slightly embarrassed, telling you that they cannot match what you are worth and that they will not stand in your way.',
    descEs: '{B} te firmó cuando no llamaba nadie. Ahora te dicen, con honestidad y algo de vergüenza, que no pueden igualar lo que vales y que no se van a interponer.',
    options: [
      O('stay', 'Stay anyway', 'Quedarte igualmente',
        'You take a fraction of what the market says you are worth. It is written about for years and it is the reason a certain kind of person likes you.',
        'Cobras una fracción de lo que dice el mercado que vales. Se escribe sobre ello durante años y es la razón por la que le caes bien a cierto tipo de gente.',
        { standing: 30, reputation: 8, morale: 10, yearsDelta: 3, attrs: { lea: 3 } }),
      O('go', 'Thank them and go', 'Darles las gracias e irte',
        'Everybody involved behaves impeccably, which somehow makes it worse. They send a case of the boots you started in.',
        'Todos se comportan impecablemente, lo que de algún modo lo empeora. Te mandan una caja de las botas con las que empezaste.',
        { endDeal: true, morale: -4, reputation: 2 }),
      O('half', 'Stay two more years, then go', 'Quedarte dos años más y luego irte',
        'A compromise with a date on it. It costs you money and buys you a clean ending, which is rarer.',
        'Un acuerdo con fecha. Te cuesta dinero y te compra un final limpio, que es más raro.',
        { standing: 16, yearsDelta: 2, annualPct: -0.15, morale: 4 }),
    ],
  },
  {
    id: 'dropped-warning', family: 'boot', weight: 3,
    when: c => hasDeal(c) && c.sp!.standing < 38 && rung(c) >= 1,
    titleEn: 'A meeting you were not expecting',
    titleEs: 'Una reunión que no esperabas',
    descEn: 'Somebody senior from {B} flies in for ninety minutes. They are polite and they have a slide with your appearances on it. The word "review" is used four times.',
    descEs: 'Alguien importante de {B} viene en avión para noventa minutos. Son educados y traen una diapositiva con tus partidos. Usan la palabra «revisión» cuatro veces.',
    options: [
      O('fight', 'Tell them you will fix it', 'Decirles que lo vas a arreglar',
        'You mean it, and meaning it in a meeting room is not the same as doing it in February. But you do mean it.',
        'Lo dices en serio, y decirlo en serio en una sala de reuniones no es lo mismo que hacerlo en febrero. Pero lo dices en serio.',
        { standing: 12, form: 6, morale: -3 }),
      O('cut', 'Offer to cut your own money', 'Ofrecerte a bajarte el fijo',
        'Nobody in the room expected it. It buys you two more years and a story that follows you around.',
        'Nadie en la sala se lo esperaba. Te compra dos años más y una historia que te acompaña.',
        { annualPct: -0.35, standing: 22, yearsDelta: 2, reputation: 3 }),
      O('walk', 'Tell them to end it now', 'Decirles que lo terminen ya',
        'It ends in the room. You walk out with no deal and, for the first time in nine years, no obligations either.',
        'Termina en esa sala. Sales sin contrato y, por primera vez en nueve años, sin obligaciones.',
        { endDeal: true, morale: 5, stamina: 8, reputation: -3 }),
    ],
  },
  {
    id: 'charity-clause', family: 'boot', weight: 0.9,
    when: c => hasDeal(c) && c.m >= 60 && rung(c) >= 2,
    titleEn: 'What the clause is actually for',
    titleEs: 'Para qué sirve realmente la cláusula',
    descEn: 'There is a line in your contract about community work that nobody has ever enforced. You have just read it properly for the first time.',
    descEs: 'Hay una línea en tu contrato sobre trabajo comunitario que nadie ha hecho cumplir nunca. Acabas de leerla en serio por primera vez.',
    options: [
      O('use', 'Make them spend the whole budget', 'Hacerles gastar el presupuesto entero',
        'Two hundred thousand euros of boots into places that do not get any. {B} put out a press release and you let them.',
        'Doscientos mil euros en botas hacia sitios que no reciben ninguna. {B} saca una nota de prensa y tú les dejas.',
        { idol: 8, reputation: 7, standing: 6, morale: 8 }),
      O('double', 'Match it yourself', 'Igualarlo tú',
        'Twice as much, half of it yours, and you insist your name is not on any of it. Two journalists find out anyway.',
        'El doble, la mitad tuyo, e insistes en que tu nombre no aparezca. Dos periodistas se enteran igualmente.',
        { money: -600_000, idol: 12, reputation: 9, morale: 12 }),
      O('ignore', 'Leave it where it is', 'Dejarlo donde está',
        'It stays unenforced, the way it has been for six years, the way it is in most of these contracts.',
        'Sigue sin aplicarse, como lleva seis años, como está en casi todos estos contratos.',
        { morale: -2 }),
    ],
  },

  // ============================ lifestyle =======================================
  {
    id: 'ls-watch', family: 'lifestyle', cat: 'watch', weight: 1.1,
    when: c => c.m >= 70,
    titleEn: 'A watch house calls',
    titleEs: 'Llama una casa de relojes',
    descEn: '{B} do not really do sponsorship. What they do is give you a watch worth more than your first car and expect to see it on your wrist at the right things.',
    descEs: '{B} no hace patrocinios exactamente. Lo que hace es darte un reloj que vale más que tu primer coche y esperar verlo en tu muñeca en los sitios adecuados.',
    options: [
      O('sign', 'Sign it', 'Firmarlo',
        'It is on your wrist in every photograph for six years and you never once pay for a watch again.',
        'Está en tu muñeca en cada foto durante seis años y no vuelves a pagar un reloj en tu vida.',
        { takeLifestyle: true, reputation: 6, morale: 4 }),
      O('haggle', 'Ask for double and mean it', 'Pedir el doble y ir en serio',
        'They come back with sixty per cent more and a tone that suggests nobody has done that before.',
        'Vuelven con un sesenta por ciento más y un tono que sugiere que nadie lo había hecho antes.',
        { takeLifestyle: true, reputation: 4, morale: -2, discipline: -2 }),
      O('no', 'You do not wear watches', 'No usas relojes',
        'Entirely true and completely baffling to everybody involved.',
        'Absolutamente cierto y absolutamente desconcertante para todos los implicados.',
        { morale: 3 }),
    ],
  },
  {
    id: 'ls-car', family: 'lifestyle', cat: 'car', weight: 1.2,
    when: c => c.m >= 50,
    titleEn: 'A car, every year, for nothing',
    titleEs: 'Un coche, cada año, gratis',
    descEn: '{B} supply the whole club. Once a year everybody picks from a list and drives away. Yours is ready and there is a photograph involved.',
    descEs: '{B} suministra al club entero. Una vez al año todos eligen de una lista y se lo llevan. El tuyo está listo y hay una foto de por medio.',
    options: [
      O('big', 'Take the biggest one on the list', 'Coger el más grande de la lista',
        'It does not fit in the players\' car park and the dressing room is merciless about it for a year.',
        'No cabe en el aparcamiento de jugadores y el vestuario no tiene piedad durante un año.',
        { takeLifestyle: true, reputation: 4, morale: 3, idol: -2 }),
      O('sensible', 'Take the sensible one', 'Coger el sensato',
        'The estate. Two of the older players nod at you in a way that is worth more than the car.',
        'El familiar. Dos veteranos te saludan con la cabeza de una forma que vale más que el coche.',
        { takeLifestyle: true, morale: 4, attrs: { lea: 1 } }),
      O('mother', 'Take it and give it to your mother', 'Cogerlo y dárselo a tu madre',
        'She refuses it for eight days and then drives it everywhere for eleven years.',
        'Lo rechaza durante ocho días y luego lo conduce a todas partes durante once años.',
        { takeLifestyle: true, morale: 12, idol: 3 }),
    ],
  },
  {
    id: 'ls-fragrance', family: 'lifestyle', cat: 'fragrance', weight: 1,
    when: c => c.m >= 76,
    titleEn: 'Thirty seconds, no dialogue',
    titleEs: 'Treinta segundos, sin diálogo',
    descEn: '{B} want you in a fragrance film. Black and white, a director who has won things, and you are required to say absolutely nothing at any point.',
    descEs: '{B} te quiere en un anuncio de perfume. Blanco y negro, un director premiado, y no tienes que decir absolutamente nada en ningún momento.',
    options: [
      O('do', 'Do it exactly as they ask', 'Hacerlo exactamente como piden',
        'It is beautiful and absurd and your teammates recite it at you for two entire seasons.',
        'Es precioso y absurdo y tus compañeros te lo recitan durante dos temporadas enteras.',
        { takeLifestyle: true, reputation: 10, morale: -3 }),
      O('football', 'Insist there is a ball in it somewhere', 'Insistir en que salga un balón en algún momento',
        'The director is furious and it is the best shot in the film.',
        'El director se enfada muchísimo y es el mejor plano de la película.',
        { takeLifestyle: true, reputation: 8, morale: 4, idol: 2 }),
      O('no', 'Decline, it is not for you', 'Rechazarlo, no es para ti',
        'A large amount of money for half a day, gone. You sleep extremely well.',
        'Una cantidad enorme de dinero por medio día, fuera. Duermes estupendamente.',
        { morale: 5, stamina: 3 }),
    ],
  },
  {
    id: 'ls-airline', family: 'lifestyle', cat: 'airline', weight: 1,
    when: c => c.m >= 72,
    titleEn: 'An airline wants your face at the gate',
    titleEs: 'Una aerolínea quiere tu cara en la puerta de embarque',
    descEn: '{B} are on the front of half the shirts in Europe and now they want a person. Airports, safety videos, and a great deal of flying.',
    descEs: '{B} está en el pecho de media Europa y ahora quiere una persona. Aeropuertos, vídeos de seguridad y muchísimo volar.',
    options: [
      O('sign', 'Sign the whole thing', 'Firmarlo todo',
        'You are in every airport you land in for four years, which is a peculiar way to live.',
        'Estás en cada aeropuerto en el que aterrizas durante cuatro años, que es una forma peculiar de vivir.',
        { takeLifestyle: true, reputation: 8, stamina: -5 }),
      O('family', 'Sign it, but the flights are the point', 'Firmarlo, pero lo importante son los vuelos',
        'Unlimited seats for your family, forever. Your parents see you play away from home for the first time in years.',
        'Asientos ilimitados para tu familia, para siempre. Tus padres te ven jugar fuera de casa por primera vez en años.',
        { takeLifestyle: true, morale: 12, reputation: 4 }),
      O('no', 'You fly enough', 'Ya vuelas bastante',
        'The single most understandable refusal of your career.',
        'El rechazo más comprensible de toda tu carrera.',
        { stamina: 6 }),
    ],
  },
  {
    id: 'ls-game', family: 'lifestyle', cat: 'game', weight: 1.4, once: 'career', milestone: true,
    when: c => c.m >= 88,
    titleEn: 'The cover',
    titleEs: 'La portada',
    descEn: 'One player goes on the front of the game every year and this year they want you. Every shop window, every console, every bedroom, for twelve months.',
    descEs: 'Un jugador va en la portada del juego cada año y este año te quieren a ti. Cada escaparate, cada consola, cada habitación, durante doce meses.',
    options: [
      O('yes', 'Say yes before they finish the sentence', 'Decir que sí antes de que acaben la frase',
        'Every child who plays football knows your face by Christmas. It is the single biggest thing that happens to your name.',
        'Todos los niños que juegan al fútbol conocen tu cara para Navidad. Es lo más grande que le pasa a tu nombre.',
        { takeLifestyle: true, reputation: 18, morale: 12 }),
      O('rating', 'Say yes and argue about your rating', 'Decir que sí y discutir tu media',
        'You spend an hour on a call about your pace with a producer who is enjoying it more than you are. You win two points.',
        'Pasas una hora al teléfono hablando de tu velocidad con un productor que lo disfruta más que tú. Ganas dos puntos.',
        { takeLifestyle: true, reputation: 15, morale: 8, discipline: -2 }),
      O('share', 'Only alongside somebody from your first club', 'Solo junto a alguien de tu primer club',
        'They think it is strange and they do it. In one town it is the most important thing that ever happened.',
        'Les parece raro y lo hacen. En un pueblo es lo más importante que ha pasado nunca.',
        { takeLifestyle: true, reputation: 13, idol: 10, morale: 10 }),
    ],
  },
  {
    id: 'ls-drink', family: 'lifestyle', cat: 'drink', weight: 1,
    when: c => c.m >= 60,
    titleEn: 'They do not want an advert',
    titleEs: 'No quieren un anuncio',
    descEn: '{B} want to make films. You, a camera crew, and something physically stupid — a rooftop, a desert, a pitch on the side of a mountain.',
    descEs: '{B} quiere hacer películas. Tú, un equipo de rodaje y algo físicamente estúpido: una azotea, un desierto, un campo en la ladera de una montaña.',
    options: [
      O('all', 'Do the stupid one', 'Hacer la estúpida',
        'It is genuinely dangerous, it is watched forty million times, and your club\'s doctor finds out afterwards.',
        'Es sinceramente peligroso, lo ven cuarenta millones de veces y el médico del club se entera después.',
        { takeLifestyle: true, reputation: 12, stamina: -8, morale: 8 }),
      O('safe', 'Do a safe version', 'Hacer una versión segura',
        'Perfectly good, watched by four million, and everybody keeps their job.',
        'Perfectamente correcto, lo ven cuatro millones y nadie pierde su trabajo.',
        { takeLifestyle: true, reputation: 6 }),
      O('no', 'Read the clause about dangerous activity', 'Leer la cláusula sobre actividades peligrosas',
        'Your club would void your contract. Somebody at the brand calls you boring and they are right.',
        'Tu club te anularía el contrato. Alguien de la marca te llama aburrido y tiene razón.',
        { morale: -2, discipline: 3 }),
    ],
  },
  {
    id: 'ls-grooming', family: 'lifestyle', cat: 'grooming', weight: 1,
    when: c => c.m >= 66,
    titleEn: 'A razor company, of all things',
    titleEs: 'Una marca de cuchillas, nada menos',
    descEn: '{B} want to pay you a startling amount of money to look pleased about your own jaw. There is no downside except every single person you know.',
    descEs: '{B} quiere pagarte una cantidad asombrosa de dinero por parecer contento con tu propia mandíbula. No hay ningún inconveniente salvo absolutamente todos tus conocidos.',
    options: [
      O('yes', 'Take the money', 'Coger el dinero',
        'It is the highest per-hour rate of your entire life. The dressing room never once lets it go.',
        'Es la tarifa por hora más alta de toda tu vida. El vestuario no lo suelta jamás.',
        { takeLifestyle: true, morale: -4, reputation: 5 }),
      O('beard', 'Take it and grow a beard immediately', 'Cogerlo y dejarte barba inmediatamente',
        'They are not amused. It is the funniest thing anybody at the club has ever seen.',
        'No les hace gracia. Es lo más gracioso que ha visto nunca nadie en el club.',
        { takeLifestyle: true, morale: 8, idol: 3, discipline: -3 }),
      O('no', 'Absolutely not', 'Ni hablar',
        'Your dignity, intact, and a number your agent mentions again every Christmas for a decade.',
        'Tu dignidad, intacta, y una cifra que tu representante menciona cada Navidad durante una década.',
        { morale: 2 }),
    ],
  },
  {
    id: 'ls-telecom', family: 'lifestyle', cat: 'telecom', weight: 0.8, once: 'career',
    when: c => c.m >= 34,
    titleEn: 'The phone company at home wants you',
    titleEs: 'La telefónica de tu país te quiere',
    descEn: 'Not an international campaign. A national one, in {H}, where people actually know who you are. It is a fraction of what a global brand pays and it will be on television at your parents\' house.',
    descEs: 'No una campaña internacional. Una nacional, en {H}, donde la gente sabe de verdad quién eres. Es una fracción de lo que paga una marca global y saldrá en la tele de casa de tus padres.',
    options: [
      O('yes', 'Do it', 'Hacerlo',
        'Your father watches it eleven times. It is the first advert you have ever been in and you are terrible in it.',
        'Tu padre lo ve once veces. Es el primer anuncio en el que sales y estás fatal.',
        { takeLifestyle: true, morale: 9, reputation: 4, idol: 3 }),
      O('family', 'Do it, but put your old coach in it', 'Hacerlo, pero meter a tu antiguo entrenador',
        'They agree because it is cheaper than an actor. He is extremely good and it runs for two years.',
        'Aceptan porque sale más barato que un actor. Está buenísimo y se emite dos años.',
        { takeLifestyle: true, morale: 12, idol: 6, reputation: 3 }),
      O('no', 'Hold out for something bigger', 'Aguantar por algo más grande',
        'Something bigger may not come. You have decided that is acceptable.',
        'Puede que lo más grande no llegue. Has decidido que es aceptable.',
        { morale: -3 }),
    ],
  },
  {
    id: 'ls-snack', family: 'lifestyle', cat: 'snack', weight: 0.8, once: 'career',
    when: c => c.m >= 30,
    titleEn: 'Your face, on a bag of crisps',
    titleEs: 'Tu cara, en una bolsa de patatas',
    descEn: '{B} want you on the packaging, in every supermarket in {H}, including the one you have shopped in since you were nine.',
    descEs: '{B} te quiere en el envase, en cada supermercado de {H}, incluido aquel en el que compras desde los nueve años.',
    options: [
      O('yes', 'Say yes, obviously', 'Decir que sí, obviamente',
        'You buy a bag of yourself and it is one of the strangest things you have ever done.',
        'Compras una bolsa de ti mismo y es una de las cosas más raras que has hecho nunca.',
        { takeLifestyle: true, morale: 10, reputation: 3, idol: 2 }),
      O('nutrition', 'Ask the club nutritionist first', 'Preguntar antes al nutricionista del club',
        'He says no in writing. You do it anyway and he brings it up in every meeting for a year.',
        'Dice que no por escrito. Lo haces igual y lo saca en cada reunión durante un año.',
        { takeLifestyle: true, morale: 5, discipline: -4, form: -2 }),
      O('no', 'Decline politely', 'Rechazarlo educadamente',
        'Somebody from the youth team does it instead and is delighted.',
        'Lo hace alguien del juvenil y está encantado.',
        { morale: -2 }),
    ],
  },
  {
    id: 'ls-bank', family: 'lifestyle', cat: 'bank', weight: 1,
    when: c => c.m >= 58,
    titleEn: 'A bank, which is to say: money',
    titleEs: 'Un banco, es decir: dinero',
    descEn: '{B} want you in a campaign about savings accounts. It is the least interesting thing you will ever be asked to do and it pays better than most of the interesting ones.',
    descEs: '{B} te quiere en una campaña sobre cuentas de ahorro. Es lo menos interesante que te pedirán nunca y paga mejor que casi todo lo interesante.',
    options: [
      O('yes', 'Take it, it is only a day', 'Cogerlo, es solo un día',
        'A day in a grey studio saying a sentence about interest rates forty times. Nobody you know ever mentions it.',
        'Un día en un estudio gris diciendo una frase sobre tipos de interés cuarenta veces. Nadie que conozcas lo menciona jamás.',
        { takeLifestyle: true, reputation: 2 }),
      O('advice', 'Take it, and actually ask them for advice', 'Cogerlo, y pedirles consejo de verdad',
        'You end up with a financial adviser who is genuinely competent, which turns out to be worth more than the fee.',
        'Acabas con un asesor financiero sinceramente competente, que resulta valer más que el caché.',
        { takeLifestyle: true, money: 700_000, reputation: 2 }),
      O('no', 'Turn down free money for no reason', 'Rechazar dinero gratis sin motivo',
        'You cannot explain it and you do not try. Your agent does not speak to you for the rest of the week.',
        'No sabes explicarlo y no lo intentas. Tu representante no te habla el resto de la semana.',
        { morale: 3, discipline: -2 }),
    ],
  },
  {
    id: 'ls-audio', family: 'lifestyle', cat: 'audio', weight: 1,
    when: c => c.m >= 64,
    titleEn: 'Headphones, off the bus, every week',
    titleEs: 'Cascos, bajando del autobús, cada semana',
    descEn: '{B} want the shot everybody has seen: off the coach, down the tunnel, headphones on, cameras there. The whole deal is that you never take them off in public.',
    descEs: '{B} quiere el plano que todos han visto: bajando del autobús, hacia el túnel, con los cascos, con las cámaras. Todo el acuerdo consiste en que no te los quites en público.',
    options: [
      O('yes', 'Wear them everywhere', 'Llevarlos a todas partes',
        'Four years of arriving at stadiums unable to hear anybody. It pays for a house.',
        'Cuatro años llegando a los estadios sin poder oír a nadie. Paga una casa.',
        { takeLifestyle: true, reputation: 6, morale: -2 }),
      O('music', 'Only if you choose what is in the ads', 'Solo si eliges tú lo que suena en los anuncios',
        'You put a band from your home town in a global commercial. They never fully recover from it.',
        'Metes a un grupo de tu pueblo en un anuncio global. No se recuperan del todo.',
        { takeLifestyle: true, reputation: 5, morale: 8, idol: 4 }),
      O('no', 'You like hearing the crowd', 'Te gusta oír a la gente',
        'A small, real reason that nobody in the meeting knows how to argue with.',
        'Una razón pequeña y real con la que nadie en la reunión sabe discutir.',
        { morale: 4, form: 2 }),
    ],
  },
  {
    id: 'ls-eyewear', family: 'lifestyle', cat: 'eyewear', weight: 0.9,
    when: c => c.m >= 54,
    titleEn: 'More sunglasses than a person needs',
    titleEs: 'Más gafas de las que necesita una persona',
    descEn: 'Two shoots a year for {B} and a wardrobe that arrives at your house in crates. Your teammates find out about the crates.',
    descEs: 'Dos sesiones al año para {B} y un armario que llega a tu casa en cajas. Tus compañeros se enteran de lo de las cajas.',
    options: [
      O('yes', 'Sign it', 'Firmarlo',
        'Sixty pairs of sunglasses. You lose fifty-one of them within two years.',
        'Sesenta pares de gafas. Pierdes cincuenta y uno en dos años.',
        { takeLifestyle: true, reputation: 4, morale: 3 }),
      O('share', 'Sign it and empty the crates in the dressing room', 'Firmarlo y vaciar las cajas en el vestuario',
        'Twenty-six men in identical sunglasses on the team bus. The photograph is still on a wall at that club.',
        'Veintiséis hombres con gafas idénticas en el autobús. La foto sigue en una pared de ese club.',
        { takeLifestyle: true, idol: 6, morale: 8, reputation: 3 }),
      O('no', 'Not worth the shoots', 'No compensa las sesiones',
        'Two days of your summer, saved.',
        'Dos días de tu verano, salvados.',
        { stamina: 3 }),
    ],
  },
];

// ---- picking one -------------------------------------------------------------

/**
 * Draw an event that fits where this career actually is.
 *
 * Returns null far more often than not: these are occasions, and one every
 * season would turn the career into an advertising schedule.
 */
export function pickBrandEvent(c: BrandCtx, rng: Rng): BrandEventDef | null {
  // Once-only means two different things depending on the family. A signature
  // boot is once *per deal* — a new brand really would build you a new one — so
  // it is tracked on the deal. A magazine cover is once in a lifetime, so that
  // is tracked on the player and survives changing brands.
  const dealDone = new Set(c.sp?.done ?? []);
  const pool = BRAND_EVENTS.filter(e => {
    if (e.once === 'deal' && dealDone.has(e.id)) return false;
    if (e.once === 'career' && c.p.flags?.[`brand:${e.id}`]) return false;
    if (!e.when(c)) return false;
    // A lifestyle event needs a brand of its category that is actually within
    // reach and not already held.
    if (e.family === 'lifestyle') {
      return lifestyleFor(c.p, c.m, c.held).some(b => b.cat === e.cat);
    }
    return true;
  });
  if (!pool.length) return null;
  // A signature boot, a Ballon d'Or campaign and the cover of the game are not
  // things that should have to win a raffle against a late delivery of samples.
  // If one is eligible, it happens.
  const milestones = pool.filter(e => e.milestone);
  if (milestones.length) return milestones[rng.int(milestones.length)];
  const total = pool.reduce((a, e) => a + e.weight, 0);
  let r = rng.next() * total;
  for (const e of pool) { r -= e.weight; if (r <= 0) return e; }
  return pool[pool.length - 1];
}

/** The lifestyle brand a lifestyle event is about. */
export function lifestyleBrandFor(e: BrandEventDef, c: BrandCtx, rng: Rng): Brand | null {
  if (e.family !== 'lifestyle') return null;
  const opts = lifestyleFor(c.p, c.m, c.held).filter(b => b.cat === e.cat);
  return opts.length ? opts[rng.int(opts.length)] : null;
}

// ---- one beat of the brand story ---------------------------------------------

/**
 * Everything the brand system ever puts on screen, as one union.
 *
 * Two shapes only: somebody is offering you a deal, or something is happening
 * under the deal you already have. They queue behind the ceremonies so a season
 * that breaks a record *and* triggers a campaign shows them one at a time.
 */
export type BrandBeat =
  | {
      kind: 'offer';
      reason: 'first' | 'renew' | 'dropped' | 'free';
      offers: BootOffer[];
      /** the deal that just ended, so a renewal keeps the relationship */
      prev?: SponsorState | null;
      /** null while undecided, 'declined' if they walked away from all of it */
      chosen: BootOffer | 'declined' | null;
    }
  | {
      kind: 'event';
      def: BrandEventDef;
      /** the brand the copy is about — the boot brand, or the lifestyle one */
      brandId: string;
      /** set only for lifestyle events: the brand on offer, and what it pays */
      lifestyleBrandId: string | null;
      lifestyleFee: number;
      chosen: BrandOption | null;
    };

/** Turn a drawn event definition into the beat the UI renders. */
export function buildBrandBeat(
  def: BrandEventDef, c: BrandCtx, rng: Rng,
): BrandBeat | null {
  if (def.family === 'lifestyle') {
    const b = lifestyleBrandFor(def, c, rng);
    if (!b) return null;
    return {
      kind: 'event', def, brandId: b.id,
      lifestyleBrandId: b.id, lifestyleFee: lifestyleMoney(b, c.m, rng),
      chosen: null,
    };
  }
  if (!c.brand) return null;
  return {
    kind: 'event', def, brandId: c.brand.id,
    lifestyleBrandId: null, lifestyleFee: 0, chosen: null,
  };
}

// ---- copy --------------------------------------------------------------------

/** Fill {B} {C} {N} {P} {H} for the player reading it. */
export function fillBrandCopy(
  s: string, p: CareerPlayer, brandName: string, lang: Lang,
): string {
  const es = lang === 'es';
  const club = p.clubId ? getClub(p.clubId) : null;
  const nt = getNation(p.ntNationCode);
  const home = getNation(p.nationCode);
  return s
    .replace(/\{B\}/g, brandName)
    .replace(/\{C\}/g, club?.name ?? '')
    .replace(/\{N\}/g, (es ? nt?.es : nt?.en) ?? '')
    .replace(/\{H\}/g, (es ? home?.es : home?.en) ?? '')
    .replace(/\{P\}/g, p.surname);
}

export const brandEventTitle = (e: BrandEventDef, lang: Lang) => (lang === 'es' ? e.titleEs : e.titleEn);
export const brandEventDesc = (e: BrandEventDef, lang: Lang) => (lang === 'es' ? e.descEs : e.descEn);
export const brandOptLabel = (o: BrandOption, lang: Lang) => (lang === 'es' ? o.es : o.en);
export const brandOptOutcome = (o: BrandOption, lang: Lang) => (lang === 'es' ? o.outcomeEs : o.outcomeEn);

// ---- applying ----------------------------------------------------------------

export interface BrandApplyResult {
  player: CareerPlayer;
  sponsor: SponsorState | null;
  /** a lifestyle brand id picked up by this choice */
  gained: string | null;
  /** the deal ended here */
  ended: boolean;
}

export function applyBrandEffects(
  p: CareerPlayer, sp: SponsorState | null, e: BrandEffects,
  o: { lifestyleBrandId?: string | null; lifestyleFee?: number },
): BrandApplyResult {
  const idolatry = { ...(p.idolatry ?? {}) };
  if (e.idol && p.clubId) {
    idolatry[p.clubId] = clamp(0, 100, (idolatry[p.clubId] ?? 0) + e.idol);
  }
  const attrs = { ...p.attrs };
  for (const [k, v] of Object.entries(e.attrs ?? {})) {
    attrs[k as keyof Attrs] = clamp(1, 99, attrs[k as keyof Attrs] + (v as number));
  }

  const gained = e.takeLifestyle ? (o.lifestyleBrandId ?? null) : null;
  const fee = gained ? (o.lifestyleFee ?? 0) : 0;

  let sponsor: SponsorState | null = sp;
  let ended = false;
  if (sp) {
    if (e.endDeal) {
      sponsor = null;
      ended = true;
    } else {
      sponsor = {
        ...sp,
        standing: clamp(0, 100, sp.standing + (e.standing ?? 0)),
        signature: sp.signature || !!e.signature,
        annual: Math.max(0, Math.round(sp.annual * (1 + (e.annualPct ?? 0)) / 10_000) * 10_000),
        yearsLeft: Math.max(0, sp.yearsLeft + (e.yearsDelta ?? 0)),
      };
    }
  }

  const player: CareerPlayer = {
    ...p,
    idolatry,
    attrs,
    reputation: clamp(0, 100, p.reputation + (e.reputation ?? 0)),
    morale: clamp(5, 100, p.morale + (e.morale ?? 0)),
    form: clamp(15, 99, p.form + (e.form ?? 0)),
    stamina: clamp(20, 100, (p.stamina ?? 70) + (e.stamina ?? 0)),
    discipline: clamp(0, 100, p.discipline + (e.discipline ?? 0)),
    money: Math.max(0, (p.money ?? 0) + (e.money ?? 0) + fee),
    endorsements: gained
      ? [...(p.endorsements ?? []), gained]
      : (p.endorsements ?? []),
  };

  return { player, sponsor, gained, ended };
}

/** The chips shown after choosing, so the numbers are never silent. */
export function brandChips(
  e: BrandEffects, lang: Lang, fee = 0,
): { label: string; delta: number; money?: boolean; flag?: boolean }[] {
  const es = lang === 'es';
  const out: { label: string; delta: number; money?: boolean; flag?: boolean }[] = [];
  const add = (label: string, v?: number) => { if (v) out.push({ label, delta: v }); };
  add(es ? 'Fama' : 'Fame', e.reputation);
  add(es ? 'Ánimo' : 'Morale', e.morale);
  add(es ? 'Forma' : 'Form', e.form);
  add(es ? 'Resistencia' : 'Stamina', e.stamina);
  add(es ? 'Disciplina' : 'Discipline', e.discipline);
  add(es ? 'Idolatría' : 'Idolatry', e.idol);
  add(es ? 'Con la marca' : 'With the brand', e.standing);
  const AL: Record<string, [string, string]> = {
    tec: ['Technique', 'Técnica'], pac: ['Pace', 'Velocidad'], phy: ['Physical', 'Físico'],
    vis: ['Vision', 'Visión'], lea: ['Leadership', 'Liderazgo'],
  };
  for (const [k, v] of Object.entries(e.attrs ?? {})) {
    if (v) out.push({ label: AL[k][es ? 1 : 0], delta: v as number });
  }
  const cash = (e.money ?? 0) + fee;
  if (cash) out.push({ label: es ? 'Dinero' : 'Money', delta: cash, money: true });
  if (e.annualPct) {
    out.push({
      label: es ? 'Fijo anual' : 'Annual fee',
      delta: Math.round(e.annualPct * 100), flag: true,
    });
  }
  if (e.yearsDelta) out.push({ label: es ? 'Años' : 'Years', delta: e.yearsDelta });
  return out;
}
