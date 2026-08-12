import {
  addTargetedUser,
  getTargetedUsers,
  isUserTargeted,
  removeTargetedUser,
} from "../repositories/flag-targeting.repository.js";

export async function addUserToTargeting(
  flagKey: string,
  environment: string,
  userId: string,
  actorId: string,
) {
  if (!actorId) {
    throw new Error("ACTOR_ID_REQUIRED");
  }

  if (!environment) {
    throw new Error("ENVIRONMENT_REQUIRED");
  }

  if (!userId) {
    throw new Error("USER_ID_REQUIRED");
  }

  const result = await addTargetedUser(flagKey, environment, userId);

  if (!result) {
    throw new Error("FLAG_NOT_FOUND");
  }

  return result;
}

export async function removeUserFromTargeting(
  flagKey: string,
  environment: string,
  userId: string,
  actorId: string,
) {
  if (!actorId) {
    throw new Error("ACTOR_ID_REQUIRED");
  }

  if (!environment) {
    throw new Error("ENVIRONMENT_REQUIRED");
  }

  if (!userId) {
    throw new Error("USER_ID_REQUIRED");
  }

  const result = await removeTargetedUser(flagKey, environment, userId);

  if (result.type === "FLAG_NOT_FOUND") {
    throw new Error("FLAG_NOT_FOUND");
  }

  if (result.type === "TARGETING_NOT_FOUND") {
    throw new Error("TARGETING_NOT_FOUND");
  }

  return result.data;
}
export async function listTargetedUsers(flagKey: string, environment: string) {
  if (!environment) {
    throw new Error("ENVIRONMENT_REQUIRED");
  }

  const users = await getTargetedUsers(flagKey, environment);

  if (users === null) {
    throw new Error("FLAG_NOT_FOUND");
  }

  return users;
}

export async function checkUserTargeting(
  flagKey: string,
  environment: string,
  userId: string,
) {
  if (!environment) {
    throw new Error("ENVIRONMENT_REQUIRED");
  }

  if (!userId) {
    throw new Error("USER_ID_REQUIRED");
  }

  return await isUserTargeted(flagKey, environment, userId);
}
