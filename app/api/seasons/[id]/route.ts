import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { seasons } from '@/lib/db/schema';

export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const [row] = await db
    .select()
    .from(seasons)
    .where(and(eq(seasons.id, params.id), eq(seasons.userId, session.user.id)));
  if (!row) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ season: row });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  await db
    .delete(seasons)
    .where(and(eq(seasons.id, params.id), eq(seasons.userId, session.user.id)));
  return NextResponse.json({ ok: true });
}
