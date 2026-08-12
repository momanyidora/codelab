import express from "express";
import flagRoutes from "./routes/flag.routes.js";
import evaluationRoutes from "./routes/evaluation.routes.js";
import flagTargetingRoutes from "./routes/flag-targeting.routes.js";
import flagEnvironmentRoutes from "./routes/flag-environment.routes.js";

const app = express();

app.use(express.json());
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
  });
});

app.use("/flags", flagRoutes);
app.use(evaluationRoutes);
app.use(flagTargetingRoutes);
app.use(flagEnvironmentRoutes);

export default app;
