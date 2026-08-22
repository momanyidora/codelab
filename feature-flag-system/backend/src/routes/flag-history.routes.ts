import { Router } from "express";
import { getFlagHistoryController } from "../controllers/flag-history.controller.js";

const router = Router();
router.get("/flags/:key/history", getFlagHistoryController);
export default router;
