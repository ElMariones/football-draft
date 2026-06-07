import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// neon() is lazy — it doesn't open a connection until a query is run. So we
// can hand it a placeholder URL when DATABASE_URL is unset, letting guest
// users render the app without configuring a database. Any code that actually
// queries the db (auth flows, /api/seasons, /api/user/api-key) will fail at
// query time with a clear connection error.
const url = process.env.DATABASE_URL ?? 'postgres://unset:unset@unset.neon.tech/unset';

if (!process.env.DATABASE_URL && process.env.NODE_ENV !== 'production') {
  // eslint-disable-next-line no-console
  console.warn(
    '[FootballDraft] DATABASE_URL is not set — auth and history are disabled. See README.',
  );
}

const sql = neon(url);
export const db = drizzle(sql, { schema });
export { schema };
