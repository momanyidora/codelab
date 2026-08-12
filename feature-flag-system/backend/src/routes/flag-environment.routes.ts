import { Router } from "express";

import {
  createEnvironmentController,
  getEnvironmentController,
  setEnvironmentEnabledController,
  setEnvironmentRolloutController,
} from "../controllers/flag-environment.controller.js";

const router = Router();

router.post(
  "/flags/:key/environments/:environment",
  createEnvironmentController,
);

router.get("/flags/:key/environments/:environment", getEnvironmentController);

router.patch(
  "/flags/:key/environments/:environment",
  setEnvironmentEnabledController,
);

router.patch(
  "/flags/:key/environments/:environment/rollout",
  setEnvironmentRolloutController,
);

export default router;
