import {
  boolean,
  integer,
  timestamp,
  unique,
  varchar,
  serial,
  pgTable,
} from "drizzle-orm/pg-core";

import { flags } from "./flags.js";

export const flagEnvironments = pgTable(
  "flag_environments",
  {
    id: serial("id").primaryKey(),
    flagId: integer("flag_id")
      .notNull()
      .references(() => flags.id, { onDelete: "cascade" }),
    environment: varchar("environment", {
      length: 100,
    }).notNull(),
    enabled: boolean("enabled").default(false).notNull(),
    rolloutPercentage: integer("rollout_percentage").default(0).notNull(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    flagEnvironmentUnique: unique("flag_environment_unique").on(
      table.flagId,
      table.environment,
    ),
  }),
);
