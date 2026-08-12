import { Router } from "express";
import { evaluateFlagController } from "../controllers/evaluation.controller.js";

const router = Router();

router.get("/evaluate", evaluateFlagController);

export default router;
