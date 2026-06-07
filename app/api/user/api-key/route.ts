import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { encryptString } from '@/lib/crypto';

export const runtime = 'nodejs';

// GET — returns only { present, model } so the key never leaves the server.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const [row] = await db
    .select({ encryptedApiKey: users.encryptedApiKey, openaiModel: users.openaiModel })
    .from(users)
    .where(eq(users.id, session.user.id));
  return NextResponse.json({
    present: !!row?.encryptedApiKey,
    model: row?.openaiModel ?? null,
  });
}

// POST { apiKey?, model? } — stores encrypted key and/or model.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  let body: { apiKey?: string; model?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const update: { encryptedApiKey?: string | null; openaiModel?: string | null } = {};
  if (typeof body.apiKey === 'string') {
    const trimmed = body.apiKey.trim();
    update.encryptedApiKey = trimmed ? encryptString(trimmed) : null;
  }
  if (typeof body.model === 'string') {
    update.openaiModel = body.model.trim() || null;
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  await db.update(users).set(update).where(eq(users.id, session.user.id));
  return NextResponse.json({ ok: true });
}

// DELETE — clears the stored key (model is preserved).
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  await db
    .update(users)
    .set({ encryptedApiKey: null })
    .where(eq(users.id, session.user.id));
  return NextResponse.json({ ok: true });
}
