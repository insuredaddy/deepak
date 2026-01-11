import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "../../config";
import { AIGenerationConfig, AIPromptInput, AIResponse, IAIProvider } from "../../core/interfaces/IAIProvider"

class GeminiProvider implements IAIProvider {
    private client: GoogleGenerativeAI;
    private modelName: string;

    constructor(apiKey: string, modelName: string) {
        this.client = new GoogleGenerativeAI(apiKey);
        this.modelName = modelName;
    }

    async generateContent(
        input: AIPromptInput,
        genConfig?: AIGenerationConfig
    ): Promise<AIResponse> {
        const model = this.client.getGenerativeModel({
            model: this.modelName,
            generationConfig: {
                temperature: genConfig?.temperature ?? 0,
                topP: genConfig?.topP ?? 0.95,
            },
        });

        const parts: any[] = [];

        if (input.systemPrompt) {
            parts.push({ text: input.systemPrompt + "\n\n" + input.userPrompt });
        } else {
            parts.push({ text: input.userPrompt });
        }

        if (input.imageData) {
            parts.push({
                inlineData: {
                    data: input.imageData.data,
                    mimeType: input.imageData.mimeType,
                },
            });
        }

        const timeout = genConfig?.timeout || config.ai.gemini.timeout;
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error("AI request timeout")), timeout);
        });

        const result = await Promise.race([
            model.generateContent({ contents: [{ role: "user", parts }] }),
            timeoutPromise,
        ]);

        return {
            text: result.response.text(),
            rawResponse: result,
        };
    }

    async extractTextFromImage(imageData: Buffer, mimeType: string): Promise<string> {
        const response = await this.generateContent({
            userPrompt: "Transcribe all readable text from this insurance policy image. Return plain text only. No formatting. No summaries.",
            imageData: {
                data: imageData.toString("base64"),
                mimeType,
            },
        });

        return response.text;
    }
}

export class AIProviderFactory {
    static create(providerName?: string): IAIProvider {
        const provider = providerName || config.ai.provider;

        switch (provider) {
            case "gemini":
                if (!config.ai.gemini.apiKey) {
                    throw new Error("GEMINI_API_KEY not configured");
                }
                return new GeminiProvider(
                    config.ai.gemini.apiKey,
                    config.ai.gemini.model
                );

            // Future: Add other providers
            // case "openai":
            //   return new OpenAIProvider(...);

            default:
                throw new Error(`Unsupported AI provider: ${provider}`);
        }
    }
}
