import type {
  CareerPlayer, CareerEvent, Effect, Title,
} from '@/data/career/types';
import { Rng, clamp } from './rng';
import { CAREER } from './config';
import type { Lang } from './i18n';

const L = (lang: Lang, en: string, es: string) => (lang === 'es' ? es : en);

// Build the localized event deck. Kept as a factory so all copy is bilingual.
export function buildEventDeck(lang: Lang): CareerEvent[] {
  const deck: CareerEvent[] = [
    // ---------- injury ----------
    {
      id: 'injury-knock', category: 'injury', weight: 1.2, cooldown: 1,
      title: L(lang, 'Nagging knock', 'Una molestia'),
      desc: L(lang, 'You pick up a knock before a big run of games. Push through or rest it?',
        'Arrastras una molestia antes de un tramo importante. ¿La aguantas o descansás?'),
      when: () => true,
      options: [
        {
          label: L(lang, 'Play through', 'Jugar igual'),
          outcomes: [
            { weight: 0.7, badge: L(lang, 'Fine', 'Sin problemas'), effects: [{ type: 'form', delta: 3 }] },
            { weight: 0.3, badge: L(lang, 'Aggravated', 'Se agravó'), effects: [{ type: 'injury', games: 8, proneness: 8 }, { type: 'morale', delta: -5 }] },
          ],
        },
        {
          label: L(lang, 'Rest it', 'Descansar'),
          outcomes: [{ weight: 1, badge: L(lang, 'Miss a few games', 'Perdés algunos partidos'), effects: [{ type: 'injury', games: 3 }, { type: 'fitness', delta: 6 }] }],
        },
      ],
    },
    {
      id: 'injury-major', category: 'injury', weight: 0.5, cooldown: 4,
      title: L(lang, 'Serious injury', 'Lesión grave'),
      desc: L(lang, 'A bad tackle leaves you facing a long spell out. How do you rehab?',
        'Una entrada fuerte te deja mucho tiempo fuera. ¿Cómo encaras la recuperación?'),
      when: p => p.age >= 19,
      options: [
        {
          label: L(lang, 'Rush back', 'Volver rápido'),
          outcomes: [
            { weight: 0.6, badge: L(lang, 'Miss 10 games', 'Perdés 10 partidos'), effects: [{ type: 'injury', games: 10 }, { type: 'ovrTemp', delta: -2, years: 1 }] },
            { weight: 0.4, badge: L(lang, 'Re-injury', 'Recaída'), effects: [{ type: 'injury', games: 16, proneness: 12 }, { type: 'ovr', delta: -1 }] },
          ],
        },
        {
          label: L(lang, 'Full rehab', 'Recuperación completa'),
          outcomes: [{ weight: 1, badge: L(lang, 'Miss 16, come back strong', 'Perdés 16, vuelves entero'), effects: [{ type: 'injury', games: 16 }, { type: 'fitness', delta: 8 }] }],
        },
      ],
    },
    // ---------- health ----------
    {
      id: 'mystery-substance', category: 'health', weight: 0.7, cooldown: 3,
      title: L(lang, 'Mysterious substance', 'Sustancia misteriosa'),
      desc: L(lang, 'The club doctor offers a supplement that boosts you — but it may fail a doping test.',
        'El médico del club te ofrece un suplemento que mejora tu rendimiento, pero si sale en el antidoping, te suspenden.'),
      when: () => true,
      options: [
        {
          label: L(lang, 'Take it', 'Consumir'),
          outcomes: [
            { weight: 0.75, badge: '+5 OVR', effects: [{ type: 'ovr', delta: 5 }] },
            { weight: 0.25, badge: L(lang, 'Suspension', 'Suspensión'), effects: [{ type: 'injury', games: 14 }, { type: 'reputation', delta: -12 }, { type: 'discipline', delta: -12 }] },
          ],
        },
        { label: L(lang, 'Refuse', 'Rechazar'), outcomes: [{ weight: 1, badge: L(lang, 'No change', 'Sin cambios'), effects: [] }] },
      ],
    },
    {
      id: 'illness', category: 'health', weight: 0.6, cooldown: 3,
      title: L(lang, 'Bad virus', 'Un virus feo'),
      desc: L(lang, 'A virus knocks you flat mid-season.', 'Un virus te tira a mitad de temporada.'),
      when: () => true,
      options: [
        { label: L(lang, 'Rest fully', 'Descansar bien'), outcomes: [{ weight: 1, badge: L(lang, 'Miss 5 games', 'Perdés 5 partidos'), effects: [{ type: 'injury', games: 5 }, { type: 'fitness', delta: 4 }] }] },
        { label: L(lang, 'Play through it', 'Jugar enfermo'), outcomes: [{ weight: 1, badge: L(lang, 'Dip in form', 'Baja de forma'), effects: [{ type: 'form', delta: -10 }] }] },
      ],
    },
    // ---------- discipline ----------
    {
      id: 'red-card-storm', category: 'discipline', weight: 0.9, cooldown: 2,
      title: L(lang, 'Seeing red', 'Ves rojo'),
      desc: L(lang, 'A rush of red cards is hurting the team. Address it?', 'Una racha de expulsiones perjudica al equipo. ¿Lo trabajás?'),
      when: p => p.discipline < 62,
      options: [
        { label: L(lang, 'Anger management', 'Control de la ira'), outcomes: [{ weight: 1, badge: L(lang, 'Calmer', 'Más tranquilo'), effects: [{ type: 'discipline', delta: 10 }, { type: 'morale', delta: 3 }] }] },
        { label: L(lang, 'Ignore it', 'Ignorarlo'), outcomes: [{ weight: 1, badge: L(lang, 'More bans', 'Más sanciones'), effects: [{ type: 'discipline', delta: -8 }, { type: 'minutesBias', delta: -4 }, { type: 'reputation', delta: -3 }] }] },
      ],
    },
    {
      id: 'training-bustup', category: 'discipline', weight: 0.8, cooldown: 2,
      title: L(lang, 'Training-ground bust-up', 'Cruce en el entrenamiento'),
      desc: L(lang, 'You clash with a teammate in training.', 'Te cruzas con un compañero en la práctica.'),
      when: () => true,
      options: [
        { label: L(lang, 'Apologize', 'Pedir disculpas'), outcomes: [{ weight: 1, badge: L(lang, 'Peace restored', 'Paz'), effects: [{ type: 'morale', delta: 4 }, { type: 'discipline', delta: 4 }] }] },
        { label: L(lang, 'Stand your ground', 'Plantarte'), outcomes: [{ weight: 1, badge: L(lang, 'Seen as a leader', 'Te ven como líder'), effects: [{ type: 'reputation', delta: 4 }, { type: 'morale', delta: -4 }, { type: 'discipline', delta: -3 }] }] },
      ],
    },
    {
      id: 'nightclub-scandal', category: 'discipline', weight: 0.7, cooldown: 3,
      title: L(lang, 'Tabloid scandal', 'Escándalo en la prensa'),
      desc: L(lang, 'A night out ends up on the front pages.', 'Una salida termina en la tapa de los diarios.'),
      when: p => p.age >= 18 && p.age <= 31 && p.reputation > 40,
      options: [
        { label: L(lang, 'Lay low', 'Perfil bajo'), outcomes: [{ weight: 1, badge: L(lang, 'Blows over', 'Se calma'), effects: [{ type: 'reputation', delta: -2 }] }] },
        {
          label: L(lang, 'PR spin', 'Operación de prensa'),
          outcomes: [
            { weight: 0.6, badge: L(lang, 'Image saved', 'Imagen salvada'), effects: [{ type: 'reputation', delta: 5 }] },
            { weight: 0.4, badge: L(lang, 'Backfires', 'Sale mal'), effects: [{ type: 'reputation', delta: -8 }, { type: 'morale', delta: -4 }] },
          ],
        },
      ],
    },
    // ---------- family ----------
    {
      id: 'birth-child', category: 'family', weight: 0.9, onceOnly: true,
      title: L(lang, 'A new arrival', 'Llega un bebé'),
      desc: L(lang, 'You become a parent.', 'Te convertís en padre/madre.'),
      when: p => p.age >= 22,
      options: [
        { label: L(lang, 'Embrace it', 'Disfrutarlo'), outcomes: [{ weight: 1, badge: L(lang, 'Happier, tired', 'Más feliz, cansado'), effects: [{ type: 'morale', delta: 8 }, { type: 'form', delta: -2 }] }] },
        { label: L(lang, 'Stay locked in', 'Seguir enfocado'), outcomes: [{ weight: 1, badge: L(lang, 'Motivated', 'Motivado'), effects: [{ type: 'morale', delta: 4 }] }] },
      ],
    },
    {
      id: 'homesickness', category: 'family', weight: 0.8, cooldown: 3,
      title: L(lang, 'Homesick', 'Nostalgia de casa'),
      desc: L(lang, 'Life abroad is wearing on you.', 'La vida lejos te empieza a pesar.'),
      when: p => p.morale < 58 && p.age <= 33,
      options: [
        { label: L(lang, 'Ask to move home', 'Pedir volver a casa'), outcomes: [{ weight: 1, badge: L(lang, 'Seek a homecoming', 'Buscar la vuelta'), effects: [{ type: 'flag', name: 'wantsHome' }, { type: 'morale', delta: 6 }] }] },
        {
          label: L(lang, 'Tough it out', 'Aguantar'),
          outcomes: [
            { weight: 0.6, badge: L(lang, 'Settle in', 'Te adaptás'), effects: [{ type: 'morale', delta: 8 }] },
            { weight: 0.4, badge: L(lang, 'Worse', 'Peor'), effects: [{ type: 'morale', delta: -8 }, { type: 'form', delta: -5 }] },
          ],
        },
      ],
    },
    // ---------- nation ----------
    {
      id: 'nationality-switch', category: 'nation', weight: 1.4, onceOnly: true,
      title: L(lang, 'A choice of nations', 'Elegir selección'),
      desc: L(lang, 'You are eligible for two national teams. Commit before your first competitive cap.',
        'Sos elegible para dos selecciones. Tienes que decidir antes de tu primer partido oficial.'),
      when: p => !!p.secondNationCode && !p.ntCapped,
      options: [
        { label: L(lang, 'Switch allegiance', 'Cambiar de selección'), outcomes: [{ weight: 1, badge: L(lang, 'New nation', 'Nueva selección'), effects: [{ type: 'switchNation' }] }] },
        { label: L(lang, 'Stay loyal', 'Ser fiel'), outcomes: [{ weight: 1, badge: L(lang, 'Loyalty', 'Lealtad'), effects: [{ type: 'loyalty', delta: 6 }, { type: 'morale', delta: 4 }] }] },
      ],
    },
    {
      id: 'nt-captaincy', category: 'nation', weight: 0.8, onceOnly: true,
      title: L(lang, 'National captaincy', 'Capitanía de la selección'),
      desc: L(lang, 'The manager offers you the armband for your country.', 'El técnico te ofrece la cinta de tu país.'),
      when: p => p.ntCapped && p.reputation > 66,
      options: [
        { label: L(lang, 'Accept', 'Aceptar'), outcomes: [{ weight: 1, badge: L(lang, 'Leader of the nation', 'Líder del país'), effects: [{ type: 'reputation', delta: 6 }, { type: 'morale', delta: 5 }] }] },
        { label: L(lang, 'Decline', 'Rechazar'), outcomes: [{ weight: 1, badge: L(lang, 'No change', 'Sin cambios'), effects: [{ type: 'morale', delta: -2 }] }] },
      ],
    },
    // ---------- contract ----------
    {
      id: 'contract-renewal', category: 'contract', weight: 1.1,
      title: L(lang, 'Contract on the table', 'Contrato sobre la mesa'),
      desc: L(lang, 'Your deal is running down. Renew, or run it to a free transfer?',
        'Se te termina el contrato. ¿Renovás o lo dejas correr para irte libre?'),
      when: p => p.contractYears <= 1 && !!p.clubId,
      options: [
        { label: L(lang, 'Renew', 'Renovar'), outcomes: [{ weight: 1, badge: L(lang, 'Loyalty + security', 'Lealtad y seguridad'), effects: [{ type: 'loyalty', delta: 8 }, { type: 'morale', delta: 5 }, { type: 'contract', years: 3 }] }] },
        { label: L(lang, 'Run it down', 'Dejarlo correr'), outcomes: [{ weight: 1, badge: L(lang, 'Free-agent path', 'Camino a irte libre'), effects: [{ type: 'flag', name: 'bosman' }, { type: 'loyalty', delta: -5 }] }] },
      ],
    },
    {
      id: 'boot-deal', category: 'offfield', weight: 0.7, cooldown: 4,
      title: L(lang, 'Boot mega-deal', 'Contrato con una marca'),
      desc: L(lang, 'A sportswear giant wants you as a face of the brand.', 'Una marca deportiva te quiere como imagen.'),
      when: p => p.reputation > 55,
      options: [
        { label: L(lang, 'Sign the deal', 'Firmar'), outcomes: [{ weight: 1, badge: L(lang, 'Fame up', 'Más fama'), effects: [{ type: 'reputation', delta: 5 }, { type: 'morale', delta: 3 }] }] },
        { label: L(lang, 'Focus on football', 'Enfocarme en el fútbol'), outcomes: [{ weight: 1, badge: L(lang, 'Sharper', 'Más concentrado'), effects: [{ type: 'form', delta: 4 }] }] },
      ],
    },
    // ---------- role ----------
    {
      id: 'position-change', category: 'role', weight: 1.0, cooldown: 3,
      title: L(lang, 'Position change', 'Cambio de posición'),
      desc: L(lang, 'The coach needs you to cover a different role.', 'El entrenador te necesita para cubrir otro puesto.'),
      when: p => p.age >= 20,
      options: [
        { label: L(lang, 'Accept', 'Aceptar'), outcomes: [{ weight: 1, badge: L(lang, 'Starter, adapting', 'Titular, adaptándote'), effects: [{ type: 'ovrTemp', delta: -2, years: 1 }, { type: 'minutesBias', delta: 6 }] }] },
        { label: L(lang, 'Refuse', 'Rechazar'), outcomes: [{ weight: 1, badge: L(lang, 'Fewer minutes', 'Menos minutos'), effects: [{ type: 'minutesBias', delta: -5 }] }] },
      ],
    },
    {
      id: 'club-captaincy', category: 'role', weight: 0.8, onceOnly: true,
      title: L(lang, 'Club captaincy', 'Capitanía del club'),
      desc: L(lang, 'The dressing room wants you as captain.', 'El vestuario te quiere como capitán.'),
      when: p => p.age >= 27 && p.loyalty > 55,
      options: [
        { label: L(lang, 'Accept', 'Aceptar'), outcomes: [{ weight: 1, badge: L(lang, 'Respected leader', 'Líder respetado'), effects: [{ type: 'reputation', delta: 4 }, { type: 'morale', delta: 5 }] }] },
        { label: L(lang, 'Decline', 'Rechazar'), outcomes: [{ weight: 1, badge: L(lang, 'No change', 'Sin cambios'), effects: [] }] },
      ],
    },
    {
      id: 'new-manager', category: 'role', weight: 1.0, cooldown: 2,
      title: L(lang, 'New manager arrives', 'Llega un nuevo técnico'),
      desc: L(lang, 'A new coach walks in with new ideas.', 'Un nuevo entrenador llega con otras ideas.'),
      when: () => true,
      options: [
        {
          label: L(lang, 'Adapt to his system', 'Adaptarte a su sistema'),
          outcomes: [
            { weight: 0.7, badge: L(lang, 'Clicks', 'Encajás'), effects: [{ type: 'minutesBias', delta: 5 }, { type: 'form', delta: 4 }] },
            { weight: 0.3, badge: L(lang, 'Slow start', 'Arranque lento'), effects: [{ type: 'form', delta: -4 }] },
          ],
        },
        { label: L(lang, 'Resist change', 'Resistirte'), outcomes: [{ weight: 1, badge: L(lang, 'Bench risk', 'Riesgo de banco'), effects: [{ type: 'minutesBias', delta: -6 }, { type: 'flag', name: 'unsettled' }] }] },
      ],
    },
    // ---------- offfield ----------
    {
      id: 'viral-goal', category: 'offfield', weight: 0.8, cooldown: 2,
      title: L(lang, 'A goal goes viral', 'Un gol se hace viral'),
      desc: L(lang, 'A wonder-goal blows up online.', 'Un golazo explota en las redes.'),
      when: p => p.overall >= 65,
      options: [
        { label: L(lang, 'Milk the moment', 'Aprovechar el momento'), outcomes: [{ weight: 1, badge: L(lang, 'Fame up', 'Más fama'), effects: [{ type: 'reputation', delta: 5 }, { type: 'value', mult: 1.05 }] }] },
        { label: L(lang, 'Stay humble', 'Ser humilde'), outcomes: [{ weight: 1, badge: L(lang, 'Respect up', 'Más respeto'), effects: [{ type: 'morale', delta: 4 }, { type: 'reputation', delta: 2 }] }] },
      ],
    },
    {
      id: 'documentary', category: 'offfield', weight: 0.6, cooldown: 4,
      title: L(lang, 'Streaming documentary', 'Documental en streaming'),
      desc: L(lang, 'A platform wants to film your life.', 'Una plataforma quiere filmar tu vida.'),
      when: p => p.reputation > 62,
      options: [
        { label: L(lang, 'Do it', 'Hacerlo'), outcomes: [{ weight: 1, badge: L(lang, 'Global fame', 'Fama global'), effects: [{ type: 'reputation', delta: 6 }] }] },
        { label: L(lang, 'Focus on football', 'Enfocarme en el fútbol'), outcomes: [{ weight: 1, badge: L(lang, 'Sharper', 'Más concentrado'), effects: [{ type: 'form', delta: 3 }] }] },
      ],
    },
  ];
  return deck;
}

// ---- selection + application ----------------------------------------------

export function selectEvent(
  p: CareerPlayer, deck: CareerEvent[], rng: Rng,
  firedById: Record<string, number>, year: number,
): CareerEvent | null {
  const eligible = deck.filter(e => {
    if (!e.when(p)) return false;
    const last = firedById[e.id];
    if (e.onceOnly && last !== undefined) return false;
    if (e.cooldown && last !== undefined && year - last < e.cooldown) return false;
    return true;
  });
  if (!eligible.length) return null;

  let chance = CAREER.eventChanceBase;
  chance += (p.injuryProneness - 20) / 300;
  chance += p.discipline < 55 ? 0.1 : 0;
  chance = clamp(0.25, 0.85, chance);
  if (!rng.chance(chance)) return null;

  return rng.weighted(eligible, e => e.weight);
}

export interface EffectResult { titles: Title[]; retire: boolean }

export function applyEffects(p: CareerPlayer, effects: Effect[], rng: Rng): EffectResult {
  const res: EffectResult = { titles: [], retire: false };
  for (const e of effects) {
    switch (e.type) {
      case 'ovr': p.overall = clamp(40, 99, p.overall + e.delta); p.peakOverall = Math.max(p.peakOverall, Math.round(p.overall)); break;
      case 'ovrTemp': p.ovrTemp.push({ delta: e.delta, years: e.years }); break;
      case 'value': p.value = Math.round(p.value * e.mult); p.peakValue = Math.max(p.peakValue, p.value); break;
      case 'morale': p.morale = clamp(5, 100, p.morale + e.delta); break;
      case 'form': p.form = clamp(15, 99, p.form + e.delta); break;
      case 'fitness': p.fitness = clamp(30, 99, p.fitness + e.delta); break;
      case 'injury': p.injuryGamesNext += e.games; if (e.proneness) p.injuryProneness = clamp(6, 100, p.injuryProneness + e.proneness); break;
      case 'loyalty': p.loyalty = clamp(0, 100, p.loyalty + e.delta); break;
      case 'reputation': p.reputation = clamp(0, 100, p.reputation + e.delta); break;
      case 'discipline': p.discipline = clamp(0, 100, p.discipline + e.delta); break;
      case 'minutesBias': p.roleBias += e.delta; break;
      case 'switchNation': if (p.secondNationCode) p.ntNationCode = p.secondNationCode; break;
      case 'unlockNation': p.secondNationCode = e.code; break;
      case 'flag': p.flags[e.name] = true; break;
      case 'contract': p.contractYears = Math.max(p.contractYears, e.years); break;
      case 'title': res.titles.push({ key: e.key, kind: e.kind, scope: e.scope, age: p.age, clubId: p.clubId ?? undefined }); break;
      case 'retire': res.retire = true; break;
    }
  }
  return res;
}
