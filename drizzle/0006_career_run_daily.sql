-- The seed of the day: one world for everyone, its own board, resets at
-- midnight UTC.
--
-- `dayKey` is the UTC calendar day the run was played, `YYYY-MM-DD`, and is null
-- for every run that is not a daily one. The board is scoped by it, so the index
-- covers the only query that reads it: today's runs, best first.
ALTER TABLE "careerRun" ADD COLUMN IF NOT EXISTS "dayKey" text;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "careerRun_daily_idx"
  ON "careerRun" ("dayKey", "score" DESC)
  WHERE "dayKey" IS NOT NULL;
