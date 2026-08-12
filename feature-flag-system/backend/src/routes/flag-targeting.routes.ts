import { Router } from "express";
import {
  addTargetedUserController,
  listTargetedUsersController,
  removeTargetedUserController,
} from "../controllers/flag-targeting.controller.js";

const router = Router();

router.post(
  "/flags/:key/environments/:environment/targeting/:userId",
  addTargetedUserController,
);

router.delete(
  "/flags/:key/environments/:environment/targeting/:userId",
  removeTargetedUserController,
);

router.get(
  "/flags/:key/environments/:environment/targeting",
  listTargetedUsersController,
);

router.post("/flags/:key/targeting/:userId", addTargetedUserController);
router.delete("/flags/:key/targeting/:userId", removeTargetedUserController);
router.get("/flags/:key/targeting", listTargetedUsersController);

export default router;
