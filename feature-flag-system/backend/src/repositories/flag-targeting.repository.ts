import { and, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { flags } from "../db/schema/flags.js";
import { flagTargeting } from "../db/schema/flag-targeting.js";

export async function addTargetedUser(
  flagKey: string,
  environment: string,
  userId: string,
) {
  const [flag] = await db
    .select()
    .from(flags)
    .where(eq(flags.key, flagKey))
    .limit(1);

  if (!flag) {
    return null;
  }

  const [existing] = await db
    .select()
    .from(flagTargeting)
    .where(
      and(
        eq(flagTargeting.flagId, flag.id),
        eq(flagTargeting.environment, environment),
        eq(flagTargeting.userId, userId),
      ),
    )
    .limit(1);

  if (existing) {
    return existing;
  }

  const [result] = await db
    .insert(flagTargeting)
    .values({
      flagId: flag.id,
      environment,
      userId,
    })
    .returning();

  return result;
}

export async function removeTargetedUser(
  flagKey: string,
  environment: string,
  userId: string,
) {
  const [flag] = await db
    .select()
    .from(flags)
    .where(eq(flags.key, flagKey))
    .limit(1);

  if (!flag) {
    return {
      type: "FLAG_NOT_FOUND" as const,
    };
  }

  const [result] = await db
    .delete(flagTargeting)
    .where(
      and(
        eq(flagTargeting.flagId, flag.id),
        eq(flagTargeting.environment, environment),
        eq(flagTargeting.userId, userId),
      ),
    )
    .returning();

  if (!result) {
    return {
      type: "TARGETING_NOT_FOUND" as const,
    };
  }

  return {
    type: "REMOVED" as const,
    data: result,
  };
}

export async function getTargetedUsers(flagKey: string, environment: string) {
  const [flag] = await db
    .select()
    .from(flags)
    .where(eq(flags.key, flagKey))
    .limit(1);

  if (!flag) {
    return null;
  }

  const result = await db
    .select({
      userId: flagTargeting.userId,
    })
    .from(flagTargeting)
    .where(
      and(
        eq(flagTargeting.flagId, flag.id),
        eq(flagTargeting.environment, environment),
      ),
    );

  return result.map((row) => row.userId);
}

export async function isUserTargeted(
  flagKey: string,
  environment: string,
  userId: string,
) {
  const [flag] = await db
    .select()
    .from(flags)
    .where(eq(flags.key, flagKey))
    .limit(1);

  if (!flag) {
    return false;
  }

  const [result] = await db
    .select()
    .from(flagTargeting)
    .where(
      and(
        eq(flagTargeting.flagId, flag.id),
        eq(flagTargeting.environment, environment),
        eq(flagTargeting.userId, userId),
      ),
    )
    .limit(1);

  return Boolean(result);
}
