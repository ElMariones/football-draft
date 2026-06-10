import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { decryptString } from '@/lib/crypto';
import { checkRateLimit } from '@/lib/rateLimit';

export const runtime = 'nodejs';

// Receives { apiKey?, payload, model?, mode?, language? }.
// If the user is logged in and did not send an apiKey, falls back to their
// stored encrypted key (decrypted server-side, never sent to the browser).
export async function POST(req: NextRequest) {
  // Rate limit: 10 requests per hour per IP
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
  const rateCheck = checkRateLimit(`analyze:${ip}`);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Try again in ${rateCheck.resetIn}s (max 10/hour).` },
      { status: 429 },
    );
  }
  let body: { apiKey?: string; payload?: string; model?: string; mode?: 'pl' | 'cl' | 'll' | 'wc'; language?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  let apiKey = body.apiKey?.trim();
  const payload = body.payload;
  let model = body.model || 'gpt-4o-mini';
  const mode = body.mode === 'cl' ? 'cl' : body.mode === 'll' ? 'll' : body.mode === 'wc' ? 'wc' : 'pl';
  const isES = body.language === 'es';

  if (!apiKey) {
    // Fall back to the user's encrypted server-stored key if they're logged in.
    // We swallow auth/db errors here so guest users can still use /api/analyze
    // even when AUTH_SECRET / DATABASE_URL aren't configured in the environment.
    try {
      const session = await auth();
      if (session?.user?.id) {
        const [row] = await db
          .select({ encryptedApiKey: users.encryptedApiKey, openaiModel: users.openaiModel })
          .from(users)
          .where(eq(users.id, session.user.id));
        if (row?.encryptedApiKey) {
          try {
            apiKey = decryptString(row.encryptedApiKey);
          } catch {
            return NextResponse.json({ error: 'Stored API key could not be decrypted' }, { status: 500 });
          }
          if (!body.model && row.openaiModel) model = row.openaiModel;
        }
      }
    } catch {
      // Auth not configured — guest must supply apiKey in the body.
    }
  }

  if (!apiKey) {
    return NextResponse.json({ error: 'Missing API key' }, { status: 400 });
  }
  if (!payload) {
    return NextResponse.json({ error: 'Missing season payload' }, { status: 400 });
  }

  const sharedPrimeRules = `CRUCIAL CONTEXT — read this carefully and never violate it:
- Each player in the XI is at the PEAK of the era shown in their "from" field (e.g. "Thierry Henry from Arsenal 00-05" means peak-form 2004 Henry, not 2025 Henry).
- ALL players are simultaneously in their prime in this fantasy campaign. NEVER mention any player being old, retired, past it, declining, out of position because of age, or anything that implies they're not at the rating shown. Their listed overall rating IS their current ability.
- The team is not a historical real-life side — it is a fantasy mash-up. Do not say things like "this XI finished 4th in real life" because the team did not exist.
- The 'ovr' field is each player's prime ability (1-99 FIFA-style). Refer to "rating", "level", or "quality", not "age".
- The XI is coached by the manager in yourTeam.manager (name, 'ovr' rating on the same 1-99 scale, and 'drawnFrom' — the club and era they were drawn from, also at their peak). Weave the manager into the story by name: credit or blame their touchline influence, tactics, and man-management alongside the players.`;

  const plPromptEN = `You are a passionate football journalist writing for a Premier League digest. You receive a JSON snapshot of a fan's simulated Premier League season with a hand-picked all-time fantasy XI.

${sharedPrimeRules}

Write an immersive 4-paragraph season verdict (around 250-350 words total). Cover:
1. Headline of the season — final position and the overall feeling of the campaign.
2. The MVP and standout performers — name them and be vivid about their goals/assists.
3. Tactical read of how the XI fitted together (formation, ATT/DEF/OVR balance, surprising contributors from defence or midfield).
4. A final dramatic verdict and a one-line prediction for next season.

Style: punchy sentences, vivid imagery, no markdown headings, no bullet points, no section labels. Pure flowing prose, blank line between paragraphs. Answer in English.`;

  const plPromptES = `Eres un apasionado periodista de fútbol que escribe para una revista de la Premier League. Recibes un JSON con los datos de una temporada simulada de Premier League con un XI fantasy de todos los tiempos elegido a mano por el usuario.

${sharedPrimeRules}

Escribe un veredicto de temporada en 4 párrafos (entre 250 y 350 palabras en total). Cubre:
1. El titular de la temporada — la posición final y el sabor general de la campaña.
2. El MVP y los destacados — nómbralos y describe con viveza sus goles y asistencias.
3. Lectura táctica de cómo encajó el XI (formación, equilibrio ATQ/DEF/GLB, contribuciones sorprendentes desde la defensa o el centro del campo).
4. Un veredicto final dramático y una frase de predicción para la próxima temporada.

Estilo: frases directas, imágenes vívidas, sin encabezados markdown, sin viñetas, sin etiquetas de sección. Prosa fluida y continua, línea en blanco entre párrafos. Responde siempre en español.`;

  const clPromptEN = `You are a passionate Champions League correspondent for European football magazines. You receive a JSON snapshot of a fan's simulated UEFA Champions League campaign with a hand-picked all-time fantasy XI.

${sharedPrimeRules}

UEFA Champions League format used in this sim:
- 16 elite European clubs in 4 groups of 4. Top 2 from each group advance.
- Single-leg knockouts from the Quarter-finals onward, penalty shootouts if level after 90.
- The 'playerStage' field tells you exactly how far this XI got: group / quarter-finals / semi-finals / final (= runner-up) / champion.
- The 'knockoutPath' array shows every KO match including pens.
- The eventual 'champion' and 'runnerUp' may not be the player's team.

Write an immersive 4-paragraph campaign briefing (around 250-350 words total). Cover:
1. Headline of the run — which stage they reached, the European atmosphere, the trajectory through the bracket.
2. The MVP and standout European nights — be vivid about specific goals, knockout drama, penalty shootouts if any.
3. Tactical read of how the XI handled different opponents in groups and knockouts — formation, ATT/DEF/OVR balance, depth.
4. A final verdict on the campaign and a one-line aim for next year's tournament.

Style: punchy sentences, vivid imagery, evoke European nights and continental glory. No markdown headings, no bullet points, no section labels. Pure flowing prose, blank line between paragraphs. Answer in English.`;

  const clPromptES = `Eres un apasionado corresponsal de la Champions League para revistas de fútbol europeo. Recibes un JSON con los datos de una campaña simulada de la UEFA Champions League con un XI fantasy de todos los tiempos elegido a mano por el usuario.

${sharedPrimeRules}

Formato de la Champions League usado en esta simulación:
- 16 clubes europeos de élite en 4 grupos de 4. Los 2 primeros de cada grupo avanzan.
- Eliminatorias a partido único desde cuartos de final, con penaltis si hay empate al final del tiempo reglamentario.
- El campo 'playerStage' indica exactamente hasta qué ronda llegó este XI: group / quarter-finals / semi-finals / final (= subcampeón) / champion.
- El array 'knockoutPath' muestra cada partido de eliminatoria incluidos los penaltis.
- El 'champion' y 'runnerUp' finales pueden no ser el equipo del jugador.

Escribe un informe de campaña en 4 párrafos (entre 250 y 350 palabras en total). Cubre:
1. El titular de la campaña — la ronda alcanzada, la atmósfera europea y la trayectoria por el cuadro.
2. El MVP y las grandes noches europeas — describe con viveza los goles, el drama de las eliminatorias y los penaltis si los hubo.
3. Lectura táctica de cómo el XI gestionó distintos rivales en grupos y eliminatorias — formación, equilibrio ATQ/DEF/GLB, profundidad de plantilla.
4. Un veredicto final sobre la campaña y una frase con el objetivo para el próximo torneo.

Estilo: frases directas, imágenes vívidas, evoca las noches europeas y la gloria continental. Sin encabezados markdown, sin viñetas, sin etiquetas de sección. Prosa fluida y continua, línea en blanco entre párrafos. Responde siempre en español.`;

  const llPromptEN = `You are a passionate football journalist writing for a Spanish football digest. You receive a JSON snapshot of a fan's simulated La Liga season with a hand-picked all-time fantasy XI built from legendary Spanish league clubs.

${sharedPrimeRules}

Write an immersive 4-paragraph season verdict (around 250-350 words total). Cover:
1. Headline of the season — final position and the overall feeling of the campaign in Spain.
2. The MVP and standout performers — name them and be vivid about their goals/assists. Reference any iconic La Liga players by their club legacy.
3. Tactical read of how the XI fitted together (formation, ATT/DEF/OVR balance, surprising contributors from defence or midfield).
4. A final dramatic verdict and a one-line prediction for next season. Reference the Spanish football spirit.

Style: punchy sentences, vivid imagery, evoke the passion of Spanish football. No markdown headings, no bullet points, no section labels. Pure flowing prose, blank line between paragraphs. Answer in English.`;

  const llPromptES = `Eres un apasionado periodista de fútbol que escribe para una revista española. Recibes un JSON con los datos de una temporada simulada de La Liga con un XI fantasy de todos los tiempos construido a partir de legendarios clubes de la liga española.

${sharedPrimeRules}

Escribe un veredicto de temporada en 4 párrafos (entre 250 y 350 palabras en total). Cubre:
1. El titular de la temporada — la posición final y el sabor general de la campaña en la Liga española.
2. El MVP y los destacados — nómbralos y describe con viveza sus goles y asistencias. Menciona el legado de los jugadores icónicos de La Liga.
3. Lectura táctica de cómo encajó el XI (formación, equilibrio ATQ/DEF/GLB, contribuciones sorprendentes desde la defensa o el centro del campo).
4. Un veredicto final dramático y una frase de predicción para la próxima temporada. Evoca el espíritu del fútbol español.

Estilo: frases directas, imágenes vívidas, evoca la pasión del fútbol español. Sin encabezados markdown, sin viñetas, sin etiquetas de sección. Prosa fluida y continua, línea en blanco entre párrafos. Responde siempre en español.`;

  const wcPromptEN = `You are a passionate World Cup correspondent covering football's greatest tournament. You receive a JSON snapshot of a fan's simulated FIFA World Cup campaign with a hand-picked fantasy XI of national-team legends drawn from different World Cup editions (e.g. "Ronaldo from Brazil 2002" means the unstoppable 2002 Ronaldo).

${sharedPrimeRules}

World Cup format used in this sim:
- 16 nations in 4 groups of 4, single round-robin (3 group games each). Top 2 advance.
- ONE-OFF knockout matches from the quarter-finals: no second legs, penalty shootouts if level after 90.
- Semi-final losers play a third-place (bronze medal) match.
- The 'playerStage' field tells you how far this XI got: group / quarter-finals / semi-finals (= lost the bronze match too) / third-place (= won bronze) / final (= runner-up) / champion.
- 'knockoutPath' shows every knockout result including pens; 'goldenBootRace' is the tournament top-scorer list.

Write an immersive 4-paragraph tournament report (around 250-350 words total). Cover:
1. Headline of the campaign — how far they went, the once-every-four-years magnitude, a nation holding its breath.
2. The Golden Ball candidate and the unforgettable nights — be vivid about decisive goals, shootouts, knockout drama.
3. Tactical read of how the XI navigated the group and one-off knockouts — formation, ATT/DEF/OVR balance, big-game temperament.
4. A final verdict written for the history books and a one-line dream for the next World Cup.

Style: punchy sentences, vivid imagery, evoke summer nights, flags, and World Cup folklore. No markdown headings, no bullet points, no section labels. Pure flowing prose, blank line between paragraphs. Answer in English.`;

  const wcPromptES = `Eres un apasionado enviado especial al Mundial, el mayor torneo del fútbol. Recibes un JSON con los datos de una campaña simulada de la Copa del Mundo con un XI fantasy de leyendas de selecciones, elegidas de distintos Mundiales (p. ej. "Ronaldo from Brazil 2002" es el imparable Ronaldo de 2002).

${sharedPrimeRules}

Formato del Mundial usado en esta simulación:
- 16 selecciones en 4 grupos de 4, liguilla a una sola vuelta (3 partidos por equipo). Avanzan los 2 primeros.
- Eliminatorias a PARTIDO ÚNICO desde cuartos: sin ida y vuelta, con penaltis si hay empate a los 90 minutos.
- Los perdedores de semifinales juegan el partido por el tercer puesto (medalla de bronce).
- El campo 'playerStage' indica hasta dónde llegó este XI: group / quarter-finals / semi-finals (= perdió también el bronce) / third-place (= ganó el bronce) / final (= subcampeón) / champion.
- 'knockoutPath' muestra cada eliminatoria incluidos los penaltis; 'goldenBootRace' es la tabla de goleadores del torneo.

Escribe una crónica del torneo en 4 párrafos (entre 250 y 350 palabras en total). Cubre:
1. El titular de la campaña — hasta dónde llegaron, la magnitud de un torneo que llega cada cuatro años, un país conteniendo la respiración.
2. El candidato al Balón de Oro y las noches inolvidables — describe con viveza los goles decisivos, las tandas de penaltis y el drama de las eliminatorias.
3. Lectura táctica de cómo el XI superó el grupo y las eliminatorias a partido único — formación, equilibrio ATQ/DEF/GLB, temple en los partidos grandes.
4. Un veredicto final escrito para los libros de historia y una frase con el sueño para el próximo Mundial.

Estilo: frases directas, imágenes vívidas, evoca las noches de verano, las banderas y el folclore mundialista. Sin encabezados markdown, sin viñetas, sin etiquetas de sección. Prosa fluida y continua, línea en blanco entre párrafos. Responde siempre en español.`;

  const systemPrompt = mode === 'cl'
    ? (isES ? clPromptES : clPromptEN)
    : mode === 'wc'
    ? (isES ? wcPromptES : wcPromptEN)
    : mode === 'll'
    ? (isES ? llPromptES : llPromptEN)
    : (isES ? plPromptES : plPromptEN);

  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.85,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `${isES ? 'Aquí está el JSON de la temporada' : 'Here is the season JSON'}:\n\n${payload}` },
        ],
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return NextResponse.json(
        { error: `OpenAI ${resp.status}: ${errText.slice(0, 400)}` },
        { status: 502 },
      );
    }

    const data = await resp.json();
    const content: string = data?.choices?.[0]?.message?.content ?? '';
    return NextResponse.json({ analysis: content });
  } catch (err) {
    return NextResponse.json(
      { error: `Network error: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 },
    );
  }
}
