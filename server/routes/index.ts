import { Router } from "express";
import { analysisRoutes } from "./analysis.routes";
import { policyRoutes } from "./policy.routes";

export const apiRouter = Router();

apiRouter.use("/analyze", analysisRoutes);
apiRouter.use("/policy", policyRoutes);
