// Teach drizzle about migrations that were applied by hand.
//
// This database was migrated manually — the tables exist, but the bookkeeping
// table drizzle uses to know what it has already run was never created. That
// makes `npm run db:migrate` unusable: with no record, it replays from 0000 and
// dies on `relation "user" already exists`, so every future schema change has to
// be applied by hand too, forever.
//
// This writes the record drizzle would have written, so the next migration runs
// normally. It applies no DDL of its own.
//
// Usage:
//   DATABASE_URL='postgres://…' node scripts/adopt-migrations.mjs [--apply]
//
// Without --apply it prints what it would do and changes nothing.
import { neon } from '@neondatabase/serverless';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'drizzle');
const APPLY = process.argv.includes('--apply');

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}
const sql = neon(url);

// Exactly what drizzle-orm's migrator records: sha256 of the raw file contents,
// and the journal's `when` as created_at. See PgDialect.migrate() — the skip
// decision compares max(created_at) against each entry's folderMillis, so these
// timestamps are what actually matter.
const journal = JSON.parse(readFileSync(join(OUT, 'meta', '_journal.json'), 'utf8'));
const entries = journal.entries.map(e => ({
  tag: e.tag,
  createdAt: e.when,
  hash: createHash('sha256').update(readFileSync(join(OUT, `${e.tag}.sql`))).digest('hex'),
}));

console.log(`journal has ${entries.length} migrations:`);
for (const e of entries) console.log(`  ${e.tag.padEnd(32)} ${e.createdAt}  ${e.hash.slice(0, 12)}…`);

const existing = await sql`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'drizzle' AND table_name = '__drizzle_migrations'`;

if (existing.length) {
  const rows = await sql`
    SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at`;
  console.log(`\nbookkeeping table already exists with ${rows.length} row(s).`);
  const known = new Set(rows.map(r => r.hash));
  const missing = entries.filter(e => !known.has(e.hash));
  if (!missing.length) {
    console.log('every migration is already recorded — nothing to do.');
    process.exit(0);
  }
  console.log(`missing: ${missing.map(m => m.tag).join(', ')}`);
}

if (!APPLY) {
  console.log('\n--apply not given. Nothing was changed.');
  process.exit(0);
}

// The same DDL drizzle itself uses, so the table it finds later is the table it
// would have made.
await sql`CREATE SCHEMA IF NOT EXISTS "drizzle"`;
await sql`
  CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
    id SERIAL PRIMARY KEY,
    hash text NOT NULL,
    created_at bigint
  )`;

let inserted = 0;
for (const e of entries) {
  const dupe = await sql`
    SELECT 1 FROM drizzle.__drizzle_migrations WHERE hash = ${e.hash} LIMIT 1`;
  if (dupe.length) continue;
  await sql`
    INSERT INTO drizzle.__drizzle_migrations ("hash", "created_at")
    VALUES (${e.hash}, ${e.createdAt})`;
  inserted++;
}

const after = await sql`
  SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at`;
console.log(`\nrecorded ${inserted} migration(s). Table now holds ${after.length}:`);
for (const r of after) {
  const match = entries.find(e => e.hash === r.hash);
  console.log(`  ${(match?.tag ?? '(unknown)').padEnd(32)} ${r.created_at}`);
}
const high = Math.max(...after.map(r => Number(r.created_at)));
const wouldRun = entries.filter(e => e.createdAt > high);
console.log(`\nnext \`db:migrate\` would run: ${wouldRun.length ? wouldRun.map(w => w.tag).join(', ') : 'nothing'}`);
