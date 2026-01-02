import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Calculator,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  TrendingUp,
  Users,
  FileText,
  Download,
  Info,
  CheckCircle2,
  AlertCircle,
  Home,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import {
  calculateOptimalCoverageForUser,
  type UserInput,
  type CalculationResult,
} from "@/lib/calculators/optimalCoverageCalculator";
import { Combobox } from "@/components/ui/combobox";
import {
  getAllStates,
  getCitiesForState,
} from "@/lib/indian-cities-data";

const PRE_EXISTING_CONDITIONS = [
  { id: "diabetes", label: "Diabetes" },
  { id: "hypertension", label: "Hypertension" },
  { id: "cardiac", label: "Cardiac History" },
  { id: "cancer", label: "Cancer History" },
  { id: "none", label: "None" },
];

export default function CalculatorPage() {
  const [, setLocation] = useLocation();
  const { theme, toggle: toggleTheme } = useTheme();
  const [currentStep, setCurrentStep] = useState(1);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [formData, setFormData] = useState<Partial<UserInput>>({
    age: undefined,
    gender: undefined,
    city: "",
    state: "",
    pincode: "",
    occupation: "",
    annualIncome: undefined,
    monthlySavings: undefined,
    hasSpouse: false,
    spouseAge: undefined,
    children: [],
    dependents: 0,
    preExistingConditions: [],
    hasCorporateInsurance: false,
    corporateSI: undefined,
    smoking: false,
    alcohol: false,
    highRiskActivities: false,
  });

  const [selectedState, setSelectedState] = useState<string>("");
  const availableCities = selectedState ? getCitiesForState(selectedState) : [];
  const allStates = getAllStates();

  const updateFormData = (field: keyof UserInput, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateStep1 = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.age || formData.age < 18 || formData.age > 100) {
      newErrors.age = "Please enter a valid age between 18 and 100";
    }
    if (!formData.gender) {
      newErrors.gender = "Please select your gender";
    }
    if (!formData.state) {
      newErrors.state = "Please select your state";
    }
    if (!formData.city) {
      newErrors.city = "Please select your city";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.annualIncome || formData.annualIncome <= 0) {
      newErrors.annualIncome = "Please enter your annual household income";
    }
    if (formData.hasSpouse && (!formData.spouseAge || formData.spouseAge < 18 || formData.spouseAge > 100)) {
      newErrors.spouseAge = "Please enter a valid spouse age between 18 and 100";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const addChild = () => {
    setFormData((prev) => ({
      ...prev,
      children: [...(prev.children || []), { age: 0 }],
    }));
  };

  const updateChildAge = (index: number, age: number) => {
    setFormData((prev) => ({
      ...prev,
      children: prev.children?.map((child, i) =>
        i === index ? { age } : child
      ) || [],
    }));
  };

  const removeChild = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      children: prev.children?.filter((_, i) => i !== index) || [],
    }));
  };

  const toggleCondition = (condition: string) => {
    setFormData((prev) => {
      const conditions = prev.preExistingConditions || [];
      if (condition === "none") {
        return { ...prev, preExistingConditions: ["none"] };
      }
      if (conditions.includes(condition)) {
        return {
          ...prev,
          preExistingConditions: conditions.filter((c) => c !== condition && c !== "none"),
        };
      }
      return {
        ...prev,
        preExistingConditions: [...conditions.filter((c) => c !== "none"), condition],
      };
    });
  };

  const handleSubmit = () => {
    // Validate all steps before submitting
    const step1Valid = validateStep1();
    const step2Valid = validateStep2();
    
    if (!step1Valid || !step2Valid) {
      // Go to the first step with errors
      if (!step1Valid) {
        setCurrentStep(1);
      } else if (!step2Valid) {
        setCurrentStep(2);
      }
      return;
    }

    const input: UserInput = {
      age: formData.age!,
      gender: formData.gender as "M" | "F" | "Other",
      city: formData.city!,
      state: formData.state || selectedState,
      pincode: formData.pincode,
      occupation: formData.occupation,
      annualIncome: formData.annualIncome!,
      monthlySavings: formData.monthlySavings,
      hasSpouse: formData.hasSpouse || false,
      spouseAge: formData.spouseAge,
      children: formData.children || [],
      dependents: formData.dependents,
      preExistingConditions: formData.preExistingConditions.length > 0
        ? formData.preExistingConditions
        : ["none"],
      hasCorporateInsurance: formData.hasCorporateInsurance || false,
      corporateSI: formData.corporateSI,
      smoking: formData.smoking || false,
      alcohol: formData.alcohol || false,
      highRiskActivities: formData.highRiskActivities || false,
    };

    const calculation = calculateOptimalCoverageForUser(input);
    setResult(calculation);
    setCurrentStep(4); // Results step
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(1)}Cr`;
    }
    return `₹${(amount / 100000).toFixed(1)}L`;
  };

  const formatCurrencyExact = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleExport = () => {
    if (!result) return;
    
    const reportText = `
OPTIMAL INSURANCE COVERAGE REPORT
Generated on ${new Date().toLocaleDateString()}

YOUR OPTIMAL COVERAGE: ${formatCurrency(result.optimalCoverage)}

BREAKDOWN:
- Worst-case scenario: ${formatCurrency(result.breakdown.worstCaseScenario)}
- City multiplier: ${result.breakdown.cityMultiplier}x
- Condition multiplier: ${result.breakdown.conditionMultiplier}x
- Room rent gap: ${formatCurrency(result.breakdown.roomRentGap)}
- Inflation buffer: ${formatCurrency(result.breakdown.inflationBuffer)}
- Multi-incident buffer: ${formatCurrency(result.breakdown.multiIncidentBuffer)}

RECOMMENDED STRUCTURE:
- Base Policy: ${formatCurrency(result.structure.baseSI)}
- Top-up/Super Top-up: ${formatCurrency(result.structure.topUpSI)}
- Riders: ${formatCurrency(result.structure.ridersSI)}

ESTIMATED PREMIUM: ${formatCurrencyExact(result.premiumEstimate.totalPremium.min)} - ${formatCurrencyExact(result.premiumEstimate.totalPremium.max)}/year

${result.corporateGap ? `
CORPORATE POLICY GAP:
- Your group covers: ${formatCurrency(result.corporateGap.corporateSI)}
- Personal coverage needed: ${formatCurrency(result.corporateGap.personalNeeded)}
` : ''}

REASONING:
${result.reasoning.map((r, i) => `${i + 1}. ${r}`).join('\n')}

5-YEAR PROJECTION:
${result.fiveYearProjection.map(p => `Year ${p.year}: ${formatCurrencyExact(p.premium)} (Cumulative: ${formatCurrencyExact(p.cumulative)})`).join('\n')}
    `.trim();

    const blob = new Blob([reportText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `optimal-coverage-report-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 relative">
      {/* Animated background elements - matching homepage */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-20 -left-40 w-80 h-80 bg-blue-400/20 dark:bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 -right-40 w-96 h-96 bg-cyan-400/20 dark:bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-teal-400/20 dark:bg-teal-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>
      
      {/* Header */}
      <header className="relative z-10 w-full py-5 px-6 backdrop-blur-xl bg-white/70 dark:bg-gray-800/80 border-b border-white/20 dark:border-gray-700/50 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1A3A52] to-[#4A9B9E] flex items-center justify-center shadow-lg">
              <Calculator className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="font-bold text-2xl bg-gradient-to-r from-[#1A3A52] to-[#4A9B9E] bg-clip-text text-transparent">
                Optimal Insurance Calculator
              </span>
              <div className="text-[10px] text-gray-500 dark:text-gray-400 -mt-1">
                Calculate your ideal coverage
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={toggleTheme}
              className="border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setLocation("/")}
              className="border-[#1A3A52]/20 dark:border-[#4A9B9E]/30 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Home className="w-4 h-4 mr-2" />
              Home
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Progress Steps */}
        {currentStep < 4 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              {[1, 2, 3].map((step) => (
                <div
                  key={step}
                  className={`flex-1 flex items-center ${
                    step < 3 ? "mr-4" : ""
                  }`}
                >
                  <div className="flex items-center flex-1">
                    <div
                      className={`w-11 h-11 rounded-full flex items-center justify-center font-bold transition-all ${
                        currentStep >= step
                          ? "bg-[#1A3A52] dark:bg-[#4A9B9E] text-white shadow-md"
                          : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      {step}
                    </div>
                    {step < 3 && (
                      <div
                        className={`flex-1 h-1.5 mx-3 rounded-full transition-all ${
                          currentStep > step
                            ? "bg-[#1A3A52] dark:bg-[#4A9B9E]"
                            : "bg-gray-200 dark:bg-gray-700"
                        }`}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-sm font-medium text-gray-700 dark:text-gray-400 px-1">
              <span>Personal</span>
              <span>Financial & Family</span>
              <span>Health & Lifestyle</span>
            </div>
          </div>
        )}

        {/* Step 1: Personal Information */}
        {currentStep === 1 && (
          <Card className="shadow-lg border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/80 backdrop-blur-sm dark:shadow-xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">Personal Information</CardTitle>
              <CardDescription className="text-base mt-1 text-gray-700 dark:text-gray-300">
                Tell us about yourself to calculate optimal coverage
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-2">
              <div className="grid md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="age" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Age <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="age"
                    type="number"
                    min="18"
                    max="100"
                    value={formData.age || ""}
                    onChange={(e) =>
                      updateFormData("age", parseInt(e.target.value) || undefined)
                    }
                    placeholder="e.g., 35"
                    className={`h-10 text-gray-900 dark:text-gray-100 ${errors.age ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                  />
                  {errors.age && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.age}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Gender <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.gender || ""}
                    onValueChange={(value) =>
                      updateFormData("gender", value)
                    }
                  >
                    <SelectTrigger className={`h-10 text-gray-900 dark:text-gray-100 ${errors.gender ? "border-red-500 focus-visible:ring-red-500" : ""}`}>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">Male</SelectItem>
                      <SelectItem value="F">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.gender && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.gender}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    State <span className="text-red-500">*</span>
                  </Label>
                  <div>
                    <Combobox
                      options={allStates.map((state) => ({
                        value: state,
                        label: state,
                      }))}
                      value={selectedState}
                      onValueChange={(value) => {
                        setSelectedState(value);
                        updateFormData("state", value);
                        // Clear city when state changes
                        updateFormData("city", "");
                      }}
                      placeholder="Select your state"
                      searchPlaceholder="Search state..."
                      emptyMessage="No state found"
                      className={`h-10 ${errors.state ? "border-red-500" : ""}`}
                    />
                  </div>
                  {errors.state && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.state}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    City <span className="text-red-500">*</span>
                  </Label>
                  {selectedState ? (
                    <div>
                      <Combobox
                        options={availableCities.map((city) => ({
                          value: city,
                          label: city,
                        }))}
                        value={formData.city || ""}
                        onValueChange={(value) => updateFormData("city", value)}
                        placeholder="Select your city"
                        searchPlaceholder="Search city..."
                        emptyMessage="No city found"
                        className={`h-10 ${errors.city ? "border-red-500" : ""}`}
                      />
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 dark:text-gray-400 p-3 border border-gray-200 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700/50">
                      Please select a state first
                    </div>
                  )}
                  {errors.city && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.city}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pincode" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Pincode (Optional)
                  </Label>
                  <Input
                    id="pincode"
                    type="text"
                    value={formData.pincode || ""}
                    onChange={(e) => updateFormData("pincode", e.target.value)}
                    placeholder="e.g., 400001"
                    className="h-10 text-gray-900 dark:text-gray-100"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="occupation" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Occupation (Optional)
                  </Label>
                  <Input
                    id="occupation"
                    type="text"
                    value={formData.occupation || ""}
                    onChange={(e) =>
                      updateFormData("occupation", e.target.value)
                    }
                    placeholder="e.g., Software Engineer"
                    className="h-10 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setLocation("/")}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (validateStep1()) {
                      setCurrentStep(2);
                    }
                  }}
                  className="bg-[#1A3A52] hover:bg-[#2d5a7b] dark:bg-[#4A9B9E] dark:hover:bg-[#5aabb0]"
                >
                  Next: Financial & Family
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Financial & Family */}
        {currentStep === 2 && (
          <Card className="shadow-lg border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/80 backdrop-blur-sm dark:shadow-xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">Financial & Family</CardTitle>
              <CardDescription className="text-base mt-1 text-gray-700 dark:text-gray-300">
                Help us understand your financial situation and family structure
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-2">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">Financial Information</h3>
                <div className="grid md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="annualIncome" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Annual Net Household Income (₹){" "}
                      <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="annualIncome"
                      type="number"
                      min="0"
                      value={formData.annualIncome || ""}
                      onChange={(e) =>
                        updateFormData(
                          "annualIncome",
                          parseFloat(e.target.value) || undefined
                        )
                      }
                      placeholder="e.g., 2000000"
                      className={`h-10 text-gray-900 dark:text-gray-100 ${errors.annualIncome ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                    />
                    {errors.annualIncome ? (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.annualIncome}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Include: Your salary + Spouse salary + Other income
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="monthlySavings" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Monthly Savings (₹) (Optional)
                    </Label>
                    <Input
                      id="monthlySavings"
                      type="number"
                      min="0"
                      value={formData.monthlySavings || ""}
                      onChange={(e) =>
                        updateFormData(
                          "monthlySavings",
                          parseFloat(e.target.value) || undefined
                        )
                      }
                      placeholder="e.g., 50000"
                      className="h-10 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">Family Structure</h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600">
                    <Checkbox
                      id="hasSpouse"
                      checked={formData.hasSpouse || false}
                      onCheckedChange={(checked) =>
                        updateFormData("hasSpouse", checked)
                      }
                    />
                    <Label htmlFor="hasSpouse" className="cursor-pointer text-sm font-medium text-gray-900 dark:text-gray-100">
                      I have a spouse
                    </Label>
                  </div>

                  {formData.hasSpouse && (
                    <div className="ml-6 space-y-2">
                      <Label htmlFor="spouseAge" className="text-sm font-medium text-gray-900 dark:text-gray-100">Spouse Age</Label>
                      <Input
                        id="spouseAge"
                        type="number"
                        min="18"
                        max="100"
                        value={formData.spouseAge || ""}
                        onChange={(e) =>
                          updateFormData(
                            "spouseAge",
                            parseInt(e.target.value) || undefined
                          )
                        }
                        placeholder="e.g., 32"
                        className={`h-10 text-gray-900 dark:text-gray-100 ${errors.spouseAge ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                      />
                      {errors.spouseAge && (
                        <p className="text-sm text-red-500 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          {errors.spouseAge}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">Children</Label>
                    {formData.children?.map((child, index) => (
                      <div key={index} className="flex gap-2 items-center">
                        <Input
                          type="number"
                          min="0"
                          max="18"
                          value={child.age || ""}
                          onChange={(e) =>
                            updateChildAge(index, parseInt(e.target.value) || 0)
                          }
                          placeholder="Child age"
                          className="flex-1 h-10 text-gray-900 dark:text-gray-100"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeChild(index)}
                          className="h-10"
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addChild}
                      className="h-10"
                    >
                      + Add Child
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex justify-between gap-4 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(1)}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={() => {
                    if (validateStep2()) {
                      setCurrentStep(3);
                    }
                  }}
                  className="bg-[#1A3A52] hover:bg-[#2d5a7b] dark:bg-[#4A9B9E] dark:hover:bg-[#5aabb0]"
                >
                  Next: Health & Lifestyle
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Health & Lifestyle */}
        {currentStep === 3 && (
          <Card className="shadow-lg border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/80 backdrop-blur-sm dark:shadow-xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">Health & Lifestyle</CardTitle>
              <CardDescription className="text-base mt-1 text-gray-700 dark:text-gray-300">
                Provide health and coverage information for accurate calculation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-2">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">Pre-existing Conditions</h3>
                <div className="space-y-2 p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600">
                  {PRE_EXISTING_CONDITIONS.map((condition) => (
                    <div key={condition.id} className="flex items-center space-x-2 py-1.5">
                      <Checkbox
                        id={condition.id}
                        checked={
                          formData.preExistingConditions?.includes(condition.id) ||
                          false
                        }
                        onCheckedChange={() => toggleCondition(condition.id)}
                      />
                      <Label htmlFor={condition.id} className="cursor-pointer text-sm font-medium text-gray-900 dark:text-gray-100">
                        {condition.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">Existing Coverage</h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600">
                    <Checkbox
                      id="hasCorporateInsurance"
                      checked={formData.hasCorporateInsurance || false}
                      onCheckedChange={(checked) =>
                        updateFormData("hasCorporateInsurance", checked)
                      }
                    />
                    <Label htmlFor="hasCorporateInsurance" className="cursor-pointer text-sm font-medium text-gray-900 dark:text-gray-100">
                      I have group/corporate health insurance from employer
                    </Label>
                  </div>

                  {formData.hasCorporateInsurance && (
                    <div className="ml-6 space-y-2">
                      <Label htmlFor="corporateSI" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Group Policy Sum Insured (₹)
                      </Label>
                      <Input
                        id="corporateSI"
                        type="number"
                        min="0"
                        value={formData.corporateSI || ""}
                        onChange={(e) =>
                          updateFormData(
                            "corporateSI",
                            parseFloat(e.target.value) || undefined
                          )
                        }
                        placeholder="e.g., 1000000"
                        className="h-10 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">Lifestyle</h3>
                <div className="space-y-2 p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center space-x-2 py-1.5">
                    <Checkbox
                      id="smoking"
                      checked={formData.smoking || false}
                      onCheckedChange={(checked) =>
                        updateFormData("smoking", checked)
                      }
                    />
                    <Label htmlFor="smoking" className="cursor-pointer text-sm font-medium text-gray-900 dark:text-gray-100">
                      Smoking
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 py-1.5">
                    <Checkbox
                      id="alcohol"
                      checked={formData.alcohol || false}
                      onCheckedChange={(checked) =>
                        updateFormData("alcohol", checked)
                      }
                    />
                    <Label htmlFor="alcohol" className="cursor-pointer text-sm font-medium text-gray-900 dark:text-gray-100">
                      Regular alcohol consumption
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 py-1.5">
                    <Checkbox
                      id="highRiskActivities"
                      checked={formData.highRiskActivities || false}
                      onCheckedChange={(checked) =>
                        updateFormData("highRiskActivities", checked)
                      }
                    />
                    <Label htmlFor="highRiskActivities" className="cursor-pointer text-sm font-medium text-gray-900 dark:text-gray-100">
                      Sports/high-risk activities
                    </Label>
                  </div>
                </div>
              </div>

              <div className="flex justify-between gap-4 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(2)}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  className="bg-[#1A3A52] hover:bg-[#2d5a7b] dark:bg-[#4A9B9E] dark:hover:bg-[#5aabb0]"
                >
                  Calculate Optimal Coverage
                  <Calculator className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Results */}
        {currentStep === 4 && result && (
          <div className="space-y-6">
            {/* Header Actions */}
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold text-[#1A3A52] dark:text-[#4A9B9E]">
                Your Optimal Coverage Report
              </h1>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleExport}>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setCurrentStep(1);
                    setResult(null);
                  }}
                >
                  Calculate Again
                </Button>
              </div>
            </div>

            {/* Section 1: Optimal Coverage */}
            <Card className="shadow-lg border-gray-200 dark:border-gray-600 bg-white/90 dark:bg-gray-800/80 backdrop-blur-sm dark:shadow-xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl font-bold flex items-center gap-2 text-gray-900 dark:text-gray-100">
                  <ShieldCheck className="w-6 h-6 text-[#1A3A52] dark:text-[#4A9B9E]" />
                  Your Optimal Coverage
                </CardTitle>
                <CardDescription className="text-base mt-1 text-gray-700 dark:text-gray-300">
                  Based on your profile, you need comprehensive coverage
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center p-6 bg-gradient-to-br from-[#1A3A52] to-[#4A9B9E] rounded-xl text-white">
                  <div className="text-5xl font-black mb-2">
                    {formatCurrency(result.optimalCoverage)}
                  </div>
                  <div className="text-lg opacity-90">Total Coverage Recommended</div>
                </div>

                <Accordion type="single" collapsible>
                  <AccordionItem value="breakdown">
                    <AccordionTrigger>View Calculation Breakdown</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                        <div className="flex justify-between">
                          <span>Worst-case scenario:</span>
                          <span className="font-semibold text-gray-900 dark:text-gray-100">
                            {formatCurrency(result.breakdown.worstCaseScenario)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>City multiplier ({result.breakdown.cityMultiplier}x):</span>
                          <span className="font-semibold">Applied</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Condition multiplier ({result.breakdown.conditionMultiplier.toFixed(2)}x):</span>
                          <span className="font-semibold">Applied</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Room rent gap:</span>
                          <span className="font-semibold">
                            {formatCurrency(result.breakdown.roomRentGap)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Inflation buffer (3 years):</span>
                          <span className="font-semibold">
                            {formatCurrency(result.breakdown.inflationBuffer)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Multi-incident buffer:</span>
                          <span className="font-semibold">
                            {formatCurrency(result.breakdown.multiIncidentBuffer)}
                          </span>
                        </div>
                        <div className="flex justify-between pt-2 border-t font-bold">
                          <span>Total Optimal Coverage:</span>
                          <span>{formatCurrency(result.optimalCoverage)}</span>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>

            {/* Section 2: Recommended Structure */}
            <Card className="shadow-lg border-gray-200 dark:border-gray-600 bg-white/90 dark:bg-gray-800/80 backdrop-blur-sm dark:shadow-xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl font-bold flex items-center gap-2 text-gray-900 dark:text-gray-100">
                  <TrendingUp className="w-6 h-6 text-[#4A9B9E]" />
                  Recommended Structure
                </CardTitle>
                <CardDescription className="text-base mt-1 text-gray-700 dark:text-gray-300">
                  How to structure your coverage for maximum protection
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700/50">
                    <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                      Base Policy
                    </div>
                    <div className="text-2xl font-bold text-[#1A3A52] dark:text-[#4A9B9E] mb-1">
                      {formatCurrency(result.structure.baseSI)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Core health coverage
                    </div>
                  </div>
                  <div className="p-5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700/50">
                    <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                      Top-up/Super Top-up
                    </div>
                    <div className="text-2xl font-bold text-[#4A9B9E] mb-1">
                      {formatCurrency(result.structure.topUpSI)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      For secondary hospitalization
                    </div>
                  </div>
                  <div className="p-5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700/50">
                    <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                      Riders
                    </div>
                    <div className="text-2xl font-bold text-[#3CBBA0] mb-1">
                      {formatCurrency(result.structure.ridersSI)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Critical illness + Personal accident
                    </div>
                  </div>
                </div>

                <div className="p-5 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="font-semibold mb-2 text-gray-900 dark:text-gray-100">Estimated Annual Premium</div>
                  <div className="text-2xl font-bold text-[#1A3A52] dark:text-[#4A9B9E] mb-2">
                    {formatCurrencyExact(result.premiumEstimate.totalPremium.min)} -{" "}
                    {formatCurrencyExact(result.premiumEstimate.totalPremium.max)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {result.premiumEstimate.affordabilityPercentage.toFixed(1)}% of your annual income
                    {result.premiumEstimate.affordabilityPercentage < 2 ? (
                      <span className="text-green-600 dark:text-green-400 ml-2 font-medium">✓ Affordable</span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400 ml-2 font-medium">⚠ Consider budget</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 3: Family Coverage */}
            {result.familyCoverage && (
              <Card className="shadow-lg border-gray-200 dark:border-gray-600 bg-white/90 dark:bg-gray-800/80 backdrop-blur-sm dark:shadow-xl">
                <CardHeader className="pb-4">
                  <CardTitle className="text-2xl font-bold flex items-center gap-2 text-gray-900 dark:text-gray-100">
                    <Users className="w-6 h-6 text-[#3CBBA0]" />
                    Family Coverage Recommendation
                  </CardTitle>
                  <CardDescription className="text-base mt-1 text-gray-700 dark:text-gray-300">
                    Optimize coverage for your entire family
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700/50">
                    <div className="font-semibold mb-2 text-gray-900 dark:text-gray-100">Recommended: Family Floater</div>
                    <div className="text-2xl font-bold text-[#1A3A52] dark:text-[#4A9B9E] mb-2">
                      {formatCurrency(result.familyCoverage.recommendedFloater)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Covers all family members with shared sum insured
                    </div>
                  </div>

                  <div className="p-5 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                    <div className="font-semibold mb-3 text-gray-900 dark:text-gray-100">Minimum Per-Person Coverage by Age</div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between py-1">
                        <span className="text-gray-600 dark:text-gray-400">Adults (18-45):</span>
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          {formatCurrency(result.familyCoverage.minimumPerPerson.adult)}
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-gray-600 dark:text-gray-400">Adults (45-60):</span>
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          {formatCurrency(result.familyCoverage.minimumPerPerson.adult45to60)}
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-gray-600 dark:text-gray-400">Adults (60+):</span>
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          {formatCurrency(result.familyCoverage.minimumPerPerson.adult60Plus)}
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-gray-600 dark:text-gray-400">Children (0-18):</span>
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          {formatCurrency(result.familyCoverage.minimumPerPerson.children)}
                        </span>
                      </div>
                      <div className="flex justify-between pt-3 mt-2 border-t border-gray-300 dark:border-gray-600 font-bold text-gray-900 dark:text-gray-100">
                        <span>Total Minimum for Family:</span>
                        <span>
                          {formatCurrency(result.familyCoverage.totalMinimumForFamily)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {result.familyCoverage.floaterRecommended ? (
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                      <div>
                        <div className="font-semibold text-green-900 dark:text-green-200">
                          Family Floater Recommended
                        </div>
                        <div className="text-sm text-green-700 dark:text-green-300">
                          A family floater policy saves costs compared to individual policies
                          for each member.
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                      <div>
                        <div className="font-semibold text-amber-900 dark:text-amber-200">
                          Consider Individual Policies
                        </div>
                        <div className="text-sm text-amber-700 dark:text-amber-300">
                          Your optimal coverage may require individual policies per family member
                          to ensure adequate protection.
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Section 4: Corporate Policy Gap */}
            {result.corporateGap && (
              <Card className="shadow-lg border-gray-200 dark:border-gray-600 bg-white/90 dark:bg-gray-800/80 backdrop-blur-sm dark:shadow-xl">
                <CardHeader className="pb-4">
                  <CardTitle className="text-2xl font-bold flex items-center gap-2 text-gray-900 dark:text-gray-100">
                    <Info className="w-6 h-6 text-[#4A9B9E]" />
                    Corporate Policy Gap Analysis
                  </CardTitle>
                  <CardDescription className="text-base mt-1 text-gray-700 dark:text-gray-300">
                    Your existing group coverage and personal gap
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700/50">
                      <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                        Your Group Covers
                      </div>
                      <div className="text-2xl font-bold text-[#1A3A52] dark:text-[#4A9B9E]">
                        {formatCurrency(result.corporateGap.corporateSI)}
                      </div>
                    </div>
                    <div className="p-5 border border-gray-200 dark:border-gray-700 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                      <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                        Personal Coverage Needed
                      </div>
                      <div className="text-2xl font-bold text-[#4A9B9E]">
                        {formatCurrency(result.corporateGap.personalNeeded)}
                      </div>
                    </div>
                  </div>
                  <div className="p-5 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <div className="font-semibold mb-2 text-gray-900 dark:text-gray-100">Recommendation</div>
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      Your group policy covers {formatCurrency(result.corporateGap.corporateSI)}.
                      You need personal coverage of {formatCurrency(result.corporateGap.personalNeeded)} to fill the gap.
                      A top-up policy is typically cheaper than a full personal policy.
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Section 5: 5-Year Projection */}
            <Card className="shadow-lg border-gray-200 dark:border-gray-600 bg-white/90 dark:bg-gray-800/80 backdrop-blur-sm dark:shadow-xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl font-bold flex items-center gap-2 text-gray-900 dark:text-gray-100">
                  <TrendingUp className="w-6 h-6 text-[#1A3A52] dark:text-[#4A9B9E]" />
                  5-Year Financial Projection
                </CardTitle>
                <CardDescription className="text-base mt-1 text-gray-700 dark:text-gray-300">
                  Estimated premium costs over the next 5 years
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {result.fiveYearProjection.map((projection) => (
                    <div
                      key={projection.year}
                      className="flex justify-between items-center p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700/50"
                    >
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">Year {projection.year}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Cumulative: {formatCurrencyExact(projection.cumulative)}
                        </div>
                      </div>
                      <div className="text-xl font-bold text-[#1A3A52] dark:text-[#4A9B9E]">
                        {formatCurrencyExact(projection.premium)}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-5 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    <strong className="text-gray-900 dark:text-gray-100">ROI Insight:</strong> Investing approximately{" "}
                    {formatCurrencyExact(result.fiveYearProjection[0].premium)} per year protects
                    you against a potential gap of {formatCurrency(result.optimalCoverage)}.
                    The cost of being uninsured could be 10-20x your premium investment.
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 6: Detailed Reasoning */}
            <Card className="shadow-lg border-gray-200 dark:border-gray-600 bg-white/90 dark:bg-gray-800/80 backdrop-blur-sm dark:shadow-xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl font-bold flex items-center gap-2 text-gray-900 dark:text-gray-100">
                  <FileText className="w-6 h-6 text-[#4A9B9E]" />
                  Why This Amount?
                </CardTitle>
                <CardDescription className="text-base mt-1 text-gray-700 dark:text-gray-300">
                  Detailed explanation of the calculation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {result.reasoning.map((reason, index) => (
                    <div key={index} className="flex gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600">
                      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[#1A3A52] dark:bg-[#4A9B9E] text-white flex items-center justify-center text-xs font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                        {reason}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* CTA Section */}
            <Card className="shadow-lg bg-gradient-to-br from-[#1A3A52] to-[#4A9B9E] text-white border-0">
              <CardContent className="p-8">
                <div className="text-center space-y-4">
                  <h3 className="text-2xl font-bold">Ready to Find the Right Policy?</h3>
                  <p className="text-white/90">
                    Use this coverage recommendation to compare policies and find the best fit
                  </p>
                  <div className="flex gap-4 justify-center">
                    <Button
                      variant="secondary"
                      onClick={() => setLocation("/")}
                      className="bg-white text-[#1A3A52] hover:bg-gray-100"
                    >
                      Upload Policy to Analyze
                    </Button>
                    <Button
                      variant="outline"
                      className="border-white text-white hover:bg-white/10"
                      onClick={() => {
                        setCurrentStep(1);
                        setResult(null);
                      }}
                    >
                      Calculate Again
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

