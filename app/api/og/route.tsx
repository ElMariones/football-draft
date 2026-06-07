import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { seasons, users } from '@/lib/db/schema';

export const runtime = 'nodejs';

const CL_STAGE_LABEL: Record<string, string> = {
  champion: 'CHAMPIONS',
  final: 'RUNNER-UP',
  'semi-finals': 'SEMI-FINALS',
  'quarter-finals': 'QUARTER-FINALS',
  group: 'GROUP STAGE',
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return new ImageResponse(
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', background: '#0a0a0f', color: 'white', fontSize: 40 }}>
        Football Draft
      </div>,
      { width: 1200, height: 630 },
    );
  }

  let row: any;
  let user: any;
  try {
    const [r] = await db
      .select({
        teamName: seasons.teamName,
        formation: seasons.formation,
        mode: seasons.mode,
        finalPosition: seasons.finalPosition,
        clStage: seasons.clStage,
        overall: seasons.overall,
        wins: seasons.wins,
        draws: seasons.draws,
        losses: seasons.losses,
        points: seasons.points,
        xiSummary: seasons.xiSummary,
        userId: seasons.userId,
      })
      .from(seasons)
      .where(eq(seasons.id, id));
    row = r;
    if (row) {
      const [u] = await db
        .select({ nickname: users.nickname, name: users.name })
        .from(users)
        .where(eq(users.id, row.userId));
      user = u;
    }
  } catch {
    row = null;
  }

  if (!row) {
    return new ImageResponse(
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', background: '#0a0a0f', color: 'white', fontSize: 40 }}>
        Football Draft
      </div>,
      { width: 1200, height: 630 },
    );
  }

  const displayName = user?.nickname || user?.name || 'Anonymous';
  const isCL = row.mode === 'cl';
  const isLL = row.mode === 'll';
  const accent = isCL ? '#3DA9FC' : isLL ? '#C8102E' : '#FFD700';
  const modeLabel = isCL ? 'Champions League' : isLL ? 'La Liga' : 'Premier League';
  const resultText = isCL
    ? CL_STAGE_LABEL[row.clStage ?? ''] ?? row.clStage
    : `#${row.finalPosition}`;

  const xi = (row.xiSummary as any[]) || [];

  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        background: `linear-gradient(135deg, ${accent}22, #0a0a0f 60%)`,
        padding: '50px 60px',
        fontFamily: 'sans-serif',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: `linear-gradient(135deg, ${accent}, ${accent}88)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontSize: 20, fontWeight: 700 }}>
            XI
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: 'white' }}>Football Draft</span>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', letterSpacing: 2 }}>{modeLabel.toUpperCase()}</span>
          </div>
        </div>
        <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)' }}>{displayName}</span>
      </div>

      {/* Main result */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, justifyContent: 'center', gap: 8 }}>
        <span style={{ fontSize: 28, color: 'rgba(255,255,255,0.7)', letterSpacing: 3 }}>{row.formation}</span>
        <span style={{ fontSize: 64, fontWeight: 800, color: 'white' }}>{row.teamName}</span>
        <span style={{ fontSize: 100, fontWeight: 900, color: accent, lineHeight: 1 }}>{resultText}</span>
        {row.points != null && !isCL && (
          <span style={{ fontSize: 22, color: 'rgba(255,255,255,0.6)', marginTop: 8 }}>
            {row.wins}W · {row.draws}D · {row.losses}L · {row.points} pts
          </span>
        )}
        {isCL && row.wins != null && (
          <span style={{ fontSize: 22, color: 'rgba(255,255,255,0.6)', marginTop: 8 }}>
            {row.wins}W · {row.draws}D · {row.losses}L
          </span>
        )}
      </div>

      {/* XI names strip */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
        {xi.slice(0, 11).map((p: any, i: number) => (
          <span
            key={i}
            style={{
              fontSize: 14,
              color: 'rgba(255,255,255,0.7)',
              background: 'rgba(255,255,255,0.08)',
              borderRadius: 8,
              padding: '4px 10px',
            }}
          >
            {p.name} ({p.overall})
          </span>
        ))}
      </div>
    </div>,
    { width: 1200, height: 630 },
  );
}
