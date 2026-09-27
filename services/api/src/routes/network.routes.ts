import { Router } from "express";
import { network } from "../controllers/network.controller.js";

const networkRouter = Router();

networkRouter.get("/network", network);

export default networkRouter;
