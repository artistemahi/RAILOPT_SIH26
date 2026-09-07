import { Router } from "express";
import { testMinio } from "../controllers/minio.controller.js";

const minioRouter = Router();

minioRouter.get("/minio-test", testMinio);

export default minioRouter;
