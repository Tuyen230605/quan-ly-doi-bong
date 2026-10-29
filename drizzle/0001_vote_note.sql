ALTER TABLE "attendances" ADD COLUMN "note" text;--> statement-breakpoint
ALTER TABLE "penalty_types" ADD COLUMN "is_no_vote_came" boolean DEFAULT false NOT NULL;