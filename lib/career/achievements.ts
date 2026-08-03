// Logros — persistent achievements.
//
// Unlike everything else in the career, these survive the run: they live in
// localStorage so a player chases them across many careers. Each one is a pure
// predicate over the finished-or-in-progress career, so the same list can be
// evaluated mid-season (for the toast) and at retirement.
import type { CareerPlayer, SeasonRecord, Title } from '@/data/career/types';
import { getClub } from '@/data/career/clubs';
import { getLeague } from '@/data/career/leagues';
import { getNation } from '@/data/career/nations';
import { legacyOf, idolLevel } from './idolatry';
import { ATTR_KEYS } from './attributes';
import type { Lang } from './i18n';

export type AchTier = 'bronze' | 'silver' | 'gold' | 'legend';

export interface AchCtx {
  p: CareerPlayer;
  stages: SeasonRecord[];
  trophies: Title[];
}

export interface Achievement {
  id: string;
  emoji: string;
  en: string; es: string;
  descEn: string; descEs: string;
  tier: AchTier;
  check: (c: AchCtx) => boolean;
}

// ---- helpers ---------------------------------------------------------------
const titles = (c: AchCtx, key: string) => c.trophies.filter(t => t.key === key).length;
const confedOf = (clubId: string) => {
  const club = getClub(clubId);
  return club ? getLeague(club.leagueId)?.confed : undefined;
};
const leagueOf = (clubId: string) => getClub(clubId)?.leagueId;
const bestSeason = (c: AchCtx, f: (s: SeasonRecord) => number) =>
  c.stages.reduce((m, s) => Math.max(m, f(s)), 0);
const clubsPlayed = (c: AchCtx) => new Set(c.stages.filter(s => !s.onLoan).map(s => s.clubId));
const confedsPlayed = (c: AchCtx) =>
  new Set(c.stages.map(s => confedOf(s.clubId)).filter(Boolean) as string[]);
const anyIndividual = (c: AchCtx, keys: string[]) =>
  c.trophies.some(t => keys.includes(t.key));

export const ACHIEVEMENTS: Achievement[] = [
  // ---- geography & loyalty ----
  { id: 'first-contract', emoji: '📝', tier: 'bronze',
    en: 'First contract', es: 'Primer contrato',
    descEn: 'Sign for your first club.', descEs: 'Firma por tu primer club.',
    check: c => c.stages.length >= 1 },
  { id: 'stay-south-america', emoji: '🌎', tier: 'silver',
    en: 'Stay in South America', es: 'Quedarse en Sudamérica',
    descEn: 'Play a whole career (8+ seasons) without ever leaving CONMEBOL.',
    descEs: 'Juega una carrera entera (8+ temporadas) sin salir nunca de la CONMEBOL.',
    check: c => c.stages.length >= 8 && [...confedsPlayed(c)].every(x => x === 'CONMEBOL') },
  { id: 'jump-to-europe', emoji: '✈️', tier: 'bronze',
    en: 'Jump to Europe', es: 'El salto a Europa',
    descEn: 'Move from a club outside Europe to a European club.',
    descEs: 'Pasa de un club de fuera de Europa a uno europeo.',
    check: c => c.stages.some((s, i) => i > 0 &&
      confedOf(c.stages[i - 1].clubId) !== 'UEFA' && confedOf(s.clubId) === 'UEFA') },
  { id: 'big-five', emoji: '🖐️', tier: 'gold',
    en: 'The big five', es: 'Las cinco grandes',
    descEn: 'Play in all five major European leagues.',
    descEs: 'Juega en las cinco grandes ligas de Europa.',
    check: c => {
      const want = ['premier-league', 'laliga', 'bundesliga', 'serie-a', 'ligue-1'];
      const got = new Set(c.stages.map(s => leagueOf(s.clubId)));
      return want.every(l => got.has(l));
    } },
  { id: 'globetrotter', emoji: '🌍', tier: 'gold',
    en: 'Globetrotter', es: 'Trotamundos',
    descEn: 'Play in four different confederations.', descEs: 'Juega en cuatro confederaciones distintas.',
    check: c => confedsPlayed(c).size >= 4 },
  { id: 'one-club-man', emoji: '💙', tier: 'legend',
    en: 'One-club man', es: 'Hombre de un solo club',
    descEn: 'Retire having played 10+ seasons for a single club and no other.',
    descEs: 'Retírate tras 10+ temporadas en un solo club y ningún otro.',
    check: c => clubsPlayed(c).size === 1 && c.stages.length >= 10 },
  { id: 'journeyman', emoji: '🧳', tier: 'silver',
    en: 'Journeyman', es: 'Trotamundos de vestuarios',
    descEn: 'Play for eight different clubs.', descEs: 'Juega en ocho clubes distintos.',
    check: c => clubsPlayed(c).size >= 8 },
  { id: 'homecoming', emoji: '🏡', tier: 'silver',
    en: 'Homecoming', es: 'La vuelta',
    descEn: 'Return to your debut club after playing elsewhere.',
    descEs: 'Vuelve al club de tu debut después de jugar en otro lado.',
    check: c => {
      const debut = c.p.debutClubId;
      if (!debut) return false;
      const left = c.stages.some(s => s.clubId !== debut);
      return left && c.stages[c.stages.length - 1]?.clubId === debut;
    } },
  { id: 'traitor', emoji: '🗡️', tier: 'bronze',
    en: 'Judas', es: 'Judas',
    descEn: 'Sign directly for your club\'s arch rival.', descEs: 'Ficha directamente por el clásico rival.',
    check: c => Object.keys(c.p.traitorAt ?? {}).length > 0 },
  { id: 'loyal-decade', emoji: '🕙', tier: 'gold',
    en: 'A decade in one shirt', es: 'Una década con la misma camiseta',
    descEn: 'Spend ten consecutive seasons at the same club.',
    descEs: 'Diez temporadas seguidas en el mismo club.',
    check: c => (c.p.stayStreak ?? 0) >= 10 },

  // ---- individual awards ----
  { id: 'ballon-dor', emoji: '🏅', tier: 'gold',
    en: 'Ballon d\'Or', es: 'Balón de Oro',
    descEn: 'Win the Ballon d\'Or.', descEs: 'Gana el Balón de Oro.',
    check: c => titles(c, 'ballon-dor') >= 1 },
  { id: 'ballon-dor-3', emoji: '🥇', tier: 'legend',
    en: 'Serial winner', es: 'Ganador en serie',
    descEn: 'Win three Ballons d\'Or.', descEs: 'Gana tres Balones de Oro.',
    check: c => titles(c, 'ballon-dor') >= 3 },
  { id: 'goat-discussion', emoji: '🐐', tier: 'legend',
    en: 'GOAT discussion', es: 'Discusión de GOAT',
    descEn: 'Win five or more Ballons d\'Or. Now they argue about you.',
    descEs: 'Gana cinco o más Balones de Oro. Ahora discuten sobre ti.',
    check: c => titles(c, 'ballon-dor') >= 5 },
  { id: 'the-best', emoji: '🌟', tier: 'gold',
    en: 'The Best', es: 'The Best',
    descEn: 'Win The Best award.', descEs: 'Gana el premio The Best.',
    check: c => titles(c, 'the-best') >= 1 },
  { id: 'golden-shoe', emoji: '👟', tier: 'gold',
    en: 'Golden Shoe', es: 'Bota de Oro',
    descEn: 'Finish as Europe\'s top scorer.', descEs: 'Termina como máximo goleador de Europa.',
    check: c => titles(c, 'golden-shoe') >= 1 },
  { id: 'top-scorer', emoji: '🎯', tier: 'silver',
    en: 'League top scorer', es: 'Pichichi',
    descEn: 'Finish a season as your league\'s top scorer.',
    descEs: 'Termina una temporada como máximo goleador de tu liga.',
    check: c => titles(c, 'league-top-scorer') >= 1 },
  { id: 'top-scorer-5', emoji: '🔫', tier: 'legend',
    en: 'Serial goalscorer', es: 'Goleador serial',
    descEn: 'Be league top scorer five times.', descEs: 'Sé máximo goleador de la liga cinco veces.',
    check: c => titles(c, 'league-top-scorer') >= 5 },
  { id: 'playmaker', emoji: '🪄', tier: 'silver',
    en: 'Playmaker', es: 'Asistidor',
    descEn: 'Lead your league in assists.', descEs: 'Lidera tu liga en asistencias.',
    check: c => titles(c, 'league-top-assist') >= 1 },
  { id: 'league-mvp', emoji: '⭐', tier: 'silver',
    en: 'League MVP', es: 'MVP de la liga',
    descEn: 'Be voted the best player in your league.',
    descEs: 'Sé elegido el mejor jugador de tu liga.',
    check: c => titles(c, 'league-mvp') >= 1 },
  { id: 'best-keeper', emoji: '🧤', tier: 'gold',
    en: 'Wall of the world', es: 'El muro del mundo',
    descEn: 'Be named the world\'s best goalkeeper.', descEs: 'Sé nombrado el mejor portero del mundo.',
    check: c => titles(c, 'world-best-keeper') >= 1 },
  { id: 'best-defender', emoji: '🛡️', tier: 'gold',
    en: 'Nothing gets past', es: 'No pasa nadie',
    descEn: 'Be named the world\'s best defender.', descEs: 'Sé nombrado el mejor defensor del mundo.',
    check: c => titles(c, 'world-best-defender') >= 1 },
  { id: 'best-midfielder', emoji: '🎼', tier: 'gold',
    en: 'The conductor', es: 'El director de orquesta',
    descEn: 'Be named the world\'s best midfielder.', descEs: 'Sé nombrado el mejor mediocampista del mundo.',
    check: c => titles(c, 'world-best-midfielder') >= 1 },
  { id: 'wonderkid-award', emoji: '🌱', tier: 'silver',
    en: 'Best young player', es: 'Mejor joven',
    descEn: 'Win a best young player award.', descEs: 'Gana un premio al mejor jugador joven.',
    check: c => anyIndividual(c, ['league-best-young', 'world-best-young']) },

  // ---- team honours ----
  { id: 'first-title', emoji: '🏆', tier: 'bronze',
    en: 'First silverware', es: 'Primer título',
    descEn: 'Win your first trophy.', descEs: 'Gana tu primer trofeo.',
    check: c => c.trophies.some(t => t.kind === 'club') },
  { id: 'league-champion', emoji: '🥇', tier: 'bronze',
    en: 'League champion', es: 'Campeón de liga',
    descEn: 'Win a domestic league title.', descEs: 'Gana un título de liga.',
    check: c => titles(c, 'league') >= 1 },
  { id: 'league-10', emoji: '📚', tier: 'legend',
    en: 'Dynasty', es: 'Dinastía',
    descEn: 'Win ten league titles.', descEs: 'Gana diez títulos de liga.',
    check: c => titles(c, 'league') >= 10 },
  { id: 'champions-league', emoji: '🌟', tier: 'gold',
    en: 'Champions of Europe', es: 'Campeón de Europa',
    descEn: 'Win the Champions League.', descEs: 'Gana la Champions League.',
    check: c => titles(c, 'champions') >= 1 },
  { id: 'champions-3', emoji: '👑', tier: 'legend',
    en: 'King of Europe', es: 'Rey de Europa',
    descEn: 'Win the Champions League three times.', descEs: 'Gana la Champions League tres veces.',
    check: c => titles(c, 'champions') >= 3 },
  { id: 'libertadores', emoji: '🌎', tier: 'gold',
    en: 'Gloria eterna', es: 'Gloria eterna',
    descEn: 'Win the Copa Libertadores.', descEs: 'Gana la Copa Libertadores.',
    check: c => titles(c, 'libertadores') >= 1 },
  { id: 'world-cup', emoji: '🏆', tier: 'legend',
    en: 'World champion', es: 'Campeón del mundo',
    descEn: 'Win the World Cup with your country.', descEs: 'Gana el Mundial con tu selección.',
    check: c => titles(c, 'world-cup') >= 1 },
  { id: 'continental-cup', emoji: '🌐', tier: 'gold',
    en: 'Continental king', es: 'Rey del continente',
    descEn: 'Win your confederation\'s championship with your country.',
    descEs: 'Gana el campeonato de tu confederación con tu selección.',
    check: c => ['euro', 'copa-america', 'asian-cup', 'afcon', 'gold-cup'].some(k => titles(c, k) >= 1) },
  { id: 'wc-golden-ball', emoji: '🥇', tier: 'legend',
    en: 'Golden Ball', es: 'Balón de Oro del Mundial',
    descEn: 'Be named the best player at a World Cup.',
    descEs: 'Sé elegido el mejor jugador de un Mundial.',
    check: c => titles(c, 'world-cup-golden-ball') >= 1 },
  { id: 'ucl-mvp', emoji: '🌟', tier: 'gold',
    en: 'Champions League MVP', es: 'MVP de la Champions',
    descEn: 'Be the standout player of a Champions League win.',
    descEs: 'Sé la figura de una Champions ganada.',
    check: c => titles(c, 'ucl-mvp') >= 1 },
  { id: 'club-world-cup', emoji: '🌍', tier: 'gold',
    en: 'Best on the planet', es: 'El mejor del planeta',
    descEn: 'Win the Club World Cup.', descEs: 'Gana el Mundial de Clubes.',
    check: c => titles(c, 'club-world-cup') >= 1 },
  { id: 'treble', emoji: '🎩', tier: 'legend',
    en: 'The treble', es: 'El triplete',
    descEn: 'Win league, domestic cup and a continental cup in one season.',
    descEs: 'Gana liga, copa nacional y una copa continental en la misma temporada.',
    check: c => c.stages.some(s => {
      const k = s.titles.map(t => t.key);
      return k.includes('league') && k.includes('domestic-cup')
        && (k.includes('champions') || k.includes('libertadores'));
    }) },
  { id: 'cabinet-20', emoji: '🗄️', tier: 'legend',
    en: 'Full cabinet', es: 'Vitrina llena',
    descEn: 'Win twenty trophies of any kind.', descEs: 'Gana veinte trofeos de cualquier tipo.',
    check: c => c.trophies.length >= 20 },

  // ---- output ----
  { id: 'goals-50', emoji: '⚽', tier: 'bronze',
    en: 'Fifty up', es: 'Cincuenta',
    descEn: 'Score 50 career goals.', descEs: 'Marca 50 goles en tu carrera.',
    check: c => c.p.goals >= 50 },
  { id: 'goals-200', emoji: '💥', tier: 'silver',
    en: 'Two hundred', es: 'Doscientos',
    descEn: 'Score 200 career goals.', descEs: 'Marca 200 goles en tu carrera.',
    check: c => c.p.goals >= 200 },
  { id: 'goals-500', emoji: '🔥', tier: 'legend',
    en: 'Five hundred', es: 'Quinientos',
    descEn: 'Score 500 career goals.', descEs: 'Marca 500 goles en tu carrera.',
    check: c => c.p.goals >= 500 },
  { id: 'season-30', emoji: '🚀', tier: 'gold',
    en: 'Thirty in a season', es: 'Treinta en una temporada',
    descEn: 'Score 30+ goals in a single season.', descEs: 'Marca 30+ goles en una temporada.',
    check: c => bestSeason(c, s => s.goals) >= 30 },
  { id: 'assists-100', emoji: '🅰️', tier: 'silver',
    en: 'Hundred assists', es: 'Cien asistencias',
    descEn: 'Provide 100 career assists.', descEs: 'Da 100 asistencias en tu carrera.',
    check: c => c.p.assists >= 100 },
  { id: 'derby-king', emoji: '⚔️', tier: 'gold',
    en: 'Derby king', es: 'Rey del clásico',
    descEn: 'Score 25 derby goals.', descEs: 'Marca 25 goles en clásicos.',
    check: c => (c.p.derbyGoals ?? 0) >= 25 },
  { id: 'apps-400', emoji: '🎽', tier: 'silver',
    en: 'Four hundred games', es: 'Cuatrocientos partidos',
    descEn: 'Play 400 career matches.', descEs: 'Juega 400 partidos en tu carrera.',
    check: c => c.p.apps >= 400 },
  { id: 'clean-sheets-100', emoji: '🚫', tier: 'gold',
    en: 'A hundred clean sheets', es: 'Cien porterías a cero',
    descEn: 'Keep 100 career clean sheets.', descEs: 'Deja 100 porterías a cero.',
    check: c => c.p.cleanSheets >= 100 },
  { id: 'perfect-season', emoji: '💫', tier: 'legend',
    en: 'Perfect season', es: 'Temporada perfecta',
    descEn: 'Finish a season with a rating of 9.0 or better.',
    descEs: 'Termina una temporada con nota 9.0 o más.',
    check: c => bestSeason(c, s => s.rating) >= 9.0 },

  // ---- idolatry ----
  { id: 'beloved', emoji: '👏', tier: 'bronze',
    en: 'Beloved', es: 'Querido',
    descEn: 'Reach 25 idolatry at a club.', descEs: 'Llega a 25 de idolatría en un club.',
    check: c => (legacyOf(c.p)?.value ?? 0) >= 25 },
  { id: 'reference', emoji: '💙', tier: 'silver',
    en: 'Reference', es: 'Referente',
    descEn: 'Reach 50 idolatry at a club.', descEs: 'Llega a 50 de idolatría en un club.',
    check: c => (legacyOf(c.p)?.value ?? 0) >= 50 },
  { id: 'idol', emoji: '⭐', tier: 'gold',
    en: 'Idol', es: 'Ídolo',
    descEn: 'Reach 75 idolatry at a club.', descEs: 'Llega a 75 de idolatría en un club.',
    check: c => (legacyOf(c.p)?.value ?? 0) >= 75 },
  { id: 'legend', emoji: '🗿', tier: 'legend',
    en: 'Legend', es: 'Leyenda',
    descEn: 'Reach 95 idolatry — a statue outside the ground.',
    descEs: 'Llega a 95 de idolatría: estatua en la puerta del estadio.',
    check: c => (legacyOf(c.p)?.value ?? 0) >= 95 },
  { id: 'idol-twice', emoji: '💞', tier: 'legend',
    en: 'Idol of two', es: 'Ídolo de dos',
    descEn: 'Reach idol status (75+) at two different clubs.',
    descEs: 'Alcanza estatus de ídolo (75+) en dos clubes distintos.',
    check: c => Object.values(c.p.idolatry ?? {}).filter(v => v >= 75).length >= 2 },

  // ---- ratings & talent ----
  { id: 'wonderkid', emoji: '✨', tier: 'silver',
    en: 'Generational talent', es: 'Pibe maravilla',
    descEn: 'Start a career as a 1-in-100 wonderkid.',
    descEs: 'Empieza una carrera como pibe maravilla (1 de cada 100).',
    check: c => !!c.p.wonderkid },
  { id: 'ovr-85', emoji: '📈', tier: 'silver',
    en: 'World class', es: 'Clase mundial',
    descEn: 'Reach 85 overall.', descEs: 'Llega a 85 de media.',
    check: c => c.p.peakOverall >= 85 },
  { id: 'ovr-92', emoji: '🧬', tier: 'legend',
    en: 'Once in a generation', es: 'Irrepetible',
    descEn: 'Reach 92 overall.', descEs: 'Llega a 92 de media.',
    check: c => c.p.peakOverall >= 92 },
  { id: 'maxed-attr', emoji: '💯', tier: 'gold',
    en: 'Maxed out', es: 'Al máximo',
    descEn: 'Push any attribute to 95 or higher.', descEs: 'Lleva un atributo a 95 o más.',
    check: c => ATTR_KEYS.some(k => c.p.attrs[k] >= 95) },

  // ---- money & life ----
  { id: 'first-million', emoji: '💶', tier: 'bronze',
    en: 'First million', es: 'El primer millón',
    descEn: 'Earn a million in career wages.', descEs: 'Gana un millón en sueldos.',
    check: c => (c.p.money ?? 0) + 0 >= 1_000_000 },
  { id: 'family-house', emoji: '🏠', tier: 'silver',
    en: 'The house', es: 'La casa',
    descEn: 'Buy your parents their house.', descEs: 'Cómprales la casa a tus padres.',
    check: c => (c.p.owned ?? []).includes('family-house') },
  { id: 'the-pitch', emoji: '🥅', tier: 'gold',
    en: 'Giving back', es: 'Devolver la mano',
    descEn: 'Build a pitch for the club that raised you.',
    descEs: 'Construye una cancha para el club que te crió.',
    check: c => (c.p.owned ?? []).includes('pitch') },
  { id: 'private-jet', emoji: '🛩️', tier: 'gold',
    en: 'Private jet', es: 'Jet privado',
    descEn: 'Buy a private jet.', descEs: 'Cómprate un jet privado.',
    check: c => (c.p.owned ?? []).includes('jet') },
  { id: 'full-staff', emoji: '🧑‍⚕️', tier: 'gold',
    en: 'Entourage', es: 'Equipo propio',
    descEn: 'Hire every member of staff in the shop.',
    descEs: 'Contrata a todo el cuerpo técnico de la tienda.',
    check: c => ['chef', 'physio', 'trainer', 'analyst', 'shooting-coach', 'mentor', 'sleep-lab']
      .every(id => (c.p.owned ?? []).includes(id)) },

  // ---- moments & longevity ----
  { id: 'clutch', emoji: '🥶', tier: 'bronze',
    en: 'Ice in the veins', es: 'Sangre fría',
    descEn: 'Win a decisive moment.', descEs: 'Gana un momento decisivo.',
    check: c => (c.p.clutchWon ?? 0) >= 1 },
  { id: 'clutch-5', emoji: '❄️', tier: 'gold',
    en: 'Big-game player', es: 'Jugador de finales',
    descEn: 'Win five decisive moments.', descEs: 'Gana cinco momentos decisivos.',
    check: c => (c.p.clutchWon ?? 0) >= 5 },
  { id: 'veteran', emoji: '🧓', tier: 'silver',
    en: 'Still going', es: 'Todavía en pie',
    descEn: 'Play a season at 38 or older.', descEs: 'Juega una temporada con 38 años o más.',
    check: c => c.stages.some(s => s.age >= 38) },
  { id: 'full-career', emoji: '🎬', tier: 'silver',
    en: 'A full career', es: 'Una carrera completa',
    descEn: 'Play twenty seasons.', descEs: 'Juega veinte temporadas.',
    check: c => c.stages.length >= 20 },
  { id: 'nt-100', emoji: '🎖️', tier: 'gold',
    en: 'Centurion', es: 'Centenario',
    descEn: 'Win 100 caps for your country.', descEs: 'Llega a 100 partidos con tu selección.',
    check: c => c.p.ntCaps >= 100 },

  // ---- the shop, and what money is for ----
  { id: 'first-purchase', emoji: '🛒', tier: 'bronze',
    en: 'First splurge', es: 'El primer gusto',
    descEn: 'Buy anything at all.', descEs: 'Compra cualquier cosa.',
    check: c => (c.p.owned ?? []).length >= 1 },
  { id: 'backroom', emoji: '🧑‍🍳', tier: 'silver',
    en: 'An entourage', es: 'Un séquito',
    descEn: 'Own five things at once.', descEs: 'Ten cinco cosas a la vez.',
    check: c => (c.p.owned ?? []).length >= 5 },
  { id: 'collector', emoji: '🗝️', tier: 'gold',
    en: 'The collector', es: 'El coleccionista',
    descEn: 'Own twelve things at once.', descEs: 'Ten doce cosas a la vez.',
    check: c => (c.p.owned ?? []).length >= 12 },
  { id: 'glass-body', emoji: '🩺', tier: 'gold',
    en: 'Made of steel', es: 'Hecho de acero',
    descEn: 'Buy the surgeon on retainer.', descEs: 'Contrata al cirujano de cabecera.',
    check: c => (c.p.owned ?? []).includes('surgeon') },
  { id: 'own-island', emoji: '🏝️', tier: 'legend',
    en: 'Your own island', es: 'Tu propia isla',
    descEn: 'Buy an island. There is nothing left to buy.',
    descEs: 'Compra una isla. Ya no queda nada por comprar.',
    check: c => (c.p.owned ?? []).includes('island') },
  { id: 'gave-back', emoji: '💙', tier: 'gold',
    en: 'Gave it back', es: 'Devolvió lo recibido',
    descEn: 'Build an academy and a foundation.',
    descEs: 'Construye una escuelita y una fundación.',
    check: c => (c.p.owned ?? []).includes('academy') && (c.p.owned ?? []).includes('foundation') },
  { id: 'millionaire', emoji: '💰', tier: 'silver',
    en: 'Ten million in the bank', es: 'Diez millones en el banco',
    descEn: 'Hold €10M at once.', descEs: 'Ten €10M a la vez.',
    check: c => (c.p.money ?? 0) >= 10_000_000 },
  { id: 'hundred-million', emoji: '🏦', tier: 'legend',
    en: 'Nine figures', es: 'Nueve cifras',
    descEn: 'Hold €100M at once.', descEs: 'Ten €100M a la vez.',
    check: c => (c.p.money ?? 0) >= 100_000_000 },

  // ---- the national team ----
  { id: 'nt-debut', emoji: '🎽', tier: 'bronze',
    en: 'The call', es: 'La convocatoria',
    descEn: 'Play once for your country.', descEs: 'Juega una vez con tu selección.',
    check: c => (c.p.ntCaps ?? 0) >= 1 },
  { id: 'nt-fifty', emoji: '🇺🇳', tier: 'silver',
    en: 'Fifty caps', es: 'Cincuenta partidos',
    descEn: 'Fifty appearances for your country.',
    descEs: 'Cincuenta partidos con tu selección.',
    check: c => (c.p.ntCaps ?? 0) >= 50 },
  { id: 'nt-goals-50', emoji: '🎯', tier: 'gold',
    en: 'Fifty for your country', es: 'Cincuenta para tu país',
    descEn: 'Score fifty international goals.',
    descEs: 'Marca cincuenta goles internacionales.',
    check: c => (c.p.ntGoals ?? 0) >= 50 },
  { id: 'nt-knockout', emoji: '🗝️', tier: 'silver',
    en: 'Into the knockouts', es: 'A la fase final',
    descEn: 'Reach a quarter-final with your country.',
    descEs: 'Llega a cuartos con tu selección.',
    check: c => (c.p.ntHistory ?? []).some(h =>
      ['qf', 'sf', 'runner-up', 'champion'].includes(h.tournament?.result ?? '')) },
  { id: 'nt-final', emoji: '🥈', tier: 'gold',
    en: 'So close', es: 'Tan cerca',
    descEn: 'Lose a major final with your country.',
    descEs: 'Pierde una final grande con tu selección.',
    check: c => (c.p.ntHistory ?? []).some(h => h.tournament?.result === 'runner-up') },
  { id: 'nt-underdog', emoji: '🐜', tier: 'legend',
    en: 'Against the odds', es: 'Contra todo pronóstico',
    descEn: 'Win a tournament with a nation rated below 75.',
    descEs: 'Gana un torneo con una selección de menos de 75.',
    check: c => (c.p.ntHistory ?? []).some(h => h.tournament?.result === 'champion')
      && (getNation(c.p.ntNationCode)?.strength ?? 99) < 75 },

  // ---- the shape of a career ----
  { id: 'one-club-man', emoji: '🏛️', tier: 'legend',
    en: 'One-club man', es: 'Hombre de un solo club',
    descEn: 'Play a whole career of ten seasons or more at a single club.',
    descEs: 'Juega una carrera entera de diez o más temporadas en un solo club.',
    check: c => c.stages.length >= 10 && clubsPlayed(c).size === 1 },
  { id: 'late-bloomer', emoji: '🌻', tier: 'silver',
    en: 'Late bloomer', es: 'Floración tardía',
    descEn: 'Reach your peak overall at 30 or older.',
    descEs: 'Alcanza tu pico de media a los 30 o más.',
    check: c => c.stages.some(st => st.age >= 30 && st.overallAtSeason >= c.p.peakOverall) },
  { id: 'teen-star', emoji: '🐣', tier: 'gold',
    en: 'Teenage star', es: 'Estrella adolescente',
    descEn: 'Reach 80 overall before turning 20.',
    descEs: 'Llega a 80 de media antes de los 20.',
    check: c => c.stages.some(st => st.age < 20 && st.overallAtSeason >= 80) },
  { id: 'evergreen', emoji: '🌲', tier: 'gold',
    en: 'Evergreen', es: 'Eterno',
    descEn: 'Still playing at 38.', descEs: 'Seguir jugando a los 38.',
    check: c => c.stages.some(st => st.age >= 38) },
  { id: 'globetrotter-5', emoji: '🌐', tier: 'legend',
    en: 'Five confederations', es: 'Cinco confederaciones',
    descEn: 'Play in five different confederations.',
    descEs: 'Juega en cinco confederaciones distintas.',
    check: c => confedsPlayed(c).size >= 5 },
  { id: 'season-40', emoji: '🔥', tier: 'legend',
    en: 'Forty in a season', es: 'Cuarenta en una temporada',
    descEn: 'Score forty goals in a single season.',
    descEs: 'Marca cuarenta goles en una temporada.',
    check: c => bestSeason(c, s => s.goals) >= 40 },
  { id: 'season-25-assists', emoji: '🅰️', tier: 'gold',
    en: 'Twenty-five assists', es: 'Veinticinco asistencias',
    descEn: 'Twenty-five assists in a single season.',
    descEs: 'Veinticinco asistencias en una temporada.',
    check: c => bestSeason(c, s => s.assists) >= 25 },
  { id: 'thousand-games', emoji: '🧱', tier: 'legend',
    en: 'A thousand games', es: 'Mil partidos',
    descEn: 'Play one thousand club games.', descEs: 'Juega mil partidos de club.',
    check: c => (c.p.apps ?? 0) >= 1000 },
  { id: 'promoted', emoji: '⬆️', tier: 'silver',
    en: 'Up we go', es: 'Ascenso',
    descEn: 'Win a second-tier league title.',
    descEs: 'Gana un título de segunda división.',
    check: c => c.stages.some(st => st.titles.some(t => t.key === 'league')
      && (getLeague(getClub(st.clubId)?.leagueId ?? '')?.tier ?? 1) >= 3) },
  { id: 'derby-king', emoji: '⚔️', tier: 'gold',
    en: 'King of the derby', es: 'Rey del clásico',
    descEn: 'Score twenty-five derby goals.', descEs: 'Marca veinticinco goles en clásicos.',
    check: c => (c.p.derbyGoals ?? 0) >= 25 },
  { id: 'treble', emoji: '👑', tier: 'legend',
    en: 'The treble', es: 'El triplete',
    descEn: 'Win the league, a domestic cup and a continental cup in one season.',
    descEs: 'Gana la liga, una copa nacional y una copa continental en la misma temporada.',
    check: c => c.stages.some(st => {
      const k = st.titles.map(t => t.key);
      return k.includes('league') && k.includes('domestic-cup')
        && (k.includes('champions') || k.includes('libertadores'));
    }) },
  { id: 'perfect-storm', emoji: '🌪️', tier: 'legend',
    en: 'The perfect year', es: 'El año perfecto',
    descEn: 'Win the Ballon d\'Or and the World Cup in the same year.',
    descEs: 'Gana el Balón de Oro y el Mundial el mismo año.',
    check: c => {
      const years = new Map<number, Set<string>>();
      for (const st of c.stages) {
        const set = years.get(st.year) ?? new Set<string>();
        for (const t of st.titles) set.add(t.key);
        years.set(st.year, set);
      }
      return [...years.values()].some(k => k.has('ballon-dor') && k.has('world-cup'));
    } },
  { id: 'nomad', emoji: '🧳', tier: 'gold',
    en: 'Twelve badges', es: 'Doce escudos',
    descEn: 'Play for twelve different clubs.', descEs: 'Juega en doce clubes distintos.',
    check: c => clubsPlayed(c).size >= 12 },
  { id: 'idol-two', emoji: '💞', tier: 'legend',
    en: 'Idol twice over', es: 'Ídolo dos veces',
    descEn: 'Reach 80 idolatry at two different clubs.',
    descEs: 'Llega a 80 de idolatría en dos clubes distintos.',
    check: c => Object.values(c.p.idolatry ?? {}).filter(v => v >= 80).length >= 2 },
  { id: 'comeback', emoji: '🔁', tier: 'silver',
    en: 'The homecoming', es: 'La vuelta a casa',
    descEn: 'Return to a club you had already left.',
    descEs: 'Vuelve a un club que ya habías dejado.',
    check: c => {
      const seen = new Set<string>();
      let last = '';
      for (const st of c.stages) {
        if (st.clubId !== last) {
          if (seen.has(st.clubId)) return true;
          seen.add(st.clubId);
          last = st.clubId;
        }
      }
      return false;
    } },

];

// ---- persistence -----------------------------------------------------------

const KEY = 'career:achievements';
export type Unlocked = Record<string, string>; // id -> ISO date

export function loadUnlocked(): Unlocked {
  try {
    const raw = window?.localStorage?.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function saveUnlocked(u: Unlocked) {
  try { window?.localStorage?.setItem(KEY, JSON.stringify(u)); } catch { /* private mode */ }
}

/** Evaluate everything and return only the ids unlocked *now*. */
export function evaluate(ctx: AchCtx, already: Unlocked): Achievement[] {
  return ACHIEVEMENTS.filter(a => {
    if (already[a.id]) return false;
    try { return a.check(ctx); } catch { return false; }
  });
}

export function achName(a: Achievement, lang: Lang) { return lang === 'es' ? a.es : a.en; }
export function achDesc(a: Achievement, lang: Lang) { return lang === 'es' ? a.descEs : a.descEn; }

export const TIER_STYLE: Record<AchTier, { ring: string; text: string; glow: string }> = {
  bronze: { ring: 'border-amber-700/60', text: 'text-amber-500', glow: '' },
  silver: { ring: 'border-slate-300/50', text: 'text-slate-200', glow: '' },
  gold:   { ring: 'border-gold/70', text: 'text-gold', glow: 'shadow-[0_0_18px_rgba(255,215,0,0.25)]' },
  legend: { ring: 'border-wc/70', text: 'text-wc', glow: 'shadow-[0_0_22px_rgba(0,223,162,0.3)]' },
};
