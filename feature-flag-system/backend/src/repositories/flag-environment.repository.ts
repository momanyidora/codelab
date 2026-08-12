import { and, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { flags } from "../db/schema/flags.js";
import { flagEnvironments } from "../db/schema/flag-environments.js";

export async function createFlagEnvironment(
  flagKey: string,
  environment: string,
) {
  const [flag] = await db
    .select()
    .from(flags)
    .where(eq(flags.key, flagKey))
    .limit(1);

 
  if (!flag) {
    return null;
  }

  const [result] = await db
    .insert(flagEnvironments)
    .values({
      flagId: flag.id,
      environment,
    })
    .onConflictDoNothing()
    .returning();

  if (result) {
    return result;
  }

  return findFlagEnvironment(flagKey, environment);
}

export async function findFlagEnvironment(
  flagKey: string,
  environment: string,
) {
  const [result] = await db
    .select({
      id: flagEnvironments.id,
      flagId: flagEnvironments.flagId,
      environment: flagEnvironments.environment,
      enabled: flagEnvironments.enabled,
      rolloutPercentage: flagEnvironments.rolloutPercentage,
      createdAt: flagEnvironments.createdAt,
      updatedAt: flagEnvironments.updatedAt,
    })
    .from(flagEnvironments)
    .innerJoin(flags, eq(flagEnvironments.flagId, flags.id))
    .where(
      and(
        eq(flags.key, flagKey),
        eq(flagEnvironments.environment, environment),
      ),
    )
    .limit(1);

  return result ?? null;
}

export async function updateFlagEnvironmentEnabled(
  flagKey: string,
  environment: string,
  enabled: boolean,
) {
  const existing = await findFlagEnvironment(flagKey, environment);

 
  if (!existing) {
    const created = await createFlagEnvironment(flagKey, environment);

  
    if (!created) {
      return null;
    }

    const [result] = await db
      .update(flagEnvironments)
      .set({
        enabled,
        updatedAt: new Date(),
      })
      .where(eq(flagEnvironments.id, created.id))
      .returning();

    return result ?? null;
  }

  const [result] = await db
    .update(flagEnvironments)
    .set({
      enabled,
      updatedAt: new Date(),
    })
    .where(eq(flagEnvironments.id, existing.id))
    .returning();

  return result ?? null;
}

export async function updateFlagEnvironmentRollout(
  flagKey: string,
  environment: string,
  percentage: number,
) {
  const existing = await findFlagEnvironment(flagKey, environment);

  if (!existing) {
    const created = await createFlagEnvironment(flagKey, environment);

    if (!created) {
      return null;
    }

    const [result] = await db
      .update(flagEnvironments)
      .set({
        rolloutPercentage: percentage,
        updatedAt: new Date(),
      })
      .where(eq(flagEnvironments.id, created.id))
      .returning();

    return result ?? null;
  }

  const [result] = await db
    .update(flagEnvironments)
    .set({
      rolloutPercentage: percentage,
      updatedAt: new Date(),
    })
    .where(eq(flagEnvironments.id, existing.id))
    .returning();

  return result ?? null;
}
