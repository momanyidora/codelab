import { Router } from "express";
import {
  createFlagController,
  getAllFlagsController,
  getFlagByKeyController,
  setFlagEnabledController,
  setFlagRolloutPercentageController,
  setFlagKillSwitchController,
} from "../controllers/flag.controller.js";

const router = Router();
router.post("/", createFlagController);
router.get("/", getAllFlagsController);
router.get("/:key", getFlagByKeyController);

router.patch("/:key", setFlagEnabledController);
router.patch("/:key/rollout", setFlagRolloutPercentageController);
router.patch("/:key/kill-switch", setFlagKillSwitchController);
export default router;
