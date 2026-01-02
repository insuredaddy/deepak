import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Home, Sun, Moon, Scale, CheckCircle2, X, ChevronDown, ChevronUp, Building2 } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { useComparison } from "@/hooks/use-comparison";
import type { PolicyData } from "@/types/policy";
import { analyzeComparison } from "@/lib/comparison-analyzer";

export default function ResultsStep() {
  const [, setLocation] = useLocation();
  const { theme, toggle: toggleTheme } = useTheme();
  const { policies, profile, clearAll, setPolicies } = useComparison();
  const [expandedFeatures, setExpandedFeatures] = useState<Set<string>>(new Set());

  // Clear on unmount (when navigating away from compare flow)
  useEffect(() => {
    return () => {
      const isStillInCompareFlow = window.location.pathname.startsWith("/compare");
      if (!isStillInCompareFlow) {
        sessionStorage.removeItem("ensured_comparison_policies");
        sessionStorage.removeItem("ensured_comparison_profile");
      }
    };
  }, []);

  const successfulPolicies = policies.filter((p) => p.status === "success" && p.policyData);

  // Early return if no policies
  if (successfulPolicies.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>No policies to compare</CardTitle>
            <CardDescription>Please upload policies first.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/compare")}>Go to Upload</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate scores based on priority need
  const calculateScore = (policy: PolicyData): number => {
    let score = 0;
    const baseSI = policy.coverage.base_si?.amount || 0;
    const premium = policy.coverage.annual_premium?.amount || 0;
    const roomRentUnlimited = policy.coverage.room_rent?.unlimited || false;
    const copayPercent = policy.coverage.copay?.percent || 0;

    switch (profile.priorityNeed) {
      case "cancer_coverage":
        const cancerSublimit = policy.sub_limits?.cancer?.limit_amount || baseSI;
        const cancerWaiting = policy.waiting_periods?.specific_diseases?.cancer?.months || 999;
        score += cancerSublimit / 10000; // Higher sub-limit = better
        score -= cancerWaiting * 10; // Lower waiting period = better
        if (policy.riders?.critical_illness?.available) score += 50;
        // Ensure non-negative
        score = Math.max(0, score);
        break;

      case "cardiac_coverage":
        const cardiacSublimit = policy.sub_limits?.cardiac?.limit_amount || baseSI;
        const cardiacWaiting = policy.waiting_periods?.specific_diseases?.cardiac?.months || 999;
        score += cardiacSublimit / 10000;
        score -= cardiacWaiting * 10;
        if (policy.riders?.critical_illness?.available) score += 50;
        score = Math.max(0, score);
        break;

      case "room_rent":
        if (roomRentUnlimited) score += 100;
        else if (policy.coverage.room_rent?.amount && policy.coverage.room_rent.amount > 5000) score += 50;
        score -= copayPercent * 2;
        score = Math.max(0, score);
        break;

      case "lowest_premium":
        // Lower premium = higher score (inverted, normalized)
        // Use a formula that gives higher scores for lower premiums
        score = Math.max(0, 10000 - (premium / 100));
        break;

      case "best_balance":
      default:
        // Balanced scoring - use ratio-based approach to prevent negatives
        // Value score: Higher SI to premium ratio = better
        const valueRatio = baseSI / Math.max(premium, 1); // SI per rupee of premium
        score += valueRatio / 10; // Normalize (e.g., 1000:1 ratio = 100 points)
        
        // Base SI contribution (normalized)
        score += baseSI / 10000; // Higher SI = better
        
        // Premium penalty (normalized, capped)
        const premiumPenalty = Math.min(premium / 200, 50); // Max 50 point penalty
        score -= premiumPenalty;
        
        // Feature bonuses
        if (roomRentUnlimited) score += 30;
        score -= copayPercent * 2; // Lower co-pay = better
        if (policy.restoration?.type === "unlimited") score += 20;
        
        // Ensure non-negative
        score = Math.max(0, score);
        break;
    }

    return Math.round(score);
  };

  const policiesWithScores = successfulPolicies
    .filter((p) => p.policyData) // Additional safety check
    .map((p) => ({
      policy: p.policyData!,
      score: calculateScore(p.policyData!),
      id: p.id,
    }))
    .sort((a, b) => b.score - a.score);

  if (policiesWithScores.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>No valid policies to compare</CardTitle>
            <CardDescription>Please upload and extract policies first.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/compare")}>Go to Upload</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const bestMatch = policiesWithScores[0];

  // Analyze comparison to get categories and key differences
  const comparisonAnalysis = analyzeComparison(policiesWithScores);

  // Generate summary
  const generateSummary = () => {
    if (!bestMatch) return { line1: "", line2: "", line3: "" };

    const policy = bestMatch.policy;
    const priority = profile.priorityNeed;

    let line1 = "";
    let line2 = "";
    let line3 = "";

    switch (priority) {
      case "cancer_coverage":
        const cancerLimit = policy.sub_limits?.cancer?.limit_amount || policy.coverage.base_si?.amount || 0;
        const cancerWaiting = policy.waiting_periods?.specific_diseases?.cancer?.months || 0;
        const cancerUnlimited = policy.sub_limits?.cancer?.unlimited || false;
        line1 = `${policy.basic_info?.insurer || "Unknown"} - ${policy.basic_info?.plan_name || "Unknown"} is your best match for cancer coverage.`;
        line2 = `It offers ${cancerUnlimited ? "unlimited" : `₹${(cancerLimit / 100000).toFixed(1)}L`} cancer coverage with ${cancerWaiting > 0 ? `only ${cancerWaiting} months` : "minimal"} waiting period.`;
        const premium1 = policy.coverage.annual_premium?.amount || 0;
        line3 = `With ${policy.coverage.base_si?.display || "N/A"} base SI and ${policy.coverage.copay?.exists ? `${policy.coverage.copay.percent}%` : "no"} co-pay, this policy provides comprehensive protection at ₹${(premium1 / 1000).toFixed(1)}K/year.`;
        break;

      case "cardiac_coverage":
        const cardiacLimit = policy.sub_limits?.cardiac?.limit_amount || policy.coverage.base_si?.amount || 0;
        const cardiacWaiting = policy.waiting_periods?.specific_diseases?.cardiac?.months || 0;
        const cardiacUnlimited = policy.sub_limits?.cardiac?.unlimited || false;
        line1 = `${policy.basic_info?.insurer || "Unknown"} - ${policy.basic_info?.plan_name || "Unknown"} is your best match for cardiac coverage.`;
        line2 = `It provides ${cardiacUnlimited ? "unlimited" : `₹${(cardiacLimit / 100000).toFixed(1)}L`} cardiac coverage with ${cardiacWaiting > 0 ? `only ${cardiacWaiting} months` : "minimal"} waiting period for heart-related procedures.`;
        const premium2 = policy.coverage.annual_premium?.amount || 0;
        line3 = `The policy offers ${policy.coverage.base_si?.display || "N/A"} base coverage, ${policy.coverage.room_rent?.unlimited ? "unlimited room rent" : `room rent up to ${policy.coverage.room_rent?.display || "N/A"}`}, and ${policy.coverage.copay?.exists ? `${policy.coverage.copay.percent}%` : "no"} co-pay at ₹${(premium2 / 1000).toFixed(1)}K/year.`;
        break;

      case "room_rent":
        line1 = `${policy.basic_info?.insurer || "Unknown"} - ${policy.basic_info?.plan_name || "Unknown"} is your best match for room rent adequacy.`;
        line2 = `It offers ${policy.coverage.room_rent?.unlimited ? "unlimited room rent" : `room rent of ${policy.coverage.room_rent?.display || "N/A"}`}, ensuring you can choose any room category without coverage reduction.`;
        const premium3 = policy.coverage.annual_premium?.amount || 0;
        line3 = `With ${policy.coverage.base_si?.display || "N/A"} base SI, ${policy.coverage.copay?.exists ? `${policy.coverage.copay.percent}%` : "no"} co-pay, and annual premium of ₹${(premium3 / 1000).toFixed(1)}K, this policy provides excellent value.`;
        break;

      case "lowest_premium":
        line1 = `${policy.basic_info?.insurer || "Unknown"} - ${policy.basic_info?.plan_name || "Unknown"} is your best match for lowest premium.`;
        line2 = `At ₹${policy.coverage.annual_premium?.display || "N/A"}, it offers the most affordable coverage among all compared policies.`;
        line3 = `Despite its lower premium, you still get ${policy.coverage.base_si?.display || "N/A"} base SI, ${policy.coverage.room_rent?.unlimited ? "unlimited room rent" : `room rent of ${policy.coverage.room_rent?.display || "N/A"}`}, and ${policy.coverage.copay?.exists ? `${policy.coverage.copay.percent}%` : "no"} co-pay.`;
        break;

      case "best_balance":
      default:
        line1 = `${policy.basic_info?.insurer || "Unknown"} - ${policy.basic_info?.plan_name || "Unknown"} is your best overall match.`;
        line2 = `It strikes the perfect balance with ${policy.coverage.base_si?.display || "N/A"} base SI, ${policy.coverage.room_rent?.unlimited ? "unlimited room rent" : `room rent of ${policy.coverage.room_rent?.display || "N/A"}`}, and ${policy.coverage.copay?.exists ? `${policy.coverage.copay.percent}%` : "no"} co-pay.`;
        line3 = `At ₹${policy.coverage.annual_premium?.display || "N/A"}, this policy offers comprehensive coverage with ${policy.restoration?.type === "unlimited" ? "unlimited restoration" : policy.restoration?.type || "no restoration"}, making it an excellent value proposition.`;
        break;
    }

    return { line1, line2, line3 };
  };

  const summary = generateSummary();

  const toggleFeature = (featureName: string) => {
    setExpandedFeatures((prev) => {
      const next = new Set(prev);
      if (next.has(featureName)) {
        next.delete(featureName);
      } else {
        next.add(featureName);
      }
      return next;
    });
  };

  const removePolicy = (policyId: string) => {
    setPolicies((prev) => prev.filter((p) => p.id !== policyId));
    if (policies.length <= 2) {
      setLocation("/compare");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 relative">
      {/* Animated background elements */}
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
              <Scale className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="font-bold text-2xl bg-gradient-to-r from-[#1A3A52] to-[#4A9B9E] bg-clip-text text-transparent">
                Policy Comparison
              </span>
              <div className="text-[10px] text-gray-500 dark:text-gray-400 -mt-1">
                Compare multiple policies side-by-side
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

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="space-y-6">
          {/* Comparison Summary Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Comparison summary</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {comparisonAnalysis.keyDifferencesTotal} key differences
              </p>
            </div>
          </div>

          {/* Policy Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {policiesWithScores.map((p, idx) => (
              <Card
                key={p.id}
                className={`relative border-2 ${
                  idx === 0
                    ? "border-[#3CBBA0] dark:border-[#4A9B9E] bg-gradient-to-br from-green-50 to-teal-50 dark:from-gray-800 dark:to-gray-700"
                    : "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800"
                }`}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6"
                  onClick={() => removePolicy(p.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 className="w-8 h-8 text-[#1A3A52] dark:text-[#4A9B9E]" />
                    <div>
                      <div className="font-bold text-sm text-gray-900 dark:text-gray-100">
                        {p.policy.basic_info?.insurer || "Unknown"}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {p.policy.basic_info?.plan_name || "Unknown"}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">Cover</div>
                      <div className="font-bold text-lg text-gray-900 dark:text-gray-100">
                        {p.policy.coverage?.base_si?.display || "N/A"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">Premium</div>
                      <div className="font-bold text-lg text-gray-900 dark:text-gray-100">
                        {p.policy.coverage.annual_premium?.display || `₹${(p.policy.coverage.annual_premium?.amount || 0).toLocaleString("en-IN")}`}
                      </div>
                      {p.policy.coverage.annual_premium?.amount && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          ₹{Math.round(p.policy.coverage.annual_premium.amount / 12).toLocaleString("en-IN")}/month
                        </div>
                      )}
                    </div>
                    {idx === 0 && (
                      <div className="mt-2">
                        <span className="text-xs bg-[#3CBBA0] text-white px-2 py-1 rounded">
                          Best Match
                        </span>
                      </div>
                    )}
                    <Button
                      className="w-full mt-3 bg-orange-500 hover:bg-orange-600 text-white"
                      size="sm"
                    >
                      Customize plan &gt;
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Best Match Recommendation */}
          {bestMatch && (
            <Card className="shadow-lg border-2 border-[#3CBBA0] dark:border-[#4A9B9E] bg-gradient-to-br from-green-50 to-teal-50 dark:from-gray-800 dark:to-gray-700">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      <CheckCircle2 className="w-6 h-6 text-[#3CBBA0]" />
                      Best Match for You
                    </CardTitle>
                    <CardDescription className="text-base mt-1 text-gray-700 dark:text-gray-300">
                      Based on your priority: {profile.priorityNeed.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-black text-[#3CBBA0]">{bestMatch.score}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Match Score</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4 border border-gray-200 dark:border-gray-600">
                  <p className="text-base text-gray-900 dark:text-gray-100 leading-relaxed mb-2">
                    {summary.line1}
                  </p>
                  <p className="text-base text-gray-900 dark:text-gray-100 leading-relaxed mb-2">
                    {summary.line2}
                  </p>
                  <p className="text-base text-gray-900 dark:text-gray-100 leading-relaxed">
                    {summary.line3}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Detailed Comparison by Categories */}
          <Card className="shadow-lg border-gray-200 dark:border-gray-600 bg-white/90 dark:bg-gray-800/80 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Detailed comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b-2 border-gray-300 dark:border-gray-600">
                      <th className="text-left p-3 font-semibold text-gray-900 dark:text-gray-100 sticky left-0 bg-white dark:bg-gray-800 z-10 min-w-[250px]">
                        Feature
                      </th>
                      {policiesWithScores.map((p) => (
                        <th
                          key={p.id}
                          className="text-center p-3 font-semibold text-gray-900 dark:text-gray-100 min-w-[200px]"
                        >
                          <div className="flex flex-col items-center gap-1">
                            <div className="text-sm font-bold">{p.policy.basic_info?.insurer || "Unknown"}</div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              {p.policy.basic_info?.plan_name || "Unknown"}
                            </div>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonAnalysis.categories.map((category) => (
                      <React.Fragment key={category.name}>
                        {/* Category Header */}
                        <tr className="bg-gray-100 dark:bg-gray-700/50">
                          <td
                            colSpan={policiesWithScores.length + 1}
                            className="p-3 font-bold text-gray-900 dark:text-gray-100"
                          >
                            <div className="flex items-center justify-between">
                              <span>{category.name}</span>
                              {category.keyDifferencesCount > 0 && (
                                <span className="text-xs font-normal text-gray-600 dark:text-gray-400">
                                  {category.keyDifferencesCount} key difference{category.keyDifferencesCount > 1 ? "s" : ""}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                        {/* Category Features */}
                        {category.features.map((feature) => {
                          const isExpanded = expandedFeatures.has(feature.name);
                          return (
                            <tr
                              key={feature.name}
                              className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                            >
                              <td className="p-3 font-medium text-gray-900 dark:text-gray-100 sticky left-0 bg-white dark:bg-gray-800 z-10">
                                <button
                                  onClick={() => toggleFeature(feature.name)}
                                  className="flex items-center gap-2 w-full text-left hover:text-[#3CBBA0] transition-colors"
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="w-4 h-4" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4" />
                                  )}
                                  <span>{feature.name}</span>
                                </button>
                                {isExpanded && feature.description && (
                                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 ml-6">
                                    {feature.description}
                                  </p>
                                )}
                              </td>
                              {feature.values.map((val) => (
                                <td key={val.policyId} className="p-3 text-center text-gray-700 dark:text-gray-300">
                                  <div className="flex flex-col items-center gap-1">
                                    {val.isBest && (
                                      <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-0.5 rounded flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3" />
                                        Best in this comparison
                                      </span>
                                    )}
                                    {val.isAvailable ? (
                                      <span>{String(val.value)}</span>
                                    ) : (
                                      <X className="w-5 h-5 text-red-500" />
                                    )}
                                  </div>
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between gap-4 pt-6">
                <Button variant="outline" onClick={() => setLocation("/compare/profile")}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    // Clear everything synchronously
                    clearAll();
                    // Force immediate navigation - the provider's useEffect will catch the flag
                    setLocation("/compare");
                  }}
                >
                  Compare More Policies
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
