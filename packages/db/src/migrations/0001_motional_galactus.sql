CREATE TABLE IF NOT EXISTS "shift" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL
);
--> statement-breakpoint
INSERT INTO "shift" (id, name, start_time, end_time) VALUES 
	('shift_morning', 'morning', '08:00', '14:00'),
	('shift_evening', 'evening', '14:00', '20:00'),
	('shift_night', 'night', '20:00', '08:00')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time;
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "preferred_shift_id" text NOT NULL DEFAULT 'shift_morning';
--> statement-breakpoint
UPDATE "user" SET "preferred_shift_id" = 'shift_morning' WHERE "preferred_shift_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "preferred_shift_id" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_preferred_shift_id_shift_id_fk" FOREIGN KEY ("preferred_shift_id") REFERENCES "public"."shift"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "user_schedule" ADD COLUMN IF NOT EXISTS "shift_id" text NOT NULL DEFAULT 'shift_morning';
--> statement-breakpoint
UPDATE "user_schedule" SET "shift_id" = 'shift_morning' WHERE "shift_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "user_schedule" ALTER COLUMN "shift_id" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "user_schedule" ADD CONSTRAINT "user_schedule_shift_id_shift_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."shift"("id") ON DELETE no action ON UPDATE no action;