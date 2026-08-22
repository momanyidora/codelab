import { Request, Response } from "express";
import { getFlagHistory } from "../services/flag-history.service.js";

export async function getFlagHistoryController(req: Request, res: Response) {
  try {
    const key = req.params.key as string;

    if (!key) {
      return res.status(400).json({
        error: {
          code: "INVALID_REQUEST",
          message: "Flag key is required",
        },
      });
    }

    const history = await getFlagHistory(key);

    return res.status(200).json(history);
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
