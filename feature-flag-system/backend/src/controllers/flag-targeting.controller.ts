import { Request, Response } from "express";
import {
  addUserToTargeting,
  listTargetedUsers,
  removeUserFromTargeting,
} from "../services/flag-targeting.service.js";

const DEFAULT_ENVIRONMENT = "staging";

export async function addTargetedUserController(req: Request, res: Response) {
  try {
    const key = req.params.key as string;
    const userId = req.params.userId as string;
    const environment =
      (req.params.environment as string | undefined) ?? DEFAULT_ENVIRONMENT;
    const actorId = req.header("X-Actor-Id");

    if (!actorId) {
      return res.status(400).json({
        error: {
          code: "ACTOR_ID_REQUIRED",
          message: "X-Actor-Id header is required",
        },
      });
    }

    const result = await addUserToTargeting(key, environment, userId, actorId);
    return res.status(201).json({
      flag: key,
      environment,
      userId,
      targeting: result,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "FLAG_NOT_FOUND") {
        return res.status(404).json({
          error: {
            code: "FLAG_NOT_FOUND",
            message: `Flag with key "${req.params.key}" was not found`,
          },
        });
      }

      if (error.message === "ENVIRONMENT_REQUIRED") {
        return res.status(400).json({
          error: {
            code: "ENVIRONMENT_REQUIRED",
            message: "Environment is required",
          },
        });
      }

      if (error.message === "USER_ID_REQUIRED") {
        return res.status(400).json({
          error: {
            code: "USER_ID_REQUIRED",
            message: "User ID is required",
          },
        });
      }
    }

    console.error(error);
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to add targeted user",
      },
    });
  }
}

export async function removeTargetedUserController(
  req: Request,
  res: Response,
) {
  try {
    const key = req.params.key as string;
    const userId = req.params.userId as string;
    const environment =
      (req.params.environment as string | undefined) ?? DEFAULT_ENVIRONMENT;
    const actorId = req.header("X-Actor-Id");

    if (!actorId) {
      return res.status(400).json({
        error: {
          code: "ACTOR_ID_REQUIRED",
          message: "X-Actor-Id header is required",
        },
      });
    }

    await removeUserFromTargeting(key, environment, userId, actorId);
    return res.status(204).send();
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "FLAG_NOT_FOUND") {
        return res.status(404).json({
          error: {
            code: "FLAG_NOT_FOUND",
            message: `Flag with key "${req.params.key}" was not found`,
          },
        });
      }

      if (error.message === "TARGETING_NOT_FOUND") {
        return res.status(404).json({
          error: {
            code: "TARGETING_NOT_FOUND",
            message: `User "${req.params.userId}" is not targeted by flag "${req.params.key}"`,
          },
        });
      }
    }

    console.error(error);

    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to remove targeted user",
      },
    });
  }
}

export async function listTargetedUsersController(req: Request, res: Response) {
  try {
    const key = req.params.key as string;

    const environment =
      (req.params.environment as string | undefined) ?? DEFAULT_ENVIRONMENT;

    const users = await listTargetedUsers(key, environment);

    return res.status(200).json({
      flag: key,
      environment,
      users,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "FLAG_NOT_FOUND") {
      return res.status(404).json({
        error: {
          code: "FLAG_NOT_FOUND",
          message: `Flag with key "${req.params.key}" was not found`,
        },
      });
    }

    console.error(error);

    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to list targeted users",
      },
    });
  }
}
