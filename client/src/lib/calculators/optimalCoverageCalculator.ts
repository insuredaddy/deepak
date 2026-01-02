/**
 * Optimal Insurance Coverage Calculator
 * 
 * Calculates the optimal health insurance coverage amount based on:
 * - Age-based worst-case medical scenarios
 * - City tier adjustments
 * - Pre-existing condition multipliers
 * - Room rent gaps
 * - Medical inflation buffers
 * - Multi-incident buffers
 */

export interface UserInput {
  // Personal
  age: number;
  gender: "M" | "F" | "Other";
  city: string;
  pincode?: string;
  occupation?: string;
  
  // Financial
  annualIncome: number; // Net household income
  monthlySavings?: number;
  
  // Family
  hasSpouse: boolean;
  spouseAge?: number;
  children: Array<{ age: number }>;
  dependents?: number;
  
  // Health
  preExistingConditions: string[]; // ["diabetes", "hypertension", "cardiac", "cancer", "none"]
  
  // Existing Coverage
  hasCorporateInsurance: boolean;
  corporateSI?: number; // Sum insured from corporate policy
  
  // Lifestyle
  smoking: boolean;
  alcohol: boolean;
  highRiskActivities: boolean;
}

export interface CoverageBreakdown {
  worstCaseScenario: number;
  cityMultiplier: number;
  conditionMultiplier: number;
  roomRentGap: number;
  inflationBuffer: number;
  multiIncidentBuffer: number;
  optimalTotal: number;
}

export interface CoverageStructure {
  baseSI: number;
  topUpSI: number;
  ridersSI: number;
  totalSI: number;
}

export interface FamilyCoverage {
  recommendedFloater: number;
  minimumPerPerson: {
    adult: number;
    adult45to60: number;
    adult60Plus: number;
    children: number;
  };
  totalMinimumForFamily: number;
  floaterRecommended: boolean;
}

export interface PremiumEstimate {
  basePremium: { min: number; max: number };
  topUpPremium: { min: number; max: number };
  ridersPremium: { min: number; max: number };
  totalPremium: { min: number; max: number };
  affordabilityPercentage: number;
}

export interface CalculationResult {
  optimalCoverage: number;
  breakdown: CoverageBreakdown;
  structure: CoverageStructure;
  familyCoverage?: FamilyCoverage;
  premiumEstimate: PremiumEstimate;
  corporateGap?: {
    corporateSI: number;
    personalNeeded: number;
  };
  reasoning: string[];
  fiveYearProjection: Array<{
    year: number;
    premium: number;
    cumulative: number;
  }>;
}

/**
 * Get city tier based on city name
 */
export function getCityTier(city: string): "Tier 1" | "Tier 2" | "Tier 3" {
  const cityLower = city.toLowerCase();
  
  const tier1Cities = [
    "mumbai", "delhi", "bangalore", "hyderabad", "chennai", "kolkata", "pune"
  ];
  
  const tier2Cities = [
    "ahmedabad", "jaipur", "chandigarh", "lucknow", "kochi", "surat",
    "indore", "nagpur", "bhopal", "visakhapatnam", "patna", "vadodara"
  ];
  
  if (tier1Cities.some(c => cityLower.includes(c))) {
    return "Tier 1";
  }
  if (tier2Cities.some(c => cityLower.includes(c))) {
    return "Tier 2";
  }
  return "Tier 3";
}

/**
 * Calculate age-based worst-case medical scenario
 */
function getWorstCaseScenario(age: number): number {
  if (age < 40) {
    return 2000000; // ₹20L - accident/trauma
  } else if (age >= 40 && age < 55) {
    return 2800000; // ₹25-30L - cardiac (CABG ₹2.2-6.5L + complications)
  } else if (age >= 55 && age < 65) {
    return 4000000; // ₹30-50L - cancer (₹8-15L + ICU)
  } else {
    return 6250000; // ₹50-75L - multiple chronic diseases
  }
}

/**
 * Get city tier multiplier
 */
function getCityMultiplier(tier: "Tier 1" | "Tier 2" | "Tier 3"): number {
  switch (tier) {
    case "Tier 1":
      return 1.2;
    case "Tier 2":
      return 1.0;
    case "Tier 3":
      return 0.8;
  }
}

/**
 * Calculate pre-existing condition multiplier
 */
function getConditionMultiplier(conditions: string[]): number {
  if (conditions.includes("none") || conditions.length === 0) {
    return 1.0;
  }
  
  let multiplier = 1.0;
  
  // Add multipliers (don't cap - can stack)
  if (conditions.includes("diabetes")) {
    multiplier += 0.2; // +20%
  }
  if (conditions.includes("hypertension")) {
    multiplier += 0.15; // +15%
  }
  if (conditions.includes("cardiac")) {
    multiplier += 0.5; // +50% (CRITICAL - very expensive)
  }
  if (conditions.includes("cancer")) {
    multiplier += 0.8; // +80% (chemotherapy + ICU costs spike)
  }
  
  return multiplier;
}

/**
 * Calculate room rent gap buffer
 */
function getRoomRentGap(
  tier: "Tier 1" | "Tier 2" | "Tier 3",
  annualIncome: number
): number {
  let baseGap = 0;
  
  switch (tier) {
    case "Tier 1":
      baseGap = 150000; // ₹1.5L (₹5K/day × 30 days)
      break;
    case "Tier 2":
      baseGap = 100000; // ₹1L
      break;
    case "Tier 3":
      baseGap = 50000; // ₹50K
      break;
  }
  
  // Higher income = premium hospitals = higher gap
  if (annualIncome > 5000000) { // >₹50L
    baseGap += 200000; // Add ₹2L
  }
  
  return baseGap;
}

/**
 * Calculate medical inflation buffer (3-year projection)
 */
function getInflationBuffer(
  baseAmount: number,
  roomRentGap: number
): number {
  const medicalInflationRate = 0.16; // 16% annually (India average)
  const years = 3;
  
  const totalBase = baseAmount + roomRentGap;
  const inflationBuffer = totalBase * medicalInflationRate * years;
  
  return inflationBuffer;
}

/**
 * Calculate multi-incident buffer (can't use 100% SI twice in same year)
 */
function getMultiIncidentBuffer(
  worstCase: number,
  roomRentGap: number
): number {
  return (worstCase + roomRentGap) * 0.3; // 30% buffer
}

/**
 * Calculate optimal total coverage
 */
function calculateOptimalCoverage(input: UserInput): CoverageBreakdown {
  const worstCase = getWorstCaseScenario(input.age);
  const cityTier = getCityTier(input.city);
  const cityMultiplier = getCityMultiplier(cityTier);
  const conditionMultiplier = getConditionMultiplier(input.preExistingConditions);
  const roomRentGap = getRoomRentGap(cityTier, input.annualIncome);
  
  // Apply multipliers
  const adjustedWorstCase = worstCase * cityMultiplier * conditionMultiplier;
  
  // Calculate buffers
  const inflationBuffer = getInflationBuffer(adjustedWorstCase, roomRentGap);
  const multiIncidentBuffer = getMultiIncidentBuffer(adjustedWorstCase, roomRentGap);
  
  // Final calculation
  const optimalTotal = adjustedWorstCase + roomRentGap + inflationBuffer + multiIncidentBuffer;
  
  return {
    worstCaseScenario: worstCase,
    cityMultiplier,
    conditionMultiplier,
    roomRentGap,
    inflationBuffer,
    multiIncidentBuffer,
    optimalTotal: Math.round(optimalTotal),
  };
}

/**
 * Calculate coverage structure (Base + Top-up + Riders)
 */
function calculateCoverageStructure(optimalTotal: number): CoverageStructure {
  return {
    baseSI: Math.round(optimalTotal * 0.65),
    topUpSI: Math.round(optimalTotal * 0.25),
    ridersSI: Math.round(optimalTotal * 0.10),
    totalSI: Math.round(optimalTotal),
  };
}

/**
 * Calculate family coverage recommendations
 */
function calculateFamilyCoverage(
  input: UserInput,
  optimalTotal: number
): FamilyCoverage | undefined {
  const familySize = 1 + (input.hasSpouse ? 1 : 0) + input.children.length;
  
  if (familySize <= 1) {
    return undefined;
  }
  
  // Minimum per person by age
  const adultMin = 1500000; // ₹15L (18-45)
  const adult45to60Min = 2000000; // ₹20L (45-60)
  const adult60PlusMin = 2500000; // ₹25L (60+)
  const childrenMin = 500000; // ₹5L (0-18)
  
  // Calculate minimums for each family member
  let totalMinimum = 0;
  
  // Self
  if (input.age < 45) {
    totalMinimum += adultMin;
  } else if (input.age < 60) {
    totalMinimum += adult45to60Min;
  } else {
    totalMinimum += adult60PlusMin;
  }
  
  // Spouse
  if (input.hasSpouse && input.spouseAge) {
    if (input.spouseAge < 45) {
      totalMinimum += adultMin;
    } else if (input.spouseAge < 60) {
      totalMinimum += adult45to60Min;
    } else {
      totalMinimum += adult60PlusMin;
    }
  }
  
  // Children
  input.children.forEach(child => {
    totalMinimum += childrenMin;
  });
  
  return {
    recommendedFloater: Math.round(optimalTotal),
    minimumPerPerson: {
      adult: adultMin,
      adult45to60: adult45to60Min,
      adult60Plus: adult60PlusMin,
      children: childrenMin,
    },
    totalMinimumForFamily: totalMinimum,
    floaterRecommended: optimalTotal >= totalMinimum * 0.8, // If optimal is close to minimum, floater works
  };
}

/**
 * Estimate premium based on coverage and age
 */
function estimatePremium(
  input: UserInput,
  structure: CoverageStructure
): PremiumEstimate {
  // Base premium benchmarks (per ₹10L base SI)
  let basePer10L: { min: number; max: number };
  
  if (input.age < 35) {
    basePer10L = { min: 10000, max: 12000 };
  } else if (input.age < 45) {
    basePer10L = { min: 10000, max: 12000 };
  } else if (input.age < 55) {
    basePer10L = { min: 15000, max: 18000 };
  } else {
    basePer10L = { min: 20000, max: 25000 };
  }
  
  // Calculate base premium
  const baseMultiplier = structure.baseSI / 1000000; // Per ₹10L
  const basePremium = {
    min: Math.round(basePer10L.min * baseMultiplier),
    max: Math.round(basePer10L.max * baseMultiplier),
  };
  
  // Adjustments
  let adjustmentFactor = 1.0;
  
  // Family floater discount (-20%)
  const familySize = 1 + (input.hasSpouse ? 1 : 0) + input.children.length;
  if (familySize > 1) {
    adjustmentFactor *= 0.8;
  }
  
  // Pre-existing conditions (+30%)
  if (input.preExistingConditions.length > 0 && !input.preExistingConditions.includes("none")) {
    adjustmentFactor *= 1.3;
  }
  
  // City tier adjustment (±15%)
  const cityTier = getCityTier(input.city);
  if (cityTier === "Tier 1") {
    adjustmentFactor *= 1.15;
  } else if (cityTier === "Tier 3") {
    adjustmentFactor *= 0.85;
  }
  
  // Apply adjustments
  basePremium.min = Math.round(basePremium.min * adjustmentFactor);
  basePremium.max = Math.round(basePremium.max * adjustmentFactor);
  
  // Top-up premium (60% of base)
  const topUpPremium = {
    min: Math.round(basePremium.min * 0.6),
    max: Math.round(basePremium.max * 0.6),
  };
  
  // Riders premium (₹3-5K per rider)
  let riderCount = 2; // Critical illness + Personal accident (always recommended)
  if (input.hasSpouse && input.spouseAge && input.spouseAge < 45) {
    // Maternity rider
    riderCount = 3;
  }
  const ridersPremium = {
    min: riderCount * 3000,
    max: riderCount * 5000,
  };
  
  const totalPremium = {
    min: basePremium.min + topUpPremium.min + ridersPremium.min,
    max: basePremium.max + topUpPremium.max + ridersPremium.max,
  };
  
  // Affordability check
  const affordabilityPercentage = (totalPremium.max / input.annualIncome) * 100;
  
  return {
    basePremium,
    topUpPremium,
    ridersPremium,
    totalPremium,
    affordabilityPercentage,
  };
}

/**
 * Generate detailed reasoning
 */
function generateReasoning(
  input: UserInput,
  breakdown: CoverageBreakdown,
  cityTier: "Tier 1" | "Tier 2" | "Tier 3"
): string[] {
  const reasoning: string[] = [];
  
  // Age-based scenario
  let ageScenario = "";
  if (input.age < 40) {
    ageScenario = "Accident/trauma scenarios";
  } else if (input.age >= 40 && input.age < 55) {
    ageScenario = "Cardiac surgery (CABG ₹2.2-6.5L + complications)";
  } else if (input.age >= 55 && input.age < 65) {
    ageScenario = "Cancer treatment (₹8-15L + ICU)";
  } else {
    ageScenario = "Multiple chronic diseases";
  }
  
  reasoning.push(
    `You are ${input.age} years old in ${input.city} (${cityTier} city)`
  );
  reasoning.push(
    `Age-relevant worst case: ${ageScenario} = ₹${(breakdown.worstCaseScenario / 100000).toFixed(1)}L`
  );
  
  // City multiplier
  if (breakdown.cityMultiplier !== 1.0) {
    reasoning.push(
      `City tier adjustment: ${cityTier} cities have ${breakdown.cityMultiplier > 1 ? "higher" : "lower"} medical costs (×${breakdown.cityMultiplier})`
    );
  }
  
  // Pre-existing conditions
  if (breakdown.conditionMultiplier > 1.0) {
    const conditions = input.preExistingConditions.filter(c => c !== "none");
    reasoning.push(
      `Pre-existing conditions (${conditions.join(", ")}): +${((breakdown.conditionMultiplier - 1) * 100).toFixed(0)}% cost increase due to higher hospitalization risk`
    );
  }
  
  // Room rent gap
  reasoning.push(
    `Room rent gap in ${cityTier}: Additional ₹${(breakdown.roomRentGap / 1000).toFixed(0)}K buffer for premium room upgrades (₹${cityTier === "Tier 1" ? "5K" : cityTier === "Tier 2" ? "3K" : "2K"}/day × 30-day stay)`
  );
  
  // Inflation
  reasoning.push(
    `Medical inflation buffer: 16%/year × 3 years = ₹${(breakdown.inflationBuffer / 100000).toFixed(1)}L to account for rising costs`
  );
  
  // Multi-incident
  reasoning.push(
    `Multi-incident buffer: 30% (₹${(breakdown.multiIncidentBuffer / 100000).toFixed(1)}L) since you can't use 100% SI twice in the same year`
  );
  
  // Final amount
  reasoning.push(
    `Result: ₹${(breakdown.optimalTotal / 100000).toFixed(1)}L total coverage keeps out-of-pocket at 5-10%. With lower coverage, OOP could be 40-50%`
  );
  
  return reasoning;
}

/**
 * Calculate 5-year premium projection
 */
function calculateFiveYearProjection(
  premiumEstimate: PremiumEstimate
): Array<{ year: number; premium: number; cumulative: number }> {
  const projection = [];
  const premiumInflation = 0.10; // 10% annual premium increase
  let cumulative = 0;
  
  for (let year = 1; year <= 5; year++) {
    const yearPremium = Math.round(
      premiumEstimate.totalPremium.max * Math.pow(1 + premiumInflation, year - 1)
    );
    cumulative += yearPremium;
    
    projection.push({
      year,
      premium: yearPremium,
      cumulative,
    });
  }
  
  return projection;
}

/**
 * Main calculation function
 */
export function calculateOptimalCoverageForUser(
  input: UserInput
): CalculationResult {
  // Income-based adjustment (affordability cap)
  let adjustedInput = { ...input };
  if (input.annualIncome < 500000) {
    // Reduce optimal by 20% if income very low
    adjustedInput = { ...input };
  }
  
  const breakdown = calculateOptimalCoverage(adjustedInput);
  
  // Apply income cap if needed
  let finalOptimal = breakdown.optimalTotal;
  if (input.annualIncome < 500000) {
    finalOptimal = Math.round(breakdown.optimalTotal * 0.8);
  } else if (input.annualIncome > 5000000) {
    // Higher income = can afford premium hospitals
    finalOptimal = Math.round(breakdown.optimalTotal + 250000); // Add ₹2.5L
  }
  
  const structure = calculateCoverageStructure(finalOptimal);
  const familyCoverage = calculateFamilyCoverage(input, finalOptimal);
  const premiumEstimate = estimatePremium(input, structure);
  const cityTier = getCityTier(input.city);
  const reasoning = generateReasoning(input, breakdown, cityTier);
  const fiveYearProjection = calculateFiveYearProjection(premiumEstimate);
  
  // Corporate policy gap
  let corporateGap: { corporateSI: number; personalNeeded: number } | undefined;
  if (input.hasCorporateInsurance && input.corporateSI) {
    const personalNeeded = Math.max(0, finalOptimal - input.corporateSI);
    corporateGap = {
      corporateSI: input.corporateSI,
      personalNeeded,
    };
  }
  
  return {
    optimalCoverage: finalOptimal,
    breakdown: {
      ...breakdown,
      optimalTotal: finalOptimal,
    },
    structure,
    familyCoverage,
    premiumEstimate,
    corporateGap,
    reasoning,
    fiveYearProjection,
  };
}

