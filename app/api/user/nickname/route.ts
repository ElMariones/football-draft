import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';

export const runtime = 'nodejs';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const [row] = await db
    .select({ nickname: users.nickname })
    .from(users)
    .where(eq(users.id, session.user.id));
  return NextResponse.json({ nickname: row?.nickname ?? null });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  let body: { nickname?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const nickname = (body.nickname ?? '').trim().slice(0, 24) || null;

  await db.update(users).set({ nickname }).where(eq(users.id, session.user.id));
  return NextResponse.json({ nickname });
}
