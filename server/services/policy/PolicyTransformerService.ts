import { randomUUID } from "crypto";
import type { RawPolicyExtraction, PolicyData, EvidenceBasedField } from "../../core/types/policy.types";

/**
 * Helper to extract numeric value from evidence-based field
 */
function extractNumber(value: string): number {
    if (!value || value === "") return 0;
    // Extract numbers from strings like "₹10,00,000" or "10 lakhs" or "10L"
    const cleaned = value.replace(/[₹,\s]/g, "").toLowerCase();
    const lakhMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*l(?:akhs?)?/);
    const croreMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*c(?:rores?)?/);
    const numberMatch = cleaned.match(/(\d+(?:\.\d+)?)/);

    if (croreMatch) {
        return Math.round(parseFloat(croreMatch[1]) * 10000000);
    } else if (lakhMatch) {
        return Math.round(parseFloat(lakhMatch[1]) * 100000);
    } else if (numberMatch) {
        return Math.round(parseFloat(numberMatch[1]));
    }
    return 0;
}

/**
 * Helper to extract months from waiting period text
 */
function extractMonths(value: string): number {
    if (!value || value === "") return 0;
    const cleaned = value.toLowerCase();
    const yearMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*years?/);
    const monthMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*months?/);
    const dayMatch = cleaned.match(/(\d+)\s*days?/);

    if (yearMatch) {
        return Math.round(parseFloat(yearMatch[1]) * 12);
    } else if (monthMatch) {
        return Math.round(parseFloat(monthMatch[1]));
    } else if (dayMatch) {
        return Math.round(parseInt(dayMatch[1]) / 30);
    }
    return 0;
}

/**
 * Helper to extract days from text
 */
function extractDays(value: string): number {
    if (!value || value === "") return 0;
    const cleaned = value.toLowerCase();
    const dayMatch = cleaned.match(/(\d+)\s*days?/);
    if (dayMatch) {
        return parseInt(dayMatch[1]);
    }
    return 0;
}

/**
 * Check if field indicates "unlimited" or "any"
 */
function isUnlimited(value: string): boolean {
    if (!value) return false;
    const lower = value.toLowerCase();
    return lower.includes("unlimited") ||
        lower.includes("any") ||
        lower.includes("no limit") ||
        lower.includes("not restricted");
}

/**
 * Check if field indicates coverage is available
 */
function isCovered(field: EvidenceBasedField): boolean {
    return field.status === "explicit" &&
        !field.value.toLowerCase().includes("not covered") &&
        !field.value.toLowerCase().includes("excluded");
}

/**
 * Transforms evidence-based Gemini extraction into full PolicyData structure
 */
export function transformRawExtraction(
    raw: RawPolicyExtraction,
    fileName: string
): PolicyData {
    const policyId = randomUUID();
    const now = new Date().toISOString();

    // Helper to format currency
    const formatCurrency = (amount: number): string => {
        if (amount >= 10000000) {
            return `₹${(amount / 10000000).toFixed(1)}Cr`;
        } else if (amount >= 100000) {
            return `₹${(amount / 100000).toFixed(1)}L`;
        } else {
            return `₹${amount.toLocaleString("en-IN")}`;
        }
    };

    // Extract base SI and premium
    const baseSI = extractNumber(raw.coverage.sum_insured.value);
    const annualPremium = raw.coverage.annual_premium
        ? extractNumber(raw.coverage.annual_premium.value)
        : 0;

    // Transform room rent
    const roomRentValue = raw.coverage.room_rent.value;
    const roomRentUnlimited = isUnlimited(roomRentValue) || raw.coverage.room_rent.value.toLowerCase().includes("any room");
    const roomRentAmount = roomRentUnlimited ? 0 : extractNumber(roomRentValue);

    const roomRent = roomRentUnlimited
        ? {
            type: "unlimited" as const,
            amount: null,
            currency: "INR",
            percent_of_si: null,
            display: "Any Room / Unlimited",
            unlimited: true,
            capped_at: null,
        }
        : roomRentAmount > 0
            ? {
                type: "daily_limit" as const,
                amount: roomRentAmount,
                currency: "INR",
                percent_of_si: null,
                display: `₹${roomRentAmount.toLocaleString("en-IN")}/day`,
                unlimited: false,
                capped_at: roomRentAmount * 10,
            }
            : {
                type: "daily_limit" as const,
                amount: null,
                currency: "INR",
                percent_of_si: null,
                display: raw.coverage.room_rent.status === "not_mentioned" ? "Not specified" : "Not covered",
                unlimited: false,
                capped_at: null,
            };

    // Transform co-pay - check evidence for co-pay mentions
    const copayPercent = 0; // Extract from evidence if mentioned
    const copay = copayPercent > 0
        ? {
            exists: true,
            type: "all_claims" as const,
            percent: copayPercent,
            flat_amount: null,
            note: `${copayPercent}% co-pay`,
            applies_to: [],
        }
        : {
            exists: false,
            type: null,
            percent: null,
            flat_amount: null,
            note: "No co-pay",
            applies_to: [],
        };

    // Transform sub-limits
    const subLimits: PolicyData["sub_limits"] = {
        cancer: {
            capped: false,
            limit_amount: null,
            display: "Unlimited",
            unlimited: true,
        },
        cardiac: {
            capped: false,
            limit_amount: null,
            display: "Unlimited",
            unlimited: true,
        },
        organ_transplant: {
            capped: false,
            limit_amount: null,
            display: "Unlimited",
            unlimited: true,
        },
        dialysis: {
            capped: false,
            limit_amount: null,
            display: "Unlimited",
            unlimited: true,
        },
        orthopedic_implants: {
            capped: false,
            limit_amount: null,
            display: "Unlimited",
            unlimited: true,
        },
        icu_charges: {
            capped: false,
            limit_amount: null,
            display: raw.coverage.icu_charges.status === "not_mentioned" ? "Not specified" : "Unlimited",
            unlimited: true,
        },
        other_major: {},
    };

    // Process disease-specific limits
    if (raw.sub_limits.disease_specific_limits) {
        raw.sub_limits.disease_specific_limits.forEach((limit) => {
            const condition = limit.condition.toLowerCase();
            const limitAmount = extractNumber(limit.limit);

            if (condition.includes("cancer")) {
                subLimits.cancer = {
                    capped: limitAmount > 0,
                    limit_amount: limitAmount > 0 ? limitAmount : null,
                    display: limitAmount > 0 ? formatCurrency(limitAmount) : "Unlimited",
                    unlimited: limitAmount === 0,
                };
            } else if (condition.includes("cardiac") || condition.includes("heart")) {
                subLimits.cardiac = {
                    capped: limitAmount > 0,
                    limit_amount: limitAmount > 0 ? limitAmount : null,
                    display: limitAmount > 0 ? formatCurrency(limitAmount) : "Unlimited",
                    unlimited: limitAmount === 0,
                };
            }
            // Add other conditions as needed
        });
    }

    // Transform waiting periods
    const monthsToDays = (months: number) => months * 30.44;
    const generalWaiting = extractMonths(raw.waiting_periods.general.value);
    const preExistingWaiting = extractMonths(raw.waiting_periods.pre_existing_disease.value);

    const waitingPeriods: PolicyData["waiting_periods"] = {
        general_waiting_period: {
            days: Math.round(monthsToDays(generalWaiting || 1)),
            months: generalWaiting || 1,
            note: "Standard waiting period for initial enrollment",
        },
        specific_diseases: {},
        pre_existing_disease: {
            days: Math.round(monthsToDays(preExistingWaiting || 36)),
            months: preExistingWaiting || 36,
            note: "Pre-existing conditions have separate waiting period",
            can_be_waived: false,
        },
    };

    // Process specific ailments
    if (raw.waiting_periods.specific_ailments) {
        raw.waiting_periods.specific_ailments.forEach((ailment) => {
            if (ailment.status === "explicit") {
                const months = extractMonths(ailment.value);
                const key = ailment.condition.toLowerCase().replace(/\s+/g, "_");
                waitingPeriods.specific_diseases[key] = {
                    months,
                    days: Math.round(monthsToDays(months)),
                    covered: true,
                };
            }
        });
    }

    // Transform coverage details
    const preHospDays = extractDays(raw.coverage.pre_hospitalization.value);
    const postHospDays = extractDays(raw.coverage.post_hospitalization.value);
    const domiciliaryLimit = extractNumber(raw.coverage.domiciliary_hospitalization.value);

    const coverageDetails: PolicyData["coverage_details"] = {
        hospitalization: {
            covered: isCovered(raw.coverage.sum_insured),
            note: "In-patient hospitalization coverage",
        },
        pre_hospitalization: {
            covered: isCovered(raw.coverage.pre_hospitalization),
            days_before_admission: preHospDays,
            display: preHospDays > 0 ? `${preHospDays} days before admission` : "Not covered",
        },
        post_hospitalization: {
            covered: isCovered(raw.coverage.post_hospitalization),
            days_after_discharge: postHospDays,
            display: postHospDays > 0 ? `${postHospDays} days after discharge` : "Not covered",
        },
        domiciliary_care: {
            covered: isCovered(raw.coverage.domiciliary_hospitalization),
            limit_type: domiciliaryLimit > 0 ? "fixed_amount" : "percentage_of_si",
            limit_amount: domiciliaryLimit > 0 ? domiciliaryLimit : 0,
            limit_percent: domiciliaryLimit === 0 && isCovered(raw.coverage.domiciliary_hospitalization) ? 10 : 0,
            display: domiciliaryLimit > 0
                ? formatCurrency(domiciliaryLimit)
                : isCovered(raw.coverage.domiciliary_hospitalization)
                    ? "10% of SI (standard)"
                    : "Not covered",
            minimum_hospitalization_days: 3,
            note: "When hospitalization not possible at home",
        },
        daycare_procedures: {
            covered: isCovered(raw.coverage.daycare_procedures),
            note: isCovered(raw.coverage.daycare_procedures)
                ? "Includes cataract, hernia, piles, arthroscopy etc."
                : "Not covered",
            examples: isCovered(raw.coverage.daycare_procedures)
                ? ["Cataract surgery", "Hernia repair", "Piles treatment"]
                : [],
        },
        opd: {
            covered: false,
            limit: null,
            note: "Out-patient treatment not covered",
        },
        consultation_charges: {
            covered: false,
            note: "Doctor consultation only during hospitalization",
        },
        diagnostic_tests: {
            covered: true,
            note: "Pre and post-hospitalization diagnostic tests covered",
            limit: "Within hospitalization limit",
        },
        pathology_radiology: {
            covered: true,
            note: "Covered if related to hospitalization",
        },
    };

    // Transform riders
    const riders: PolicyData["riders"] = {
        critical_illness: {
            available: isCovered(raw.riders.critical_illness),
            base_premium_addition: 0,
            base_premium_addition_display: "₹0",
            total_premium_with_rider: annualPremium,
            coverage_amount: isCovered(raw.riders.critical_illness) ? extractNumber(raw.riders.critical_illness.value) : 0,
            coverage_display: isCovered(raw.riders.critical_illness)
                ? formatCurrency(extractNumber(raw.riders.critical_illness.value))
                : "Not available",
            diseases_covered: [],
        },
        personal_accident: {
            available: isCovered(raw.riders.personal_accident),
            base_premium_addition: 0,
            base_premium_addition_display: "₹0",
            total_premium_with_rider: annualPremium,
            coverage_amount: isCovered(raw.riders.personal_accident) ? extractNumber(raw.riders.personal_accident.value) : 0,
            coverage_display: isCovered(raw.riders.personal_accident)
                ? formatCurrency(extractNumber(raw.riders.personal_accident.value))
                : "Not available",
            covers: [],
        },
        maternity: {
            available: isCovered(raw.riders.maternity),
            base_premium_addition: 0,
            base_premium_addition_display: "₹0",
            total_premium_with_rider: annualPremium,
            waiting_period_months: isCovered(raw.riders.maternity) ? extractMonths(raw.riders.maternity.value) : 0,
            coverage_amount: isCovered(raw.riders.maternity) ? extractNumber(raw.riders.maternity.value) : 0,
            coverage_display: isCovered(raw.riders.maternity)
                ? formatCurrency(extractNumber(raw.riders.maternity.value))
                : "Not available",
            covers: [],
        },
        accidental_hospitalization: {
            available: false,
            note: "Not offered with this plan",
        },
        dental: {
            available: false,
            note: "Not offered with this plan",
        },
    };

    // Transform restoration
    const restorationValue = raw.restoration.value.toLowerCase();
    const restorationType = restorationValue.includes("unlimited")
        ? "unlimited"
        : restorationValue.includes("limited") || restorationValue.includes("once")
            ? "limited"
            : raw.restoration.status === "explicit"
                ? "limited"
                : null;

    const restoration: PolicyData["restoration"] = {
        type: restorationType,
        note: raw.restoration.status === "explicit" ? raw.restoration.value : "Not specified",
        times_per_year: restorationType === "unlimited" ? 999 : restorationType === "limited" ? 1 : 0,
        cost: "Premium basis",
        automatic: true,
        example: restorationType === "unlimited"
            ? "SI can be restored unlimited times per claim year"
            : restorationType === "limited"
                ? "SI can be restored once per claim year"
                : "No restoration benefit",
    };

    // Transform network
    const networkCount = extractNumber(raw.network.cashless_hospitals.value);
    const network: PolicyData["network"] = {
        hospital_network_count: {
            total: networkCount,
            note: networkCount > 0 ? "Pan-India network" : "Not specified",
            international: false,
        },
        cashless_available: raw.network.cashless_hospitals.status === "explicit",
        third_party_administrator: "",
        tpa_contact: {
            phone: "",
            email: "",
            website: "",
            helpline_24_7: false,
        },
    };

    // Transform exclusions
    const exclusions: PolicyData["exclusions"] = {
        major_exclusions: raw.exclusions.explicit_exclusions || [],
        conditions_not_covered: [],
        pre_existing_exclusion: {
            applies: raw.waiting_periods.pre_existing_disease.status === "explicit",
            waiting_period_months: preExistingWaiting || 36,
            note: raw.waiting_periods.pre_existing_disease.status === "explicit"
                ? "Pre-existing conditions excluded for waiting period"
                : "Not specified",
        },
    };

    return {
        policy_id: policyId,
        upload_date: now,
        file_name: fileName,
        extraction_metadata: {
            extracted_by: "gemini-3-pro-evidence-based",
            extraction_confidence: raw.policy_metadata.extraction_confidence,
            extraction_timestamp: now,
            missing_fields: [],
            manual_verification_needed: raw.policy_metadata.extraction_confidence < 0.7,
            extraction_notes: raw.notes || "Evidence-based extraction with document quotes",
        },
        basic_info: {
            insurer: raw.policy_metadata.insurer,
            plan_name: raw.policy_metadata.policy_name,
            plan_code: undefined,
            policy_type: "Individual Health Insurance",
            inception_date: raw.policy_metadata.policy_date || null,
            expiry_date: null,
        },
        coverage: {
            base_si: {
                amount: baseSI,
                currency: "INR",
                display: formatCurrency(baseSI),
            },
            annual_premium: {
                amount: annualPremium || 0,
                currency: "INR",
                display: annualPremium > 0 ? `₹${annualPremium.toLocaleString("en-IN")}/year` : "Not specified",
                premium_per_month: annualPremium > 0 ? annualPremium / 12 : 0,
            },
            room_rent: roomRent,
            copay: copay,
            deductible: {
                exists: false,
                amount: null,
                note: "No deductible",
            },
        },
        sub_limits: subLimits,
        waiting_periods: waitingPeriods,
        coverage_details: coverageDetails,
        riders,
        exclusions,
        restoration,
        network,
        claim_process: undefined,
        irdai_updates: undefined,
        user_ratings: {
            covered: false,
            note: "Ratings not included",
        },
        additional_info: {
            policy_link: undefined,
            download_brochure: undefined,
            faq_link: undefined,
            source: raw.policy_metadata.document_source || "User uploaded PDF",
            verified: false,
            verified_by: null,
            verification_date: null,
        },
    };
}
