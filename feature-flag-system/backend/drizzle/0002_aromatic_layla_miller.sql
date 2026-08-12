CREATE TABLE "flag_targeting" (
	"id" serial PRIMARY KEY NOT NULL,
	"flag_id" integer NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "flag_targeting_flag_user_unique" UNIQUE("flag_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "flag_targeting" ADD CONSTRAINT "flag_targeting_flag_id_flags_id_fk" FOREIGN KEY ("flag_id") REFERENCES "public"."flags"("id") ON DELETE cascade ON UPDATE no action;