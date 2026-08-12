import { Request, Response } from "express";
import {
  createEnvironment,
  getEnvironment,
  setEnvironmentEnabled,
  setEnvironmentRollout,
} from "../services/flag-environment.service.js";

export async function createEnvironmentController(req: Request, res: Response) {
  try {
    const actorId = req.header("X-Actor-Id");

    if (!actorId) {
      return res.status(400).json({
        error: {
          code: "ACTOR_ID_REQUIRED",
          message: "X-Actor-Id header is required",
        },
      });
    }

    const key = req.params.key as string;
    const environment = req.params.environment as string;

    if (!environment) {
      return res.status(400).json({
        error: {
          code: "ENVIRONMENT_REQUIRED",
          message: "Environment is required",
        },
      });
    }

    const result = await createEnvironment(key, environment);

    if (!result) {
      return res.status(404).json({
        error: {
          code: "FLAG_NOT_FOUND",
          message: `Flag with key "${key}" was not found`,
        },
      });
    }

    return res.status(201).json(result);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Something went wrong",
      },
    });
  }
}

export async function getEnvironmentController(req: Request, res: Response) {
  try {
    const key = req.params.key as string;
    const environment = req.params.environment as string;

    if (!environment) {
      return res.status(400).json({
        error: {
          code: "ENVIRONMENT_REQUIRED",
          message: "Environment is required",
        },
      });
    }

    const result = await getEnvironment(key, environment);

    if (!result) {
      return res.status(404).json({
        error: {
          code: "ENVIRONMENT_NOT_FOUND",
          message: `Environment "${environment}" was not found for flag "${key}"`,
        },
      });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Something went wrong",
      },
    });
  }
}

export async function setEnvironmentEnabledController(
  req: Request,
  res: Response,
) {
  try {
    const actorId = req.header("X-Actor-Id");

    if (!actorId) {
      return res.status(400).json({
        error: {
          code: "ACTOR_ID_REQUIRED",
          message: "X-Actor-Id header is required",
        },
      });
    }

    const key = req.params.key as string;
    const environment = req.params.environment as string;
    const { enabled } = req.body;

    if (!environment) {
      return res.status(400).json({
        error: {
          code: "ENVIRONMENT_REQUIRED",
          message: "Environment is required",
        },
      });
    }

    if (typeof enabled !== "boolean") {
      return res.status(400).json({
        error: {
          code: "INVALID_ENABLED_VALUE",
          message: "enabled must be a boolean",
        },
      });
    }

    const result = await setEnvironmentEnabled(key, environment, enabled);

    return res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message.includes("was not found")) {
      return res.status(404).json({
        error: {
          code: "FLAG_NOT_FOUND",
          message,
        },
      });
    }

    console.error(error);

    return res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message,
      },
    });
  }
}

export async function setEnvironmentRolloutController(
  req: Request,
  res: Response,
) {
  try {
    const actorId = req.header("X-Actor-Id");

    if (!actorId) {
      return res.status(400).json({
        error: {
          code: "ACTOR_ID_REQUIRED",
          message: "X-Actor-Id header is required",
        },
      });
    }

    const key = req.params.key as string;
    const environment = req.params.environment as string;
    const { percentage } = req.body;

    if (!environment) {
      return res.status(400).json({
        error: {
          code: "ENVIRONMENT_REQUIRED",
          message: "Environment is required",
        },
      });
    }

    const result = await setEnvironmentRollout(key, environment, percentage);

    return res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message.includes("between 0 and 100")) {
      return res.status(400).json({
        error: {
          code: "INVALID_ROLLOUT_PERCENTAGE",
          message,
        },
      });
    }

    if (message.includes("was not found")) {
      return res.status(404).json({
        error: {
          code: "FLAG_NOT_FOUND",
          message,
        },
      });
    }

    console.error(error);

    return res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message,
      },
    });
  }
}
