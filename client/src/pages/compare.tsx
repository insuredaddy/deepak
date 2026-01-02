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
  FileText,
  Upload,
  X,
  CheckCircle2,
  Loader2,
  Home,
  Sun,
  Moon,
  ArrowRight,
  ArrowLeft,
  Scale,
  AlertCircle,
} from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { useDropzone } from "react-dropzone";
import type { PolicyData } from "@/types/policy";
import { Combobox } from "@/components/ui/combobox";
import { getAllStates, getCitiesForState } from "@/lib/indian-cities-data";

/* Circular Progress Component */
function CircularProgress({ progress, size = 48 }: { progress: number; size?: number }) {
  const radius = (size - 6) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;
  
  const getColor = () => {
    if (progress >= 80) return "#3CBBA0";
    if (progress >= 60) return "#4A9B9E";
    if (progress >= 40) return "#F59E0B";
    return "#E07856";
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth="3"
          fill="none"
          className="text-gray-200 dark:text-gray-700"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={getColor()}
          strokeWidth="3"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-300 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold text-gray-900 dark:text-gray-100">
          {Math.round(progress)}%
        </span>
      </div>
    </div>
  );
}

type UploadStatus = "idle" | "uploading" | "extracting" | "success" | "error";

interface UploadedPolicy {
  id: string;
  file: File;
  status: UploadStatus;
  policyData?: PolicyData;
  error?: string;
  progress?: string;
  progressPercent?: number;
}

interface ComparisonProfile {
  age: number | undefined;
  city: string;
  state: string;
  preExistingConditions: string[];
  householdIncome: number | undefined;
  familySize: number | undefined;
  priorityNeed: "cancer_coverage" | "cardiac_coverage" | "room_rent" | "lowest_premium" | "best_balance" | "";
}

export default function ComparePage() {
  const [, setLocation] = useLocation();
  const { theme, toggle: toggleTheme } = useTheme();
  const [currentStep, setCurrentStep] = useState(1); // 1: Upload, 2: Profile, 3: Results
  const [policies, setPolicies] = useState<UploadedPolicy[]>([]);
  const [profile, setProfile] = useState<ComparisonProfile>({
    age: undefined,
    city: "",
    state: "",
    preExistingConditions: [],
    householdIncome: undefined,
    familySize: undefined,
    priorityNeed: "",
  });
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [selectedState, setSelectedState] = useState<string>("");

  const onDrop = async (acceptedFiles: File[]) => {
    console.log("📥 Files dropped:", acceptedFiles.length, "files");
    // Limit to 4 policies total
    const remainingSlots = 4 - policies.length;
    const filesToAdd = acceptedFiles.slice(0, remainingSlots);
    console.log("✅ Adding", filesToAdd.length, "files (remaining slots:", remainingSlots, ")");

    const newPolicies: UploadedPolicy[] = filesToAdd.map((file) => ({
      id: Math.random().toString(36).substring(7),
      file,
      status: "idle" as UploadStatus,
    }));

    console.log("📋 New policies created:", newPolicies.map(p => ({ id: p.id, name: p.file.name })));
    
    // Add policies to state first
    setPolicies((prev) => [...prev, ...newPolicies]);

    // Auto-start extraction for new policies - pass file directly to avoid race condition
    console.log("🚀 Starting extraction for", newPolicies.length, "policies...");
    newPolicies.forEach((policy) => {
      console.log("▶️ Calling extractPolicy for:", policy.id, policy.file.name);
      // Pass file directly to avoid state race condition
      extractPolicy(policy.id, policy.file);
    });
  };

  const extractPolicy = async (policyId: string, file?: File) => {
    console.log("🔵 extractPolicy called for policyId:", policyId);
    let policyFile: File | null = file || null;

    // If file not passed, try to get from state
    if (!policyFile) {
      setPolicies((prev) => {
        const policy = prev.find((p) => p.id === policyId);
        if (!policy) {
          console.error("❌ Policy not found:", policyId);
          return prev;
        }
        policyFile = policy.file;
        console.log("📄 Policy file found in state:", policyFile.name, "Size:", policyFile.size);
        return prev;
      });
    } else {
      console.log("📄 Policy file passed directly:", policyFile.name, "Size:", policyFile.size);
    }

    if (!policyFile) {
      console.error("❌ No policy file found!");
      return;
    }

    // Update status to uploading
    setPolicies((prev) =>
      prev.map((p) =>
        p.id === policyId ? { ...p, status: "uploading", progress: "Uploading file...", progressPercent: 5 } : p
      )
    );

    let uploadProgressInterval: NodeJS.Timeout | null = null;
    let extractionProgressInterval: NodeJS.Timeout | null = null;

    try {
      console.log("📤 Creating FormData and preparing upload...");
      const formData = new FormData();
      formData.append("policy_pdf", policyFile);
      console.log("✅ FormData created, file appended");

      // Simulate upload progress (0-50%)
      uploadProgressInterval = setInterval(() => {
        setPolicies((prev) => {
          const current = prev.find((p) => p.id === policyId);
          if (!current || current.status !== "uploading" || (current.progressPercent || 0) >= 50) {
            if ((current?.progressPercent || 0) >= 50 && uploadProgressInterval) {
              clearInterval(uploadProgressInterval);
            }
            return prev;
          }
          const currentPercent = current.progressPercent || 5;
          const newPercent = Math.min(50, currentPercent + 2);
          return prev.map((p) =>
            p.id === policyId
              ? { ...p, progressPercent: newPercent }
              : p
          );
        });
      }, 200);

      // Use fetch() API like the working /api/analyze endpoint
      console.log("🚀 Sending POST to /api/extract-policy");
      const response = await fetch("/api/extract-policy", {
        method: "POST",
        body: formData,
      });

      // Clear upload progress interval
      if (uploadProgressInterval) {
        clearInterval(uploadProgressInterval);
      }

      console.log("📥 Response status:", response.status);
      console.log("📥 Response ok:", response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Backend error response:", errorText);
        throw new Error(`Backend returned ${response.status}: ${errorText}`);
      }

      // Update to extracting
      setPolicies((prev) =>
        prev.map((p) =>
          p.id === policyId
            ? { ...p, status: "extracting", progress: "Extracting policy data...", progressPercent: 50 }
            : p
        )
      );

      // Start extraction progress simulation
      extractionProgressInterval = setInterval(() => {
        setPolicies((prev) => {
          const policy = prev.find((p) => p.id === policyId);
          if (!policy || policy.status !== "extracting" || (policy.progressPercent || 0) >= 95) {
            if (extractionProgressInterval) {
              clearInterval(extractionProgressInterval);
            }
            return prev;
          }
          const currentPercent = policy.progressPercent || 50;
          const increment = Math.random() * 3 + 1; // 1-4% increments
          const newPercent = Math.min(95, currentPercent + increment);
          return prev.map((p) =>
            p.id === policyId
              ? { ...p, progressPercent: newPercent }
              : p
          );
        });
      }, 300);

      const contentType = response.headers.get("content-type");
      console.log("📋 Content-Type:", contentType);

      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("❌ Non-JSON response:", text.substring(0, 200));
        throw new Error("Backend did not return JSON");
      }

      const result = await response.json();
      console.log("✅ Received JSON data:", result);

      if (!result.extracted_data) {
        console.error("Missing extracted_data in response:", result);
        throw new Error("Invalid response: missing extracted_data");
      }

      // Update to success
      console.log("Extraction successful, updating policy:", result);
      setPolicies((prev) =>
        prev.map((p) =>
          p.id === policyId
            ? {
                ...p,
                status: "success",
                policyData: result.extracted_data,
                progress: undefined,
                progressPercent: 100,
              }
            : p
        )
      );
    } catch (error: any) {
      console.error("Extraction error caught:", error);
      if (uploadProgressInterval) {
        clearInterval(uploadProgressInterval);
      }
      if (extractionProgressInterval) {
        clearInterval(extractionProgressInterval);
      }
      setPolicies((prev) =>
        prev.map((p) =>
          p.id === policyId
            ? {
                ...p,
                status: "error",
                error: error.message || "Failed to extract policy",
                progress: undefined,
                progressPercent: undefined,
              }
            : p
        )
      );
    }
  };

  const removePolicy = (policyId: string) => {
    setPolicies((prev) => prev.filter((p) => p.id !== policyId));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    multiple: true,
    disabled: policies.length >= 4,
  });

  const canProceed = policies.length >= 2 && policies.every((p) => p.status === "success");

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

      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Step 1: Upload Policies */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <Card className="shadow-lg border-gray-200 dark:border-gray-600 bg-white/90 dark:bg-gray-800/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Upload Policies to Compare
                </CardTitle>
                <CardDescription className="text-base mt-1 text-gray-700 dark:text-gray-300">
                  Upload 2-4 insurance policy PDFs. Each will be automatically extracted and analyzed.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Upload Area */}
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
                    isDragActive
                      ? "border-[#1A3A52] dark:border-[#4A9B9E] bg-blue-50 dark:bg-blue-900/20"
                      : "border-gray-300 dark:border-gray-600 hover:border-[#4A9B9E] dark:hover:border-[#3CBBA0]"
                  } ${policies.length >= 4 ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <input {...getInputProps()} />
                  <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
                  <p className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    {isDragActive
                      ? "Drop policies here"
                      : policies.length >= 4
                      ? "Maximum 4 policies reached"
                      : "Drag & drop policy PDFs here, or click to browse"}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {policies.length >= 4
                      ? "Remove a policy to add another"
                      : `${policies.length}/4 policies uploaded`}
                  </p>
                </div>

                {/* Uploaded Policies List */}
                {policies.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                      Uploaded Policies
                    </h3>
                    {policies.map((policy) => (
                      <div
                        key={policy.id}
                        className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700/50"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <FileText className="w-5 h-5 text-gray-400" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                              {policy.file.name}
                            </p>
                            {policy.status === "success" && policy.policyData && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {policy.policyData.basic_info.insurer} - {policy.policyData.basic_info.plan_name} • {policy.policyData.coverage.base_si.display} • {policy.policyData.coverage.annual_premium.display}
                              </p>
                            )}
                            {(policy.status === "uploading" || policy.status === "extracting") && policy.progress && (
                              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                {policy.progress} {policy.progressPercent !== undefined && `(${Math.round(policy.progressPercent)}%)`}
                              </p>
                            )}
                            {policy.status === "error" && policy.error && (
                              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                                {policy.error}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {policy.status === "uploading" || policy.status === "extracting" ? (
                            <CircularProgress progress={policy.progressPercent || 0} size={48} />
                          ) : policy.status === "success" ? (
                            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                          ) : policy.status === "error" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => extractPolicy(policy.id)}
                              className="text-xs"
                            >
                              Retry
                            </Button>
                          ) : null}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removePolicy(policy.id)}
                            className="h-8 w-8"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end gap-4 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setLocation("/")}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => setCurrentStep(2)}
                    disabled={!canProceed}
                    className="bg-[#1A3A52] hover:bg-[#2d5a7b] dark:bg-[#4A9B9E] dark:hover:bg-[#5aabb0] disabled:opacity-50"
                  >
                    Next: Enter Profile
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 2: Profile Input */}
        {currentStep === 2 && (
          <Card className="shadow-lg border-gray-200 dark:border-gray-600 bg-white/90 dark:bg-gray-800/80 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Your Profile
              </CardTitle>
              <CardDescription className="text-base mt-1 text-gray-700 dark:text-gray-300">
                Tell us about yourself to get personalized policy recommendations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Age */}
                <div className="space-y-2">
                  <Label htmlFor="age" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Age <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="age"
                    type="number"
                    min="1"
                    max="100"
                    value={profile.age || ""}
                    onChange={(e) => {
                      const value = e.target.value ? parseInt(e.target.value) : undefined;
                      setProfile((prev) => ({ ...prev, age: value }));
                      if (profileErrors.age) {
                        setProfileErrors((prev) => ({ ...prev, age: undefined }));
                      }
                    }}
                    placeholder="Enter your age"
                    className="h-10 text-gray-900 dark:text-gray-100"
                  />
                  {profileErrors.age && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {profileErrors.age}
                    </p>
                  )}
                </div>

                {/* Household Income */}
                <div className="space-y-2">
                  <Label htmlFor="income" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Annual Household Income (₹) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="income"
                    type="number"
                    min="0"
                    value={profile.householdIncome || ""}
                    onChange={(e) => {
                      const value = e.target.value ? parseInt(e.target.value) : undefined;
                      setProfile((prev) => ({ ...prev, householdIncome: value }));
                      if (profileErrors.householdIncome) {
                        setProfileErrors((prev) => ({ ...prev, householdIncome: undefined }));
                      }
                    }}
                    placeholder="e.g., 1000000"
                    className="h-10 text-gray-900 dark:text-gray-100"
                  />
                  {profileErrors.householdIncome && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {profileErrors.householdIncome}
                    </p>
                  )}
                </div>

                {/* State */}
                <div className="space-y-2">
                  <Label htmlFor="state" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    State <span className="text-red-500">*</span>
                  </Label>
                  <Combobox
                    options={getAllStates().map((state) => ({
                      value: state,
                      label: state,
                    }))}
                    value={selectedState}
                    onValueChange={(value) => {
                      setSelectedState(value);
                      setProfile((prev) => ({ ...prev, state: value, city: "" }));
                      if (profileErrors.state) {
                        setProfileErrors((prev) => ({ ...prev, state: undefined }));
                      }
                    }}
                    placeholder="Select your state"
                    searchPlaceholder="Search state..."
                    emptyMessage="No state found"
                    className={`h-10 ${profileErrors.state ? "border-red-500" : ""}`}
                  />
                  {profileErrors.state && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {profileErrors.state}
                    </p>
                  )}
                </div>

                {/* City */}
                <div className="space-y-2">
                  <Label htmlFor="city" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    City <span className="text-red-500">*</span>
                  </Label>
                  {selectedState ? (
                    <Combobox
                      options={getCitiesForState(selectedState).map((city) => ({
                        value: city,
                        label: city,
                      }))}
                      value={profile.city}
                      onValueChange={(value) => {
                        setProfile((prev) => ({ ...prev, city: value }));
                        if (profileErrors.city) {
                          setProfileErrors((prev) => ({ ...prev, city: undefined }));
                        }
                      }}
                      placeholder="Select your city"
                      searchPlaceholder="Search city..."
                      emptyMessage="No city found"
                      className={`h-10 ${profileErrors.city ? "border-red-500" : ""}`}
                    />
                  ) : (
                    <div className="text-sm text-gray-500 dark:text-gray-400 p-3 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800/50">
                      Please select a state first
                    </div>
                  )}
                  {profileErrors.city && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {profileErrors.city}
                    </p>
                  )}
                </div>

                {/* Family Size */}
                <div className="space-y-2">
                  <Label htmlFor="familySize" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Family Size <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="familySize"
                    type="number"
                    min="1"
                    max="20"
                    value={profile.familySize || ""}
                    onChange={(e) => {
                      const value = e.target.value ? parseInt(e.target.value) : undefined;
                      setProfile((prev) => ({ ...prev, familySize: value }));
                      if (profileErrors.familySize) {
                        setProfileErrors((prev) => ({ ...prev, familySize: undefined }));
                      }
                    }}
                    placeholder="Number of family members"
                    className="h-10 text-gray-900 dark:text-gray-100"
                  />
                  {profileErrors.familySize && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {profileErrors.familySize}
                    </p>
                  )}
                </div>

                {/* Priority Need */}
                <div className="space-y-2">
                  <Label htmlFor="priority" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Priority Need <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={profile.priorityNeed}
                    onValueChange={(value: any) => {
                      setProfile((prev) => ({ ...prev, priorityNeed: value }));
                      if (profileErrors.priorityNeed) {
                        setProfileErrors((prev) => ({ ...prev, priorityNeed: undefined }));
                      }
                    }}
                  >
                    <SelectTrigger className={`h-10 text-gray-900 dark:text-gray-100 ${profileErrors.priorityNeed ? "border-red-500" : ""}`}>
                      <SelectValue placeholder="What's most important to you?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cancer_coverage">Cancer Coverage</SelectItem>
                      <SelectItem value="cardiac_coverage">Cardiac Coverage</SelectItem>
                      <SelectItem value="room_rent">Room Rent Adequacy</SelectItem>
                      <SelectItem value="lowest_premium">Lowest Premium</SelectItem>
                      <SelectItem value="best_balance">Best Overall Balance</SelectItem>
                    </SelectContent>
                  </Select>
                  {profileErrors.priorityNeed && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {profileErrors.priorityNeed}
                    </p>
                  )}
                </div>
              </div>

              {/* Pre-existing Conditions */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Pre-existing Conditions (Select all that apply)
                </Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { id: "diabetes", label: "Diabetes" },
                    { id: "hypertension", label: "Hypertension" },
                    { id: "cardiac", label: "Cardiac History" },
                    { id: "cancer", label: "Cancer History" },
                    { id: "none", label: "None" },
                  ].map((condition) => (
                    <div key={condition.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={condition.id}
                        checked={profile.preExistingConditions.includes(condition.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            if (condition.id === "none") {
                              setProfile((prev) => ({ ...prev, preExistingConditions: ["none"] }));
                            } else {
                              setProfile((prev) => ({
                                ...prev,
                                preExistingConditions: prev.preExistingConditions
                                  .filter((c) => c !== "none")
                                  .concat(condition.id),
                              }));
                            }
                          } else {
                            setProfile((prev) => ({
                              ...prev,
                              preExistingConditions: prev.preExistingConditions.filter((c) => c !== condition.id),
                            }));
                          }
                        }}
                      />
                      <Label
                        htmlFor={condition.id}
                        className="text-sm font-normal text-gray-700 dark:text-gray-300 cursor-pointer"
                      >
                        {condition.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between gap-4 pt-4">
                <Button variant="outline" onClick={() => setCurrentStep(1)}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={() => {
                    // Validate
                    const errors: Record<string, string> = {};
                    if (!profile.age || profile.age < 1 || profile.age > 100) {
                      errors.age = "Please enter a valid age (1-100)";
                    }
                    if (!profile.householdIncome || profile.householdIncome < 0) {
                      errors.householdIncome = "Please enter a valid annual income";
                    }
                    if (!profile.state) {
                      errors.state = "Please select your state";
                    }
                    if (!profile.city) {
                      errors.city = "Please select your city";
                    }
                    if (!profile.familySize || profile.familySize < 1) {
                      errors.familySize = "Please enter a valid family size";
                    }
                    if (!profile.priorityNeed) {
                      errors.priorityNeed = "Please select your priority need";
                    }

                    if (Object.keys(errors).length > 0) {
                      setProfileErrors(errors);
                      return;
                    }

                    setProfileErrors({});
                    setCurrentStep(3);
                  }}
                  className="bg-[#1A3A52] hover:bg-[#2d5a7b] dark:bg-[#4A9B9E] dark:hover:bg-[#5aabb0]"
                >
                  Compare Policies
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Comparison Results */}
        {currentStep === 3 && (() => {
          const successfulPolicies = policies.filter((p) => p.status === "success" && p.policyData);
          
          // Calculate scores based on priority need
          const calculateScore = (policy: PolicyData): number => {
            let score = 0;
            const baseSI = policy.coverage.base_si.amount;
            const premium = policy.coverage.annual_premium.amount;
            const roomRentUnlimited = policy.coverage.room_rent.unlimited;
            const copayPercent = policy.coverage.copay.percent || 0;
            
            switch (profile.priorityNeed) {
              case "cancer_coverage":
                // Score based on cancer sub-limit, waiting period, and coverage
                const cancerSublimit = policy.sub_limits.cancer.limit_amount;
                const cancerWaiting = policy.waiting_periods.specific_diseases.cancer?.months || 999;
                score += (cancerSublimit || baseSI) / 10000; // Higher sub-limit = better
                score -= cancerWaiting * 10; // Lower waiting period = better
                if (policy.riders.critical_illness?.available) score += 50;
                break;
                
              case "cardiac_coverage":
                const cardiacSublimit = policy.sub_limits.cardiac.limit_amount;
                const cardiacWaiting = policy.waiting_periods.specific_diseases.cardiac?.months || 999;
                score += (cardiacSublimit || baseSI) / 10000;
                score -= cardiacWaiting * 10;
                if (policy.riders.critical_illness?.available) score += 50;
                break;
                
              case "room_rent":
                if (roomRentUnlimited) score += 100;
                else if (policy.coverage.room_rent.amount && policy.coverage.room_rent.amount > 5000) score += 50;
                score -= copayPercent * 2; // Lower co-pay = better
                break;
                
              case "lowest_premium":
                // Lower premium = higher score (inverted)
                score = 1000000 / (premium || 1);
                break;
                
              case "best_balance":
              default:
                // Balanced scoring
                score += baseSI / 10000; // Higher SI = better
                score -= premium / 100; // Lower premium = better
                if (roomRentUnlimited) score += 30;
                score -= copayPercent * 2;
                if (policy.restoration.type === "unlimited") score += 20;
                break;
            }
            
            return Math.round(score);
          };
          
          const policiesWithScores = successfulPolicies.map((p) => ({
            policy: p.policyData!,
            score: calculateScore(p.policyData!),
            id: p.id,
          })).sort((a, b) => b.score - a.score);
          
          const bestMatch = policiesWithScores[0];
          
          return (
            <div className="space-y-6">
              {/* Best Match Recommendation */}
              {bestMatch && (() => {
                // Generate summary based on priority and policy features
                const generateSummary = () => {
                  const policy = bestMatch.policy;
                  const priority = profile.priorityNeed;
                  
                  let line1 = "";
                  let line2 = "";
                  let line3 = "";
                  
                  switch (priority) {
                    case "cancer_coverage":
                      const cancerLimit = policy.sub_limits.cancer.limit_amount || policy.coverage.base_si.amount;
                      const cancerWaiting = policy.waiting_periods.specific_diseases.cancer?.months || 0;
                      line1 = `${policy.basic_info.insurer} - ${policy.basic_info.plan_name} is your best match for cancer coverage.`;
                      line2 = `It offers ${policy.sub_limits.cancer.unlimited ? "unlimited" : `₹${(cancerLimit / 100000).toFixed(1)}L`} cancer coverage with ${cancerWaiting > 0 ? `only ${cancerWaiting} months` : "minimal"} waiting period.`;
                      line3 = `With ${policy.coverage.base_si.display} base SI and ${policy.coverage.copay.exists ? `${policy.coverage.copay.percent}%` : "no"} co-pay, this policy provides comprehensive protection at ₹${(policy.coverage.annual_premium.amount / 1000).toFixed(1)}K/year.`;
                      break;
                      
                    case "cardiac_coverage":
                      const cardiacLimit = policy.sub_limits.cardiac.limit_amount || policy.coverage.base_si.amount;
                      const cardiacWaiting = policy.waiting_periods.specific_diseases.cardiac?.months || 0;
                      line1 = `${policy.basic_info.insurer} - ${policy.basic_info.plan_name} is your best match for cardiac coverage.`;
                      line2 = `It provides ${policy.sub_limits.cardiac.unlimited ? "unlimited" : `₹${(cardiacLimit / 100000).toFixed(1)}L`} cardiac coverage with ${cardiacWaiting > 0 ? `only ${cardiacWaiting} months` : "minimal"} waiting period for heart-related procedures.`;
                      line3 = `The policy offers ${policy.coverage.base_si.display} base coverage, ${policy.coverage.room_rent.unlimited ? "unlimited room rent" : `room rent up to ${policy.coverage.room_rent.display}`}, and ${policy.coverage.copay.exists ? `${policy.coverage.copay.percent}%` : "no"} co-pay at ₹${(policy.coverage.annual_premium.amount / 1000).toFixed(1)}K/year.`;
                      break;
                      
                    case "room_rent":
                      line1 = `${policy.basic_info.insurer} - ${policy.basic_info.plan_name} is your best match for room rent adequacy.`;
                      line2 = `It offers ${policy.coverage.room_rent.unlimited ? "unlimited room rent" : `room rent of ${policy.coverage.room_rent.display}`}, ensuring you can choose any room category without coverage reduction.`;
                      line3 = `With ${policy.coverage.base_si.display} base SI, ${policy.coverage.copay.exists ? `${policy.coverage.copay.percent}%` : "no"} co-pay, and annual premium of ₹${(policy.coverage.annual_premium.amount / 1000).toFixed(1)}K, this policy provides excellent value.`;
                      break;
                      
                    case "lowest_premium":
                      line1 = `${policy.basic_info.insurer} - ${policy.basic_info.plan_name} is your best match for lowest premium.`;
                      line2 = `At ₹${policy.coverage.annual_premium.display}, it offers the most affordable coverage among all compared policies.`;
                      line3 = `Despite its lower premium, you still get ${policy.coverage.base_si.display} base SI, ${policy.coverage.room_rent.unlimited ? "unlimited room rent" : `room rent of ${policy.coverage.room_rent.display}`}, and ${policy.coverage.copay.exists ? `${policy.coverage.copay.percent}%` : "no"} co-pay.`;
                      break;
                      
                    case "best_balance":
                    default:
                      line1 = `${policy.basic_info.insurer} - ${policy.basic_info.plan_name} is your best overall match.`;
                      line2 = `It strikes the perfect balance with ${policy.coverage.base_si.display} base SI, ${policy.coverage.room_rent.unlimited ? "unlimited room rent" : `room rent of ${policy.coverage.room_rent.display}`}, and ${policy.coverage.copay.exists ? `${policy.coverage.copay.percent}%` : "no"} co-pay.`;
                      line3 = `At ₹${policy.coverage.annual_premium.display}, this policy offers comprehensive coverage with ${policy.restoration.type === "unlimited" ? "unlimited restoration" : policy.restoration.type || "no restoration"}, making it an excellent value proposition.`;
                      break;
                  }
                  
                  return { line1, line2, line3 };
                };
                
                const summary = generateSummary();
                
                return (
                  <Card className="shadow-lg border-2 border-[#3CBBA0] dark:border-[#4A9B9E] bg-gradient-to-br from-green-50 to-teal-50 dark:from-gray-800 dark:to-gray-700">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            <CheckCircle2 className="w-6 h-6 text-[#3CBBA0]" />
                            Best Match for You
                          </CardTitle>
                          <CardDescription className="text-base mt-1 text-gray-700 dark:text-gray-300">
                            Based on your priority: {profile.priorityNeed.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                          </CardDescription>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-black text-[#3CBBA0]">{bestMatch.score}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">Match Score</div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {/* 3-line Summary */}
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
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
                        {bestMatch.policy.basic_info.insurer} - {bestMatch.policy.basic_info.plan_name}
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-gray-600 dark:text-gray-400">Base SI</div>
                          <div className="font-semibold text-gray-900 dark:text-gray-100">{bestMatch.policy.coverage.base_si.display}</div>
                        </div>
                        <div>
                          <div className="text-gray-600 dark:text-gray-400">Annual Premium</div>
                          <div className="font-semibold text-gray-900 dark:text-gray-100">{bestMatch.policy.coverage.annual_premium.display}</div>
                        </div>
                        <div>
                          <div className="text-gray-600 dark:text-gray-400">Room Rent</div>
                          <div className="font-semibold text-gray-900 dark:text-gray-100">{bestMatch.policy.coverage.room_rent.display}</div>
                        </div>
                        <div>
                          <div className="text-gray-600 dark:text-gray-400">Co-pay</div>
                          <div className="font-semibold text-gray-900 dark:text-gray-100">
                            {bestMatch.policy.coverage.copay.exists ? `${bestMatch.policy.coverage.copay.percent}%` : "None"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                );
              })()}
              
              {/* Side-by-Side Comparison Table */}
              <Card className="shadow-lg border-gray-200 dark:border-gray-600 bg-white/90 dark:bg-gray-800/80 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    Detailed Comparison
                  </CardTitle>
                  <CardDescription className="text-base mt-1 text-gray-700 dark:text-gray-300">
                    Compare all policies side-by-side
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b-2 border-gray-300 dark:border-gray-600">
                          <th className="text-left p-3 font-semibold text-gray-900 dark:text-gray-100 sticky left-0 bg-white dark:bg-gray-800 z-10">
                            Feature
                          </th>
                          {policiesWithScores.map((p, idx) => (
                            <th key={p.id} className="text-center p-3 font-semibold text-gray-900 dark:text-gray-100 min-w-[200px]">
                              <div className="flex flex-col items-center gap-1">
                                {idx === 0 && (
                                  <span className="text-xs bg-[#3CBBA0] text-white px-2 py-1 rounded">Best Match</span>
                                )}
                                <div className="text-sm">{p.policy.basic_info.insurer}</div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">{p.policy.basic_info.plan_name}</div>
                                <div className="text-xs text-[#3CBBA0] font-bold">Score: {p.score}</div>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {/* Base SI */}
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <td className="p-3 font-medium text-gray-900 dark:text-gray-100 sticky left-0 bg-white dark:bg-gray-800 z-10">
                            Base Sum Insured
                          </td>
                          {policiesWithScores.map((p) => (
                            <td key={p.id} className="p-3 text-center text-gray-700 dark:text-gray-300">
                              {p.policy.coverage.base_si.display}
                            </td>
                          ))}
                        </tr>
                        
                        {/* Annual Premium */}
                        <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
                          <td className="p-3 font-medium text-gray-900 dark:text-gray-100 sticky left-0 bg-gray-50 dark:bg-gray-700/30 z-10">
                            Annual Premium
                          </td>
                          {policiesWithScores.map((p) => (
                            <td key={p.id} className="p-3 text-center text-gray-700 dark:text-gray-300">
                              {p.policy.coverage.annual_premium.display}
                            </td>
                          ))}
                        </tr>
                        
                        {/* Room Rent */}
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <td className="p-3 font-medium text-gray-900 dark:text-gray-100 sticky left-0 bg-white dark:bg-gray-800 z-10">
                            Room Rent
                          </td>
                          {policiesWithScores.map((p) => (
                            <td key={p.id} className="p-3 text-center text-gray-700 dark:text-gray-300">
                              {p.policy.coverage.room_rent.display}
                            </td>
                          ))}
                        </tr>
                        
                        {/* Co-pay */}
                        <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
                          <td className="p-3 font-medium text-gray-900 dark:text-gray-100 sticky left-0 bg-gray-50 dark:bg-gray-700/30 z-10">
                            Co-pay
                          </td>
                          {policiesWithScores.map((p) => (
                            <td key={p.id} className="p-3 text-center text-gray-700 dark:text-gray-300">
                              {p.policy.coverage.copay.exists ? `${p.policy.coverage.copay.percent}%` : "None"}
                            </td>
                          ))}
                        </tr>
                        
                        {/* Cancer Sub-limit */}
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <td className="p-3 font-medium text-gray-900 dark:text-gray-100 sticky left-0 bg-white dark:bg-gray-800 z-10">
                            Cancer Coverage
                          </td>
                          {policiesWithScores.map((p) => (
                            <td key={p.id} className="p-3 text-center text-gray-700 dark:text-gray-300">
                              {p.policy.sub_limits.cancer.display}
                            </td>
                          ))}
                        </tr>
                        
                        {/* Cardiac Sub-limit */}
                        <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
                          <td className="p-3 font-medium text-gray-900 dark:text-gray-100 sticky left-0 bg-gray-50 dark:bg-gray-700/30 z-10">
                            Cardiac Coverage
                          </td>
                          {policiesWithScores.map((p) => (
                            <td key={p.id} className="p-3 text-center text-gray-700 dark:text-gray-300">
                              {p.policy.sub_limits.cardiac.display}
                            </td>
                          ))}
                        </tr>
                        
                        {/* Pre-existing Waiting Period */}
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <td className="p-3 font-medium text-gray-900 dark:text-gray-100 sticky left-0 bg-white dark:bg-gray-800 z-10">
                            Pre-existing Waiting Period
                          </td>
                          {policiesWithScores.map((p) => (
                            <td key={p.id} className="p-3 text-center text-gray-700 dark:text-gray-300">
                              {p.policy.waiting_periods.pre_existing_disease.months} months
                            </td>
                          ))}
                        </tr>
                        
                        {/* Restoration */}
                        <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
                          <td className="p-3 font-medium text-gray-900 dark:text-gray-100 sticky left-0 bg-gray-50 dark:bg-gray-700/30 z-10">
                            Restoration Benefit
                          </td>
                          {policiesWithScores.map((p) => (
                            <td key={p.id} className="p-3 text-center text-gray-700 dark:text-gray-300">
                              {p.policy.restoration.type === "unlimited" ? "Unlimited" : p.policy.restoration.type || "None"}
                            </td>
                          ))}
                        </tr>
                        
                        {/* Critical Illness Rider */}
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <td className="p-3 font-medium text-gray-900 dark:text-gray-100 sticky left-0 bg-white dark:bg-gray-800 z-10">
                            Critical Illness Rider
                          </td>
                          {policiesWithScores.map((p) => (
                            <td key={p.id} className="p-3 text-center text-gray-700 dark:text-gray-300">
                              {p.policy.riders.critical_illness?.available ? (
                                <div>
                                  <div>{p.policy.riders.critical_illness.coverage_display}</div>
                                  <div className="text-xs text-gray-600 dark:text-gray-400">
                                    +{p.policy.riders.critical_illness.base_premium_addition_display}
                                  </div>
                                </div>
                              ) : (
                                "Not Available"
                              )}
                            </td>
                          ))}
                        </tr>
                        
                        {/* Network Hospitals */}
                        <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
                          <td className="p-3 font-medium text-gray-900 dark:text-gray-100 sticky left-0 bg-gray-50 dark:bg-gray-700/30 z-10">
                            Network Hospitals
                          </td>
                          {policiesWithScores.map((p) => (
                            <td key={p.id} className="p-3 text-center text-gray-700 dark:text-gray-300">
                              {p.policy.network.hospital_network_count?.total?.toLocaleString() || "N/A"}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="flex justify-between gap-4 pt-6">
                    <Button variant="outline" onClick={() => setCurrentStep(2)}>
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setCurrentStep(1);
                        setPolicies([]);
                        setProfile({
                          age: undefined,
                          city: "",
                          state: "",
                          preExistingConditions: [],
                          householdIncome: undefined,
                          familySize: undefined,
                          priorityNeed: "",
                        });
                        setSelectedState("");
                      }}
                    >
                      Compare More Policies
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })()}
      </main>
    </div>
  );
}



