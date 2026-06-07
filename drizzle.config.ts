import { config as loadEnv } from 'dotenv';
import type { Config } from 'drizzle-kit';

// drizzle-kit doesn't pick up .env.local automatically the way Next does.
loadEnv({ path: '.env.local' });

export default {
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
