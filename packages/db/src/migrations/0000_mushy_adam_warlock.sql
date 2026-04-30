DO $$ BEGIN
    CREATE TYPE "public"."role" AS ENUM('admin', 'user');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    CREATE TYPE "public"."shift_enum" AS ENUM('morning', 'evening', 'night');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"role" "role" DEFAULT 'user' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nurse" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nurse_shift_preference" (
	"nurse_id" text NOT NULL,
	"shift_id" text NOT NULL,
	"weight" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "nurse_shift_preference_nurse_id_shift_id_pk" PRIMARY KEY("nurse_id","shift_id")
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nurse_schedule" (
	"id" text PRIMARY KEY NOT NULL,
	"nurse_id" text NOT NULL,
	"date" timestamp NOT NULL,
	"shift_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "shift" (
	"id" text PRIMARY KEY NOT NULL,
	"name" "shift_enum" NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"crosses_midnight" boolean NOT NULL,
	CONSTRAINT "shift_name_unique" UNIQUE("name")
);--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT IF NOT EXISTS "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT IF NOT EXISTS "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nurse_shift_preference" ADD CONSTRAINT IF NOT EXISTS "nurse_shift_preference_nurse_id_nurse_id_fk" FOREIGN KEY ("nurse_id") REFERENCES "public"."nurse"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nurse_shift_preference" ADD CONSTRAINT IF NOT EXISTS "nurse_shift_preference_shift_id_shift_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."shift"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nurse_schedule" ADD CONSTRAINT IF NOT EXISTS "nurse_schedule_nurse_id_nurse_id_fk" FOREIGN KEY ("nurse_id") REFERENCES "public"."nurse"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nurse_schedule" ADD CONSTRAINT IF NOT EXISTS "nurse_schedule_shift_id_shift_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."shift"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_nurse_day" ON "nurse_schedule" USING btree ("nurse_id","date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_nurse_schedule_date" ON "nurse_schedule" USING btree ("date");