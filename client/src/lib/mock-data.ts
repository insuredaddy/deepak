import { AnalysisResponse } from "./types";

export const mockReport: AnalysisResponse = {
  id: "sample",
  page1: {
    verdict: "Sufficient, with gaps",
    asOf: "As of today, based on age 32 and city Mumbai.",
    why: "₹10L base with restoration covers most single admissions today.\nRoom rent linkage can reduce payouts if you upgrade rooms.\nConsumables are excluded, creating 5–10% out-of-pocket risk.",
    coveredFor: [
      "₹10L cover with 100% restoration after first claim",
      "Pre (60) and post (180) hospitalization included",
      "No co-pay on network hospitalizations",
    ],
    whereItHurts: [
      "Room rent capped at Single Private Room; upgrades trigger proportionate deduction",
      "Consumables (PPE, gloves) excluded; expect ₹2k–₹10k per admission",
    ],
    costContext: [
      "Routine admission (appendix): ₹80k–₹1.5L in Mumbai",
      "Major surgery (cardiac): ₹3L–₹8L depending on room choice",
      "Critical care with ICU: ₹5L–₹15L (restoration applies after first claim)",
    ],
  },
  details: {
    policySummary: [
      "Sum insured: ₹10,00,000",
      "Room rent: Single Private Room",
      "Co-pay: None on network hospitals",
      "Pre / post hospitalization: 60 / 180 days",
      "No-claim bonus: 50% per year (max 100%)",
      "Geography: Zone 1 (All India)",
    ],
    activeWaitingPeriods: [
      "Pre-existing diseases: 2 years remaining",
      "Specific diseases (hernia, cataract, joint replacement): 1 year remaining",
    ],
    gaps: {
      serious: [
        "Room rent linkage: If you upgrade from Single Private to Deluxe, all associated charges (surgeon fees, ICU, etc.) will be proportionately reduced",
      ],
      nonSerious: [
        "Consumables excluded: Non-medical items like PPE kits, gloves, masks not covered; expect ₹2k–₹10k per admission",
        "Ambulance capped at ₹2,000 per hospitalization",
      ],
    },
    clauseExplanations: [
      "Restoration benefit: Full sum insured is restored 100% after the first claim is exhausted, providing effective ₹20L coverage",
      "Day care procedures: Covered as per policy schedule, no hospitalization duration requirement",
    ],
    summary: "This policy provides solid base coverage with restoration, but room rent linkage and consumables exclusion create moderate out-of-pocket risks.",
  },
  recommendations: [
    "Consider upgrading sum insured to ₹15L–₹20L if planning advanced treatments in premium hospitals",
    "Add a super top-up policy (₹50L) with ₹5L deductible for catastrophic coverage",
    "Review consumables coverage: Some newer policies include this; compare before renewal",
  ],
};