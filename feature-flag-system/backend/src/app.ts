import express from "express";
import cors from "cors";

import flagRoutes from "./routes/flag.routes.js";
import evaluationRoutes from "./routes/evaluation.routes.js";
import flagTargetingRoutes from "./routes/flag-targeting.routes.js";
import flagEnvironmentRoutes from "./routes/flag-environment.routes.js";
import flagHistoryRoutes from "./routes/flag-history.routes.js";

const app = express();

app.use(express.json());
app.use(cors());

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
  });
});

app.use("/flags", flagRoutes);
app.use(evaluationRoutes);
app.use(flagTargetingRoutes);
app.use(flagEnvironmentRoutes);
app.use(flagHistoryRoutes);

export default app;
