CREATE TABLE "payment_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"fund" text DEFAULT 'ball' NOT NULL,
	"title" text NOT NULL,
	"amount" integer NOT NULL,
	"note" text,
	"status" text DEFAULT 'open' NOT NULL,
	"created_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "rules" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "request_id" integer;--> statement-breakpoint
CREATE INDEX "payment_requests_team" ON "payment_requests" USING btree ("team_id");