import { Router } from "express";
import { PolicyController } from "../controllers/PolicyController";
import { uploadMiddleware } from "../middleware/upload.middleware";

export const policyRoutes = Router();
const controller = new PolicyController();

policyRoutes.post(
    "/extract",
    uploadMiddleware.single("policy_pdf"),
    controller.extractPolicy
);
