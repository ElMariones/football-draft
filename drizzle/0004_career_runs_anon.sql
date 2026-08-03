-- The career board does not require an account: the name given to the player is
-- the entry. Existing rows keep their user link; new ones may have none.
ALTER TABLE "careerRun" ALTER COLUMN "userId" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "careerRun" DROP CONSTRAINT IF EXISTS "careerRun_userId_user_id_fk";--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "careerRun" ADD CONSTRAINT "careerRun_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
