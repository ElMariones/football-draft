// Archetypes — the first real decision of a career.
//
// Before the first ball is kicked you pick who you are. It's a permanent
// attribute tilt plus an identity that flavours the rest of the run (and the
// nickname on the summary card). Three of the position's pool are offered, so
// the choice is constrained by the seed, not a free pick of the best one.
import type { Position } from '@/data/types';
import type { Attrs } from '@/data/career/types';
import { isKeeperOrDef, isAttacker, isMidfielder } from './config';
import type { Rng } from './rng';
import type { Lang } from './i18n';

export interface Archetype {
  id: string;
  en: string; es: string;
  descEn: string; descEs: string;
  delta: Partial<Attrs>;
  /** identity tag used by moments/flavor (e.g. penalty taker, captain material) */
  trait?: 'finisher' | 'burner' | 'wall' | 'brain' | 'captain' | 'allrounder';
}

const ATTACK: Archetype[] = [
  { id: 'poacher',  en: 'Box poacher',   es: 'Killer del área',
    descEn: 'You live off goals. Inside the box you do not miss.',
    descEs: 'Vives del gol. Adentro del área no perdonas.',
    delta: { tec: 8 }, trait: 'finisher' },
  { id: 'arrow',    en: 'The Arrow',     es: 'Flecha',
    descEn: 'Play the ball into space and nobody catches you.',
    descEs: 'Te tiran una pelota al espacio y no te agarran más.',
    delta: { pac: 8 }, trait: 'burner' },
  { id: 'tank',     en: 'Tank',          es: 'Tanque',
    descEn: 'You win everything in the air and hold off two centre-backs.',
    descEs: 'Bajas todas de cabeza y aguantas contra dos centrales.',
    delta: { phy: 8 }, trait: 'wall' },
  { id: 'caudillo', en: 'Caudillo',      es: 'Caudillo',
    descEn: 'Born to carry the team on your back.',
    descEs: 'Nacido para ponerse el equipo al hombro.',
    delta: { lea: 8, tec: 2 }, trait: 'captain' },
  { id: 'enganche', en: 'Playmaker',     es: 'Enganche',
    descEn: 'The brain. Your passes are worth goals.',
    descEs: 'El cerebro. Tus pases valen goles.',
    delta: { vis: 8 }, trait: 'brain' },
  { id: 'complete', en: 'All-rounder',   es: 'Todoterreno',
    descEn: 'A bit of everything, all of it done well.',
    descEs: 'Un poco de todo, bien hecho.',
    delta: { tec: 3, pac: 3, phy: 3, vis: 3 }, trait: 'allrounder' },
];

const MID: Archetype[] = [
  { id: 'metronome', en: 'Metronome',    es: 'Metrónomo',
    descEn: 'The game runs at the speed you decide.',
    descEs: 'El partido va a la velocidad que tú quieres.',
    delta: { vis: 8 }, trait: 'brain' },
  { id: 'engine',    en: 'Engine',       es: 'Motorcito',
    descEn: 'You cover every blade of grass, both boxes, all game.',
    descEs: 'Corres cada metro, de área a área, los 90 minutos.',
    delta: { phy: 6, pac: 4 }, trait: 'wall' },
  { id: 'destroyer', en: 'Destroyer',    es: 'Cinco de marca',
    descEn: 'Nothing gets through the middle. Nothing.',
    descEs: 'Por el medio no pasa nadie. Nadie.',
    delta: { phy: 8, lea: 2 }, trait: 'wall' },
  { id: 'caudillo',  en: 'Caudillo',     es: 'Caudillo',
    descEn: 'Born to carry the team on your back.',
    descEs: 'Nacido para ponerse el equipo al hombro.',
    delta: { lea: 8, vis: 2 }, trait: 'captain' },
  { id: 'arriving',  en: 'Late runner',  es: 'Volante llegador',
    descEn: 'You arrive at the edge of the box and finish.',
    descEs: 'Llegas al borde del área y la mandas a guardar.',
    delta: { tec: 6, pac: 3 }, trait: 'finisher' },
  { id: 'complete',  en: 'All-rounder',  es: 'Todoterreno',
    descEn: 'A bit of everything, all of it done well.',
    descEs: 'Un poco de todo, bien hecho.',
    delta: { tec: 3, pac: 3, phy: 3, vis: 3 }, trait: 'allrounder' },
];

const DEF: Archetype[] = [
  { id: 'wall',      en: 'The Wall',     es: 'El Muro',
    descEn: 'They pass over you or not at all.',
    descEs: 'Por encima de ti no pasa nadie.',
    delta: { phy: 8 }, trait: 'wall' },
  { id: 'sweeper',   en: 'Ball-player',  es: 'Central con salida',
    descEn: 'The move starts at your feet.',
    descEs: 'La jugada empieza en tus pies.',
    delta: { vis: 6, tec: 3 }, trait: 'brain' },
  { id: 'flyer',     en: 'Overlapper',   es: 'Lateral volante',
    descEn: 'You end the game further forward than the wingers.',
    descEs: 'Terminas el partido más adelante que los extremos.',
    delta: { pac: 8 }, trait: 'burner' },
  { id: 'caudillo',  en: 'Caudillo',     es: 'Caudillo',
    descEn: 'The dressing room follows you, not the armband.',
    descEs: 'El vestuario te sigue a ti, no a la cinta.',
    delta: { lea: 8, phy: 2 }, trait: 'captain' },
  { id: 'stopper',   en: 'Old-school',   es: 'Marcador de área',
    descEn: 'A defender from another era. Nobody enjoys the 90 minutes.',
    descEs: 'Un defensor de otra época. Nadie la pasa bien.',
    delta: { phy: 6, lea: 3 }, trait: 'wall' },
  { id: 'complete',  en: 'All-rounder',  es: 'Todoterreno',
    descEn: 'A bit of everything, all of it done well.',
    descEs: 'Un poco de todo, bien hecho.',
    delta: { tec: 3, pac: 3, phy: 3, vis: 3 }, trait: 'allrounder' },
];

const GK: Archetype[] = [
  { id: 'shotstop',  en: 'Shot-stopper', es: 'Atajapenales',
    descEn: 'One-on-one, you win. Penalties are your speciality.',
    descEs: 'Mano a mano, ganas tú. Los penales son lo tuyo.',
    delta: { tec: 8 }, trait: 'finisher' },
  { id: 'sweeper-k', en: 'Sweeper keeper', es: 'Portero líbero',
    descEn: 'You play thirty metres off your line and start attacks.',
    descEs: 'Juegas treinta metros fuera del área y empiezas los ataques.',
    delta: { vis: 6, pac: 3 }, trait: 'brain' },
  { id: 'giant',     en: 'The Giant',    es: 'El Gigante',
    descEn: 'Crosses are yours. All of them.',
    descEs: 'Los centros son tuyos. Todos.',
    delta: { phy: 8 }, trait: 'wall' },
  { id: 'captain-k', en: 'Vocal keeper', es: 'Portero capitán',
    descEn: 'You organise the whole defence at the top of your lungs.',
    descEs: 'Ordenas toda la defensa a los gritos.',
    delta: { lea: 8, phy: 2 }, trait: 'captain' },
  { id: 'complete',  en: 'All-rounder',  es: 'Todoterreno',
    descEn: 'A bit of everything, all of it done well.',
    descEs: 'Un poco de todo, bien hecho.',
    delta: { tec: 3, pac: 3, phy: 3, vis: 3 }, trait: 'allrounder' },
];

export function poolFor(pos: Position): Archetype[] {
  if (pos === 'GK') return GK;
  if (isKeeperOrDef(pos)) return DEF;
  if (isAttacker(pos)) return ATTACK;
  if (isMidfielder(pos)) return MID;
  return MID;
}

/** Three options drawn from the position's pool — the seed decides your menu. */
export function offerArchetypes(pos: Position, rng: Rng, n = 3): Archetype[] {
  const pool = poolFor(pos);
  const picked: Archetype[] = [];
  const rest = [...pool];
  for (let i = 0; i < n && rest.length; i++) {
    picked.push(rest.splice(rng.int(rest.length), 1)[0]);
  }
  return picked;
}

export function getArchetype(pos: Position, id: string): Archetype | null {
  return poolFor(pos).find(a => a.id === id) ?? null;
}

export function archetypeName(a: Archetype, lang: Lang): string {
  return lang === 'es' ? a.es : a.en;
}
export function archetypeDesc(a: Archetype, lang: Lang): string {
  return lang === 'es' ? a.descEs : a.descEn;
}
