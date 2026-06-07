import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// neon() is lazy — it doesn't open a connection until a query is run. So we
// can hand it a placeholder URL when DATABASE_URL is unset, letting guest
// users render the app without configuring a database. Any code that actually
// queries the db (auth flows, /api/seasons, /api/user/api-key) will fail at
// query time with a clear connection error.

// Trim defensively: Vercel's env-var UI lets you save values with hidden
// trailing newlines or surrounding quotes, which makes neon() reject the URL.
const rawUrl = process.env.DATABASE_URL?.trim().replace(/^["']|["']$/g, '') ?? '';
const PLACEHOLDER_URL =
  'postgresql://placeholder:placeholder@ep-placeholder-12345678.us-east-1.aws.neon.tech/neondb?sslmode=require';
const url = rawUrl || PLACEHOLDER_URL;

if (!rawUrl && process.env.NODE_ENV !== 'production') {
  // eslint-disable-next-line no-console
  console.warn(
    '[FootballDraft] DATABASE_URL is not set — auth and history are disabled. See README.',
  );
}

let sql;
try {
  sql = neon(url);
} catch (err) {
  // Reach here when DATABASE_URL is malformed. Re-throw with a much clearer
  // message so the Vercel build log points the user at the real fix.
  const msg = err instanceof Error ? err.message : String(err);
  throw new Error(
    `[FootballDraft] DATABASE_URL is set but neon() rejected it. ` +
      `Check the Vercel env var for stray whitespace, quotes, or a partial paste. Original error: ${msg}`,
  );
}

export const db = drizzle(sql, { schema });
export { schema };
