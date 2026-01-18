import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import fs from "fs";
import { AIProviderFactory } from "../ai/AIProviderFactory";
import { IAIProvider } from "server/core/interfaces/IAIProvider";

export class FileService {
    private aiProvider: IAIProvider;

    constructor() {
        this.aiProvider = AIProviderFactory.create();
    }

    async extractText(file: Express.Multer.File): Promise<string> {
        const mimeType = file.mimetype;

        if (mimeType.includes("pdf")) {
            return this.extractFromPDF(file.path);
        }

        if (mimeType.startsWith("image/")) {
            return this.extractFromImage(file);
        }

        if (mimeType === "text/plain") {
            return this.extractFromText(file.path);
        }

        throw new Error(`Unsupported file type: ${mimeType}`);
    }

    private async extractFromPDF(filePath: string): Promise<string> {
        const data = new Uint8Array(fs.readFileSync(filePath));
        const pdf = await pdfjs.getDocument({ data }).promise;

        let text = "";
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            text += content.items.map((item: any) => item.str).join(" ") + "\n";
        }

        return text;
    }

    private async extractFromImage(file: Express.Multer.File): Promise<string> {
        const buffer = fs.readFileSync(file.path);
        return this.aiProvider.extractTextFromImage(buffer, file.mimetype);
    }

    private async extractFromText(filePath: string): Promise<string> {
        return fs.readFileSync(filePath, "utf-8");
    }

    cleanup(filePath: string): void {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
}
