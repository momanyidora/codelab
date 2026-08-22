import { db } from "../db/index.js";
import { flagHistory } from "../db/schema/flag-history.js";
import { flags } from "../db/schema/flags.js";
import { asc, eq } from "drizzle-orm";

export async function createFlagHistory(
  flagId: number,
  actor: string,
  action: string,
  before: unknown,
  after: unknown,
  environment?: string,
) {
  const [result] = await db
    .insert(flagHistory)
    .values({
      flagId,
      environment: environment ?? null,
      actor,
      action,
      before,
      after,
    })
    .returning();
  return result;
}

export async function findFlagHistory(flagKey: string) {
  return db
    .select({
      id: flagHistory.id,
      flag: flags.key,
      environment: flagHistory.environment,
      actor: flagHistory.actor,
      action: flagHistory.action,
      before: flagHistory.before,
      after: flagHistory.after,
      createdAt: flagHistory.createAt,
    })
    .from(flagHistory)
    .innerJoin(flags, eq(flagHistory.flagId, flags.id))
    .where(eq(flags.key, flagKey))
    .orderBy(asc(flagHistory.createAt), asc(flagHistory.id));
}
