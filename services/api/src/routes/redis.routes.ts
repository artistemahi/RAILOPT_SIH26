import { Router } from "express";
import { testRedis } from "../controllers/redis.controller.js";

const redisRouter = Router();

redisRouter.get("/redis-test", testRedis);

export default redisRouter;
