import { Router } from "express";
import { getApiInformation } from "../controllers/api.controller.js";

export const apiRouter = Router();

apiRouter.get("/", getApiInformation);
