import { Request, Response } from "express";
import { FileService } from "server/services/file/FileService";
import { PolicyExtractionService } from "server/services/policy/PolicyExtractionService";

export class PolicyController {
    private fileService: FileService;
    private extractionService: PolicyExtractionService;

    constructor() {
        this.fileService = new FileService();
        this.extractionService = new PolicyExtractionService();
    }

    extractPolicy = async (req: Request, res: Response) => {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        try {
            const policyText = await this.fileService.extractText(req.file);
            this.fileService.cleanup(req.file.path);

            if (!policyText.trim()) {
                return res.status(400).json({ error: "No text extracted from file" });
            }

            const result = await this.extractionService.extractPolicyData(
                policyText,
                req.file.originalname
            );

            return res.json(result);
        } catch (err: any) {
            this.fileService.cleanup(req.file.path);
            throw err;
        }
    };
}
