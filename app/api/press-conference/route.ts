import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { decryptString } from '@/lib/crypto';
import { checkRateLimit } from '@/lib/rateLimit';

export const runtime = 'nodejs';

function getIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
}

async function resolveApiKey(body: { apiKey?: string }): Promise<{ key: string | null; model: string }> {
  let apiKey = body.apiKey?.trim() || null;
  let model = 'gpt-4o-mini';

  if (!apiKey) {
    try {
      const session = await auth();
      if (session?.user?.id) {
        const [row] = await db
          .select({ encryptedApiKey: users.encryptedApiKey, openaiModel: users.openaiModel })
          .from(users)
          .where(eq(users.id, session.user.id));
        if (row?.encryptedApiKey) {
          try { apiKey = decryptString(row.encryptedApiKey); } catch { /* */ }
          if (row.openaiModel) model = row.openaiModel;
        }
      }
    } catch { /* auth not configured */ }
  }

  return { key: apiKey, model };
}

async function callOpenAI(apiKey: string, model: string, system: string, user: string) {
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      temperature: 0.85,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`OpenAI ${resp.status}: ${errText.slice(0, 400)}`);
  }
  const data = await resp.json();
  return data?.choices?.[0]?.message?.content ?? '';
}

// POST /api/press-conference
// Body: { step: 'questions' | 'summary', payload, apiKey?, mode?, language?, answers? }
export async function POST(req: NextRequest) {
  // Rate limit: 5 press conferences per hour per IP (each conference = 2 calls)
  const ip = getIp(req);
  const rateCheck = checkRateLimit(`press:${ip}`, 5);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Try again in ${rateCheck.resetIn}s (max 5/hour).` },
      { status: 429 },
    );
  }

  let body: {
    step?: string;
    payload?: string;
    apiKey?: string;
    mode?: string;
    language?: string;
    answers?: { question: string; answer: string }[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { key: apiKey, model } = await resolveApiKey(body);
  if (!apiKey) return NextResponse.json({ error: 'Missing API key' }, { status: 400 });
  if (!body.payload) return NextResponse.json({ error: 'Missing season payload' }, { status: 400 });

  const isES = body.language === 'es';
  const mode = body.mode === 'cl' ? 'cl' : body.mode === 'll' ? 'll' : 'pl';

  const sharedContext = `CRUCIAL CONTEXT:
- Each player in the XI is at the PEAK of the era shown. ALL players are simultaneously in their prime.
- The team is a fantasy mash-up, not a historical real-life side.
- The 'ovr' field is each player's prime ability (1-99). Refer to "quality" or "level", not "age".
- You are simulating a press conference with the manager of this team after the season/campaign.
- The manager is named in yourTeam.manager (name, 'ovr' rating, and 'drawnFrom' — the club/era they were drawn from, at their coaching peak). Journalists must address the manager BY NAME and may reference their famous past (e.g. their drawnFrom club) and their reputation when framing questions.`;

  try {
    if (body.step === 'questions') {
      const questionsPrompt = isES
        ? `${sharedContext}

Eres un generador de preguntas de rueda de prensa de fútbol. Analiza el JSON de la temporada/campaña y genera exactamente 4 preguntas que harían 4 periodistas diferentes al entrenador del equipo fantasy.

Cada pregunta debe cubrir un ángulo distinto:
1. Sobre el resultado general de la temporada (posición final, si cumplió expectativas)
2. Sobre un jugador destacado o el MVP (por qué lo eligió, cómo rindió)
3. Sobre la táctica/formación (cómo encajó el equipo, decisiones tácticas)
4. Sobre el futuro o un momento clave de la temporada (un partido decisivo, planes futuros)

Para cada pregunta, genera también 4 posibles respuestas cortas (máx 80 caracteres cada una) que el manager podría dar. Las respuestas deben variar en tono: una confiada, una humilde, una divertida/provocadora, y una analítica/seria.

Responde SOLO en JSON válido con este formato exacto (sin markdown, sin backticks):
{"questions":[{"journalist":"Nombre del periodista","outlet":"Nombre del medio","question":"La pregunta","options":["Respuesta 1","Respuesta 2","Respuesta 3","Respuesta 4"]}]}`
        : `${sharedContext}

You are a football press conference question generator. Analyze the season/campaign JSON and generate exactly 4 questions that 4 different journalists would ask the fantasy team's manager.

Each question must cover a different angle:
1. About the overall season result (final position, whether it met expectations)
2. About a standout player or the MVP (why they chose them, how they performed)
3. About the tactics/formation (how the team fit together, tactical decisions)
4. About the future or a pivotal moment in the season (a decisive match, future plans)

For each question, also generate 4 short possible answers (max 80 chars each) the manager could give. The answers should vary in tone: one confident, one humble, one funny/provocative, and one analytical/serious.

Respond ONLY in valid JSON with this exact format (no markdown, no backticks):
{"questions":[{"journalist":"Journalist name","outlet":"Media outlet name","question":"The question","options":["Answer 1","Answer 2","Answer 3","Answer 4"]}]}`;

      const raw = await callOpenAI(apiKey, model, questionsPrompt, body.payload);
      let parsed;
      try {
        const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        parsed = JSON.parse(cleaned);
      } catch {
        return NextResponse.json({ error: 'Failed to parse AI response', raw }, { status: 502 });
      }
      return NextResponse.json(parsed);
    }

    if (body.step === 'summary') {
      if (!body.answers || body.answers.length === 0) {
        return NextResponse.json({ error: 'Missing answers' }, { status: 400 });
      }

      const answersBlock = body.answers
        .map((a, i) => `Q${i + 1}: ${a.question}\nManager's answer: "${a.answer}"`)
        .join('\n\n');

      const summaryPrompt = isES
        ? `${sharedContext}

Eres un periodista deportivo de élite escribiendo una crónica post-partido que combina el análisis de la temporada con las declaraciones del entrenador en la rueda de prensa.

Escribe un artículo de 4-5 párrafos (300-400 palabras) que:
1. Abra con el resultado de la temporada y el ambiente general
2. Incorpore las citas del entrenador de forma natural (usando "el míster declaró...", "según el técnico...", "en sus propias palabras...")
3. Analice a los jugadores destacados y la táctica, entrelazando las respuestas del manager
4. Cierre con una valoración final y las expectativas del entrenador para el futuro

Las respuestas del entrenador en la rueda de prensa fueron:

${answersBlock}

Estilo: prosa periodística española, citas entrecomilladas integradas en el texto, sin encabezados ni viñetas. Responde siempre en español.`
        : `${sharedContext}

You are an elite sports journalist writing a post-season piece that combines season analysis with the manager's press conference quotes.

Write a 4-5 paragraph article (300-400 words) that:
1. Opens with the season result and overall atmosphere
2. Weaves in the manager's quotes naturally (using "the boss stated...", "according to the gaffer...", "in his own words...")
3. Analyzes the standout players and tactics, interleaving the manager's responses
4. Closes with a final assessment and the manager's expectations for the future

The manager's press conference answers were:

${answersBlock}

Style: punchy sports journalism, quoted responses woven into flowing prose, no headings or bullet points. Answer in English.`;

      const content = await callOpenAI(apiKey, model, summaryPrompt, body.payload);
      return NextResponse.json({ summary: content });
    }

    return NextResponse.json({ error: 'Invalid step (use "questions" or "summary")' }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  }
}
