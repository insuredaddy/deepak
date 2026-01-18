export interface AIGenerationConfig {
    temperature?: number;
    topP?: number;
    maxTokens?: number;
    timeout?: number;
}

export interface AIPromptInput {
    systemPrompt?: string;
    userPrompt: string;
    imageData?: {
        data: string;
        mimeType: string;
    };
}

export interface AIResponse {
    text: string;
    rawResponse?: any;
}

export interface IAIProvider {
    generateContent(input: AIPromptInput, config?: AIGenerationConfig): Promise<AIResponse>;
    extractTextFromImage(imageData: Buffer, mimeType: string): Promise<string>;
}
