import { pgTable, varchar, text, serial,boolean,  timestamp, integer } from "drizzle-orm/pg-core";

export const flags = pgTable("flags", {
  id: serial("id").primaryKey(),

  key: varchar("key", {
    length: 255,
  })
    .notNull()
    .unique(),

  description: text("description").notNull(),

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

    
});
