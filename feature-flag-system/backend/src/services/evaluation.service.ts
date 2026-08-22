import { findFlagByKey } from "../repositories/flag.repository.js";
import { getBucket } from "../utils/hash.js";
import { checkUserTargeting } from "./flag-targeting.service.js";
import { getEnvironment } from "./flag-environment.service.js";

export async function evaluateFlag(
  flagKey: string,
  user: string,
  environment: string,
) {
  const flag = await findFlagByKey(flagKey);

  if (!flag) {
    return {
      flag: flagKey,
      user,
      environment,
      enabled: false,
      reason: "FLAG_NOT_FOUND",
    };
  }

  if (flag.killSwitch) {
    return {
      flag: flag.key,
      user,
      environment,
      enabled: false,
      reason: "KILL_SWITCH",
    };
  }
  const environmentConfig = await getEnvironment(flagKey, environment);

  const enabled = environmentConfig?.enabled ?? flag.enabled;

  const rolloutPercentage =
    environmentConfig?.rolloutPercentage ?? flag.rolloutPercentage;

  if (!enabled) {
    return {
      flag: flag.key,
      user,
      environment,
      enabled: false,
      reason: "FLAG_DISABLED",
    };
  }

  const targeted = await checkUserTargeting(flag.key, environment, user);

  if (targeted) {
    return {
      flag: flag.key,
      user,
      environment,
      enabled: true,
      reason: "TARGETED_USER",
    };
  }

  if (rolloutPercentage === 100) {
    return {
      flag: flag.key,
      user,
      environment,
      enabled: true,
      reason: "ROLLOUT_ENABLED",
    };
  }

  if (rolloutPercentage === 0) {
    return {
      flag: flag.key,
      user,
      environment,
      enabled: false,
      reason: "ROLLOUT_DISABLED",
    };
  }

  const bucket = getBucket(user, flag.key);

  if (bucket < rolloutPercentage) {
    return {
      flag: flag.key,
      user,
      environment,
      enabled: true,
      reason: "ROLLOUT_ENABLED",
    };
  }

  return {
    flag: flag.key,
    user,
    environment,
    enabled: false,
    reason: "ROLLOUT_DISABLED",
  };
}
