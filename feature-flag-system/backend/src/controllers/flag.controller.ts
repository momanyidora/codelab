import { Request, Response } from "express";
import {
  createFlagService,
  getAllFlagsService,
  getFlagByKeyService,
  setFlagEnabled,
  setFlagRolloutPercentageService,
  setFlagKillSwitch,
} from "../services/flag.service.js";

export async function createFlagController(req: Request, res: Response) {
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

    const { key, description } = req.body;

    if (!key || !description) {
      return res.status(400).json({
        error: {
          code: "INVALID_REQUEST",
          message: "key and description are required",
        },
      });
    }

    const flag = await createFlagService(key, description, actorId);

    return res.status(201).json(flag);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Flag with key")) {
      return res.status(409).json({
        error: {
          code: "DUPLICATE_FLAG",
          message: error.message,
        },
      });
    }

    console.error(error);

    return res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Something went wrong",
      },
    });
  }
}

export async function getAllFlagsController(_req: Request, res: Response) {
  try {
    const flags = await getAllFlagsService();

    return res.status(200).json(flags);
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

export async function getFlagByKeyController(req: Request, res: Response) {
  try {
    const key = req.params.key;

    if (typeof key !== "string") {
      return res.status(400).json({
        error: {
          code: "INVALID_REQUEST",
          message: "Flag key must be a string",
        },
      });
    }

    const flag = await getFlagByKeyService(key);

    if (!flag) {
      return res.status(404).json({
        error: {
          code: "FLAG_NOT_FOUND",
          message: `Flag with key "${key}" was not found`,
        },
      });
    }

    return res.status(200).json(flag);
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

export async function setFlagEnabledController(req: Request, res: Response) {
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

    const key = req.params.key;

    if (typeof key !== "string") {
      return res.status(400).json({
        error: {
          code: "INVALID_REQUEST",
          message: "Flag key must be a string",
        },
      });
    }

    const { enabled } = req.body;

    if (typeof enabled !== "boolean") {
      return res.status(400).json({
        error: {
          code: "INVALID_ENABLED_VALUE",
          message: "enabled must be a boolean",
        },
      });
    }

    const flag = await setFlagEnabled(key, enabled, actorId);

    return res.status(200).json(flag);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Flag with key")) {
      return res.status(404).json({
        error: {
          code: "FLAG_NOT_FOUND",
          message: error.message,
        },
      });
    }

    console.error(error);

    return res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Something went wrong",
      },
    });
  }
}
export async function setFlagRolloutPercentageController(
  req: Request,
  res: Response,
) {
  try {
    const actorId = req.header("X-Actor-Id");

    if (!actorId) {
      return res.status(400).json({
        error: {
          code: "MISSING_ACTOR",
          message: "X-Actor-Id header is required",
        },
      });
    }

    const key = req.params.key;

    if (typeof key !== "string") {
      return res.status(400).json({
        error: {
          code: "INVALID_REQUEST",
          message: "Flag key must be a string",
        },
      });
    }

    const { percentage } = req.body;

    const flag = await setFlagRolloutPercentageService(
      key,
      percentage,
      actorId,
    );

    return res.status(200).json(flag);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message.includes("Rollout percentage must be between 0 and 100")) {
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

export async function setFlagKillSwitchController(req: Request, res: Response) {
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

    const key = req.params.key;

    if (typeof key !== "string") {
      return res.status(400).json({
        error: {
          code: "INVALID_REQUEST",
          message: "Flag key must be a string",
        },
      });
    }

    const { enabled } = req.body;

    if (typeof enabled !== "boolean") {
      return res.status(400).json({
        error: {
          code: "INVALID_KILL_SWITCH_VALUE",
          message: "enabled must be a boolean",
        },
      });
    }

    const flag = await setFlagKillSwitch(key, enabled, actorId);

    return res.status(200).json(flag);
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
        message: "Something went wrong",
      },
    });
  }
}