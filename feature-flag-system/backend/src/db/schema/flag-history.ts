import {
  pgTable,
  serial,
  integer,
  timestamp,
  varchar,
  jsonb,
} from "drizzle-orm/pg-core";
import { flags } from "./flags.js";

export const flagHistory = pgTable("flag_history", {
  id: serial("id").primaryKey(),
  flagId: integer("flag_id")
    .notNull()
    .references(() => flags.id, { onDelete: "cascade" }),
  environment: varchar("environment", {
    length: 100,
  }),
  actor: varchar("actor", {
    length: 255,
  }).notNull(),

  action: varchar("action", {
    length: 100,
  }).notNull(),
  before: jsonb("before"),
  after: jsonb("after"),
  createAt: timestamp("created_at", {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
});
