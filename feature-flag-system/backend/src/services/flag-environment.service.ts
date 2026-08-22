import {
  createFlagEnvironment,
  findFlagEnvironment,
  updateFlagEnvironmentEnabled,
  updateFlagEnvironmentRollout,
} from "../repositories/flag-environment.repository.js";
import {
  findAllFlags,
  findFlagByKey,
} from "../repositories/flag.repository.js";
import { recordFlagHistory } from "./flag-history.service.js";

export async function createEnvironment(flagKey: string, environment: string) {
  if (!environment) {
    throw new Error("ENVIRONMENT_REQUIRED");
  }

  const result = await createFlagEnvironment(flagKey, environment);

  return result;
}

export async function getEnvironment(flagKey: string, environment: string) {
  if (!environment) {
    throw new Error("ENVIRONMENT_REQUIRED");
  }

  const result = await findFlagEnvironment(flagKey, environment);

  return result;
}

export async function setEnvironmentEnabled(
  flagKey: string,
  environment: string,
  enabled: boolean,
  actor = "system",
) {
  const existing = await getEnvironment(flagKey, environment);

  const result = await updateFlagEnvironmentEnabled(
    flagKey,
    environment,
    enabled,
  );

  if (!result) {
    throw new Error(`Flag with key "${flagKey}" was not found.`);
  }
  const flag = await findFlagByKey(flagKey);

  if (flag) {
    await recordFlagHistory(
      flag.id,
      actor,
      "ENVIRONMENT_ENABLED_CHANGED",
      existing?.enabled ?? false,
      result.enabled,
      environment,
    );
  }
  return result;
}

export async function setEnvironmentRollout(
  flagKey: string,
  environment: string,
  percentage: number,
  actor = "system",

) {

  if (!environment) {
    throw new Error("ENVIRONMENT_REQUIRED");
  }
  if(percentage < 0 ||  percentage > 100){
    throw new Error("Rollout percentage must be between 0 and 100.")
  }
const existing = await getEnvironment(flagKey, environment);

const result = await updateFlagEnvironmentRollout(
  flagKey,
  environment,
  percentage,
);

if (!result) {
  throw new Error(`Flag with key "${flagKey}" was not found.`);
}

const flag = await findFlagByKey(flagKey);

if (flag) {
  await recordFlagHistory(
    flag.id,
    actor,
    "ENVIRONMENT_ROLLOUT_CHANGED",
    existing?.rolloutPercentage ?? 0,
    result.rolloutPercentage,
    environment,
  );
}

return result

}