import { Request, Response } from "express";
import { FileService } from "../services/file/FileService";
import { PolicyAnalysisService } from "../services/policy/PolicyAnalysisService";

export class AnalysisController {
    private fileService: FileService;
    private analysisService: PolicyAnalysisService;

    constructor() {
        this.fileService = new FileService();
        this.analysisService = new PolicyAnalysisService();
    }

    analyzePolicy = async (req: Request, res: Response) => {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        try {
            const policyText = await this.fileService.extractText(req.file);
            this.fileService.cleanup(req.file.path);

            if (!policyText.trim()) {
                return res.status(400).json({ error: "No text extracted from file" });
            }

            const analysis = await this.analysisService.analyzePolicySufficiency(policyText);

            return res.json(analysis);
        } catch (err: any) {
            this.fileService.cleanup(req.file.path);
            throw err;
        }
    };
}
