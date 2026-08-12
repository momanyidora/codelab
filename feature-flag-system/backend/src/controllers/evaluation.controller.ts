import { Request, Response } from "express";
import { evaluateFlag } from "../services/evaluation.service.js";

const DEFAULT_ENVIRONMENT = "staging";

export async function evaluateFlagController(req: Request, res: Response) {
  try {
    const flag = req.query.flag;
    const user = req.query.user;
    const environment =
      typeof req.query.environment === "string"
        ? req.query.environment
        : DEFAULT_ENVIRONMENT;

    if (typeof flag !== "string" || typeof user !== "string") {
      return res.status(400).json({
        error: {
          code: "INVALID_REQUEST",
          message: "flag and user query parameters are required",
        },
      });
    }

    const result = await evaluateFlag(flag, user, environment);

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
