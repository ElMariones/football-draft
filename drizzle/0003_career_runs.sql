CREATE TABLE IF NOT EXISTS "careerRun" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"surname" text NOT NULL,
	"nationCode" text NOT NULL,
	"position" text NOT NULL,
	"score" integer NOT NULL,
	"peakOverall" integer NOT NULL,
	"seasonsPlayed" integer NOT NULL,
	"trophies" integer NOT NULL,
	"goals" integer NOT NULL,
	"assists" integer NOT NULL,
	"apps" integer NOT NULL,
	"ballonDors" integer DEFAULT 0 NOT NULL,
	"seed" integer NOT NULL,
	"seedSource" text NOT NULL,
	"history" jsonb NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "careerRun" ADD CONSTRAINT "careerRun_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
-- the leaderboard is one best row per user, ranked; these cover both halves
CREATE INDEX IF NOT EXISTS "careerRun_user_score_idx" ON "careerRun" ("userId","score" DESC);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "careerRun_score_idx" ON "careerRun" ("score" DESC);
