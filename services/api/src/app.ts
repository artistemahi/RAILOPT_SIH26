import cors from "cors";
import express from "express";
import { config } from "./config/env.js";
import { getPythonServiceDirectory } from "./integrations/python-services.integration.js";
import { apiRouter } from "./routes/api.routes.js";
import { healthRouter } from "./routes/health.routes.js";

export const app = express();

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

app.locals.pythonServices = getPythonServiceDirectory();

app.use("/api", apiRouter);
app.use(healthRouter);
