import {
  createFlagEnvironment,
  findFlagEnvironment,
  updateFlagEnvironmentEnabled,
  updateFlagEnvironmentRollout,
} from "../repositories/flag-environment.repository.js";

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
) {
  if (!environment) {
    throw new Error("ENVIRONMENT_REQUIRED");
  }


  const result = await updateFlagEnvironmentEnabled(
    flagKey,
    environment,
    enabled,
  );

  if (!result) {
    throw new Error(`Flag with key "${flagKey}" was not found.`);
  }

  return result;
}

export async function setEnvironmentRollout(
  flagKey: string,
  environment: string,
  percentage: number,
) {
  if (!environment) {
    throw new Error("ENVIRONMENT_REQUIRED");
  }

  if (!Number.isInteger(percentage) || percentage < 0 || percentage > 100) {
    throw new Error("Rollout percentage must be between 0 and 100.");
  }

  const result = await updateFlagEnvironmentRollout(
    flagKey,
    environment,
    percentage,
  );

  if (!result) {
    throw new Error(`Flag with key "${flagKey}" was not found.`);
  }

  return result;
}
