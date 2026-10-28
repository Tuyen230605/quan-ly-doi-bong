CREATE TABLE "attendances" (
	"match_id" integer NOT NULL,
	"player_id" integer NOT NULL,
	"present" boolean NOT NULL,
	"charge_to_player_id" integer,
	"fee_override" integer,
	"in_roster" boolean DEFAULT false NOT NULL,
	"vote_choice" text,
	"result" text,
	"fee" integer,
	CONSTRAINT "attendances_match_id_player_id_pk" PRIMARY KEY("match_id","player_id")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"actor_type" text NOT NULL,
	"actor_id" integer,
	"actor_name" text NOT NULL,
	"action" text NOT NULL,
	"detail" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "funds" (
	"team_id" integer NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"bank_bin" text,
	"account_no" text,
	"account_name" text,
	"qr_image" text,
	CONSTRAINT "funds_team_id_code_pk" PRIMARY KEY("team_id","code")
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"schedule_id" integer,
	"date" text NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text,
	"venue_id" integer,
	"kind" text DEFAULT 'internal' NOT NULL,
	"opponent" text,
	"note" text,
	"cost_field" integer DEFAULT 0 NOT NULL,
	"cost_water" integer DEFAULT 0 NOT NULL,
	"cost_referee" integer DEFAULT 0 NOT NULL,
	"cost_other" integer DEFAULT 0 NOT NULL,
	"vote_mode" text,
	"vote_deadline" timestamp with time zone,
	"status" text DEFAULT 'upcoming' NOT NULL,
	"cancel_reason" text,
	"split_method" text,
	"rounding_step" integer,
	"fixed_fee" integer,
	"guest_fee" integer,
	"payer_player_id" integer,
	"member_fee" integer,
	"settled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "penalty_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"name" text NOT NULL,
	"amount_mode" text DEFAULT 'fixed' NOT NULL,
	"default_amount" integer DEFAULT 0 NOT NULL,
	"is_no_show" boolean DEFAULT false NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"full_name" text NOT NULL,
	"nickname" text,
	"phone" text,
	"jersey_no" integer,
	"position" text,
	"type" text DEFAULT 'member' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"host_player_id" integer,
	"pin_hash" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schedule_players" (
	"schedule_id" integer NOT NULL,
	"player_id" integer NOT NULL,
	CONSTRAINT "schedule_players_schedule_id_player_id_pk" PRIMARY KEY("schedule_id","player_id")
);
--> statement-breakpoint
CREATE TABLE "schedules" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"name" text NOT NULL,
	"weekdays" jsonb NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text,
	"venue_id" integer,
	"cost_field" integer DEFAULT 0 NOT NULL,
	"cost_water" integer DEFAULT 0 NOT NULL,
	"cost_referee" integer DEFAULT 0 NOT NULL,
	"cost_other" integer DEFAULT 0 NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text,
	"vote_mode" text DEFAULT 'absent' NOT NULL,
	"deadline_weekday" integer DEFAULT 7 NOT NULL,
	"deadline_time" text DEFAULT '23:59' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_admins" (
	"team_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" text DEFAULT 'admin' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "team_admins_team_id_user_id_pk" PRIMARY KEY("team_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"password_hash" text NOT NULL,
	"viewer_version" integer DEFAULT 1 NOT NULL,
	"area" text,
	"split_method" text DEFAULT 'equal' NOT NULL,
	"rounding_step" integer DEFAULT 1000 NOT NULL,
	"fixed_fee" integer DEFAULT 50000 NOT NULL,
	"guest_fee" integer DEFAULT 70000 NOT NULL,
	"require_pin" boolean DEFAULT false NOT NULL,
	"created_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "teams_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"fund" text NOT NULL,
	"type" text NOT NULL,
	"cash_amount" integer DEFAULT 0 NOT NULL,
	"player_amount" integer DEFAULT 0 NOT NULL,
	"player_id" integer,
	"match_id" integer,
	"ref_id" integer,
	"penalty_type_id" integer,
	"method" text,
	"category" text,
	"note" text,
	"date" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"cancel_reason" text,
	"created_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"display_name" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "venues" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"map_url" text,
	"field_cost" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "votes" (
	"match_id" integer NOT NULL,
	"player_id" integer NOT NULL,
	"choice" text NOT NULL,
	"reason" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by_admin_id" integer,
	CONSTRAINT "votes_match_id_player_id_pk" PRIMARY KEY("match_id","player_id")
);
--> statement-breakpoint
CREATE INDEX "audit_team" ON "audit_logs" USING btree ("team_id");--> statement-breakpoint
CREATE UNIQUE INDEX "matches_schedule_date" ON "matches" USING btree ("schedule_id","date");--> statement-breakpoint
CREATE INDEX "matches_team_date" ON "matches" USING btree ("team_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "penalty_types_team_name" ON "penalty_types" USING btree ("team_id","name");--> statement-breakpoint
CREATE INDEX "players_team" ON "players" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "schedules_team" ON "schedules" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "tx_team_date" ON "transactions" USING btree ("team_id","date");--> statement-breakpoint
CREATE INDEX "tx_player" ON "transactions" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "tx_match" ON "transactions" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "venues_team" ON "venues" USING btree ("team_id");