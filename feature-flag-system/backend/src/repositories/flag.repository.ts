import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { flags } from "../db/schema/flags.js";

export async function createFlag(key: string, description: string) {
  const [flag] = await db
    .insert(flags)
    .values({
      key,
      description,
    })
    .returning();

  return flag;
}

export async function findFlagByKey(key: string) {
  const [flag] = await db
    .select()
    .from(flags)
    .where(eq(flags.key, key))
    .limit(1);

  return flag ?? null;
}

export async function findAllFlags() {
  return db.select().from(flags);
}

export async function updateFlagEnabled(key: string, enabled: boolean) {
  const [flag] = await db
    .update(flags)
    .set({
      enabled,
      updatedAt: new Date(),
    })
    .where(eq(flags.key, key))
    .returning();

  return flag ?? null;
}

export async function setRolloutPercentage(key: string, percentage: number) {
  const [flag] = await db
    .update(flags)
    .set({
      rolloutPercentage: percentage,
      updatedAt: new Date(),
    })
    .where(eq(flags.key, key))
    .returning();

  return flag ?? null;
}

export async function updateFlagKillSwitch(key: string, killSwitch: boolean) {
  const [flag] = await db
    .update(flags)
    .set({
      killSwitch,
      updatedAt: new Date(),
    })
    .where(eq(flags.key, key))
    .returning();

  return flag ?? null;
}
