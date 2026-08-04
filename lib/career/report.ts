// The end-of-season report.
//
// A season used to be six numbers and one sentence: "24 apps, 1 goal, 0 assists,
// 5.9 — a year to forget." That is a scoreline, not a season. It never said
// where the club finished, who knocked them out of the cup, whether the country
// called, or what the decision you agonised over in the summer actually did.
//
// This module turns a SeasonRecord into something worth reading: how the club
// did competition by competition, what happened with your country, a verdict on
// your own numbers that knows what your position is *for*, the aftermath of your
// last decision, and a couple of beats of colour.
//
// Everything here is derived, deterministic and bilingual. The variant picking
// is seeded off the record itself so a season reads the same every render and
// the same in both languages — the report is a fact about the season, not a
// fresh roll each time the component mounts.
import type { Position } from '@/data/types';
import type {
  CareerPlayer, SeasonRecord, CompRun, CompStage, Title,
} from '@/data/career/types';
import { getClub } from '@/data/career/clubs';
import { getLeague, leagueName } from '@/data/career/leagues';
import { getNation } from '@/data/career/nations';
import { domesticCupName } from '@/data/career/cups';
import type { NtSeason } from './international';
import { reasonLabel, resultLabel, roleLabel } from './international';
import { titleLabel, type Lang } from './i18n';
import { titleName } from './competitions';
import { eventById } from './events';
import { clamp } from './rng';

export type Tone = 'great' | 'good' | 'ok' | 'bad' | 'neutral';

export interface ReportLine {
  icon: string;
  /** competition or section name */
  label: string;
  /** the short result, e.g. "Champions" or "3rd of 20" */
  result: string;
  /** the sentence underneath */
  detail: string;
  tone: Tone;
}

export interface DecisionReport {
  title: string;
  option: string;
  outcome: string;
}

export interface SeasonReport {
  /** the one-line verdict on your season */
  verdict: string;
  verdictTone: Tone;
  /** a short banner word for the rating */
  grade: string;
  /** per-90-ish summary line under the verdict */
  summary: string;
  club: ReportLine[];
  nation: ReportLine;
  /** position-aware commentary on your own numbers */
  notes: string[];
  decision: DecisionReport | null;
  /** headlines the engine wrote during the season, plus generated colour */
  news: string[];
  titles: { label: string; title: Title }[];
}

const L = (lang: Lang, en: string, es: string) => (lang === 'es' ? es : en);
type Pair = [string, string];
const P = (lang: Lang, p: Pair) => p[lang === 'es' ? 1 : 0];

// ---- deterministic variant picking -----------------------------------------

/**
 * A season's report has to read the same every time the card renders, so the
 * variants are chosen by hashing the season rather than rolling dice. Mixing in
 * the stat line as well as the year means two identical-looking years at the
 * same club still get different phrasing.
 */
function seasonHash(rec: SeasonRecord): number {
  let h = 0x811c9dc5;
  const mix = (n: number) => { h ^= n & 0xffff; h = Math.imul(h, 0x01000193) >>> 0; };
  mix(rec.year); mix(rec.age); mix(rec.apps); mix(rec.goals);
  mix(rec.assists); mix(Math.round(rec.rating * 10)); mix(rec.cleanSheets);
  for (let i = 0; i < rec.clubId.length; i++) mix(rec.clubId.charCodeAt(i));
  return h >>> 0;
}
/** Pick from a list using the season hash, offset so each call site differs. */
function pickBy<T>(hash: number, salt: number, arr: T[]): T {
  return arr[(Math.imul(hash ^ (salt * 0x9e3779b1), 0x85ebca6b) >>> 0) % arr.length];
}

// ---- position groups --------------------------------------------------------

export type PosGroup = 'gk' | 'cb' | 'fb' | 'dm' | 'cm' | 'am' | 'wing' | 'st';

export function posGroup(pos: Position): PosGroup {
  switch (pos) {
    case 'GK': return 'gk';
    case 'CB': return 'cb';
    case 'LB': case 'RB': case 'LWB': case 'RWB': return 'fb';
    case 'CDM': return 'dm';
    case 'CM': case 'LM': case 'RM': return 'cm';
    case 'CAM': return 'am';
    case 'LW': case 'RW': return 'wing';
    default: return 'st';
  }
}

// ---- competition labels ------------------------------------------------------

const STAGE: Record<CompStage, Pair> = {
  group: ['Group stage', 'Fase de grupos'],
  r32: ['Last 32', 'Dieciseisavos'],
  r16: ['Last 16', 'Octavos de final'],
  qf: ['Quarter-finals', 'Cuartos de final'],
  sf: ['Semi-finals', 'Semifinales'],
  final: ['Runners-up', 'Subcampeón'],
  won: ['WINNERS', 'CAMPEÓN'],
};

export function stageLabel(s: CompStage, lang: Lang): string {
  return P(lang, STAGE[s]);
}

function ordinal(n: number, lang: Lang): string {
  if (lang === 'es') return `${n}º`;
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

function compName(c: CompRun, clubId: string, lang: Lang): string {
  const club = getClub(clubId);
  const league = club ? getLeague(club.leagueId) : null;
  if (c.kind === 'league') return league ? leagueName(league.id, lang) : titleLabel('league', lang);
  if (c.kind === 'cup') {
    return domesticCupName(league?.nationCode, lang) ?? titleLabel('domestic-cup', lang);
  }
  return titleLabel(c.key, lang);
}

// ---- the club's season -------------------------------------------------------

function leagueLine(c: CompRun, rec: SeasonRecord, lang: Lang, hash: number): ReportLine {
  const label = compName(c, rec.clubId, lang);
  const pos = c.position ?? 0;
  const teams = c.teams ?? 20;
  const result = c.won
    ? L(lang, 'CHAMPIONS', 'CAMPEÓN')
    : L(lang, `${ordinal(pos, lang)} of ${teams}`, `${ordinal(pos, lang)} de ${teams}`);

  let tone: Tone = 'ok';
  let detail: string;
  if (c.won) {
    tone = 'great';
    detail = P(lang, pickBy<Pair>(hash, 11, [
      ['The title is yours. The parade route was already booked.',
       'El título es vuestro. El recorrido del bus ya estaba reservado.'],
      ['Champions. Nobody could live with you over a whole season.',
       'Campeones. Nadie os aguantó el ritmo en toda la temporada.'],
      ['Top of the table, and it was never really close.',
       'Primeros de la tabla, y nunca hubo demasiada discusión.'],
    ]));
  } else if (pos === 2) {
    tone = 'good';
    detail = P(lang, pickBy<Pair>(hash, 12, [
      ['Second. The cruellest position in football.',
       'Segundos. La posición más cruel del fútbol.'],
      ['Runners-up. You will replay two dropped points all summer.',
       'Subcampeones. Vas a repasar dos puntos perdidos todo el verano.'],
    ]));
  } else if (pos <= 4) {
    tone = 'good';
    detail = P(lang, pickBy<Pair>(hash, 13, [
      ['Continental football secured. That was the season\'s job.',
       'Plaza continental asegurada. Ese era el trabajo de la temporada.'],
      ['Top four. Not glory, but nobody gets sacked over it.',
       'Entre los cuatro primeros. No es gloria, pero nadie pierde el puesto.'],
    ]));
  } else if (pos <= teams / 2) {
    tone = 'ok';
    detail = P(lang, pickBy<Pair>(hash, 14, [
      ['A mid-table finish. Safe by March, forgotten by June.',
       'Media tabla. Salvados en marzo, olvidados en junio.'],
      ['Comfortable, anonymous, over.', 'Cómodo, anónimo, terminado.'],
    ]));
  } else if (pos < teams - 2) {
    tone = 'bad';
    detail = P(lang, pickBy<Pair>(hash, 15, [
      ['The bottom half. Too many afternoons nobody enjoyed.',
       'Mitad baja de la tabla. Demasiadas tardes que nadie disfrutó.'],
      ['A season spent looking down the table, not up it.',
       'Una temporada mirando hacia abajo en la tabla, no hacia arriba.'],
    ]));
  } else {
    tone = 'bad';
    detail = P(lang, pickBy<Pair>(hash, 16, [
      ['Survival went to the last day. It should never have been that close.',
       'La permanencia se decidió el último día. Nunca debió apretar tanto.'],
      ['A relegation fight from November onwards. Brutal.',
       'Pelea por no descender desde noviembre. Brutal.'],
    ]));
  }
  return { icon: '🏟️', label, result, detail, tone };
}

function knockoutLine(
  c: CompRun, rec: SeasonRecord, lang: Lang, hash: number, salt: number,
): ReportLine {
  const label = compName(c, rec.clubId, lang);
  const icon = c.kind === 'cup' ? '🥇' : '🌍';
  if (!c.entered) {
    return {
      icon, label,
      result: L(lang, 'Not in it', 'Sin plaza'),
      // A place is earned by *last* season's table, so a club can win the league
      // and still have spent this year without European nights. Say so, or the
      // line reads as a contradiction sitting under "CHAMPIONS".
      detail: L(lang,
        'Last season\'s finish earned no continental place. Wednesdays were free.',
        'La clasificación del año pasado no dio plaza continental. Los miércoles quedaron libres.'),
      tone: 'neutral',
    };
  }
  const stage = c.stage ?? 'group';
  const result = stageLabel(stage, lang);
  if (c.won) {
    return {
      icon: '🏆', label, result,
      detail: P(lang, pickBy<Pair>(hash, salt, [
        ['Won it. That trophy has your name on the base of it.',
         'La ganasteis. Ese trofeo lleva tu nombre grabado en la base.'],
        ['Lifted. Some nights you remember for the rest of your life.',
         'Levantada. Hay noches que se recuerdan toda la vida.'],
      ])),
      tone: 'great',
    };
  }
  const map: Record<CompStage, { tone: Tone; lines: Pair[] }> = {
    won: { tone: 'great', lines: [['Won it.', 'La ganasteis.']] },
    final: {
      tone: 'good',
      lines: [
        ['Beaten in the final. The medal goes in a drawer, not on a wall.',
         'Derrota en la final. Esa medalla va a un cajón, no a una pared.'],
        ['So close. One night away from everything.',
         'Tan cerca. A una noche de todo.'],
      ],
    },
    sf: {
      tone: 'good',
      lines: [
        ['Out in the semis. The hardest round to lose.',
         'Fuera en semifinales. La ronda más dura de perder.'],
        ['A semi-final is a good run that nobody remembers.',
         'Una semifinal es una buena campaña que nadie recuerda.'],
      ],
    },
    qf: {
      tone: 'ok',
      lines: [
        ['Knocked out in the quarters.', 'Eliminados en cuartos de final.'],
        ['The quarter-final tie got away from you.',
         'La eliminatoria de cuartos se os escapó.'],
      ],
    },
    r16: {
      tone: 'ok',
      lines: [
        ['Out in the last 16. Not a disgrace, not a run either.',
         'Fuera en octavos. Ni una vergüenza ni una campaña.'],
      ],
    },
    r32: {
      tone: 'bad',
      lines: [
        ['Dumped out early by a side from a lower division. Ugly night.',
         'Eliminados temprano por un equipo de división inferior. Noche fea.'],
        ['An early exit nobody at the club wants to talk about.',
         'Una eliminación temprana de la que nadie en el club quiere hablar.'],
      ],
    },
    group: {
      tone: 'bad',
      lines: [
        ['Did not survive the group. Home before the knockouts started.',
         'No superasteis el grupo. En casa antes de que empezaran las eliminatorias.'],
      ],
    },
  };
  const m = map[stage];
  return { icon, label, result, detail: P(lang, pickBy(hash, salt, m.lines)), tone: m.tone };
}

// ---- the national team -------------------------------------------------------

function nationLine(p: CareerPlayer, nt: NtSeason | null, lang: Lang, hash: number): ReportLine {
  const nation = getNation(p.ntNationCode);
  const name = nation ? P(lang, [nation.en, nation.es]) : p.ntNationCode;
  const icon = nation?.flag ?? '🌐';

  if (!nt || !nt.calledUp) {
    const reason = nt?.reason
      ? reasonLabel(nt.reason, name, lang)
      : L(lang, 'The call never came.', 'La llamada no llegó.');
    const near = nt?.proximity ?? 0;
    const how = near >= 80
      ? L(lang, ` You were close — ${near}% of the way there.`,
             ` Estuviste cerca — ${near}% del camino.`)
      : '';
    return {
      icon, label: name,
      result: L(lang, 'Not called up', 'Sin convocatoria'),
      detail: reason + how,
      tone: 'bad',
    };
  }

  const role = nt.role ? roleLabel(nt.role, lang) : '';
  const t = nt.tournament;
  // The season total counts qualifiers and friendlies too, so it must never be
  // read out next to a tournament result — "15 caps · group stage" said you
  // played fifteen games at a World Cup you went out of after three.
  const caps = (n: number, g: number) => L(lang,
    `${n} cap${n === 1 ? '' : 's'}, ${g} goal${g === 1 ? '' : 's'}.`,
    `${n} partido${n === 1 ? '' : 's'}, ${g} gol${g === 1 ? '' : 'es'}.`);
  const season = caps(nt.caps, nt.goals);

  if (!t) {
    return {
      icon, label: name,
      result: role,
      detail: `${season} ` + P(lang, pickBy<Pair>(hash, 21, [
        ['No tournament this year — qualifiers and friendlies only.',
         'Sin torneo este año — solo clasificatorios y amistosos.'],
        ['A year of qualifiers. The real thing comes later.',
         'Un año de eliminatorias. Lo importante viene después.'],
      ])),
      tone: nt.role === 'star' || nt.role === 'starter' ? 'good' : 'ok',
    };
  }

  const tname = titleLabel(t.key, lang);
  if (!t.qualified) {
    return {
      icon, label: `${name} · ${tname}`,
      result: L(lang, 'Did not qualify', 'No clasificó'),
      detail: `${season} ` + L(lang,
        'The qualifiers were not enough. You watched the tournament on television.',
        'Las eliminatorias no alcanzaron. Viste el torneo por televisión.'),
      tone: 'bad',
    };
  }

  const detailMap: Record<string, Pair> = {
    champion: ['You are a champion of the world you play in. Nothing else compares.',
               'Sois campeones. Nada se compara con esto.'],
    'runner-up': ['One game short. That medal will always be the wrong colour.',
                  'A un partido. Esa medalla siempre tendrá el color equivocado.'],
    sf: ['A semi-final with your country. The dream stayed alive for weeks.',
         'Una semifinal con tu selección. El sueño duró semanas.'],
    qf: ['Out in the quarters. A good tournament that ended in one bad hour.',
         'Fuera en cuartos. Un buen torneo terminado en una mala hora.'],
    r16: ['Out in the last 16.', 'Eliminados en octavos.'],
    group: ['Group stage and home. Three games is not a tournament.',
            'Fase de grupos y a casa. Tres partidos no son un torneo.'],
  };
  const d = detailMap[t.result] ?? ['', ''];
  const tone: Tone = t.result === 'champion' ? 'great'
    : t.result === 'runner-up' || t.result === 'sf' ? 'good'
      : t.result === 'group' ? 'bad' : 'ok';
  const atIt = L(lang,
    `${t.caps} at the tournament, ${t.goals} scored.`,
    `${t.caps} en el torneo, ${t.goals} gol${t.goals === 1 ? '' : 'es'}.`);
  const year = L(lang, `${nt.caps} caps across the year.`, `${nt.caps} partidos en todo el año.`);
  return {
    icon: t.result === 'champion' ? '🏆' : icon,
    label: `${name} · ${tname}`,
    result: resultLabel(t.result, lang),
    detail: `${atIt} ${year} ${P(lang, d as Pair)}`,
    tone,
  };
}

// ---- your own numbers --------------------------------------------------------

interface Facts {
  apps: number; goals: number; assists: number; cleanSheets: number;
  rating: number; age: number; share: number;
  gpa: number; apa: number; csr: number;
  derby: number; group: PosGroup; onLoan: boolean;
}

interface Note {
  /** higher wins when the list is trimmed */
  weight: number;
  when: (f: Facts) => boolean;
  lines: Pair[];
}

/**
 * What your numbers mean *for your position*. Ten goals is a triumph from
 * centre-back, a warning sign from centre-forward and background noise from
 * central midfield — the same row in the table has to say three different
 * things, or it says nothing at all.
 */
const NOTES: Note[] = [
  // ---- never played ----
  {
    weight: 100,
    when: f => f.apps === 0,
    lines: [
      ['You did not play a single minute all season. A year of your career, gone.',
       'No jugaste un solo minuto en toda la temporada. Un año de tu carrera, tirado.'],
    ],
  },
  {
    weight: 95,
    when: f => f.apps > 0 && f.share < 0.2,
    lines: [
      ['Barely used. Warming up on the touchline is not a career.',
       'Apenas contaron contigo. Calentar en la banda no es una carrera.'],
      ['A season of substitute appearances and long walks back to the bench.',
       'Una temporada de entrar desde el banquillo y volver caminando a él.'],
    ],
  },
  {
    weight: 55,
    when: f => f.share >= 0.93 && f.apps >= 20,
    lines: [
      ['Ever-present. The manager never once thought about leaving you out.',
       'Indiscutible. Al entrenador no se le pasó por la cabeza dejarte fuera.'],
      ['You played everything. Every competition, every round, every week.',
       'Lo jugaste todo. Todas las competiciones, todas las rondas, todas las semanas.'],
    ],
  },

  // ---- striker / centre-forward ----
  {
    weight: 92,
    when: f => f.group === 'st' && f.apps >= 12 && f.gpa >= 0.8,
    lines: [
      ['A goal a game. Defenders talked about you in the week before playing you.',
       'Un gol por partido. Los defensas hablaban de ti la semana previa a enfrentarte.'],
      ['Numbers that do not belong in a normal season. You were unplayable.',
       'Números que no caben en una temporada normal. Fuiste ingobernable.'],
    ],
  },
  {
    weight: 88,
    when: f => f.group === 'st' && f.apps >= 12 && f.gpa >= 0.55,
    lines: [
      ['A proper centre-forward\'s return. You were the first name on the team sheet.',
       'Números de un nueve de verdad. Eras el primer nombre de la alineación.'],
      ['You scored in every kind of game — the easy ones and the ones that mattered.',
       'Marcaste en todo tipo de partidos: en los fáciles y en los que importaban.'],
    ],
  },
  {
    weight: 70,
    when: f => f.group === 'st' && f.apps >= 12 && f.gpa >= 0.22 && f.gpa < 0.55,
    lines: [
      ['A respectable haul, without ever making the season yours.',
       'Un botín respetable, sin llegar a hacer tuya la temporada.'],
      ['You scored enough to keep the shirt and not enough to be talked about.',
       'Marcaste lo justo para mantener el puesto y no lo suficiente para que hablaran de ti.'],
    ],
  },
  {
    weight: 94,
    when: f => f.group === 'st' && f.apps >= 15 && f.gpa < 0.12,
    lines: [
      ['A striker who does not score is a problem, and everyone in the stadium knows the arithmetic.',
       'Un delantero que no marca es un problema, y todo el estadio sabe hacer esa cuenta.'],
      ['The drought lasted months. You stopped celebrating the ones that did go in.',
       'La sequía duró meses. Dejaste de celebrar los pocos que entraron.'],
    ],
  },
  {
    // One in four games is modest, not a failure — the "not enough goals" line
    // used to reach up to 0.3, which called a teenager with nine in the league
    // a problem striker.
    weight: 86,
    when: f => f.group === 'st' && f.apps >= 15 && f.gpa >= 0.12 && f.gpa < 0.22,
    lines: [
      ['Not enough goals for a number nine. That is the whole job description.',
       'Pocos goles para un nueve. Ese es literalmente el trabajo.'],
      ['You worked, you pressed, you held it up — and you did not score.',
       'Trabajaste, presionaste, aguantaste el balón — y no marcaste.'],
    ],
  },
  {
    weight: 74,
    when: f => f.group === 'st' && f.apps >= 12 && f.apa >= 0.3,
    lines: [
      ['More provider than finisher this year — you dropped in and made them instead.',
       'Más asistente que definidor este año — bajaste a construir en lugar de rematar.'],
    ],
  },

  // ---- wingers ----
  {
    weight: 90,
    when: f => f.group === 'wing' && f.apps >= 12 && f.apa >= 0.4,
    lines: [
      ['Full-backs did not sleep the night before playing you. The assists piled up.',
       'Los laterales no dormían la noche antes de enfrentarte. Las asistencias se acumularon.'],
      ['You beat your man all season, and someone was always arriving at the far post.',
       'Ganaste el uno contra uno todo el año, y siempre había alguien llegando al segundo palo.'],
    ],
  },
  {
    weight: 88,
    when: f => f.group === 'wing' && f.apps >= 12 && f.gpa >= 0.45,
    lines: [
      ['A winger scoring like a centre-forward. You came inside and punished people.',
       'Un extremo marcando como un nueve. Entrabas hacia dentro y castigabas.'],
    ],
  },
  {
    weight: 84,
    when: f => f.group === 'wing' && f.apps >= 15 && f.gpa + f.apa < 0.2,
    lines: [
      ['Anonymous on the flank. Wingers are judged on end product and yours never came.',
       'Anónimo en la banda. A un extremo se le juzga por el último pase, y el tuyo no llegó.'],
    ],
  },
  {
    weight: 52,
    when: f => f.group === 'wing' && f.apps >= 15 && f.gpa + f.apa >= 0.2 && f.gpa + f.apa < 0.45,
    lines: [
      ['Dangerous in spells. The good half-hours were very good and there were not enough of them.',
       'Peligroso a ratos. Las buenas medias horas fueron muy buenas y hubo pocas.'],
      ['You got at your full-back all year without quite punishing him often enough.',
       'Encaraste a tu lateral todo el año sin llegar a castigarle lo suficiente.'],
    ],
  },
  {
    weight: 52,
    when: f => f.group === 'st' && f.apps >= 15 && f.assists >= 6,
    lines: [
      ['The goals were modest, but you set up plenty. A nine who plays for the team.',
       'Los goles fueron discretos, pero regalaste muchos. Un nueve que juega para el equipo.'],
    ],
  },

  // ---- attacking midfielder ----
  {
    weight: 90,
    when: f => f.group === 'am' && f.apps >= 12 && f.apa >= 0.45,
    lines: [
      ['Everything good came through you. The pass before the goal was yours all year.',
       'Todo lo bueno pasó por ti. El pase antes del gol fue tuyo todo el año.'],
      ['You saw things nobody else on the pitch saw, and then you executed them.',
       'Viste cosas que nadie más en el campo vio, y encima las ejecutaste.'],
    ],
  },
  {
    weight: 82,
    when: f => f.group === 'am' && f.apps >= 12 && f.gpa >= 0.4,
    lines: [
      ['A ten arriving late in the box, over and over. Impossible to pick up.',
       'Un diez llegando desde atrás al área, una y otra vez. Imposible de marcar.'],
    ],
  },
  {
    weight: 84,
    when: f => f.group === 'am' && f.apps >= 15 && f.apa < 0.15 && f.gpa < 0.2,
    lines: [
      ['No final ball, no goals. A number ten without either is just a passenger.',
       'Sin último pase y sin goles. Un diez sin ninguna de las dos cosas sobra.'],
    ],
  },

  // ---- central / wide midfield ----
  {
    weight: 88,
    when: f => f.group === 'cm' && f.apps >= 12 && f.goals >= 10,
    lines: [
      ['Double figures from midfield. Arriving in the box is the rarest habit in football.',
       'Dobles cifras desde el medio. Llegar al área es la costumbre más rara del fútbol.'],
    ],
  },
  {
    weight: 80,
    when: f => f.group === 'cm' && f.apps >= 12 && f.apa >= 0.28,
    lines: [
      ['The tempo was whatever you decided it was, and the assists proved it.',
       'El ritmo fue el que tú decidiste, y las asistencias lo demostraron.'],
    ],
  },
  {
    weight: 62,
    when: f => f.group === 'cm' && f.apps >= 18 && f.goals + f.assists <= 3,
    lines: [
      ['Honest, unnoticed midfield work. The stats page will never do it justice.',
       'Trabajo honesto y silencioso en el medio. La hoja de estadísticas nunca le hará justicia.'],
    ],
  },

  // ---- holding midfield ----
  {
    weight: 86,
    when: f => f.group === 'dm' && f.apps >= 12 && f.goals >= 6,
    lines: [
      ['Six goals from in front of the back four. Nobody expected that, least of all you.',
       'Seis goles desde delante de la defensa. Nadie lo esperaba, tú menos que nadie.'],
    ],
  },
  {
    weight: 66,
    when: f => f.group === 'dm' && f.apps >= 15,
    lines: [
      ['You broke play up all season. It never trends, but the team feels it when you are out.',
       'Cortaste juego toda la temporada. Nunca es noticia, pero el equipo lo nota cuando faltas.'],
      ['The unglamorous job, done properly, thirty-odd times.',
       'El trabajo ingrato, bien hecho, treinta y tantas veces.'],
    ],
  },

  // ---- full-backs / wing-backs ----
  {
    weight: 88,
    when: f => f.group === 'fb' && f.apps >= 12 && f.assists >= 8,
    lines: [
      ['A full-back with the assist numbers of a winger. You lived in the opposition half.',
       'Un lateral con números de extremo. Viviste en el campo rival.'],
    ],
  },
  {
    weight: 86,
    when: f => f.group === 'fb' && f.apps >= 12 && f.goals >= 5,
    lines: [
      ['Five goals from full-back. That is not supposed to happen and it happened anyway.',
       'Cinco goles desde el lateral. Eso no debería pasar y pasó igual.'],
    ],
  },
  {
    weight: 68,
    when: f => f.group === 'fb' && f.apps >= 15 && f.csr >= 0.32,
    lines: [
      ['Up and down that flank every week, and the clean sheets came with it.',
       'Subiendo y bajando esa banda cada semana, y las porterías a cero llegaron con ello.'],
    ],
  },

  // ---- centre-backs ----
  {
    weight: 88,
    when: f => f.group === 'cb' && f.apps >= 12 && f.goals >= 6,
    lines: [
      ['Six goals from centre-back. Every corner became an event.',
       'Seis goles desde el eje de la defensa. Cada córner se convirtió en un acontecimiento.'],
      ['You were a threat at both ends — half the goals came from set pieces you attacked.',
       'Fuiste peligro en las dos áreas — la mitad llegó en jugadas a balón parado que atacaste.'],
    ],
  },
  {
    weight: 78,
    when: f => f.group === 'cb' && f.apps >= 12 && f.goals >= 3 && f.goals < 6,
    lines: [
      ['A few goals from set pieces. Defenders who score win their team points.',
       'Algún gol a balón parado. Los defensas que marcan dan puntos.'],
    ],
  },
  {
    weight: 80,
    when: f => f.group === 'cb' && f.apps >= 15 && f.csr >= 0.38,
    lines: [
      ['A wall. Strikers went home having touched the ball six times.',
       'Un muro. Los delanteros se iban a casa habiendo tocado el balón seis veces.'],
    ],
  },
  {
    weight: 82,
    when: f => f.group === 'cb' && f.apps >= 15 && f.csr < 0.12,
    lines: [
      ['The back line leaked all season. A centre-back is judged on that and nothing else.',
       'La defensa hizo agua toda la temporada. A un central se le juzga por eso y por nada más.'],
    ],
  },

  // ---- goalkeepers ----
  {
    weight: 88,
    when: f => f.group === 'gk' && f.apps >= 15 && f.csr >= 0.4,
    lines: [
      ['Clean sheet after clean sheet. Goalkeepers are measured in silence, and yours was loud.',
       'Portería a cero tras portería a cero. A los porteros se les mide en silencios, y el tuyo se oyó.'],
    ],
  },
  {
    weight: 84,
    when: f => f.group === 'gk' && f.apps >= 15 && f.csr < 0.12,
    lines: [
      ['You picked the ball out of your own net far too often. Some of it was not your fault.',
       'Sacaste el balón de tu red demasiadas veces. Parte de la culpa no era tuya.'],
    ],
  },
  {
    weight: 60,
    when: f => f.group === 'gk' && f.apps >= 15,
    lines: [
      ['A season between the posts: nobody names the keeper when things go well.',
       'Una temporada bajo palos: nadie nombra al portero cuando todo va bien.'],
    ],
  },

  // ---- context ----
  {
    weight: 91,
    when: f => f.derby >= 2,
    lines: [
      ['You scored in the derby. More than once. That is the kind of thing that gets sung.',
       'Marcaste en el clásico. Más de una vez. De eso salen los cánticos.'],
    ],
  },
  {
    weight: 89,
    when: f => f.derby === 1,
    lines: [
      ['One derby goal — worth ten of the others to the people in the stands.',
       'Un gol en el clásico — vale por diez de los otros para la gente de la grada.'],
    ],
  },
  {
    weight: 76,
    when: f => f.rating >= 8.6 && f.apps >= 18,
    lines: [
      ['Season ratings like that put you in the conversation for every individual award.',
       'Con esas notas te metes en la conversación de todos los premios individuales.'],
    ],
  },
  {
    weight: 72,
    when: f => f.rating <= 5.9 && f.apps >= 15,
    lines: [
      ['The performances were flat for months. You know it, and so does the crowd.',
       'El rendimiento fue plano durante meses. Tú lo sabes, y la grada también.'],
    ],
  },
  {
    weight: 70,
    when: f => f.age <= 19 && f.apps >= 18,
    lines: [
      ['A teenager playing this much is a statement from the manager, not an accident.',
       'Que un adolescente juegue tanto es una declaración del entrenador, no una casualidad.'],
    ],
  },
  {
    weight: 68,
    when: f => f.age >= 35 && f.apps >= 20,
    lines: [
      ['At your age, this many games is its own achievement. The legs still answer.',
       'A tu edad, tantos partidos ya son un logro. Las piernas siguen respondiendo.'],
    ],
  },
  {
    weight: 64,
    when: f => f.onLoan,
    lines: [
      ['A loan is an audition. This is the tape they will watch.',
       'Una cesión es una prueba. Esta es la cinta que van a ver.'],
    ],
  },

  // ---- floor ----
  // Every season has to say *something* about the player, or a perfectly
  // ordinary year for a centre-back renders an empty "Your year" heading. These
  // sit below every rule above and only surface when nothing sharper matched.
  {
    weight: 20,
    when: f => f.apps >= 10 && (f.group === 'cb' || f.group === 'fb' || f.group === 'gk'),
    lines: [
      ['A defender\'s season is measured in things that did not happen. Yours was steady.',
       'La temporada de un defensa se mide en lo que no pasó. La tuya fue seria.'],
      ['You defended well enough that nobody wrote about you. Take that as praise.',
       'Defendiste lo bastante bien como para que nadie escribiera sobre ti. Tómalo como un elogio.'],
    ],
  },
  {
    weight: 20,
    when: f => f.apps >= 10 && (f.group === 'dm' || f.group === 'cm' || f.group === 'am'),
    lines: [
      ['A midfielder\'s year: thousands of passes, and two or three anyone remembers.',
       'Un año de centrocampista: miles de pases, y dos o tres que alguien recuerda.'],
      ['You held the middle of the pitch together for another season.',
       'Sostuviste el centro del campo una temporada más.'],
    ],
  },
  {
    weight: 20,
    when: f => f.apps >= 10 && (f.group === 'wing' || f.group === 'st'),
    lines: [
      ['An attacker is only ever as good as his last month, and yours was fine.',
       'A un atacante se le juzga por su último mes, y el tuyo estuvo bien.'],
      ['You gave the defenders something to think about most weeks.',
       'Diste trabajo a los defensas casi todas las semanas.'],
    ],
  },
  {
    weight: 18,
    when: f => f.apps >= 10 && f.goals >= 1 && f.assists >= 1 && f.group !== 'gk',
    lines: [
      ['Goals and assists both on the sheet. A rounded contribution.',
       'Goles y asistencias en la misma hoja. Una aportación completa.'],
    ],
  },
];

/** Anything at or below this weight is filler, and only one may ever show. */
const FLOOR_WEIGHT = 25;

/**
 * Up to three observations, sharpest first — but never a wall of filler. A
 * season with nothing distinctive about it gets one generic line, not three
 * generic lines dressed up as analysis.
 */
function chooseNotes(f: Facts): Note[] {
  const hits = NOTES.filter(n => n.when(f)).sort((a, b) => b.weight - a.weight);
  const sharp = hits.filter(n => n.weight > FLOOR_WEIGHT).slice(0, 3);
  // Filler only stands in for silence, never alongside a real observation —
  // "not enough goals for a number nine" followed by "you gave the defenders
  // something to think about" argues with itself.
  if (sharp.length > 0) return sharp;
  const filler = hits.find(n => n.weight <= FLOOR_WEIGHT);
  return filler ? [filler] : [];
}

// ---- colour ------------------------------------------------------------------

interface Colour { when: (f: Facts, rec: SeasonRecord) => boolean; lines: Pair[] }

/**
 * Beats that are not results: the texture of a year. Picked deterministically so
 * a season keeps its own small stories.
 */
const COLOUR: Colour[] = [
  {
    when: (f) => f.rating >= 8.2 && f.apps >= 20,
    lines: [
      ['📺 A weekly highlights package ran your name over the opening titles for a month.',
       '📺 Un programa de resúmenes puso tu nombre en la cabecera durante un mes.'],
      ['👕 Yours was the shirt the club sold most of. The number outsold the crest.',
       '👕 Tu camiseta fue la más vendida del club. El dorsal vendió más que el escudo.'],
      ['🎙️ You were asked the same question in forty press conferences and answered it forty ways.',
       '🎙️ Te hicieron la misma pregunta en cuarenta ruedas de prensa y respondiste de cuarenta formas.'],
    ],
  },
  {
    when: (f) => f.rating < 6.2 && f.apps >= 15,
    lines: [
      ['📰 A local columnist wrote that you looked tired. It was reprinted everywhere.',
       '📰 Un columnista local escribió que se te veía cansado. Lo reprodujeron en todas partes.'],
      ['🔇 There were whistles at your own ground in November. Nobody forgets those.',
       '🔇 Hubo silbidos en tu propio estadio en noviembre. Esos no se olvidan.'],
      ['📉 A radio phone-in spent an hour debating whether you should be dropped.',
       '📉 Un programa de radio dedicó una hora a debatir si debías quedarte fuera.'],
    ],
  },
  {
    when: (f) => f.apps >= 10 && f.apps < 40 && f.rating >= 6.2 && f.rating < 8.2,
    lines: [
      ['🚌 A long away trip in February ended with a coach breakdown and a 3am arrival.',
       '🚌 Un viaje largo en febrero acabó con el autobús averiado y llegada a las 3 de la mañana.'],
      ['🧤 You swapped shirts with an opponent you grew up watching. It is framed now.',
       '🧤 Cambiaste camiseta con un rival al que veías de niño. Ahora está enmarcada.'],
      ['🏫 The club sent you to open a school. Two hundred children learned your name.',
       '🏫 El club te mandó a inaugurar un colegio. Doscientos niños aprendieron tu nombre.'],
      ['❄️ A pitch inspection almost called off the biggest game of your winter.',
       '❄️ Una inspección del campo casi suspende el partido más importante de tu invierno.'],
      ['📱 A clip of you in the warm-up went round the internet for reasons you never understood.',
       '📱 Un vídeo tuyo en el calentamiento dio la vuelta a internet por razones que nunca entendiste.'],
    ],
  },
  {
    when: (f) => f.age <= 20,
    lines: [
      ['🎒 You still got a lift to training from someone in your family this season.',
       '🎒 Esta temporada todavía te llevaba alguien de tu familia a los entrenamientos.'],
      ['📝 A senior player took you aside after a bad game and told you something useful.',
       '📝 Un veterano te apartó tras un mal partido y te dijo algo que te sirvió.'],
    ],
  },
  {
    when: (f) => f.age >= 33,
    lines: [
      ['🧊 Ice baths stopped being optional some time around your thirty-second birthday.',
       '🧊 Los baños de hielo dejaron de ser opcionales por tu trigésimo segundo cumpleaños.'],
      ['🗣️ Younger teammates started asking you things instead of the coaching staff.',
       '🗣️ Los compañeros jóvenes empezaron a preguntarte a ti en lugar del cuerpo técnico.'],
    ],
  },
  {
    when: (f) => f.share >= 0.9,
    lines: [
      ['🩹 You played through something in the spring that should have kept you out.',
       '🩹 En primavera jugaste con algo que debería haberte dejado fuera.'],
    ],
  },
  {
    when: (f) => f.share < 0.35 && f.apps > 0,
    lines: [
      ['🪑 You learned the exact temperature of every substitutes\' bench in the division.',
       '🪑 Aprendiste la temperatura exacta de todos los banquillos de la liga.'],
      ['🚪 A conversation with the manager in March did not go the way you hoped.',
       '🚪 Una charla con el entrenador en marzo no salió como esperabas.'],
    ],
  },
];

// ---- verdict -----------------------------------------------------------------

function verdictFor(rec: SeasonRecord, f: Facts, comps: CompRun[], lang: Lang, hash: number) {
  const silver = rec.titles.some(t => t.kind === 'club' || t.kind === 'national');
  const award = rec.titles.some(t => t.kind === 'individual');
  const league = comps.find(c => c.kind === 'league');
  const relegationScare = !!league && !!league.position && !!league.teams
    && league.position >= league.teams - 2;

  let grade: string;
  let tone: Tone;
  if (rec.rating >= 8.5) { grade = L(lang, 'OUTSTANDING', 'SOBRESALIENTE'); tone = 'great'; }
  else if (rec.rating >= 7.5) { grade = L(lang, 'EXCELLENT', 'NOTABLE'); tone = 'good'; }
  else if (rec.rating >= 6.8) { grade = L(lang, 'SOLID', 'SOLVENTE'); tone = 'ok'; }
  else if (rec.rating >= 6.0) { grade = L(lang, 'QUIET', 'DISCRETO'); tone = 'ok'; }
  else { grade = L(lang, 'POOR', 'FLOJO'); tone = 'bad'; }

  let verdict: string;
  if (silver && rec.rating >= 8) {
    tone = 'great';
    verdict = P(lang, pickBy<Pair>(hash, 31, [
      ['A season that ends with a trophy and your name all over it.',
       'Una temporada que termina con un título y tu nombre por todas partes.'],
      ['You won something, and you were the reason. Those two things rarely arrive together.',
       'Ganaste algo, y fuiste el motivo. Esas dos cosas rara vez llegan juntas.'],
    ]));
  } else if (silver) {
    tone = 'good';
    verdict = P(lang, pickBy<Pair>(hash, 32, [
      ['Silverware. However the individual year went, that goes in the cabinet forever.',
       'Un título. Fuera como fuera tu año, eso queda en la vitrina para siempre.'],
      ['You are a winner this season, and nobody checks the ratings in twenty years.',
       'Esta temporada eres campeón, y dentro de veinte años nadie mira las notas.'],
    ]));
  } else if (award) {
    tone = 'good';
    verdict = P(lang, pickBy<Pair>(hash, 33, [
      ['No team trophy, but the individual recognition came anyway.',
       'Sin título colectivo, pero el reconocimiento individual llegó igual.'],
    ]));
  } else if (f.apps === 0) {
    tone = 'bad';
    verdict = L(lang, 'A lost year. Nothing happened, and nothing is the worst result there is.',
      'Un año perdido. No pasó nada, y no pasar nada es el peor resultado que hay.');
  } else if (relegationScare) {
    tone = 'bad';
    verdict = P(lang, pickBy<Pair>(hash, 34, [
      ['A relegation fight is a long way to walk for nothing.',
       'Pelear el descenso es un camino muy largo para no ganar nada.'],
      ['Survival was the trophy this year, and it barely arrived.',
       'La permanencia fue el título este año, y llegó por los pelos.'],
    ]));
  } else if (rec.rating >= 8.5) {
    verdict = P(lang, pickBy<Pair>(hash, 35, [
      ['A dream season. Everything you touched came off.',
       'Una temporada de ensueño. Todo lo que tocaste salió bien.'],
      ['You were the best player on the pitch most weeks. It is that simple.',
       'Fuiste el mejor del campo casi todas las semanas. Así de simple.'],
    ]));
  } else if (rec.rating >= 7.5) {
    verdict = P(lang, pickBy<Pair>(hash, 36, [
      ['A brilliant campaign, one trophy short of being unforgettable.',
       'Un año brillante, a un título de ser inolvidable.'],
      ['Consistently excellent. People started expecting it, which is its own compliment.',
       'Excelente de forma constante. La gente empezó a darlo por hecho, que es otro elogio.'],
    ]));
  } else if (rec.rating >= 6.8) {
    verdict = P(lang, pickBy<Pair>(hash, 37, [
      ['A solid year. You did your job and the team was better for it.',
       'Un año sólido. Hiciste tu trabajo y el equipo estuvo mejor por ello.'],
      ['Dependable rather than spectacular, which is how most careers are actually built.',
       'Fiable más que espectacular, que es como se construyen casi todas las carreras.'],
    ]));
  } else if (rec.rating >= 6.0) {
    verdict = P(lang, pickBy<Pair>(hash, 38, [
      ['A quiet season that will not take up much room in the memoirs.',
       'Una temporada tranquila que no ocupará mucho espacio en las memorias.'],
      ['Not bad, not good. Twelve months that mostly happened to you.',
       'Ni bien ni mal. Doce meses que en gran parte te pasaron por encima.'],
    ]));
  } else {
    verdict = P(lang, pickBy<Pair>(hash, 39, [
      ['A year to forget, and you will not be allowed to.',
       'Un año para el olvido, y no te van a dejar olvidarlo.'],
      ['Nothing worked. The sooner this one is filed away, the better.',
       'No funcionó nada. Cuanto antes se archive este año, mejor.'],
    ]));
  }
  if (rec.onLoan) {
    verdict = L(lang, 'Out on loan. ', 'Cedido. ') + verdict;
  }
  return { verdict, tone, grade };
}

// ---- the report --------------------------------------------------------------

export function buildSeasonReport(
  rec: SeasonRecord, player: CareerPlayer, lang: Lang,
): SeasonReport {
  const hash = seasonHash(rec);
  const club = getClub(rec.clubId);
  const league = club ? getLeague(club.leagueId) : null;
  const available = rec.availableGames ?? Math.max(rec.apps, 38);

  const f: Facts = {
    apps: rec.apps, goals: rec.goals, assists: rec.assists, cleanSheets: rec.cleanSheets,
    rating: rec.rating, age: rec.age,
    share: available > 0 ? clamp(0, 1, rec.apps / available) : 0,
    gpa: rec.apps > 0 ? rec.goals / rec.apps : 0,
    apa: rec.apps > 0 ? rec.assists / rec.apps : 0,
    csr: rec.apps > 0 ? rec.cleanSheets / rec.apps : 0,
    derby: rec.derbyGoals ?? 0,
    group: posGroup(player.position),
    onLoan: rec.onLoan,
  };

  const comps = rec.comps ?? [];
  const clubLines: ReportLine[] = [];
  const lg = comps.find(c => c.kind === 'league');
  if (lg) clubLines.push(leagueLine(lg, rec, lang, hash));
  const cup = comps.find(c => c.kind === 'cup');
  if (cup) clubLines.push(knockoutLine(cup, rec, lang, hash, 41));
  const cont = comps.find(c => c.kind === 'continental');
  if (cont) clubLines.push(knockoutLine(cont, rec, lang, hash, 42));

  const nt = (player.ntHistory ?? []).find(h => h.year === rec.year) ?? null;

  const notes = chooseNotes(f).map((n, i) => P(lang, pickBy(hash, 51 + i, n.lines)));

  // colour: one beat, from whichever pools match
  const pools = COLOUR.filter(c => c.when(f, rec));
  const colour: string[] = [];
  if (pools.length) {
    const pool = pickBy(hash, 61, pools);
    colour.push(P(lang, pickBy(hash, 62, pool.lines)));
  }

  const { verdict, tone, grade } = verdictFor(rec, f, comps, lang, hash);

  // The summer decision, resolved. Looked up by id in the language being read
  // now, so a career switched to English does not keep Spanish event copy.
  let decision: DecisionReport | null = null;
  if (rec.decision) {
    const ev = eventById(rec.decision.eventId, lang);
    const opt = ev?.options[rec.decision.optionIndex];
    const outcome = opt?.outcomes[rec.decision.outcomeIndex];
    if (ev && opt && outcome) {
      decision = { title: ev.title, option: opt.label, outcome: outcome.badge };
    }
  }

  const per = rec.apps > 0
    ? L(lang,
        `${rec.apps} games · ${rec.goals}G ${rec.assists}A · ${(f.gpa + f.apa).toFixed(2)} per game`,
        `${rec.apps} partidos · ${rec.goals}G ${rec.assists}A · ${(f.gpa + f.apa).toFixed(2)} por partido`)
    : L(lang, 'No appearances', 'Sin partidos');
  // The club's name is already the headline directly above this, so repeating it
  // here only pushed the per-game figure — the actual content of the line — off
  // the end of a phone screen.
  const where = league ? leagueName(league.id, lang) : '';

  return {
    verdict, verdictTone: tone, grade,
    summary: where ? `${where} · ${per}` : per,
    club: clubLines,
    nation: nationLine(player, nt, lang, hash),
    notes,
    decision,
    news: [...(rec.news ?? []), ...colour],
    titles: rec.titles.map(t => ({ label: titleName(t, lang), title: t })),
  };
}
