import {
  pgTable,
  text,
  timestamp,
  primaryKey,
  integer,
  jsonb,
  uuid,
} from 'drizzle-orm/pg-core';
import type { AdapterAccountType } from 'next-auth/adapters';

// Auth.js standard tables — schema mirrors @auth/drizzle-adapter's expected shape.

export const users = pgTable('user', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  email: text('email').unique(),
  emailVerified: timestamp('emailVerified', { mode: 'date' }),
  image: text('image'),
  // App-specific: encrypted OpenAI key + selected model. Never returned to the client.
  encryptedApiKey: text('encryptedApiKey'),
  openaiModel: text('openaiModel'),
  // Custom display name for leaderboard/sharing (distinct from Google profile name).
  nickname: text('nickname'),
});

export const accounts = pgTable(
  'account',
  {
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').$type<AdapterAccountType>().notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('providerAccountId').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  account => ({
    compoundKey: primaryKey({ columns: [account.provider, account.providerAccountId] }),
  }),
);

export const sessions = pgTable('session', {
  sessionToken: text('sessionToken').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
});

export const verificationTokens = pgTable(
  'verificationToken',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
  },
  vt => ({ compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }) }),
);

// App-specific: a completed run (league season or CL campaign) saved for replay.
// `payload` holds the full SeasonResult or CLResult JSON so we can rerender it.
export const seasons = pgTable('seasons', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('createdAt', { mode: 'date' }).notNull().defaultNow(),
  mode: text('mode').notNull(),               // 'pl' | 'cl' | 'll' | 'wc'
  teamName: text('teamName').notNull(),
  formation: text('formation').notNull(),
  // For league modes: 1-20. For CL/WC: null (use clStage instead).
  finalPosition: integer('finalPosition'),
  // For CL/WC: 'group' | 'quarter-finals' | 'semi-finals' | 'third-place' (WC bronze)
  // | 'final' | 'champion'. Null for league.
  clStage: text('clStage'),
  // Full result blob (SeasonResult or CLResult).
  payload: jsonb('payload').notNull(),
  // XI snapshot for quick listing without parsing the full payload.
  xiSummary: jsonb('xiSummary').notNull(),
  // Aggregates for the public leaderboard — denormalised so we don't parse
  // jsonb on every query. Computed in POST /api/seasons; nullable for rows
  // saved before this column existed (backfilled lazily).
  overall: integer('overall'),
  wins: integer('wins'),
  draws: integer('draws'),
  losses: integer('losses'),
  points: integer('points'),                  // null for CL
});

export type SeasonRow = typeof seasons.$inferSelect;
export type NewSeasonRow = typeof seasons.$inferInsert;
