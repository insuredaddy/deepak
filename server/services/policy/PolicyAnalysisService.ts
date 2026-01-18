import { PolicyAnalysisResult } from "server/core/types/policy.types";
import { SUFFICIENCY_PROMPT } from "../../prompts/sufficiency.prompt";
import { AIProviderFactory } from "../ai/AIProviderFactory";
import { IAIProvider } from "../../core/interfaces/IAIProvider";

export class PolicyAnalysisService {
    private aiProvider: IAIProvider;

    constructor() {
        this.aiProvider = AIProviderFactory.create();
    }

    async analyzePolicySufficiency(
        policyText: string
    ): Promise<PolicyAnalysisResult> {
        const response = await this.aiProvider.generateContent({
            systemPrompt: SUFFICIENCY_PROMPT,
            userPrompt: policyText,
        });

        const analysis = this.parseAndValidate(response.text);
        return this.enforceVerdictRules(analysis);
    }

    private parseAndValidate(text: string): any {
        const cleaned = text.replace(/```json|```/g, "").trim();
        return JSON.parse(cleaned);
    }

    private enforceVerdictRules(analysis: any): PolicyAnalysisResult {
        if (!analysis.metadata?.extractedFields || !analysis.page1) {
            return analysis;
        }

        const { sum_insured } = analysis.metadata.extractedFields;
        const city = analysis.policyholderInfo?.city || "Not mentioned";
        const seriousGaps = analysis.details?.gaps?.serious || [];
        const hasSeriousGaps = seriousGaps.length > 0;

        const metroCities = ["Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Kolkata", "Pune"];
        const tier2Cities = ["Ahmedabad", "Jaipur", "Chandigarh", "Lucknow", "Kochi"];

        const isMetro = metroCities.some(c => city.toLowerCase().includes(c.toLowerCase()));
        const isTier2 = tier2Cities.some(c => city.toLowerCase().includes(c.toLowerCase()));

        const sumInsuredNum = typeof sum_insured === "number"
            ? sum_insured
            : parseFloat(String(sum_insured).replace(/[₹,]/g, ""));

        let enforcedVerdict = analysis.page1.verdict;

        // Rule 1: Insufficient SI
        if ((isMetro && sumInsuredNum < 300000) ||
            (isTier2 && sumInsuredNum < 200000) ||
            (!isMetro && !isTier2 && sumInsuredNum < 200000)) {
            enforcedVerdict = "Insufficient";
        }
        // Rule 2: Serious gaps
        else if (hasSeriousGaps) {
            enforcedVerdict = "Sufficient, with gaps";
        }
        // Rule 3: Sufficient
        else if ((isMetro && sumInsuredNum >= 1000000 && !hasSeriousGaps) ||
            (isTier2 && sumInsuredNum >= 700000 && !hasSeriousGaps) ||
            (!isMetro && !isTier2 && sumInsuredNum >= 700000 && !hasSeriousGaps)) {
            enforcedVerdict = "Sufficient";
        }
        // Rule 4: Default to borderline
        else {
            enforcedVerdict = "Borderline";
        }

        analysis.page1.verdict = enforcedVerdict;
        analysis.metadata.verdictEnforced = true;

        return analysis;
    }
}
