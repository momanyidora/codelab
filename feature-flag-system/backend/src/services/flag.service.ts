import {
  createFlag,
  findAllFlags,
  findFlagByKey,
  updateFlagEnabled,
  setRolloutPercentage,
  updateFlagKillSwitch,
} from "../repositories/flag.repository.js";
import { recordFlagHistory } from "./flag-history.service.js";

export async function createFlagService(
  key: string,
  description: string,
  actor = "system",
) {
  const existingFlag = await findFlagByKey(key);

  if (existingFlag) {
    throw new Error(`Flag with key "${key}" already exists`);
  }
  const flag = await createFlag(key, description);
  if (flag) {
    await recordFlagHistory(flag.id, actor, "FLAG_CREATED", null, {
      key: flag.key,
      description: flag.description,
      enabled: flag.enabled,
      rolloutPercentage: flag.rolloutPercentage,
    });
  }

  return flag;
}

export async function getFlagByKeyService(key: string) {
  return findFlagByKey(key);
}

export async function getAllFlagsService() {
  return findAllFlags();
}

export async function setFlagEnabled(
  key: string,
  enabled: boolean,
  actor = "system",
) {
  const existingFlag = await findFlagByKey(key);

  if (!existingFlag) {
    throw new Error(`Flag with key "${key}" was not found.`);
  }

  const result = await updateFlagEnabled(key, enabled);
  if (result) {
    await recordFlagHistory(
      result.id,
      actor,
      "FLAG_ENABLED_CHANGED",
      existingFlag.enabled,
      result.enabled,
    );
  }
  return result;
}

export async function setFlagRolloutPercentageService(
  key: string,
  percentage: number,
  actor = "system",
) {
  if (!Number.isInteger(percentage) || percentage < 0 || percentage > 100) {
    throw new Error("Rollout percentage must be between 0 and 100.");
  }

  const flag = await findFlagByKey(key);

  if (!flag) {
    throw new Error(`Flag with key "${key}" was not found.`);
  }
  const result = await setRolloutPercentage(key, percentage);

  if (result) {
    await recordFlagHistory(
      result.id,
      actor,
      "ROLLOUT_PERCENTAGE_CHANGED",
      flag.rolloutPercentage,
      result.rolloutPercentage,
    );
  }
  return result;
}
export async function setFlagKillSwitch(
  key: string,
  killSwitch: boolean,
  actor: string,
) {
  const existingFlag = await findFlagByKey(key);

  if (!existingFlag) {
    throw new Error(`Flag with key "${key}" was not found.`);
  }

  const result = await updateFlagKillSwitch(key, killSwitch);

  if (result) {
    await recordFlagHistory(
      result.id,
      actor,
      killSwitch ? "KILL_SWITCH_ENGAGED" : "KILL_SWITCH_RELEASED",
      existingFlag.killSwitch,
      result.killSwitch,
    );
  }

  return result;
}