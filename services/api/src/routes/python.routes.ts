import { Router } from "express";
import { optimize, predict } from "../controllers/python.controller.js";

const pythonRouter = Router();

pythonRouter.post("/predict", predict);
pythonRouter.post("/optimize", optimize);

export default pythonRouter;
