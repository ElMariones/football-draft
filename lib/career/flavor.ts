import type { CareerPlayer, ClubOffer, SeasonRecord } from '@/data/career/types';
import { getClub } from '@/data/career/clubs';
import { getLeague } from '@/data/career/leagues';
import { Rng } from './rng';
import type { Lang } from './i18n';

const pick = (lang: Lang, en: string, es: string) => (lang === 'es' ? es : en);

// ---- transfer-window headline (narrative line under the market label) ------

export function transferHeadline(
  player: CareerPlayer, offers: ClubOffer[], opts: { youth: boolean; loan: boolean },
  lang: Lang, rng: Rng,
): string {
  if (opts.youth) {
    return pick(lang,
      'Three clubs want you in their youth project. Where does your story begin?',
      'Tres clubes te quieren en su proyecto juvenil. ¿Dónde empieza tu historia?');
  }
  if (opts.loan) {
    return pick(lang,
      'Your club wants you to get minutes elsewhere. Pick where to keep growing.',
      'Tu club quiere que sumes minutos en otro equipo. Elige dónde seguir creciendo.');
  }
  const stepUp = offers.some(o => {
    const c = getClub(o.clubId);
    return c && c.strength > player.overall + 3;
  });
  const european = offers.some(o => {
    const c = getClub(o.clubId);
    const l = c && getLeague(c.leagueId);
    return l && l.tier === 1 && l.nationCode !== player.nationCode;
  });
  const declining = player.age >= 32 || player.overall < player.peakOverall - 4;

  const bucket =
    european ? EUROPE : stepUp ? STEP_UP : declining ? DECLINE : NORMAL;
  const arr = bucket[lang];
  return arr[rng.int(arr.length)];
}

const EUROPE = {
  en: [
    "Europe's elite are calling — the big stage awaits.",
    'A giant of the continent has come knocking. Time to shine?',
    'The transfer that could define your career is on the table.',
  ],
  es: [
    'La elite de Europa te llama — el gran escenario espera.',
    'Un gigante del continente golpeó la puerta. ¿Hora de brillar?',
    'Está sobre la mesa el pase que puede definir tu carrera.',
  ],
};
const STEP_UP = {
  en: [
    'Bigger clubs have noticed you. Ready for the step up?',
    'Your form has scouts circling. A new challenge beckons.',
    'The market is hot for you this summer.',
  ],
  es: [
    'Clubes más grandes te miran. ¿Listo para el salto?',
    'Tu nivel tiene a los cazatalentos dando vueltas. Llega un nuevo desafío.',
    'El mercado arde por ti este verano.',
  ],
};
const DECLINE = {
  en: [
    'A new chapter opens — clubs value your experience now.',
    'The offers are quieter, but a smart move can add years to your career.',
    'Teams want a leader in the dressing room. Where to next?',
  ],
  es: [
    'Se abre un nuevo capítulo — ahora valoran tu experiencia.',
    'Las ofertas bajaron, pero una buena elección alarga tu carrera.',
    'Los equipos buscan un líder de vestuario. ¿Hacia dónde vas?',
  ],
};
const NORMAL = {
  en: [
    'Offers arrived after your last campaign. Stay, or seek a new home?',
    'The window is open. Weigh your options.',
    'A few clubs are keen. The choice is yours.',
  ],
  es: [
    'Llegaron ofertas tras tu última campaña. ¿Te quedas o buscás nuevo rumbo?',
    'El mercado está abierto. Sopesa tus opciones.',
    'Algunos clubes te quieren. La decisión es tuya.',
  ],
};

// ---- per-offer micro-flavor (deterministic, stable across renders) ---------

export function offerFlavor(player: CareerPlayer, offer: ClubOffer, lang: Lang): string {
  const club = getClub(offer.clubId);
  if (!club) return '';
  const league = getLeague(club.leagueId);
  if (offer.verb === 'stay') {
    return player.loyalty > 65
      ? pick(lang, 'Become a one-club legend.', 'Convertite en ídolo de una vida.')
      : pick(lang, 'Continuity and trust.', 'Continuidad y confianza.');
  }
  if (offer.verb === 'loan') {
    return pick(lang, 'Game time to develop.', 'Minutos para desarrollarte.');
  }
  if (offer.homecoming) {
    return offer.clubId === player.debutClubId
      ? pick(lang, 'Where it all started. Finish the story here.',
          'Donde empezó todo. Termina la historia aquí.')
      : pick(lang, 'An old home wants you back.', 'Una vieja casa te quiere de vuelta.');
  }
  // Honesty rule: a move is only a "step up" relative to the club you are
  // leaving, not to your own rating. Comparing against `player.overall` is how
  // a squad player at Real Madrid was told that Dortmund was a step up.
  const from = player.clubId ? getClub(player.clubId) : null;
  const fromLeague = from ? getLeague(from.leagueId) : null;
  const diff = from ? club.strength - from.strength : 0;
  const alreadyElite = fromLeague ? fromLeague.tier === 1 : false;

  if (league && league.tier === 1 && !alreadyElite) {
    return pick(lang, 'Your leap to the European elite.', 'Tu salto a la elite europea.');
  }
  if (from && diff >= 6) return pick(lang, 'A big step up.', 'Un salto de categoría.');
  if (from && diff >= 2) return pick(lang, 'A stronger side.', 'Un equipo más fuerte.');
  if (from && diff <= -8) {
    return offer.role === 'starter'
      ? pick(lang, 'A step down, but you play every week.', 'Bajas un escalón, pero juegas siempre.')
      : pick(lang, 'A clear step down.', 'Un paso atrás claro.');
  }
  if (from && diff <= -3) return pick(lang, 'A smaller club.', 'Un club más chico.');
  if (offer.role === 'prospect') return pick(lang, 'The big challenge.', 'El gran desafío.');
  if (offer.role === 'starter' && club.strength <= player.overall - 2) {
    return pick(lang, "You'll be the star of the team.", 'Serás la figura del equipo.');
  }
  return pick(lang, 'A fresh start.', 'Un nuevo comienzo.');
}

// ---- season recap flavor ---------------------------------------------------

export function seasonFlavor(rec: SeasonRecord, lang: Lang): string {
  const hasTitle = rec.titles.some(t => t.kind === 'club' || t.kind === 'national');
  const award = rec.titles.some(t => t.kind === 'individual');
  let base: string;
  if (rec.rating >= 8.5) base = pick(lang, 'A dream season.', 'Una temporada de ensueño.');
  else if (rec.rating >= 7.5) base = pick(lang, 'A brilliant campaign.', 'Un año brillante.');
  else if (rec.rating >= 6.8) base = pick(lang, 'A solid year.', 'Un año sólido.');
  else if (rec.rating >= 6.0) base = pick(lang, 'A quiet season.', 'Una temporada tranquila.');
  else base = pick(lang, 'A year to forget.', 'Un año para el olvido.');
  if (rec.onLoan) base = pick(lang, 'Sharpening up on loan. ', 'Rodaje en el préstamo. ') + base;
  if (hasTitle) base += pick(lang, ' Silverware secured!', ' ¡Con vitrina nueva!');
  else if (award) base += pick(lang, ' And personal glory!', ' ¡Y gloria personal!');
  return base;
}
