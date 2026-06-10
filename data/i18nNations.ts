// Spanish translations for World Cup mode data: nation display names and the
// per-edition flavour lines. English lives in data/nations/* as the canonical
// data; anything missing here falls back to English automatically.
import { EraKey } from './types';

interface NationEs {
  name?: string; // omit when the Spanish name is identical
  notes: Partial<Record<EraKey, string>>;
}

export const NATIONS_ES: Record<string, NationEs> = {
  brazil: {
    name: 'Brasil',
    notes: {
      '1998': 'Subcampeones en Francia — Ronaldo en su cima más aterradora',
      '2002': 'Campeones del mundo — las tres R conquistaron Asia',
      '2006': 'El cuarteto mágico — Kaká, Ronaldinho, Adriano y Ronaldo',
      '2010': 'El pragmático equipo de Dunga, eliminado por Holanda en cuartos',
      '2014': 'Anfitriones. Neymar-dependientes — y entonces llegó el Mineirazo',
      '2018': 'La Seleção reconstruida de Tite — cayó ante Bélgica en cuartos',
      '2022': 'Favoritos al título, eliminados por Croacia en los penaltis',
    },
  },
  argentina: {
    notes: {
      '1998': 'Ortega y Batistuta brillaron en Francia antes del drama con Inglaterra y el golpe holandés',
      '2002': 'La apisonadora de Bielsa, sorprendentemente eliminada en la fase de grupos',
      '2006': 'El gol de 24 pases a Serbia; un Messi adolescente desde el banquillo',
      '2010': 'El circo de Maradona — Messi, Tévez e Higuaín en ataque',
      '2014': 'Subcampeones en el Maracaná — Messi los arrastró hasta la final',
      '2018': 'Campaña caótica, eliminados por la Francia que sería campeona',
      '2022': 'Campeones del mundo en Catar — Messi por fin levantó la copa',
    },
  },
  france: {
    name: 'Francia',
    notes: {
      '1998': 'Campeones del mundo en casa — Zidane los metió de cabeza en la historia',
      '2002': 'La maldición del campeón — fuera en grupos sin marcar un gol',
      '2006': 'La despedida de Zidane — genialidad, un cabezazo y una final perdida',
      '2014': 'Reconstruidos tras 2010 — Pogba y Griezmann se presentaron al mundo',
      '2018': 'Campeones del mundo — Mbappé corrió hacia la leyenda en Rusia',
      '2022': 'Subcampeones tras la mejor final jamás jugada',
    },
  },
  germany: {
    name: 'Alemania',
    notes: {
      '2002': 'Kahn cargó con un equipo sin cartel hasta la final',
      '2006': 'El Sommermärchen — anfitriones que redescubrieron la alegría, terceros',
      '2010': 'Jóvenes, rápidos, implacables — 4-1 a Inglaterra, 4-0 a Argentina',
      '2014': 'Campeones del mundo — el 7-1 de Belo Horizonte nunca se olvidará',
      '2018': 'La maldición del campeón golpea de nuevo — últimos de grupo',
      '2022': 'Otra vez fuera en grupos pese al 4-2 a Costa Rica',
    },
  },
  italy: {
    name: 'Italia',
    notes: {
      '1998': 'Eliminados por penaltis ante el anfitrión — otra vez',
      '2002': 'Gol de oro fatal ante Corea del Sur, y aquel gol anulado a Tommasi',
      '2006': 'Campeones del mundo — el torneo de Cannavaro, la zurda de Grosso',
      '2010': 'El campeón, último de un grupo con Nueva Zelanda',
      '2014': 'Ganaron a Inglaterra en la selva; luego Suárez mordió a Chiellini',
    },
  },
  spain: {
    name: 'España',
    notes: {
      '2002': 'Robados ante Corea del Sur — los eternos aspirantes, todavía',
      '2006': 'Brillantes en grupos, apeados por Zidane en octavos',
      '2010': "Campeones del mundo — el gran triunfo del tiki-taka, Iniesta 116'",
      '2014': 'El final de la dinastía — 5-1 ante Holanda en el debut',
      '2018': 'Lopetegui destituido en la víspera; fuera ante Rusia por penaltis',
      '2022': '7-0 a Costa Rica, luego mil pases sin gol ante Marruecos',
    },
  },
  england: {
    name: 'Inglaterra',
    notes: {
      '1998': 'El golazo de Owen, la roja de Beckham y penaltis otra vez',
      '2002': 'La redención de Beckham ante Argentina; la vaselina de Ronaldinho',
      '2006': 'El circo de la generación dorada — fuera por penaltis ante Portugal',
      '2010': 'El gol fantasma de Lampard y un 4-1 ante Alemania',
      '2018': 'Chalecos, balón parado y unas semis — el fútbol casi vuelve a casa',
      '2022': 'Eliminados por Francia en cuartos — el penalti de Kane por encima del larguero',
    },
  },
  netherlands: {
    name: 'Países Bajos',
    notes: {
      '1998': 'Bergkamp ante Argentina — uno de los grandes goles de los Mundiales',
      '2006': 'La batalla de Núremberg — 16 tarjetas contra Portugal',
      '2010': 'Subcampeones — una Oranje pragmática y el kung-fu de De Jong en la final',
      '2014': 'La venganza del 5-1 a España; la genialidad del cambio de portero de Van Gaal',
      '2022': 'Invictos hasta los penaltis con Argentina — la falta ensayada de Weghorst',
    },
  },
  portugal: {
    notes: {
      '2002': 'La generación dorada fracasó — fuera en grupos',
      '2006': 'Cuarto puesto — el último baile de Figo, el guiño de Ronaldo',
      '2010': '7-0 a Corea del Norte; luego la España campeona los dejó a cero',
      '2014': 'La roja de Pepe y una lección alemana (4-0) — fuera por diferencia de goles',
      '2018': 'El hat-trick de Ronaldo a España iluminó Sochi',
      '2022': 'Ronaldo al banquillo, hat-trick de Gonçalo Ramos y Marruecos esperaba',
    },
  },
  uruguay: {
    notes: {
      '2010': 'Cuarto puesto — la mano de Suárez, el Balón de Oro de Forlán',
      '2014': 'Suárez mordió a Chiellini y la campaña se derrumbó',
      '2018': 'El muro de Godín más Suárez y Cavani — Francia los frenó en cuartos',
      '2022': 'La despedida de una generación dorada — fuera por goles marcados',
    },
  },
  croatia: {
    name: 'Croacia',
    notes: {
      '1998': 'Terceros en su primer Mundial — la Bota de Oro de Šuker',
      '2006': 'Tres empates y a casa — pero un núcleo joven se estaba formando',
      '2014': 'Abrieron el torneo ante Brasil — y aquel penalti de Fred',
      '2018': 'Subcampeones — el Balón de Oro de Modrić y tres prórrogas seguidas',
      '2022': 'Terceros — las paradas de Livaković y la consagración de Gvardiol',
    },
  },
  belgium: {
    name: 'Bélgica',
    notes: {
      '2002': 'Octavos — solo Brasil pudo frenar a los diablos rojos de Wilmots',
      '2014': 'La llegada de la generación dorada — cuartos en Brasil',
      '2018': 'Terceros — la remontada ante Japón y la contra ante Brasil',
      '2022': 'La despedida gris de la generación dorada — fuera en grupos',
    },
  },
  mexico: {
    name: 'México',
    notes: {
      '2002': 'Primeros de grupo antes de la eterna maldición de octavos',
      '2006': 'Llevaron a Argentina a la prórroga — Maxi Rodríguez rompió corazones',
      '2010': 'El Tri brilló en el partido inaugural — Argentina, otra vez, en octavos',
      '2014': 'El recital de Ochoa ante Brasil; el "No era penal" ante Holanda',
      '2018': 'Ganaron a la campeona Alemania — y luego Brasil en octavos, otra vez',
      '2022': 'Fuera en grupos por primera vez desde 1978 — por un solo gol',
    },
  },
  usa: {
    name: 'Estados Unidos',
    notes: {
      '2002': 'Cuartos de final — ganaron a Portugal y México, robados ante Alemania',
      '2010': 'El gol de Donovan a Argelia en el descuento — puro delirio',
      '2014': 'Sobrevivieron al grupo de la muerte; 16 paradas de Howard ante Bélgica',
      '2022': 'La plantilla más joven de Catar — el valiente gol de Pulisic a Irán',
    },
  },
  japan: {
    name: 'Japón',
    notes: {
      '2002': 'Los coanfitriones llegaron a octavos sobre una ola de euforia azul',
      '2010': 'Honda llevó a los Samurái Azules a octavos en Sudáfrica',
      '2018': '2-0 a Bélgica en octavos — y la contra del minuto 94',
      '2022': 'Ganaron a Alemania Y a España — el milagro de Doha, por partida doble',
    },
  },
  nigeria: {
    notes: {
      '1998': 'Las Súper Águilas tumbaron a España 3-2 en un clásico de Francia 98',
      '2002': 'En el grupo de la muerte con Argentina, Inglaterra y Suecia',
      '2010': 'La roja de Sani Kaita fue debate nacional',
      '2014': 'Los campeones de África llegaron a octavos hasta que Francia lo acabó',
      '2018': 'La camiseta icónica se agotó en todo el mundo; Argentina los apeó al final',
    },
  },
};

// ---------- lookup helpers (fall back to English when no translation) ----------

export function localizedTeamName(
  team: { id: string; name: string } | null | undefined,
  lang: string,
): string {
  if (!team) return '';
  if (lang === 'es') return NATIONS_ES[team.id]?.name ?? team.name;
  return team.name;
}

export function localizedEraNotes(
  teamId: string,
  era: EraKey | string,
  fallback: string | undefined,
  lang: string,
): string | undefined {
  if (lang === 'es') {
    return NATIONS_ES[teamId]?.notes[era as EraKey] ?? fallback;
  }
  return fallback;
}
