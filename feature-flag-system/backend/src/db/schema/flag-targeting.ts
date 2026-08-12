import {
  integer,
  pgTable,
  serial,
  timestamp,
  varchar,
  unique,
} from "drizzle-orm/pg-core";
import { flags } from "./flags.js";

export const flagTargeting = pgTable(
  "flag_targeting",
  {
    id: serial("id").primaryKey(),

    flagId: integer("flag_id")
      .notNull()
      .references(() => flags.id, { onDelete: "cascade" }),
      

      environment: varchar("environment", {
        length: 100,
      }).notNull(),

    userId: varchar("user_id", {
      length: 255,
    }).notNull(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    flagEnvironmentUserUnique: unique("flag_targeting_flag_environment_user_unique").on(
      table.flagId,
      table.environment,
      table.userId,
    ),
  }),
);
