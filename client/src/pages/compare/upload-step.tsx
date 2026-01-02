import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FileText,
  Upload,
  X,
  CheckCircle2,
  ArrowRight,
  Home,
  Sun,
  Moon,
  Scale,
} from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { useDropzone } from "react-dropzone";
import { useComparison, type UploadedPolicy } from "@/hooks/use-comparison";
import type { PolicyData } from "@/types/policy";
import { CircularProgress } from "./circular-progress";

type UploadStatus = "idle" | "uploading" | "extracting" | "success" | "error";

export default function UploadStep() {
  const [, setLocation] = useLocation();
  const { theme, toggle: toggleTheme } = useTheme();
  const { policies, setPolicies } = useComparison();

  // Clear sessionStorage when navigating away from compare flow
  useEffect(() => {
    return () => {
      // Check if we're leaving the compare flow entirely
      setTimeout(() => {
        const isStillInCompareFlow = window.location.pathname.startsWith("/compare");
        if (!isStillInCompareFlow) {
          sessionStorage.removeItem("ensured_comparison_policies");
          sessionStorage.removeItem("ensured_comparison_profile");
        }
      }, 0);
    };
  }, []);

  const extractPolicy = async (policyId: string, file?: File) => {
    let policyFile: File | null = file || null;

    if (!policyFile) {
      setPolicies((prev) => {
        const policy = prev.find((p) => p.id === policyId);
        if (!policy) {
          console.error("❌ Policy not found:", policyId);
          return prev;
        }
        policyFile = policy.file;
        return prev;
      });
    }

    if (!policyFile) {
      console.error("❌ No policy file found!");
      return;
    }

    setPolicies((prev) =>
      prev.map((p) =>
        p.id === policyId ? { ...p, status: "uploading", progress: "Uploading file...", progressPercent: 5 } : p
      )
    );

    let uploadProgressInterval: NodeJS.Timeout | null = null;
    let extractionProgressInterval: NodeJS.Timeout | null = null;

    try {
      const formData = new FormData();
      formData.append("policy_pdf", policyFile);

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

      const response = await fetch("/api/extract-policy", {
        method: "POST",
        body: formData,
      });

      if (uploadProgressInterval) {
        clearInterval(uploadProgressInterval);
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Backend returned ${response.status}: ${errorText}`);
      }

      setPolicies((prev) =>
        prev.map((p) =>
          p.id === policyId
            ? { ...p, status: "extracting", progress: "Extracting policy data...", progressPercent: 50 }
            : p
        )
      );

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
          const increment = Math.random() * 3 + 1;
          const newPercent = Math.min(95, currentPercent + increment);
          return prev.map((p) =>
            p.id === policyId
              ? { ...p, progressPercent: newPercent }
              : p
          );
        });
      }, 300);

      const result = await response.json();

      if (!result.extracted_data) {
        throw new Error("Invalid response: missing extracted_data");
      }

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

  const onDrop = async (acceptedFiles: File[]) => {
    const remainingSlots = 4 - policies.length;
    const filesToAdd = acceptedFiles.slice(0, remainingSlots);

    const newPolicies: UploadedPolicy[] = filesToAdd.map((file) => ({
      id: Math.random().toString(36).substring(7),
      file,
      status: "idle" as UploadStatus,
    }));

    setPolicies((prev) => [...prev, ...newPolicies]);

    newPolicies.forEach((policy) => {
      extractPolicy(policy.id, policy.file);
    });
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
                onClick={() => setLocation("/compare/profile")}
                disabled={!canProceed}
                className="bg-[#1A3A52] hover:bg-[#2d5a7b] dark:bg-[#4A9B9E] dark:hover:bg-[#5aabb0] disabled:opacity-50"
              >
                Next: Enter Profile
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

