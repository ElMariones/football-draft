// The derby.
//
// Two ideas. First, a derby is a *result*, not just a fixture you happened to
// score in: the season knows you beat them home and away, and that record
// follows you for as long as you wear the shirt. Second, a derby generates
// stories — the celebration in front of their end, the handshake that never
// happened, the banner with your name on it — and those stories are what the
// terraces actually remember about a rivalry.
//
// Everything scales with the fixture's `heat` (see data/career/derbies.ts). El
// Clásico and a mid-table grudge are not the same night and are not written up
// the same way.
import type { CareerPlayer, DerbyRecord } from '@/data/career/types';
import { getClub } from '@/data/career/clubs';
import { derbyBetween, derbiesFor, type Derby } from '@/data/career/derbies';
import { rivalsOf } from '@/data/career/rivals';
import { Rng, clamp, logistic } from './rng';
import { applyEffects, type PlayerEffects } from './effects';
import type { Lang } from './i18n';

// ---- the record you build --------------------------------------------------

export type { DerbyRecord };

export const emptyRecord = (): DerbyRecord => ({ w: 0, d: 0, l: 0, goals: 0, heat: 0 });

export function recordVs(p: CareerPlayer, rivalId: string): DerbyRecord {
  return p.derbyRecord?.[rivalId] ?? emptyRecord();
}

/** Every rivalry this career has actually played, busiest first. */
export function playedRivalries(p: CareerPlayer): { rivalId: string; rec: DerbyRecord }[] {
  return Object.entries(p.derbyRecord ?? {})
    .map(([rivalId, rec]) => ({ rivalId, rec }))
    .filter(x => x.rec.w + x.rec.d + x.rec.l > 0)
    .sort((a, b) =>
      (b.rec.w + b.rec.d + b.rec.l) - (a.rec.w + a.rec.d + a.rec.l) || b.rec.heat - a.rec.heat);
}

// ---- a season of derbies ---------------------------------------------------

export interface DerbyFixture {
  rivalId: string;
  derby: Derby | null;
  result: 'w' | 'd' | 'l';
  /** your goals in this specific fixture */
  goals: number;
}

export interface DerbySeason {
  fixtures: DerbyFixture[];
  w: number;
  d: number;
  l: number;
  goals: number;
  /** the biggest fixture played this season */
  top: Derby | null;
  topRivalId: string | null;
  /** you took every derby there was to take */
  cleanSweep: boolean;
}

const EMPTY: DerbySeason = {
  fixtures: [], w: 0, d: 0, l: 0, goals: 0, top: null, topRivalId: null, cleanSweep: false,
};

/**
 * Play out the season's derbies.
 *
 * Two legs against every rival in your own division. The result is the clubs'
 * strengths plus what you are worth on the night — a great player genuinely
 * swings a derby, which is the entire romance of the fixture — and a derby is
 * far more likely to be drawn than a normal game, because they are.
 */
export function rollDerbySeason(
  clubId: string, leagueId: string, playerLift: number, derbyGoals: number, rng: Rng,
): DerbySeason {
  const club = getClub(clubId);
  if (!club) return EMPTY;

  const opponents = rivalsOf(clubId)
    .map(getClub)
    .filter((c): c is NonNullable<typeof c> => !!c && c.leagueId === leagueId);
  if (!opponents.length) return EMPTY;

  const fixtures: DerbyFixture[] = [];
  for (const opp of opponents) {
    for (let leg = 0; leg < 2; leg++) {
      // home advantage swings to whoever is at home, one leg each
      const home = leg === 0 ? 3 : -3;
      const edge = club.strength + playerLift + home - opp.strength;
      const win = clamp(0.12, 0.74, logistic(edge / 8) * 0.82);
      const draw = clamp(0.16, 0.34, 0.30 - Math.abs(edge) * 0.006);
      const r = rng.next();
      const result: 'w' | 'd' | 'l' = r < win ? 'w' : r < win + draw ? 'd' : 'l';
      fixtures.push({ rivalId: opp.id, derby: derbyBetween(clubId, opp.id), result, goals: 0 });
    }
  }

  // Spread the derby goals the engine already produced across the fixtures,
  // weighted towards the ones that went well — you score more in games you win.
  let left = derbyGoals;
  const order = [...fixtures].sort((a, b) =>
    (b.result === 'w' ? 2 : b.result === 'd' ? 1 : 0) - (a.result === 'w' ? 2 : a.result === 'd' ? 1 : 0));
  while (left > 0 && order.length) {
    const f = order[rng.int(Math.min(order.length, left > 2 ? order.length : 2))];
    f.goals += 1;
    left -= 1;
  }

  const w = fixtures.filter(f => f.result === 'w').length;
  const d = fixtures.filter(f => f.result === 'd').length;
  const l = fixtures.filter(f => f.result === 'l').length;
  const named = fixtures.filter(f => f.derby).sort((a, b) => b.derby!.heat - a.derby!.heat);
  const topFix = named[0] ?? fixtures[0];

  return {
    fixtures, w, d, l, goals: derbyGoals,
    top: topFix?.derby ?? null,
    topRivalId: topFix?.rivalId ?? null,
    cleanSweep: fixtures.length >= 2 && l === 0 && d === 0,
  };
}

/**
 * Fold a season's derbies into the career record, and move the bad blood.
 *
 * Heat is how bad it is *right now*, not a lifetime counter. It cools over a
 * summer and it is topped up by what happens on the pitch, which gives it an
 * equilibrium in the thirties for an ordinary fierce fixture and leaves the top
 * of the scale for a rivalry you have personally set on fire. Without the decay
 * it simply accumulated, and every career ended at 100 with the label stuck on
 * "open warfare".
 */
export function creditDerbySeason(p: CareerPlayer, s: DerbySeason): CareerPlayer {
  const rec = { ...(p.derbyRecord ?? {}) };
  const touched = new Set(s.fixtures.map(f => f.rivalId));
  for (const rivalId of touched) {
    const cur = { ...(rec[rivalId] ?? emptyRecord()) };
    cur.heat *= 0.72;
    rec[rivalId] = cur;
  }
  for (const f of s.fixtures) {
    const cur = { ...(rec[f.rivalId] ?? emptyRecord()) };
    cur[f.result] += 1;
    cur.goals += f.goals;
    // Beating them and scoring against them both make the next one worse.
    const heatUp = (f.result === 'w' ? 2 : f.result === 'l' ? 1 : 1.2)
      + f.goals * 2.5
      + (f.derby ? f.derby.heat * 0.15 : 0);
    cur.heat = clamp(0, 100, cur.heat + heatUp);
    rec[f.rivalId] = cur;
  }
  // A rivalry you no longer play cools faster, because you are not there.
  for (const [id, r] of Object.entries(rec)) {
    if (!touched.has(id) && r.heat > 0) rec[id] = { ...r, heat: r.heat * 0.85 };
  }
  return { ...p, derbyRecord: rec };
}

/** What a derby season is worth in reputation and idolatry. */
export function derbyPayoff(s: DerbySeason): { reputation: number; idol: number } {
  const heat = s.top?.heat ?? 4;
  const swing = s.w * 2 - s.l;
  return {
    reputation: Math.round(clamp(-6, 14, swing * (heat / 6) + s.goals * 1.4)),
    idol: Math.round(clamp(-8, 18, swing * (heat / 5) + s.goals * 2.2)),
  };
}

/** The headline the ticker gets, when there is one worth printing. */
export function derbyNews(s: DerbySeason, lang: Lang): string[] {
  const es = lang === 'es';
  const out: string[] = [];
  if (!s.fixtures.length) return out;
  const name = s.top ? (es ? s.top.es : s.top.en) : (es ? 'el clásico' : 'the derby');

  if (s.cleanSweep && s.fixtures.length >= 2) {
    out.push(es
      ? `⚔️ Ganaste todos los clásicos de la temporada. ${name}, entero, tuyo.`
      : `⚔️ You won every derby of the season. ${name}, all of it, yours.`);
  } else if (s.w > s.l) {
    out.push(es
      ? `⚔️ ${name}: ${s.w}G ${s.d}E ${s.l}P. La ciudad se lleva bien contigo.`
      : `⚔️ ${name}: ${s.w}W ${s.d}D ${s.l}L. The city is on your side.`);
  } else if (s.l > s.w) {
    out.push(es
      ? `⚔️ ${name}: ${s.w}G ${s.d}E ${s.l}P. Un año largo para escuchar.`
      : `⚔️ ${name}: ${s.w}W ${s.d}D ${s.l}L. A long year of hearing about it.`);
  }

  if (s.goals >= 3) {
    out.push(es
      ? `🔥 ${s.goals} goles en clásicos. Eso te lo cantan veinte años.`
      : `🔥 ${s.goals} derby goals. They will sing that at you for twenty years.`);
  }
  return out;
}

// ============================ the stories ====================================

export interface RivalOption {
  id: string;
  en: string; es: string;
  outcomeEn: string; outcomeEs: string;
  effects: PlayerEffects;
  /** how much worse this makes the rivalry */
  heat?: number;
  /** permanent mark on the career */
  flag?: string;
}

export interface RivalCtx {
  p: CareerPlayer;
  rivalId: string;
  derby: Derby | null;
  heat: number;
  /** this season's derby results */
  season: DerbySeason;
  /** you used to play for them */
  exPlayer: boolean;
  /** career total against this rival */
  rec: DerbyRecord;
}

export interface RivalEventDef {
  id: string;
  weight: number;
  once?: 'career';
  when: (c: RivalCtx) => boolean;
  titleEn: string; titleEs: string;
  descEn: string; descEs: string;
  options: RivalOption[];
}

const O = (
  id: string, en: string, es: string, outcomeEn: string, outcomeEs: string,
  effects: PlayerEffects, extra: { heat?: number; flag?: string } = {},
): RivalOption => ({ id, en, es, outcomeEn, outcomeEs, effects, ...extra });

const scored = (c: RivalCtx) => c.season.goals > 0;
const won = (c: RivalCtx) => c.season.w > 0;
const lost = (c: RivalCtx) => c.season.l > 0;
const isGk = (c: RivalCtx) => c.p.position === 'GK';

/**
 * Copy placeholders: {R} the rival club, {C} your club, {D} the fixture's name,
 * {P} your surname.
 */
export const RIVAL_EVENTS: RivalEventDef[] = [
  // ---------------- the celebration ----------------
  {
    id: 'celebration', weight: 1.6,
    when: c => scored(c),
    titleEn: 'You scored, and then you had a decision to make',
    titleEs: 'Marcaste, y luego tuviste que decidir',
    descEn: 'You have just scored in {D}. Forty thousand of them are directly behind that goal and every camera in the country is on your face.',
    descEs: 'Acabas de marcar en {D}. Cuarenta mil de ellos están justo detrás de esa portería y todas las cámaras del país están en tu cara.',
    options: [
      O('front', 'Celebrate in front of their end', 'Celebrarlo delante de su grada',
        'A yellow card, a hail of objects and a photograph that ends up on ten thousand bedroom walls on your side of the city.',
        'Amarilla, una lluvia de objetos y una foto que acaba en diez mil habitaciones de tu mitad de la ciudad.',
        { idol: 12, reputation: 7, discipline: -6, morale: 5 }, { heat: 22 }),
      O('badge', 'Kiss the badge and say nothing', 'Besar el escudo y no decir nada',
        'The oldest gesture there is. Your own end loses its mind and nobody can write a word against you.',
        'El gesto más viejo que hay. Tu grada se vuelve loca y nadie puede escribir una línea en tu contra.',
        { idol: 9, morale: 6, reputation: 3 }, { heat: 8 }),
      O('none', 'Do not celebrate at all', 'No celebrarlo',
        'You turn and jog back. Half the ground cannot work out what it means, which is exactly the point.',
        'Te das la vuelta y trotas hacia atrás. Medio estadio no sabe qué significa, que es justo la idea.',
        { reputation: 5, attrs: { lea: 2 }, morale: 2 }, { heat: 3 }),
      O('shush', 'Put a finger to your lips', 'Llevarte el dedo a los labios',
        'Sixty thousand people who now have a specific man to blame. You will hear about this every single time you come here.',
        'Sesenta mil personas que ahora tienen un culpable con nombre. Te lo van a recordar cada vez que vuelvas.',
        { idol: 10, reputation: 9, discipline: -4 }, { heat: 30, flag: 'derbyVillain' }),
    ],
  },
  // ---------------- ex-player ----------------
  {
    id: 'ex-player', weight: 2, once: 'career',
    when: c => c.exPlayer,
    titleEn: 'You used to play for them',
    titleEs: 'Antes jugabas ahí',
    descEn: 'It is your first {D} in the other shirt. Their supporters have prepared something for you, and it is not a welcome.',
    descEs: 'Es tu primer {D} con la otra camiseta. Su afición te ha preparado algo, y no es una bienvenida.',
    options: [
      O('applaud', 'Applaud their end before kick-off', 'Aplaudir a su grada antes del partido',
        'Half of them boo louder and half of them cannot quite keep it up. The gesture is remembered longer than the result.',
        'La mitad abuchea más fuerte y la otra mitad no consigue mantenerlo. El gesto se recuerda más que el resultado.',
        { reputation: 6, morale: 4, attrs: { lea: 2 } }, { heat: -6 }),
      O('ignore', 'Look at the floor and warm up', 'Mirar al suelo y calentar',
        'Ninety minutes of the most personal abuse of your career. You play like a man who cannot hear any of it.',
        'Noventa minutos del insulto más personal de tu carrera. Juegas como quien no oye nada.',
        { form: 7, discipline: 3, morale: -4 }, { heat: 6 }),
      O('fire', 'Give it straight back to them', 'Devolvérselo todo',
        'You spend the game arguing with a stand. It is enormous fun and it costs you a booking and some sympathy.',
        'Te pasas el partido discutiendo con una grada. Es divertidísimo y te cuesta una amarilla y algo de simpatía.',
        { idol: 8, discipline: -7, reputation: 4, morale: 6 }, { heat: 25 }),
    ],
  },
  // ---------------- polemics ----------------
  {
    id: 'penalty-dive', weight: 1.2,
    when: c => !isGk(c) && won(c),
    titleEn: 'They say you went down too easily',
    titleEs: 'Dicen que te dejaste caer',
    descEn: 'The penalty that won {D} is being shown from nine angles on every programme in the country. Their manager used the word "cheat" on live television.',
    descEs: 'El penalti que ganó {D} se está viendo desde nueve ángulos en todos los programas del país. Su entrenador dijo «tramposo» en directo.',
    options: [
      O('admit', 'Admit there was not much in it', 'Admitir que había poco',
        'Nobody expects it and it defuses the whole thing in a day. Your own supporters are less delighted than the neutrals.',
        'Nadie se lo espera y desactiva todo en un día. Tu afición está menos encantada que los neutrales.',
        { reputation: 8, discipline: 4, idol: -4 }, { heat: -8 }),
      O('deny', 'Insist it was a penalty', 'Insistir en que era penalti',
        'You hold the line for three weeks. The clip outlives your career and it is used in referee training.',
        'Mantienes la versión tres semanas. El vídeo sobrevive a tu carrera y lo usan para formar árbitros.',
        { idol: 5, reputation: -4, morale: 2 }, { heat: 16 }),
      O('mock', 'Reenact it, badly, in the next warm-up', 'Recrearlo, fatal, en el siguiente calentamiento',
        'It is the funniest thing anybody has done all season and their supporters will never forgive it.',
        'Es lo más gracioso que ha hecho nadie en toda la temporada y su afición no lo perdonará jamás.',
        { reputation: 10, idol: 9, discipline: -6 }, { heat: 28 }),
    ],
  },
  {
    id: 'handshake', weight: 1.1,
    when: c => c.heat >= 25,
    titleEn: 'The handshake',
    titleEs: 'El saludo',
    descEn: 'Their captain has said in print that he will not shake your hand before {D}. There are nineteen cameras on the line-up.',
    descEs: 'Su capitán ha dicho en prensa que no te dará la mano antes de {D}. Hay diecinueve cámaras en la foto de equipos.',
    options: [
      O('offer', 'Offer your hand anyway', 'Ofrecerle la mano igualmente',
        'He does not take it and you hold your hand out for four full seconds. The still is on every front page in the morning.',
        'No te la da y tú la mantienes cuatro segundos enteros. La foto está en todas las portadas por la mañana.',
        { reputation: 12, attrs: { lea: 3 }, morale: 3 }, { heat: 10 }),
      O('skip', 'Walk straight past him', 'Pasar de largo',
        'Two men refusing to look at each other, which is what everybody came for.',
        'Dos hombres que se niegan a mirarse, que es a lo que ha venido todo el mundo.',
        { idol: 5, discipline: -3, reputation: 2 }, { heat: 18 }),
      O('word', 'Say something to him instead', 'Decirle algo al oído',
        'Nobody hears it and everybody speculates for a month. He is booked in the eleventh minute.',
        'Nadie lo oye y todos especulan durante un mes. A él lo amonestan en el minuto once.',
        { reputation: 6, idol: 6, discipline: -4, form: 3 }, { heat: 22 }),
    ],
  },
  {
    id: 'banner', weight: 1,
    when: c => c.heat >= 40,
    titleEn: 'They have made a banner about you',
    titleEs: 'Han hecho una pancarta contigo',
    descEn: 'It is forty metres long, it has your face on it, and what it says about you is not printable. It gets on television for ninety minutes.',
    descEs: 'Mide cuarenta metros, tiene tu cara y lo que dice de ti no es publicable. Sale en televisión noventa minutos.',
    options: [
      O('photo', 'Ask for a photograph of it', 'Pedir una foto de la pancarta',
        'You frame it. When somebody asks why, you say it took them four months and you are flattered.',
        'La enmarcas. Cuando te preguntan por qué, dices que les llevó cuatro meses y que te halaga.',
        { reputation: 9, morale: 7, idol: 5 }, { heat: 12 }),
      O('complain', 'Report it to the federation', 'Denunciarlo a la federación',
        'They are fined and a stand is closed for a game. You are now the man who got their stand closed.',
        'Les multan y cierran una grada un partido. Ahora eres el hombre que cerró su grada.',
        { reputation: 3, discipline: 5, idol: -3 }, { heat: 30 }),
      O('nothing', 'Say nothing about it, ever', 'No decir nada, nunca',
        'It dies in a fortnight, the way these always do when nobody feeds them.',
        'Muere en quince días, como mueren siempre cuando nadie las alimenta.',
        { discipline: 3, morale: -2, form: 2 }, { heat: -4 }),
    ],
  },
  {
    id: 'tunnel', weight: 0.9,
    when: c => c.heat >= 35 && !isGk(c),
    titleEn: 'It goes off in the tunnel',
    titleEs: 'Se lía en el túnel',
    descEn: 'Twenty-two men, two benches and both sets of staff, in a corridor four metres wide, at half time. You are in the middle of it.',
    descEs: 'Veintidós jugadores, dos banquillos y los dos cuerpos técnicos, en un pasillo de cuatro metros, en el descanso. Tú estás en medio.',
    options: [
      O('in', 'Get involved', 'Meterte',
        'Three matches and a fine. Your dressing room decides, permanently, that you are one of them.',
        'Tres partidos y una multa. Tu vestuario decide, para siempre, que eres de los suyos.',
        { idol: 12, discipline: -12, morale: 6, attrs: { lea: 2 } }, { heat: 25 }),
      O('split', 'Pull your own players out of it', 'Sacar a los tuyos de ahí',
        'You get an elbow in the face for your trouble and the referee names you in the report as the one who stopped it.',
        'Te llevas un codazo por las molestias y el árbitro te menciona en el acta como el que lo paró.',
        { reputation: 8, attrs: { lea: 4 }, discipline: 4, form: -2 }, { heat: 4 }),
      O('walk', 'Walk into the dressing room', 'Meterte en el vestuario',
        'The sensible thing. One of your own says something about it that takes a month to forget.',
        'Lo sensato. Uno de los tuyos dice algo que tarda un mes en olvidarse.',
        { discipline: 6, morale: -5, idol: -3 }, { heat: 2 }),
    ],
  },
  {
    id: 'rival-legend', weight: 1,
    when: c => c.heat >= 20,
    titleEn: 'One of their legends has had a go at you',
    titleEs: 'Una leyenda suya te ha atacado',
    descEn: 'A man with four hundred games for {R} spent eleven minutes on television explaining that you are overrated, and named you doing it.',
    descEs: 'Un hombre con cuatrocientos partidos en el {R} se pasó once minutos en televisión explicando que estás sobrevalorado, y con nombre y apellido.',
    options: [
      O('stats', 'Answer him with your record against them', 'Contestarle con tu registro contra ellos',
        'You read the numbers out slowly. It is devastating and it makes you look about nine per cent less likeable.',
        'Lees los números despacio. Es demoledor y te hace parecer un nueve por ciento menos simpático.',
        { reputation: 7, idol: 6, morale: 3 }, { heat: 18 }),
      O('respect', 'Say you grew up watching him', 'Decir que creciste viéndole jugar',
        'Completely true and completely disarming. He is visibly uncomfortable about it for weeks.',
        'Absolutamente cierto y absolutamente desarmante. Se le ve incómodo durante semanas.',
        { reputation: 9, attrs: { lea: 2 } }, { heat: -6 }),
      O('pitch', 'Answer him on the pitch', 'Contestarle en el campo',
        'You say nothing at all and then have the game of your season against them. It is the only reply anybody remembers.',
        'No dices absolutamente nada y luego haces el partido de tu temporada contra ellos. Es la única respuesta que alguien recuerda.',
        { form: 9, idol: 8, reputation: 5 }, { heat: 12 }),
    ],
  },
  {
    id: 'tapped-up', weight: 1.1,
    when: c => c.heat >= 30 && c.p.age >= 22 && c.p.overall >= 76,
    titleEn: 'They want to sign you',
    titleEs: 'Te quieren fichar',
    descEn: 'An intermediary for {R} has made contact. They know exactly what it would mean, on both sides of the city, and that is part of what they are paying for.',
    descEs: 'Un intermediario del {R} se ha puesto en contacto. Saben perfectamente lo que significaría, en las dos mitades de la ciudad, y parte de lo que pagan es eso.',
    options: [
      O('listen', 'Take the meeting, quietly', 'Ir a la reunión, en silencio',
        'It leaks within a fortnight, because these always do. Your own supporters read the same story you did.',
        'Se filtra en quince días, porque siempre se filtran. Tu afición lee la misma noticia que tú.',
        { money: 0, idol: -14, reputation: 4, morale: -4 }, { heat: 10 }),
      O('refuse', 'Refuse, and let it be known you refused', 'Negarte, y que se sepa que te negaste',
        'It is on the front of the local paper for two days. You could not buy what it does for you at that club.',
        'Sale en portada del periódico local dos días. No podrías comprar lo que eso hace por ti en ese club.',
        { idol: 18, morale: 8, attrs: { lea: 2 } }, { heat: 14 }),
      O('leverage', 'Use it to get a new contract', 'Usarlo para renegociar',
        'Cold, effective, and your agent is thrilled. Something about it sits badly with you for a while.',
        'Frío, eficaz, y tu representante encantado. Algo de todo aquello te sienta mal un tiempo.',
        { money: 3_200_000, idol: -5, morale: -3 }, { heat: 6 }),
    ],
  },
  {
    id: 'keeper-wall', weight: 1.4,
    when: c => isGk(c) && (won(c) || lost(c)),
    titleEn: 'The end behind your goal',
    titleEs: 'La grada detrás de tu portería',
    descEn: 'You spend forty-five minutes of {D} with two thousand of their supporters directly behind you, and they have done their research on your family.',
    descEs: 'Te pasas cuarenta y cinco minutos de {D} con dos mil de los suyos justo detrás, y se han informado sobre tu familia.',
    options: [
      O('conduct', 'Conduct them like an orchestra', 'Dirigirles como a una orquesta',
        'You turn round at 0-0 and start waving your arms. It is the best thing on television that night and you concede in the next move.',
        'Te giras con 0-0 y empiezas a mover los brazos. Es lo mejor de la noche en televisión y te marcan en la jugada siguiente.',
        { reputation: 11, idol: 8, form: -4, discipline: -4 }, { heat: 24 }),
      O('block', 'Block it out completely', 'Bloquearlo por completo',
        'A clean sheet and a goalkeeper who genuinely did not hear a word of it. Your manager mentions it for years.',
        'Portería a cero y un portero que de verdad no oyó nada. Tu entrenador lo menciona durante años.',
        { form: 8, attrs: { lea: 3 }, morale: 4 }, { heat: 3 }),
      O('salute', 'Applaud them at the final whistle', 'Aplaudirles al final',
        'Baffling, disarming, and about a third of them applaud back before they remember who you are.',
        'Desconcertante, desarmante, y un tercio te aplaude antes de acordarse de quién eres.',
        { reputation: 7, morale: 5 }, { heat: -10 }),
    ],
  },
  {
    id: 'injury-tackle', weight: 0.9,
    when: c => c.heat >= 30,
    titleEn: 'You have broken their best player',
    titleEs: 'Has roto a su mejor jugador',
    descEn: 'It was not malicious and it was very late. He is out for five months and their supporters have decided what kind of man you are.',
    descEs: 'No hubo mala intención y llegaste tardísimo. Está cinco meses fuera y su afición ya ha decidido qué clase de persona eres.',
    options: [
      O('visit', 'Go and see him', 'Ir a verle',
        'You drive to his house. He is decent about it, the photograph gets out, and it is the only thing that ever calms this down.',
        'Conduces hasta su casa. Se porta bien, la foto se filtra, y es lo único que llega a calmar esto.',
        { reputation: 10, morale: 4, attrs: { lea: 3 } }, { heat: -18 }),
      O('statement', 'Put out a statement and nothing more', 'Sacar un comunicado y nada más',
        'Written by somebody at the club, believed by nobody, and it does the job it was meant to do.',
        'Escrito por alguien del club, creído por nadie, y cumple exactamente la función que tenía.',
        { discipline: 2, reputation: -2 }, { heat: 6 }),
      O('defend', 'Say you went for the ball', 'Decir que ibas al balón',
        'You did, and it does not matter. You are on the front of their fanzine for a decade.',
        'Ibas, y da igual. Estás en la portada de su fanzine durante una década.',
        { idol: 4, reputation: -6, discipline: -3 }, { heat: 26 }),
    ],
  },
  {
    id: 'derby-week-ban', weight: 0.9,
    when: c => (c.derby?.heat ?? 0) >= 8,
    titleEn: 'The manager has banned everyone from talking',
    titleEs: 'El entrenador ha prohibido hablar',
    descEn: 'Derby week. Nobody speaks to anybody. A journalist gets you alone in a car park anyway and asks whether you are afraid of them.',
    descEs: 'Semana de clásico. Nadie habla con nadie. Un periodista te pilla solo en un aparcamiento y te pregunta si les tienes miedo.',
    options: [
      O('obey', 'Say nothing, exactly as instructed', 'No decir nada, exactamente como te dijeron',
        'The most boring clip of the week. Your manager notices, which is the only thing that was ever at stake.',
        'El vídeo más aburrido de la semana. Tu entrenador se da cuenta, que era lo único en juego.',
        { discipline: 6, form: 3 }),
      O('bite', 'Tell him what you actually think', 'Decirle lo que piensas de verdad',
        'It is on the back page by six. The dressing room loves it and you are fined two weeks\' wages.',
        'Está en la contraportada a las seis. Al vestuario le encanta y te multan con dos semanas de sueldo.',
        { idol: 8, reputation: 7, money: -350_000, discipline: -8 }, { heat: 20 }),
      O('joke', 'Answer with a joke and walk off', 'Contestar con un chiste e irte',
        'Nine words, no story, and it is quoted on that programme all week anyway.',
        'Nueve palabras, ninguna noticia, y aun así lo citan toda la semana en ese programa.',
        { reputation: 5, morale: 4 }, { heat: 5 }),
    ],
  },
  {
    id: 'shirt-swap', weight: 0.8,
    when: c => c.rec.w + c.rec.d + c.rec.l >= 4,
    titleEn: 'He wants to swap shirts',
    titleEs: 'Quiere cambiar la camiseta',
    descEn: 'Their number ten finds you at the whistle and holds his shirt out. Your own end can see the whole thing.',
    descEs: 'Su número diez te busca en el pitido final y te tiende la camiseta. Tu grada lo está viendo entero.',
    options: [
      O('swap', 'Swap it', 'Cambiarla',
        'Two professionals behaving like professionals, and about four hundred people online who consider it treason.',
        'Dos profesionales comportándose como profesionales, y unas cuatrocientas personas en internet que lo consideran traición.',
        { reputation: 5, idol: -5, morale: 3 }, { heat: -8 }),
      O('refuse', 'Refuse it, politely', 'Rechazarla, con educación',
        'You say not tonight and he understands completely. Your end sees it and that is worth more than the shirt.',
        'Le dices que esta noche no y lo entiende perfectamente. Tu grada lo ve y eso vale más que la camiseta.',
        { idol: 9, morale: 4 }, { heat: 8 }),
      O('give', 'Give him yours and take nothing', 'Darle la tuya y no coger nada',
        'A strange, generous gesture nobody quite knows how to read. He keeps it framed.',
        'Un gesto raro y generoso que nadie sabe muy bien cómo leer. Él la conserva enmarcada.',
        { reputation: 7, attrs: { lea: 2 } }, { heat: -12 }),
    ],
  },
  {
    id: 'city-life', weight: 0.9,
    when: c => (c.derby?.city ?? false) && c.rec.w + c.rec.d + c.rec.l >= 2,
    titleEn: 'You have to live here',
    titleEs: 'Aquí es donde vives',
    descEn: 'Same city, same restaurants, same schools. Your neighbour supports {R} and so does your daughter\'s entire class.',
    descEs: 'La misma ciudad, los mismos restaurantes, los mismos colegios. Tu vecino es del {R} y la clase entera de tu hija también.',
    options: [
      O('embrace', 'Lean into it entirely', 'Asumirlo del todo',
        'You take the whole class to training. Half of them still support {R} and all of them defend you forever.',
        'Te llevas a la clase entera a un entrenamiento. La mitad sigue siendo del {R} y todos te defienden para siempre.',
        { idol: 8, reputation: 6, morale: 8 }, { heat: -10 }),
      O('move', 'Move to the other side of the city', 'Mudarte al otro lado de la ciudad',
        'Quieter, and a forty-minute drive to training. Somebody writes that you could not handle it.',
        'Más tranquilo, y cuarenta minutos hasta el entrenamiento. Alguien escribe que no pudiste con ello.',
        { morale: 4, money: -600_000, idol: -3, stamina: -3 }),
      O('stay', 'Stay exactly where you are', 'Quedarte donde estás',
        'Some weeks it is unbearable. It is also the reason that city eventually decides you are one of theirs.',
        'Hay semanas insoportables. También es la razón por la que esa ciudad acaba decidiendo que eres de los suyos.',
        { idol: 11, morale: -3, attrs: { lea: 2 } }),
    ],
  },
  {
    id: 'lost-badly', weight: 1.3,
    when: c => lost(c) && c.season.w === 0,
    titleEn: 'You lost it, and they are not going to let it go',
    titleEs: 'Lo perdiste, y no te lo van a dejar pasar',
    descEn: 'Beaten in {D}, at home. There is a club function in four days that both sets of players attend every year.',
    descEs: 'Derrota en {D}, en casa. Hay un acto dentro de cuatro días al que van los jugadores de los dos clubes cada año.',
    options: [
      O('go', 'Go, and stand there taking it', 'Ir, y aguantarlo de pie',
        'Two hours of the worst small talk of your life. Two of their players tell you afterwards it took something to turn up.',
        'Dos horas de la peor conversación de tu vida. Dos de los suyos te dicen después que hay que tenerlos para aparecer.',
        { attrs: { lea: 4 }, reputation: 6, morale: -5 }),
      O('skip', 'Do not go', 'No ir',
        'Nobody says anything and everybody notices. It is mentioned in a column three weeks later.',
        'Nadie dice nada y todos se dan cuenta. Lo mencionan en una columna tres semanas después.',
        { morale: 3, reputation: -4, idol: -2 }),
      O('promise', 'Go, and promise them next year', 'Ir, y prometerles la revancha',
        'Loudly, with a glass in your hand, in front of witnesses. It is a very long twelve months.',
        'En voz alta, con una copa en la mano y delante de testigos. Son doce meses muy largos.',
        { idol: 6, reputation: 5, form: 5, morale: 2 }, { heat: 18 }),
    ],
  },
  {
    id: 'sweep', weight: 2, once: 'career',
    when: c => c.season.cleanSweep && c.season.fixtures.length >= 2,
    titleEn: 'You beat them home and away',
    titleEs: 'Les ganaste en casa y fuera',
    descEn: 'Every {D} of the season, won. It has happened eleven times in the club\'s history and the supporters have made a song about this one.',
    descEs: 'Todos los {D} de la temporada, ganados. Ha pasado once veces en la historia del club y la afición ya tiene una canción para este.',
    options: [
      O('sing', 'Sing it with them, on the balcony', 'Cantarla con ellos, en el balcón',
        'You do not know the words and it does not matter at all. The video is the most-watched thing that club ever posts.',
        'No te sabes la letra y da exactamente igual. El vídeo es lo más visto que ha publicado ese club.',
        { idol: 14, morale: 10, reputation: 6 }, { heat: 20 }),
      O('humble', 'Say it is three points twice and nothing more', 'Decir que son tres puntos dos veces y nada más',
        'Nobody believes you, including you. It is the correct thing to say and it ages extremely well.',
        'No te cree nadie, tú tampoco. Es lo correcto y envejece estupendamente.',
        { reputation: 8, discipline: 4, idol: 5 }),
      O('tattoo', 'Get the date tattooed', 'Tatuarte la fecha',
        'A small line of numbers on your ribs. In nineteen years somebody in a bar asks what it is and you tell the whole story.',
        'Una línea pequeña de números en las costillas. Diecinueve años después alguien en un bar pregunta y cuentas la historia entera.',
        { idol: 12, morale: 8, money: -25_000 }, { heat: 12, flag: 'derbyTattoo' }),
    ],
  },
];

/** Draw a derby event that fits, or nothing at all. */
export function pickRivalEvent(c: RivalCtx, rng: Rng): RivalEventDef | null {
  const pool = RIVAL_EVENTS.filter(e => {
    if (e.once === 'career' && c.p.flags?.[`derby:${e.id}`]) return false;
    return e.when(c);
  });
  if (!pool.length) return null;
  const total = pool.reduce((a, e) => a + e.weight, 0);
  let r = rng.next() * total;
  for (const e of pool) { r -= e.weight; if (r <= 0) return e; }
  return pool[pool.length - 1];
}

/** Fill {R} {C} {D} {P}. */
export function fillRivalCopy(s: string, p: CareerPlayer, rivalId: string, derby: Derby | null, lang: Lang): string {
  const es = lang === 'es';
  const rival = getClub(rivalId);
  const club = p.clubId ? getClub(p.clubId) : null;
  const fallback = es ? 'el clásico' : 'the derby';
  return s
    .replace(/\{R\}/g, rival?.name ?? '')
    .replace(/\{C\}/g, club?.name ?? '')
    .replace(/\{D\}/g, derby ? (es ? derby.es : derby.en) : fallback)
    .replace(/\{P\}/g, p.surname);
}

export const rivalTitle = (e: RivalEventDef, lang: Lang) => (lang === 'es' ? e.titleEs : e.titleEn);
export const rivalDesc = (e: RivalEventDef, lang: Lang) => (lang === 'es' ? e.descEs : e.descEn);
export const rivalOptLabel = (o: RivalOption, lang: Lang) => (lang === 'es' ? o.es : o.en);
export const rivalOptOutcome = (o: RivalOption, lang: Lang) => (lang === 'es' ? o.outcomeEs : o.outcomeEn);

/** Apply a chosen option: the usual effects, plus what it does to the bad blood. */
export function applyRivalOption(
  p: CareerPlayer, rivalId: string, o: RivalOption,
): CareerPlayer {
  const next = applyEffects(p, o.effects);
  const rec = { ...(next.derbyRecord ?? {}) };
  const cur = { ...(rec[rivalId] ?? emptyRecord()) };
  cur.heat = clamp(0, 100, cur.heat + (o.heat ?? 0));
  rec[rivalId] = cur;
  const flags = { ...next.flags };
  if (o.flag) flags[o.flag] = true;
  return { ...next, derbyRecord: rec, flags };
}

/** How the panel describes a rivalry's temperature. */
export function heatLabel(heat: number, lang: Lang): string {
  const es = lang === 'es';
  if (heat >= 80) return es ? 'Guerra abierta' : 'Open warfare';
  if (heat >= 60) return es ? 'Muy caliente' : 'Bad blood';
  if (heat >= 35) return es ? 'Picante' : 'Needle';
  if (heat >= 15) return es ? 'Tensa' : 'Tense';
  return es ? 'Correcta' : 'Cordial';
}
