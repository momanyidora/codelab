import { Router } from "express";
import {
  createFlagController,
  getAllFlagsController,
  getFlagByKeyController,
  setFlagEnabledController,
  setFlagRolloutPercentageController,
} from "../controllers/flag.controller.js";

const router = Router();
router.post("/", createFlagController);
router.get("/", getAllFlagsController);
router.get("/:key", getFlagByKeyController);

router.patch("/:key", setFlagEnabledController)
router.patch("/:key/rollout", setFlagRolloutPercentageController)

export default router