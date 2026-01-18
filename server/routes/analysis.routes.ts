import { Router } from "express";
import { AnalysisController } from "../controllers/AnalysisController";
import { uploadMiddleware } from "../middleware/upload.middleware";

export const analysisRoutes = Router();
const controller = new AnalysisController();

analysisRoutes.post(
    "/",
    uploadMiddleware.single("file"),
    controller.analyzePolicy
);
