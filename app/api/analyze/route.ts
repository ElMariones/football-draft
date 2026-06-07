import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Receives { apiKey, payload } where payload is the compact JSON
// produced by lib/simulation.seasonToCompactJSON.
export async function POST(req: NextRequest) {
  let body: { apiKey?: string; payload?: string; model?: string; mode?: 'pl' | 'cl'; language?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const apiKey = body.apiKey?.trim();
  const payload = body.payload;
  const model = body.model || 'gpt-4o-mini';
  const mode = body.mode === 'cl' ? 'cl' : 'pl';
  const isES = body.language === 'es';

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
- The 'ovr' field is each player's prime ability (1-99 FIFA-style). Refer to "rating", "level", or "quality", not "age".`;

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

  const systemPrompt = mode === 'cl'
    ? (isES ? clPromptES : clPromptEN)
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
