import { AIProviderFactory } from "../ai/AIProviderFactory";
import { POLICY_EXTRACTION_PROMPT } from "../../prompts/policy-extraction.prompt";
import { transformRawExtraction } from "./PolicyTransformerService";
import { PolicyExtractionResult } from "../../core/types/policy.types";
import { IAIProvider } from "../../core/interfaces/IAIProvider";

export class PolicyExtractionService {
    private aiProvider: IAIProvider;

    constructor() {
        this.aiProvider = AIProviderFactory.create();
    }

    async extractPolicyData(
        policyText: string,
        fileName: string
    ): Promise<PolicyExtractionResult> {
        const response = await this.aiProvider.generateContent({
            systemPrompt: POLICY_EXTRACTION_PROMPT,
            userPrompt: policyText,
        });

        const rawExtraction = this.parseResponse(response.text);
        const policyData = transformRawExtraction(rawExtraction, fileName);

        return {
            policy_id: policyData.policy_id,
            extracted_data: policyData,
            extraction_metadata: {
                confidence: policyData.extraction_metadata.extraction_confidence,
                missing_fields: policyData.extraction_metadata.missing_fields,
                needs_verification: policyData.extraction_metadata.manual_verification_needed,
            },
        };
    }

    private parseResponse(text: string): any {
        const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) ||
            text.match(/(\{[\s\S]*\})/);
        const jsonText = jsonMatch ? jsonMatch[1] : text;
        return JSON.parse(jsonText);
    }
}
