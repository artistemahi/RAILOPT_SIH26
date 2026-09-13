import { Router } from "express";

import { optimize } from "../controllers/python.controller.js";

const pythonRouter = Router();

pythonRouter.post("/optimize", optimize);

export default pythonRouter;