ALTER TABLE "flag_targeting" DROP CONSTRAINT "flag_targeting_flag_user_unique";--> statement-breakpoint
ALTER TABLE "flag_targeting" ADD COLUMN "environment" varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE "flag_targeting" ADD CONSTRAINT "flag_targeting_flag_environment_user_unique" UNIQUE("flag_id","environment","user_id");