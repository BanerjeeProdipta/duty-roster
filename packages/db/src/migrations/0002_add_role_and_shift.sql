ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "role" text DEFAULT 'user' NOT NULL;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "preferred_shift_id" text NOT NULL;
ALTER TABLE "user" ADD CONSTRAINT "user_preferred_shift_id_shift_id_fk" FOREIGN KEY ("preferred_shift_id") REFERENCES "public"."shift"("id") ON DELETE no action ON UPDATE no action;
