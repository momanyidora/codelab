import {
  createFlag,
  findAllFlags,
  findFlagByKey,
  updateFlagEnabled,
  setRolloutPercentage,
} from "../repositories/flag.repository.js";

export async function createFlagService(key: string, description: string) {
  const existingFlag = await findFlagByKey(key);

  if (existingFlag) {
    throw new Error(`Flag with key "${key}" already exists`);
  }

  return createFlag(key, description);
}

export async function getFlagByKeyService(key: string) {
  return findFlagByKey(key);
}

export async function getAllFlagsService() {
  return findAllFlags();
}

export async function setFlagEnabled(key: string, enabled: boolean) {
  const existingFlag = await findFlagByKey(key);

  if (!existingFlag) {
    throw new Error(`Flag with key "${key}" was not found.`);
  }

  return updateFlagEnabled(key, enabled);
}

export async function setFlagRolloutPercentageService(
  key: string,
  percentage: number,
) {
  if (!Number.isInteger(percentage) || percentage < 0 || percentage > 100) {
    throw new Error("Rollout percentage must be between 0 and 100.");
  }

  const flag = await findFlagByKey(key);

  if (!flag) {
    throw new Error(`Flag with key "${key}" was not found.`);
  }

  return setRolloutPercentage(key, percentage);
}
