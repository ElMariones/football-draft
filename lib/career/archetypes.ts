// Archetypes — the first real decision of a career.
//
// Before the first ball is kicked you pick who you are. It's a permanent
// attribute tilt plus an identity that flavours the rest of the run (and the
// nickname on the summary card). Three of the position's pool are offered, so
// the choice is constrained by the seed, not a free pick of the best one.
//
// Every archetype belongs to a rarity, and rarity is a *budget*: the points it
// spends across the five attributes. That keeps the tiers honest — a legendary
// is not just rarer wording, it is measurably worth more — and the draw is
// weighted so that seeing one at all is an event.
import type { Position } from '@/data/types';
import type { Attrs } from '@/data/career/types';
import { isKeeperOrDef, isAttacker, isMidfielder } from './config';
import type { Rng } from './rng';
import type { Lang } from './i18n';

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

/** Points an archetype of each rarity spends across its attributes. */
export const RARITY_BUDGET: Record<Rarity, number> = {
  common: 8, rare: 12, epic: 16, legendary: 21,
};

/** How often each tier turns up among the three offered. */
const RARITY_WEIGHT: Record<Rarity, number> = {
  common: 60, rare: 27, epic: 10, legendary: 3,
};

export const RARITY_LABEL: Record<Rarity, { en: string; es: string }> = {
  common: { en: 'Common', es: 'Común' },
  rare: { en: 'Rare', es: 'Rara' },
  epic: { en: 'Epic', es: 'Épica' },
  legendary: { en: 'Legendary', es: 'Legendaria' },
};

export const RARITY_STYLE: Record<Rarity, { ring: string; text: string; glow: string }> = {
  common: { ring: 'border-white/15', text: 'text-white/45', glow: '' },
  rare: { ring: 'border-cl/60', text: 'text-cl', glow: 'shadow-[0_0_18px_rgba(61,169,252,0.18)]' },
  epic: { ring: 'border-purple-400/60', text: 'text-purple-300', glow: 'shadow-[0_0_22px_rgba(192,132,252,0.22)]' },
  legendary: { ring: 'border-gold/70', text: 'text-gold', glow: 'shadow-[0_0_30px_rgba(245,197,66,0.30)]' },
};

export interface Archetype {
  id: string;
  en: string; es: string;
  descEn: string; descEs: string;
  delta: Partial<Attrs>;
  rarity: Rarity;
  /** identity tag used by moments/flavor (e.g. penalty taker, captain material) */
  trait?: 'finisher' | 'burner' | 'wall' | 'brain' | 'captain' | 'allrounder';
}

const ATTACK: Archetype[] = [
  // ---- common (8) ----
  { id: 'poacher', en: 'Box poacher', es: 'Killer del área',
    descEn: 'You live off goals. Inside the box you do not miss.',
    descEs: 'Vives del gol. Dentro del área no perdonas.',
    delta: { tec: 8 }, rarity: 'common', trait: 'finisher' },
  { id: 'arrow', en: 'The Arrow', es: 'Flecha',
    descEn: 'Play the ball into space and nobody catches you.',
    descEs: 'Te tiran una pelota al espacio y no te agarran más.',
    delta: { pac: 8 }, rarity: 'common', trait: 'burner' },
  { id: 'tank', en: 'Tank', es: 'Tanque',
    descEn: 'You win everything in the air and hold off two centre-backs.',
    descEs: 'Bajas todas de cabeza y aguantas contra dos centrales.',
    delta: { phy: 8 }, rarity: 'common', trait: 'wall' },
  { id: 'bull', en: 'The Bull', es: 'El Toro',
    descEn: 'Head down, shoulder first. Defenders bounce off you.',
    descEs: 'Cabeza gacha y hombro. Los defensores rebotan.',
    delta: { phy: 5, pac: 3 }, rarity: 'common', trait: 'wall' },
  { id: 'header', en: 'Aerial menace', es: 'Cabeceador',
    descEn: 'Every corner is a chance the moment it leaves the boot.',
    descEs: 'Cada córner es una ocasión desde que sale del pie.',
    delta: { phy: 5, tec: 3 }, rarity: 'common', trait: 'finisher' },
  { id: 'wolf', en: 'The Wolf', es: 'El Lobo',
    descEn: 'You smell the loose ball a second before anybody else.',
    descEs: 'Hueles el rebote un segundo antes que el resto.',
    delta: { pac: 5, vis: 3 }, rarity: 'common', trait: 'finisher' },

  // ---- rare (12) ----
  { id: 'caudillo', en: 'Caudillo', es: 'Caudillo',
    descEn: 'Born to carry the team on your back.',
    descEs: 'Nacido para ponerse el equipo al hombro.',
    delta: { lea: 9, tec: 3 }, rarity: 'rare', trait: 'captain' },
  { id: 'enganche', en: 'Playmaker', es: 'Enganche',
    descEn: 'The brain. Your passes are worth goals.',
    descEs: 'El cerebro. Tus pases valen goles.',
    delta: { vis: 9, tec: 3 }, rarity: 'rare', trait: 'brain' },
  { id: 'complete', en: 'All-rounder', es: 'Todoterreno',
    descEn: 'A bit of everything, all of it done well.',
    descEs: 'Un poco de todo, bien hecho.',
    delta: { tec: 3, pac: 3, phy: 3, vis: 3 }, rarity: 'rare', trait: 'allrounder' },
  { id: 'false-nine', en: 'False nine', es: 'Falso 9',
    descEn: 'You drop off and suddenly the centre-backs have nobody to mark.',
    descEs: 'Te tiras atrás y los centrales se quedan sin nadie a quien marcar.',
    delta: { vis: 6, tec: 6 }, rarity: 'rare', trait: 'brain' },
  { id: 'ice', en: 'Ice in the veins', es: 'Sangre fría',
    descEn: 'The bigger the moment, the slower your heartbeat.',
    descEs: 'Cuanto más grande el momento, más lento te late el corazón.',
    delta: { tec: 7, lea: 5 }, rarity: 'rare', trait: 'finisher' },
  { id: 'dribbler', en: 'The Dribbler', es: 'El Gambeteador',
    descEn: 'One against one is not a duel. It is a formality.',
    descEs: 'El uno contra uno no es un duelo. Es un trámite.',
    delta: { tec: 7, pac: 5 }, rarity: 'rare', trait: 'burner' },

  // ---- epic (16) ----
  { id: 'acrobat', en: 'The Acrobat', es: 'El Acróbata',
    descEn: 'You score the goals other players do not even attempt.',
    descEs: 'Metes los goles que otros ni intentan.',
    delta: { tec: 9, pac: 4, phy: 3 }, rarity: 'epic', trait: 'finisher' },
  { id: 'left-foot', en: 'The Left Foot', es: 'La Zurda',
    descEn: 'A wand. Free kicks, crosses, finishes — all of it from one boot.',
    descEs: 'Una varita. Tiros libres, centros, definiciones: todo de un pie.',
    delta: { tec: 10, vis: 6 }, rarity: 'epic', trait: 'finisher' },
  { id: 'nine-complete', en: 'The Complete Nine', es: 'El 9 Total',
    descEn: 'Hold it up, run in behind, finish with either foot.',
    descEs: 'La aguantas, picas al espacio y la defines con las dos.',
    delta: { tec: 5, pac: 4, phy: 5, vis: 2 }, rarity: 'epic', trait: 'allrounder' },

  // ---- legendary (21) ----
  { id: 'phenom', en: 'Generational talent', es: 'Talento generacional',
    descEn: 'They have been talking about you since you were twelve. They were right.',
    descEs: 'Hablan de ti desde los doce años. Y tenían razón.',
    delta: { tec: 8, pac: 6, vis: 5, phy: 2 }, rarity: 'legendary', trait: 'allrounder' },
];

const MID: Archetype[] = [
  // ---- common (8) ----
  { id: 'engine', en: 'Engine', es: 'Motorcito',
    descEn: 'You cover every blade of grass, both boxes, all game.',
    descEs: 'Corres cada metro, de área a área, los 90 minutos.',
    delta: { phy: 5, pac: 3 }, rarity: 'common', trait: 'wall' },
  { id: 'arriving', en: 'Late runner', es: 'Volante llegador',
    descEn: 'You arrive at the edge of the box and finish.',
    descEs: 'Llegas al borde del área y la mandas a guardar.',
    delta: { tec: 5, pac: 3 }, rarity: 'common', trait: 'finisher' },
  { id: 'metronome', en: 'Metronome', es: 'Metrónomo',
    descEn: 'The game runs at the speed you decide.',
    descEs: 'El partido va a la velocidad que tú quieres.',
    delta: { vis: 8 }, rarity: 'common', trait: 'brain' },
  { id: 'thief', en: 'Ball thief', es: 'Ladrón de pelotas',
    descEn: 'You do not tackle. You take it off them and they never notice.',
    descEs: 'No barres. Se la sacas y ni se dan cuenta.',
    delta: { vis: 5, pac: 3 }, rarity: 'common', trait: 'wall' },
  { id: 'presser', en: 'Pressing monster', es: 'Presión alta',
    descEn: 'The other team cannot play out. You are always there.',
    descEs: 'El rival no puede salir jugando. Siempre estás ahí.',
    delta: { phy: 4, pac: 4 }, rarity: 'common', trait: 'wall' },

  // ---- rare (12) ----
  { id: 'destroyer', en: 'Destroyer', es: 'Cinco de marca',
    descEn: 'Nothing gets through the middle. Nothing.',
    descEs: 'Por el medio no pasa nadie. Nadie.',
    delta: { phy: 8, lea: 4 }, rarity: 'rare', trait: 'wall' },
  { id: 'caudillo', en: 'Caudillo', es: 'Caudillo',
    descEn: 'Born to carry the team on your back.',
    descEs: 'Nacido para ponerse el equipo al hombro.',
    delta: { lea: 9, vis: 3 }, rarity: 'rare', trait: 'captain' },
  { id: 'complete', en: 'All-rounder', es: 'Todoterreno',
    descEn: 'A bit of everything, all of it done well.',
    descEs: 'Un poco de todo, bien hecho.',
    delta: { tec: 3, pac: 3, phy: 3, vis: 3 }, rarity: 'rare', trait: 'allrounder' },
  { id: 'regista', en: 'Regista', es: 'Regista',
    descEn: 'You play from deep and the whole pitch opens up in front of you.',
    descEs: 'Juegas desde atrás y toda la cancha se te abre adelante.',
    delta: { vis: 8, tec: 4 }, rarity: 'rare', trait: 'brain' },
  { id: 'set-piece', en: 'Dead-ball specialist', es: 'Especialista a balón parado',
    descEn: 'A free kick anywhere near the box is already half a goal.',
    descEs: 'Una falta cerca del área ya es medio gol.',
    delta: { tec: 8, vis: 4 }, rarity: 'rare', trait: 'finisher' },
  { id: 'general', en: 'Field general', es: 'General del campo',
    descEn: 'You do not shout. You point, and eleven players move.',
    descEs: 'No gritas. Señalas, y once jugadores se mueven.',
    delta: { lea: 7, vis: 5 }, rarity: 'rare', trait: 'captain' },

  // ---- epic (16) ----
  { id: 'conductor', en: 'The Conductor', es: 'El Director de Orquesta',
    descEn: 'Every pass is a decision, and every decision is the right one.',
    descEs: 'Cada pase es una decisión, y cada decisión es la correcta.',
    delta: { vis: 10, tec: 6 }, rarity: 'epic', trait: 'brain' },
  { id: 'ten', en: 'The Number Ten', es: 'El Diez',
    descEn: 'Here the shirt is not a number. It is a job description.',
    descEs: 'Aquí la camiseta no es un número. Es un cargo.',
    delta: { tec: 7, vis: 7, lea: 2 }, rarity: 'epic', trait: 'brain' },
  { id: 'iron-lung', en: 'Iron lungs', es: 'Pulmones de acero',
    descEn: 'Ninety minutes at the same speed. The other ten are walking.',
    descEs: 'Noventa minutos a la misma velocidad. Los otros diez caminan.',
    delta: { phy: 8, pac: 5, lea: 3 }, rarity: 'epic', trait: 'wall' },

  // ---- legendary (21) ----
  { id: 'chosen', en: 'The Chosen One', es: 'El Elegido',
    descEn: 'Some players join a team. You become one.',
    descEs: 'Algunos jugadores se suman a un equipo. Tú te conviertes en uno.',
    delta: { tec: 7, vis: 7, lea: 4, pac: 3 }, rarity: 'legendary', trait: 'allrounder' },
];

const DEF: Archetype[] = [
  // ---- common (8) ----
  { id: 'wall', en: 'The Wall', es: 'El Muro',
    descEn: 'They pass over you or not at all.',
    descEs: 'Por encima de ti no pasa nadie.',
    delta: { phy: 8 }, rarity: 'common', trait: 'wall' },
  { id: 'flyer', en: 'Overlapper', es: 'Lateral volante',
    descEn: 'You end the game further forward than the wingers.',
    descEs: 'Terminas el partido más adelante que los extremos.',
    delta: { pac: 8 }, rarity: 'common', trait: 'burner' },
  { id: 'sweeper', en: 'Ball-player', es: 'Central con salida',
    descEn: 'The move starts at your feet.',
    descEs: 'La jugada empieza en tus pies.',
    delta: { vis: 5, tec: 3 }, rarity: 'common', trait: 'brain' },
  { id: 'stopper', en: 'Old-school', es: 'Marcador de área',
    descEn: 'A defender from another era. Nobody enjoys the 90 minutes.',
    descEs: 'Un defensor de otra época. Nadie la pasa bien.',
    delta: { phy: 5, lea: 3 }, rarity: 'common', trait: 'wall' },
  { id: 'warrior', en: 'Warrior', es: 'Guerrero',
    descEn: 'You finish every game with something bleeding. But you finish it.',
    descEs: 'Terminas todos los partidos con algo sangrando. Pero los terminas.',
    delta: { phy: 5, lea: 3 }, rarity: 'common', trait: 'wall' },
  { id: 'recovery', en: 'Recovery pace', es: 'Vuelta rápida',
    descEn: 'Beaten once, back in front of him ten metres later.',
    descEs: 'Te ganan una vez y a los diez metros ya estás otra vez delante.',
    delta: { pac: 5, phy: 3 }, rarity: 'common', trait: 'burner' },

  // ---- rare (12) ----
  { id: 'caudillo', en: 'Caudillo', es: 'Caudillo',
    descEn: 'The dressing room follows you, not the armband.',
    descEs: 'El vestuario te sigue a ti, no a la cinta.',
    delta: { lea: 9, phy: 3 }, rarity: 'rare', trait: 'captain' },
  { id: 'complete', en: 'All-rounder', es: 'Todoterreno',
    descEn: 'A bit of everything, all of it done well.',
    descEs: 'Un poco de todo, bien hecho.',
    delta: { tec: 3, pac: 3, phy: 3, vis: 3 }, rarity: 'rare', trait: 'allrounder' },
  { id: 'libero', en: 'Libero', es: 'Líbero',
    descEn: 'You defend the space nobody else has noticed yet.',
    descEs: 'Defiendes el espacio que todavía nadie vio.',
    delta: { vis: 7, phy: 5 }, rarity: 'rare', trait: 'brain' },
  { id: 'reader', en: 'The Reader', es: 'El Anticipador',
    descEn: 'You never slide in. You are simply already there.',
    descEs: 'Nunca barres. Sencillamente ya estás ahí.',
    delta: { vis: 8, pac: 4 }, rarity: 'rare', trait: 'brain' },
  { id: 'brick', en: 'Brick wall', es: 'Pared de ladrillo',
    descEn: 'Strikers go back to the bench asking what they hit.',
    descEs: 'Los delanteros vuelven al banco preguntando contra qué chocaron.',
    delta: { phy: 9, lea: 3 }, rarity: 'rare', trait: 'wall' },

  // ---- epic (16) ----
  { id: 'elegant', en: 'The Elegant One', es: 'El Elegante',
    descEn: 'You defend without ever looking hurried, or dirty.',
    descEs: 'Defiendes sin despeinarte y sin ensuciarte nunca.',
    delta: { vis: 7, tec: 5, phy: 4 }, rarity: 'epic', trait: 'brain' },
  { id: 'modern-back', en: 'Modern full-back', es: 'Carrilero moderno',
    descEn: 'Eighty metres of touchline, both directions, every week.',
    descEs: 'Ochenta metros de banda, ida y vuelta, todas las semanas.',
    delta: { pac: 8, phy: 5, tec: 3 }, rarity: 'epic', trait: 'burner' },
  { id: 'lockdown', en: 'The Lockdown', es: 'El Candado',
    descEn: 'They put you on their best player and you erase him from the game.',
    descEs: 'Te ponen contra su mejor jugador y lo borras del partido.',
    delta: { phy: 7, pac: 5, lea: 4 }, rarity: 'epic', trait: 'wall' },

  // ---- legendary (21) ----
  { id: 'emperor', en: 'The Emperor', es: 'El Emperador',
    descEn: 'A defender who decides finals. There are three of you in history.',
    descEs: 'Un defensor que define finales. Hay tres así en la historia.',
    delta: { phy: 7, lea: 6, vis: 5, tec: 3 }, rarity: 'legendary', trait: 'captain' },
];

const GK: Archetype[] = [
  // ---- common (8) ----
  { id: 'shotstop', en: 'Shot-stopper', es: 'Atajapenales',
    descEn: 'One-on-one, you win. Penalties are your speciality.',
    descEs: 'Mano a mano, ganas tú. Los penales son lo tuyo.',
    delta: { tec: 8 }, rarity: 'common', trait: 'finisher' },
  { id: 'giant', en: 'The Giant', es: 'El Gigante',
    descEn: 'Crosses are yours. All of them.',
    descEs: 'Los centros son tuyos. Todos.',
    delta: { phy: 8 }, rarity: 'common', trait: 'wall' },
  { id: 'sweeper-k', en: 'Sweeper keeper', es: 'Portero líbero',
    descEn: 'You play thirty metres off your line and start the attacks.',
    descEs: 'Juegas treinta metros fuera del área y empiezas los ataques.',
    delta: { vis: 5, pac: 3 }, rarity: 'common', trait: 'brain' },
  { id: 'cat', en: 'The Cat', es: 'El Gato',
    descEn: 'Pure reflex. You save things you had no time to see.',
    descEs: 'Puro reflejo. Atajas cosas que no tuviste tiempo de ver.',
    delta: { pac: 5, tec: 3 }, rarity: 'common', trait: 'finisher' },

  // ---- rare (12) ----
  { id: 'captain-k', en: 'Vocal keeper', es: 'Portero capitán',
    descEn: 'You organise the whole defence at the top of your lungs.',
    descEs: 'Ordenas toda la defensa a los gritos.',
    delta: { lea: 9, phy: 3 }, rarity: 'rare', trait: 'captain' },
  { id: 'complete', en: 'All-rounder', es: 'Todoterreno',
    descEn: 'A bit of everything, all of it done well.',
    descEs: 'Un poco de todo, bien hecho.',
    delta: { tec: 3, pac: 3, phy: 3, vis: 3 }, rarity: 'rare', trait: 'allrounder' },
  { id: 'penalty-king', en: 'Penalty king', es: 'Rey de los penales',
    descEn: 'Shootouts are not a lottery when you are in goal.',
    descEs: 'Contigo en el arco, los penales no son una lotería.',
    delta: { tec: 8, lea: 4 }, rarity: 'rare', trait: 'finisher' },
  { id: 'distributor', en: 'The Distributor', es: 'El Lanzador',
    descEn: 'Your throw is worth more than most midfielders’ passes.',
    descEs: 'Tu saque vale más que el pase de muchos mediocampistas.',
    delta: { vis: 8, tec: 4 }, rarity: 'rare', trait: 'brain' },

  // ---- epic (16) ----
  { id: 'madman', en: 'The Madman', es: 'El Loco',
    descEn: 'Nobody knows what you will do next. Least of all the striker.',
    descEs: 'Nadie sabe qué vas a hacer. Menos que nadie, el delantero.',
    delta: { pac: 7, tec: 6, phy: 3 }, rarity: 'epic', trait: 'burner' },
  { id: 'monument', en: 'The Monument', es: 'El Monumento',
    descEn: 'Fifteen years, one shirt, one goal to defend.',
    descEs: 'Quince años, una camiseta, un arco que defender.',
    delta: { phy: 7, lea: 6, tec: 3 }, rarity: 'epic', trait: 'captain' },

  // ---- legendary (21) ----
  { id: 'saint', en: 'The Saint', es: 'El Santo',
    descEn: 'Strikers cross themselves before they shoot. It does not help.',
    descEs: 'Los delanteros se persignan antes de patear. No les sirve.',
    delta: { tec: 8, phy: 5, lea: 5, vis: 3 }, rarity: 'legendary', trait: 'wall' },
];

export function poolFor(pos: Position): Archetype[] {
  if (pos === 'GK') return GK;
  if (isKeeperOrDef(pos)) return DEF;
  if (isAttacker(pos)) return ATTACK;
  if (isMidfielder(pos)) return MID;
  return MID;
}

/**
 * Three options drawn from the position's pool — the seed decides your menu.
 *
 * The draw is weighted by rarity rather than uniform, so a legendary is something
 * that happens to you rather than something you can count on. Each pick rolls a
 * tier first and then an archetype inside it, and a tier drops out of the running
 * once its last member has been taken.
 */
export function offerArchetypes(pos: Position, rng: Rng, n = 3): Archetype[] {
  const rest = [...poolFor(pos)];
  const picked: Archetype[] = [];
  const tiers: Rarity[] = ['legendary', 'epic', 'rare', 'common'];

  for (let i = 0; i < n && rest.length; i++) {
    const avail = tiers.filter(t => rest.some(a => a.rarity === t));
    const total = avail.reduce((s, t) => s + RARITY_WEIGHT[t], 0);
    let r = rng.next() * total;
    let tier = avail[avail.length - 1];
    for (const t of avail) { r -= RARITY_WEIGHT[t]; if (r <= 0) { tier = t; break; } }

    const bucket = rest.filter(a => a.rarity === tier);
    const chosen = bucket[rng.int(bucket.length)];
    picked.push(chosen);
    rest.splice(rest.indexOf(chosen), 1);
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
export function rarityLabel(r: Rarity, lang: Lang): string {
  return lang === 'es' ? RARITY_LABEL[r].es : RARITY_LABEL[r].en;
}
