CREATE TABLE IF NOT EXISTS "nurse" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "shift" ADD COLUMN IF NOT EXISTS "crosses_midnight" boolean NOT NULL DEFAULT false;
--> statement-breakpoint
UPDATE "shift" SET "crosses_midnight" = false WHERE "crosses_midnight" IS NULL;
--> statement-breakpoint
ALTER TABLE "shift" ALTER COLUMN "crosses_midnight" DROP DEFAULT;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nurse_schedule" (
	"id" text PRIMARY KEY NOT NULL,
	"nurse_id" text NOT NULL,
	"date" timestamp NOT NULL,
	"shift_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "nurse_schedule_nurse_id_nurse_id_fk" FOREIGN KEY ("nurse_id") REFERENCES "public"."nurse"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "nurse_schedule_shift_id_shift_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."shift"("id") ON DELETE set null ON UPDATE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_nurse_day" ON "nurse_schedule" USING btree ("nurse_id","date");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nurse_shift_preference" (
	"nurse_id" text NOT NULL,
	"shift_id" text NOT NULL,
	"weight" integer NOT NULL,
	PRIMARY KEY ("nurse_id", "shift_id"),
	CONSTRAINT "nurse_shift_preference_nurse_id_nurse_id_fk" FOREIGN KEY ("nurse_id") REFERENCES "public"."nurse"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "nurse_shift_preference_shift_id_shift_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."shift"("id") ON DELETE cascade ON UPDATE no action
);