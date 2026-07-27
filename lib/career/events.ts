import type {
  CareerPlayer, CareerEvent, Effect, Title,
} from '@/data/career/types';
import { Rng, clamp } from './rng';
import { applyOverallDelta, overallFrom, gainAttrs } from './attributes';
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
    // ================= Legend update: 20 new events ==========================
    // ---------- teammates ----------
    {
      id: 'star-signing', category: 'teammate', weight: 1.1, cooldown: 3,
      title: L(lang, 'A superstar arrives', 'Llega una estrella'),
      desc: L(lang, 'The club signs a big name in your position. The shirt is suddenly contested.',
        'El club ficha a un crack en tu puesto. De golpe la camiseta se pelea.'),
      when: p => p.age >= 19,
      options: [
        {
          label: L(lang, 'Fight for the shirt', 'Pelear el puesto'),
          outcomes: [
            { weight: 0.55, badge: L(lang, 'You win the duel', 'Ganas el duelo'), effects: [{ type: 'minutesBias', delta: 7 }, { type: 'form', delta: 6 }] },
            { weight: 0.45, badge: L(lang, 'You lose the duel', 'Pierdes el duelo'), effects: [{ type: 'minutesBias', delta: -8 }, { type: 'morale', delta: -8 }] },
          ],
        },
        {
          label: L(lang, 'Learn from him', 'Aprender de él'),
          outcomes: [{ weight: 1, badge: L(lang, 'You improve', 'Mejoras'), effects: [{ type: 'attr', attrs: { tec: 2, vis: 2 } }, { type: 'minutesBias', delta: -3 }] }],
        },
      ],
    },
    {
      id: 'captain-feud', category: 'teammate', weight: 0.9, cooldown: 3,
      title: L(lang, 'Clash with the captain', 'Cruce con el capitán'),
      desc: L(lang, 'The captain calls you out in front of the whole dressing room.',
        'El capitán te expone delante de todo el vestuario.'),
      when: p => p.age >= 20,
      options: [
        {
          label: L(lang, 'Answer back', 'Contestarle'),
          outcomes: [
            { weight: 0.5, badge: L(lang, 'You earn respect', 'Te ganas el respeto'), effects: [{ type: 'attr', attrs: { lea: 3 } }, { type: 'reputation', delta: 3 }] },
            { weight: 0.5, badge: L(lang, 'Dressing room split', 'Vestuario partido'), effects: [{ type: 'morale', delta: -10 }, { type: 'minutesBias', delta: -4 }] },
          ],
        },
        {
          label: L(lang, 'Swallow it', 'Tragártelo'),
          outcomes: [{ weight: 1, badge: L(lang, 'Peace, but it stings', 'Paz, pero duele'), effects: [{ type: 'morale', delta: -3 }, { type: 'discipline', delta: 5 }] }],
        },
      ],
    },
    {
      id: 'roommate-kid', category: 'teammate', weight: 0.8, cooldown: 4,
      title: L(lang, 'The kid from the academy', 'El chico de la cantera'),
      desc: L(lang, 'A 17-year-old is put in your care on away trips. He copies everything you do.',
        'Te ponen a cargo de un chico de 17 años en los viajes. Copia todo lo que haces.'),
      when: p => p.age >= 25,
      options: [
        { label: L(lang, 'Take him under your wing', 'Apadrinarlo'), outcomes: [{ weight: 1, badge: L(lang, 'A leader is born', 'Nace un líder'), effects: [{ type: 'attr', attrs: { lea: 4 } }, { type: 'idol', delta: 2 }] }] },
        { label: L(lang, 'Not your job', 'No es tu trabajo'), outcomes: [{ weight: 1, badge: L(lang, 'Focused on yourself', 'Enfocado en ti'), effects: [{ type: 'form', delta: 4 }] }] },
      ],
    },
    {
      id: 'penalty-argument', category: 'teammate', weight: 0.9, cooldown: 3,
      title: L(lang, 'Who takes the penalties?', '¿Quién patea los penales?'),
      desc: L(lang, 'You and a teammate both want the ball from twelve yards.',
        'Tú y un compañero queréis la pelota desde los doce pasos.'),
      when: p => p.overall >= 66,
      options: [
        {
          label: L(lang, 'Grab the ball', 'Agarrar la pelota'),
          outcomes: [
            { weight: 0.6, badge: L(lang, 'They are yours now', 'Ahora son tuyos'), effects: [{ type: 'attr', attrs: { tec: 3, lea: 2 } }] },
            { weight: 0.4, badge: L(lang, 'You miss the first', 'Fallas el primero'), effects: [{ type: 'form', delta: -8 }, { type: 'morale', delta: -5 }] },
          ],
        },
        { label: L(lang, 'Let him take them', 'Dejárselos a él'), outcomes: [{ weight: 1, badge: L(lang, 'Dressing room happy', 'Vestuario contento'), effects: [{ type: 'morale', delta: 5 }] }] },
      ],
    },
    // ---------- coaching staff ----------
    {
      id: 'coach-believes', category: 'staff', weight: 1.0, cooldown: 3,
      title: L(lang, 'The manager backs you', 'El técnico te banca'),
      desc: L(lang, 'He tells the press you are the project. That is a lot of weight to carry.',
        'Le dice a la prensa que el proyecto eres tú. Eso pesa.'),
      when: p => p.age >= 19,
      options: [
        { label: L(lang, 'Take the responsibility', 'Asumir la responsabilidad'), outcomes: [{ weight: 1, badge: L(lang, 'Undisputed starter', 'Titular indiscutido'), effects: [{ type: 'minutesBias', delta: 9 }, { type: 'attr', attrs: { lea: 2 } }] }] },
        { label: L(lang, 'Play it down', 'Bajarle el precio'), outcomes: [{ weight: 1, badge: L(lang, 'No pressure', 'Sin presión'), effects: [{ type: 'morale', delta: 6 }, { type: 'form', delta: 3 }] }] },
      ],
    },
    {
      id: 'fitness-coach', category: 'staff', weight: 0.9, cooldown: 3,
      title: L(lang, 'The new fitness coach', 'El nuevo preparador físico'),
      desc: L(lang, 'He wants to rebuild your body from scratch. It will hurt for months.',
        'Quiere rehacerte el cuerpo desde cero. Van a ser meses duros.'),
      when: () => true,
      options: [
        {
          label: L(lang, 'Do the full programme', 'Hacer el programa completo'),
          outcomes: [
            { weight: 0.7, badge: L(lang, 'A new engine', 'Motor nuevo'), effects: [{ type: 'attr', attrs: { phy: 4, pac: 2 } }, { type: 'stamina', delta: 14 }] },
            { weight: 0.3, badge: L(lang, 'Overtrained', 'Sobreentrenado'), effects: [{ type: 'injury', games: 6 }, { type: 'stamina', delta: -8 }] },
          ],
        },
        { label: L(lang, 'Keep your own routine', 'Seguir con lo tuyo'), outcomes: [{ weight: 1, badge: L(lang, 'No change', 'Sin cambios'), effects: [{ type: 'stamina', delta: 4 }] }] },
      ],
    },
    {
      id: 'coach-sacked', category: 'staff', weight: 1.0, cooldown: 2,
      title: L(lang, 'They sack the manager who signed you', 'Echan al técnico que te fichó'),
      desc: L(lang, 'The man who wanted you is gone. The new one has his own favourites.',
        'El que te quería se fue. El nuevo tiene sus propios preferidos.'),
      when: p => !!p.clubId,
      options: [
        {
          label: L(lang, 'Win the new man over', 'Convencer al nuevo'),
          outcomes: [
            { weight: 0.6, badge: L(lang, 'He trusts you', 'Confía en ti'), effects: [{ type: 'minutesBias', delta: 6 }] },
            { weight: 0.4, badge: L(lang, 'Out of the plans', 'Fuera de los planes'), effects: [{ type: 'minutesBias', delta: -9 }, { type: 'flag', name: 'unsettled' }] },
          ],
        },
        { label: L(lang, 'Ask to leave', 'Pedir salida'), outcomes: [{ weight: 1, badge: L(lang, 'Agent activated', 'Representante activado'), effects: [{ type: 'flag', name: 'wantsHome' }, { type: 'loyalty', delta: -8 }] }] },
      ],
    },
    {
      id: 'tactical-role', category: 'staff', weight: 0.9, cooldown: 3,
      title: L(lang, 'A new tactical role', 'Un rol táctico nuevo'),
      desc: L(lang, 'The coach wants you deeper, with more of the game in front of you.',
        'El entrenador te quiere más atrás, con todo el partido de frente.'),
      when: p => p.age >= 24,
      options: [
        { label: L(lang, 'Reinvent yourself', 'Reinventarte'), outcomes: [{ weight: 1, badge: L(lang, 'New brain', 'Cerebro nuevo'), effects: [{ type: 'attr', attrs: { vis: 5 } }, { type: 'ovrTemp', delta: -2, years: 1 }] }] },
        { label: L(lang, 'Stay where you are', 'Quedarte donde estás'), outcomes: [{ weight: 1, badge: L(lang, 'What you know', 'Lo que sabes'), effects: [{ type: 'form', delta: 4 }] }] },
      ],
    },
    // ---------- media ----------
    {
      id: 'tv-pundit-attack', category: 'media', weight: 1.0, cooldown: 2,
      title: L(lang, 'A pundit tears you apart', 'Un panelista te destroza'),
      desc: L(lang, 'A famous ex-player spends ten minutes on TV explaining why you are overrated.',
        'Un exjugador famoso se pasa diez minutos en la tele explicando por qué estás sobrevalorado.'),
      when: p => p.reputation > 35,
      options: [
        {
          label: L(lang, 'Answer on the pitch', 'Responder dentro de la cancha'),
          outcomes: [
            { weight: 0.65, badge: L(lang, 'Silenced him', 'Lo callaste'), effects: [{ type: 'form', delta: 10 }, { type: 'reputation', delta: 6 }] },
            { weight: 0.35, badge: L(lang, 'You pressed too hard', 'Te apuraste'), effects: [{ type: 'form', delta: -6 }] },
          ],
        },
        { label: L(lang, 'Reply on social media', 'Contestarle en redes'), outcomes: [{ weight: 1, badge: L(lang, 'It becomes the story', 'Se hace la nota'), effects: [{ type: 'reputation', delta: 4 }, { type: 'discipline', delta: -6 }] }] },
      ],
    },
    {
      id: 'magazine-cover', category: 'media', weight: 0.8, cooldown: 3,
      title: L(lang, 'The magazine cover', 'La tapa de la revista'),
      desc: L(lang, 'A glossy wants you on the cover, shirtless, holding a golden ball.',
        'Una revista te quiere en la tapa, sin camiseta y con un balón dorado.'),
      when: p => p.reputation > 50,
      options: [
        { label: L(lang, 'Do the shoot', 'Hacer la producción'), outcomes: [{ weight: 1, badge: L(lang, 'Everywhere', 'En todos lados'), effects: [{ type: 'reputation', delta: 8 }, { type: 'money', delta: 400_000 }] }] },
        { label: L(lang, 'Too much', 'Demasiado'), outcomes: [{ weight: 1, badge: L(lang, 'Kept it simple', 'Perfil bajo'), effects: [{ type: 'morale', delta: 3 }, { type: 'form', delta: 3 }] }] },
      ],
    },
    {
      id: 'leaked-audio', category: 'media', weight: 0.7, cooldown: 4,
      title: L(lang, 'A leaked audio', 'Un audio filtrado'),
      desc: L(lang, 'A private message about your club gets out. It does not sound good.',
        'Se filtra un mensaje privado sobre tu club. No suena bien.'),
      when: p => !!p.clubId,
      options: [
        {
          label: L(lang, 'Deny everything', 'Negarlo todo'),
          outcomes: [
            { weight: 0.5, badge: L(lang, 'It dies down', 'Se apaga'), effects: [{ type: 'reputation', delta: -2 }] },
            { weight: 0.5, badge: L(lang, 'A second audio drops', 'Aparece un segundo audio'), effects: [{ type: 'idol', delta: -6 }, { type: 'reputation', delta: -8 }] },
          ],
        },
        { label: L(lang, 'Own it and apologise', 'Dar la cara y pedir perdón'), outcomes: [{ weight: 1, badge: L(lang, 'Respected for it', 'Te lo valoran'), effects: [{ type: 'idol', delta: 2 }, { type: 'reputation', delta: -3 }, { type: 'morale', delta: 4 }] }] },
      ],
    },
    {
      id: 'documentary-crew', category: 'media', weight: 0.7, cooldown: 4,
      title: L(lang, 'Cameras in your house', 'Cámaras en tu casa'),
      desc: L(lang, 'A streaming crew wants to follow your family for a full season.',
        'Un equipo de streaming quiere seguir a tu familia toda una temporada.'),
      when: p => p.reputation > 58,
      options: [
        {
          label: L(lang, 'Let them in', 'Dejarlos entrar'),
          outcomes: [
            { weight: 0.6, badge: L(lang, 'A global hit', 'Éxito mundial'), effects: [{ type: 'reputation', delta: 12 }, { type: 'money', delta: 1_500_000 }] },
            { weight: 0.4, badge: L(lang, 'Too much exposure', 'Demasiada exposición'), effects: [{ type: 'reputation', delta: 6 }, { type: 'form', delta: -8 }, { type: 'morale', delta: -5 }] },
          ],
        },
        { label: L(lang, 'Keep your home private', 'Tu casa es tuya'), outcomes: [{ weight: 1, badge: L(lang, 'Calm', 'Tranquilidad'), effects: [{ type: 'morale', delta: 6 }] }] },
      ],
    },
    // ---------- transfers ----------
    {
      id: 'release-clause', category: 'transfer', weight: 0.9, cooldown: 3,
      title: L(lang, 'Someone pays your clause', 'Alguien paga tu cláusula'),
      desc: L(lang, 'A club deposits your release clause without asking anyone.',
        'Un club deposita tu cláusula de rescisión sin preguntarle a nadie.'),
      when: p => p.overall >= 74 && !!p.clubId,
      options: [
        { label: L(lang, 'Force the move', 'Forzar la salida'), outcomes: [{ weight: 1, badge: L(lang, 'You are gone', 'Te vas'), effects: [{ type: 'flag', name: 'forcedTransfer' }, { type: 'loyalty', delta: -15 }, { type: 'idol', delta: -5 }] }] },
        { label: L(lang, 'Refuse to sign', 'Negarte a firmar'), outcomes: [{ weight: 1, badge: L(lang, 'The badge over the money', 'El escudo antes que el dinero'), effects: [{ type: 'idol', delta: 8 }, { type: 'loyalty', delta: 12 }] }] },
      ],
    },
    {
      id: 'agent-change', category: 'transfer', weight: 0.8, cooldown: 4,
      title: L(lang, 'A super-agent calls', 'Te llama un súper agente'),
      desc: L(lang, 'He promises Europe, sponsors and double the wage. He takes a big cut.',
        'Te promete Europa, patrocinadores y el doble de sueldo. Se lleva una buena tajada.'),
      when: p => p.age >= 20,
      options: [
        {
          label: L(lang, 'Sign with him', 'Firmar con él'),
          outcomes: [
            { weight: 0.65, badge: L(lang, 'Doors open', 'Se abren puertas'), effects: [{ type: 'reputation', delta: 10 }, { type: 'money', delta: 800_000 }] },
            { weight: 0.35, badge: L(lang, 'He only chases money', 'Solo busca dinero'), effects: [{ type: 'loyalty', delta: -10 }, { type: 'idol', delta: -4 }] },
          ],
        },
        { label: L(lang, 'Stay with your family agent', 'Seguir con el de siempre'), outcomes: [{ weight: 1, badge: L(lang, 'Trust', 'Confianza'), effects: [{ type: 'morale', delta: 5 }, { type: 'loyalty', delta: 5 }] }] },
      ],
    },
    {
      id: 'saudi-offer', category: 'transfer', weight: 0.8, cooldown: 3,
      title: L(lang, 'An offer you cannot read twice', 'Una oferta que no se lee dos veces'),
      desc: L(lang, 'A club abroad offers a wage that would set up your grandchildren.',
        'Un club del extranjero te ofrece un sueldo que arregla a tus nietos.'),
      when: p => p.age >= 28 && p.reputation > 55,
      options: [
        { label: L(lang, 'Take the money', 'Agarrar el dinero'), outcomes: [{ weight: 1, badge: L(lang, 'Set for life', 'Arreglado de por vida'), effects: [{ type: 'money', delta: 12_000_000 }, { type: 'idol', delta: -6 }, { type: 'reputation', delta: -4 }] }] },
        { label: L(lang, 'Stay and compete', 'Quedarte a competir'), outcomes: [{ weight: 1, badge: L(lang, 'Still hungry', 'Con hambre'), effects: [{ type: 'idol', delta: 6 }, { type: 'form', delta: 6 }] }] },
      ],
    },
    {
      id: 'loan-request', category: 'transfer', weight: 0.9, cooldown: 2,
      title: L(lang, 'Frozen out', 'Congelado'),
      desc: L(lang, 'You have not played in months. Your agent suggests a loan to save the season.',
        'Llevas meses sin jugar. Tu representante propone una cesión para salvar la temporada.'),
      when: p => p.age <= 30 && p.roleBias < 0,
      options: [
        { label: L(lang, 'Go on loan', 'Irte cedido'), outcomes: [{ weight: 1, badge: L(lang, 'Minutes again', 'Minutos otra vez'), effects: [{ type: 'minutesBias', delta: 10 }, { type: 'form', delta: 6 }] }] },
        { label: L(lang, 'Stay and fight', 'Quedarte a pelearla'), outcomes: [{ weight: 1, badge: L(lang, 'Head down, work', 'Agachar la cabeza y trabajar'), effects: [{ type: 'attr', attrs: { phy: 2, tec: 2 } }, { type: 'morale', delta: -4 }] }] },
      ],
    },
    // ---------- private life ----------
    {
      id: 'wedding', category: 'family', weight: 0.8, onceOnly: true,
      title: L(lang, 'Getting married', 'Te casas'),
      desc: L(lang, 'You marry in the middle of the season. Half the dressing room is invited.',
        'Te casas en plena temporada. Medio vestuario está invitado.'),
      when: p => p.age >= 24,
      options: [
        { label: L(lang, 'A huge wedding', 'Una boda enorme'), outcomes: [{ weight: 1, badge: L(lang, 'Happy, distracted', 'Feliz, distraído'), effects: [{ type: 'morale', delta: 12 }, { type: 'form', delta: -5 }, { type: 'money', delta: -600_000 }] }] },
        { label: L(lang, 'Quiet, just family', 'Íntima, solo familia'), outcomes: [{ weight: 1, badge: L(lang, 'Settled', 'Asentado'), effects: [{ type: 'morale', delta: 8 }, { type: 'form', delta: 2 }] }] },
      ],
    },
    {
      id: 'family-illness', category: 'family', weight: 0.7, cooldown: 5,
      title: L(lang, 'Bad news from home', 'Malas noticias de casa'),
      desc: L(lang, 'Someone close to you is seriously ill, and you are a plane ride away.',
        'Alguien muy cercano está gravemente enfermo, y tú estás a un avión de distancia.'),
      when: p => p.age >= 22,
      options: [
        { label: L(lang, 'Go home, miss games', 'Volver, perderte partidos'), outcomes: [{ weight: 1, badge: L(lang, 'Family first', 'La familia primero'), effects: [{ type: 'injury', games: 6 }, { type: 'morale', delta: 8 }, { type: 'attr', attrs: { lea: 2 } }] }] },
        { label: L(lang, 'Stay and play through it', 'Quedarte y jugar igual'), outcomes: [{ weight: 1, badge: L(lang, 'Football as escape', 'El fútbol como refugio'), effects: [{ type: 'morale', delta: -12 }, { type: 'form', delta: 5 }] }] },
      ],
    },
    {
      id: 'old-friends', category: 'family', weight: 0.8, cooldown: 3,
      title: L(lang, 'The friends from the block', 'Los amigos del barrio'),
      desc: L(lang, 'They want you out every weekend, exactly like before you were famous.',
        'Te quieren afuera todos los fines de semana, igual que antes de ser famoso.'),
      when: p => p.age >= 19 && p.age <= 30,
      options: [
        {
          label: L(lang, 'Keep the old life', 'Mantener la vida de antes'),
          outcomes: [
            { weight: 0.55, badge: L(lang, 'Grounded', 'Con los pies en la tierra'), effects: [{ type: 'morale', delta: 9 }, { type: 'idol', delta: 3 }] },
            { weight: 0.45, badge: L(lang, 'Caught out late', 'Te pillan de madrugada'), effects: [{ type: 'discipline', delta: -10 }, { type: 'form', delta: -7 }] },
          ],
        },
        { label: L(lang, 'Cut them off', 'Cortar por lo sano'), outcomes: [{ weight: 1, badge: L(lang, 'Professional, lonely', 'Profesional, solo'), effects: [{ type: 'form', delta: 6 }, { type: 'morale', delta: -6 }] }] },
      ],
    },
    {
      id: 'charity-foundation', category: 'offfield', weight: 0.7, onceOnly: true,
      title: L(lang, 'Your own foundation', 'Tu propia fundación'),
      desc: L(lang, 'You can fund the pitches and boots you never had as a kid.',
        'Puedes financiar las canchas y las botas que nunca tuviste de chico.'),
      when: p => p.age >= 26 && (p.money ?? 0) > 2_000_000,
      options: [
        { label: L(lang, 'Fund it properly', 'Financiarla en serio'), outcomes: [{ weight: 1, badge: L(lang, 'Loved for it', 'Te lo agradecen'), effects: [{ type: 'money', delta: -2_000_000 }, { type: 'idol', delta: 10 }, { type: 'reputation', delta: 8 }] }] },
        { label: L(lang, 'Just lend your name', 'Solo poner el nombre'), outcomes: [{ weight: 1, badge: L(lang, 'A photo op', 'Una foto'), effects: [{ type: 'reputation', delta: 3 }] }] },
      ],
    },
    {
      id: 'gambling-habit', category: 'offfield', weight: 0.6, cooldown: 5,
      title: L(lang, 'The card games get bigger', 'Las cartas se ponen serias'),
      desc: L(lang, 'What started on the team bus is now real money on your phone at 3am.',
        'Lo que empezó en el micro del equipo ahora es dinero de verdad en el móvil a las 3 de la mañana.'),
      when: p => p.age >= 21 && (p.money ?? 0) > 1_000_000,
      options: [
        {
          label: L(lang, 'Keep playing', 'Seguir jugando'),
          outcomes: [
            { weight: 0.4, badge: L(lang, 'A big night', 'Una gran noche'), effects: [{ type: 'money', delta: 900_000 }] },
            { weight: 0.6, badge: L(lang, 'A very bad month', 'Un mes muy malo'), effects: [{ type: 'money', delta: -2_500_000 }, { type: 'morale', delta: -10 }, { type: 'form', delta: -6 }] },
          ],
        },
        { label: L(lang, 'Get help and stop', 'Pedir ayuda y parar'), outcomes: [{ weight: 1, badge: L(lang, 'Back in control', 'De nuevo en control'), effects: [{ type: 'morale', delta: 7 }, { type: 'attr', attrs: { lea: 2 } }] }] },
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
      case 'ovr':
        // shift the attributes so the gain survives the end-of-season recompute
        p.attrs = applyOverallDelta(p.attrs, e.delta);
        p.overall = overallFrom(p.attrs, p.position);
        p.peakOverall = Math.max(p.peakOverall, Math.round(p.overall));
        break;
      case 'attr':
        p.attrs = gainAttrs(p.attrs, e.attrs, p.potential);
        p.overall = overallFrom(p.attrs, p.position);
        break;
      case 'stamina': p.stamina = clamp(0, 100, (p.stamina ?? 70) + e.delta); break;
      case 'money': p.money = Math.max(0, (p.money ?? 0) + e.delta); break;
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
