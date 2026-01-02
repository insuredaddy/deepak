import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { ShieldCheck, FileText, Brain, CheckCircle2, Loader2 } from "lucide-react";
import { useAnalysis } from "@/hooks/use-analysis";

const steps = [
  {
    id: 1,
    icon: FileText,
    title: "Reading Policy",
    description: "Extracting text from your PDF document",
    duration: 2000,
  },
  {
    id: 2,
    icon: Brain,
    title: "AI Analysis",
    description: "Analyzing coverage, limits, and exclusions",
    duration: 3000,
  },
  {
    id: 3,
    icon: ShieldCheck,
    title: "Generating Report",
    description: "Creating your sufficiency assessment",
    duration: 2000,
  },
];

export default function Processing() {
  const [, setLocation] = useLocation();
  const { state, status, error } = useAnalysis();
  const [activeStep, setActiveStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [startTime] = useState(Date.now());
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null);
  const [currentStepDetail, setCurrentStepDetail] = useState("");

  // Realistic step progression with dynamic timing
  useEffect(() => {
    // Step 1: Reading Policy (0-35%)
    const step1Start = setTimeout(() => {
      setActiveStep(0);
      setCurrentStepDetail("Scanning document pages...");
    }, 0);
    
    const step1Progress = setInterval(() => {
      setProgress((prev) => {
        if (prev < 35) {
          const increment = Math.random() * 2 + 0.5; // Random increment between 0.5-2.5%
          return Math.min(35, prev + increment);
        }
        return prev;
      });
    }, 150);

    // Step 2: AI Analysis (35-80%)
    const step2Start = setTimeout(() => {
      setActiveStep(1);
      setCurrentStepDetail("Analyzing coverage terms and conditions...");
      setProgress(35);
    }, 2000 + Math.random() * 1000);

    const step2Progress = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 35 && prev < 80) {
          const increment = Math.random() * 1.5 + 0.3; // Slower, more realistic
          return Math.min(80, prev + increment);
        }
        return prev;
      });
    }, 200);

    // Step 3: Generating Report (80-95%)
    const step3Start = setTimeout(() => {
      setActiveStep(2);
      setCurrentStepDetail("Compiling your personalized report...");
      setProgress(80);
    }, 5000 + Math.random() * 2000);

    const step3Progress = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 80 && prev < 95) {
          const increment = Math.random() * 1 + 0.2;
          return Math.min(95, prev + increment);
        }
        return prev;
      });
    }, 250);

    return () => {
      clearTimeout(step1Start);
      clearTimeout(step2Start);
      clearTimeout(step3Start);
      clearInterval(step1Progress);
      clearInterval(step2Progress);
      clearInterval(step3Progress);
    };
  }, []);

  // Calculate estimated time remaining based on progress
  useEffect(() => {
    const elapsed = (Date.now() - startTime) / 1000; // seconds
    if (progress > 5 && progress < 95) {
      const estimatedTotal = (elapsed / progress) * 100;
      const remaining = Math.max(0, estimatedTotal - elapsed);
      setEstimatedTimeRemaining(Math.round(remaining));
    } else if (progress >= 95) {
      setEstimatedTimeRemaining(null);
      setCurrentStepDetail("Finalizing report...");
    }
  }, [progress, startTime]);

  // Redirect when complete
  useEffect(() => {
    if (state.analysis && state.analysisId) {
      console.log("✅ Analysis complete, redirecting to report...");
      setProgress(100);
      setCurrentStepDetail("Report ready!");
      
      // Verify sessionStorage has the data before redirecting
      const stored = sessionStorage.getItem("ensured_report");
      if (!stored) {
        console.error("❌ No data in sessionStorage, waiting...");
        return;
      }
      
      try {
        const parsed = JSON.parse(stored);
        if (!parsed.page1 || !parsed.details) {
          console.error("❌ Invalid data in sessionStorage, waiting...");
          return;
        }
      } catch (err) {
        console.error("❌ Failed to parse sessionStorage data:", err);
        return;
      }
      
      // Small delay to ensure everything is ready
      setTimeout(() => {
        console.log("🚀 Redirecting to /report");
        setLocation("/report");
      }, 500);
    }
  }, [setLocation, state.analysis, state.analysisId]);

  // Handle errors
  useEffect(() => {
    if (status === "error" || error || state.error) {
      console.error("❌ Processing error detected:", error || state.error);
      setProgress(95); // Stop progress at 95% on error
    }
  }, [status, error, state.error]);

  const hasError = status === "error" || !!error || state.error;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-80 h-80 bg-blue-400/20 dark:bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-cyan-400/20 dark:bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative z-10 w-full max-w-3xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-[#1A3A52] to-[#4A9B9E] mb-6 shadow-2xl relative">
            <div className="absolute inset-0 bg-gradient-to-br from-[#1A3A52] to-[#4A9B9E] rounded-2xl blur-xl opacity-50 animate-pulse"></div>
            <ShieldCheck className="w-10 h-10 text-white relative z-10" />
          </div>
          
          <h1 className="text-4xl font-bold text-[#1A3A52] dark:text-[#4A9B9E] mb-3">
            Analyzing Your Policy
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Our AI is reading your document and performing a deterministic sufficiency check. This usually takes 30-60 seconds.
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-3 text-sm">
            <div className="flex flex-col">
              <span className="font-semibold text-gray-700 dark:text-gray-300">
                {currentStepDetail || "Processing..."}
              </span>
              {estimatedTimeRemaining !== null && estimatedTimeRemaining > 0 && (
                <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  ~{estimatedTimeRemaining}s remaining
                </span>
              )}
            </div>
            <span className="font-bold text-[#1A3A52] dark:text-[#4A9B9E] text-lg">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner">
            <div 
              className="h-full bg-gradient-to-r from-[#1A3A52] via-[#4A9B9E] to-[#3CBBA0] rounded-full transition-all duration-300 ease-out relative overflow-hidden"
              style={{ width: `${Math.min(100, progress)}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
            </div>
          </div>
        </div>

        {/* Steps */}
        {!hasError && (
          <div className="grid gap-4 mb-8">
            {steps.map((step, index) => {
              const isActive = index === activeStep;
              const isCompleted = index < activeStep;
              const Icon = step.icon;

              return (
                <div
                  key={step.id}
                  className={`relative bg-white dark:bg-gray-800 rounded-2xl p-6 border-2 transition-all duration-500 ${
                    isActive
                      ? "border-[#1A3A52] dark:border-[#4A9B9E] shadow-xl scale-[1.02] animate-pulse-subtle"
                      : isCompleted
                      ? "border-[#3CBBA0] dark:border-[#3CBBA0] shadow-md hover:scale-[1.01]"
                      : "border-gray-200 dark:border-gray-700 shadow-sm opacity-60"
                  }`}
                >
                  {/* Glow effect for active */}
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-[#1A3A52]/10 dark:from-[#4A9B9E]/10 to-[#4A9B9E]/10 dark:to-[#3CBBA0]/10 rounded-2xl blur-xl"></div>
                  )}

                  <div className="relative flex items-center gap-4">
                    {/* Icon */}
                    <div
                      className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all flex-shrink-0 ${
                        isActive
                          ? "bg-gradient-to-br from-[#1A3A52] to-[#4A9B9E] dark:from-[#4A9B9E] dark:to-[#3CBBA0] shadow-lg"
                          : isCompleted
                          ? "bg-[#3CBBA0]"
                          : "bg-gray-100 dark:bg-gray-700"
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-7 h-7 text-white" />
                      ) : isActive ? (
                        <Loader2 className="w-7 h-7 text-white animate-spin" />
                      ) : (
                        <Icon className={`w-7 h-7 ${isActive ? "text-white" : "text-gray-400"}`} />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3
                          className={`text-lg font-bold ${
                            isActive || isCompleted ? "text-[#1A3A52] dark:text-[#4A9B9E]" : "text-gray-400 dark:text-gray-500"
                          }`}
                        >
                          {step.title}
                        </h3>
                        {isActive && (
                          <span className="flex gap-1">
                            <span className="w-2 h-2 bg-[#1A3A52] dark:bg-[#4A9B9E] rounded-full animate-bounce"></span>
                            <span className="w-2 h-2 bg-[#1A3A52] dark:bg-[#4A9B9E] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                            <span className="w-2 h-2 bg-[#1A3A52] dark:bg-[#4A9B9E] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                          </span>
                        )}
                      </div>
                      <p
                        className={`text-sm ${
                          isActive || isCompleted ? "text-gray-600 dark:text-gray-300" : "text-gray-400 dark:text-gray-500"
                        }`}
                      >
                        {step.description}
                      </p>
                    </div>

                    {/* Step number */}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        isCompleted
                          ? "bg-[#3CBBA0]/10 dark:bg-[#3CBBA0]/20 text-[#3CBBA0]"
                          : isActive
                          ? "bg-[#1A3A52]/10 dark:bg-[#4A9B9E]/20 text-[#1A3A52] dark:text-[#4A9B9E]"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500"
                      }`}
                    >
                      {isCompleted ? "✓" : step.id}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Error State */}
        {hasError && (
          <div className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/30 dark:to-rose-900/30 border-2 border-red-200 dark:border-red-800 rounded-2xl p-8 text-center shadow-lg">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">⚠️</span>
            </div>
            <h3 className="text-xl font-bold text-red-900 dark:text-red-200 mb-2">
              Analysis Failed
            </h3>
            <p className="text-red-700 dark:text-red-300 mb-4">
              {error || state.error || "Unable to extract readable text from this document."}
            </p>
            <button
              onClick={() => window.location.href = "/"}
              className="px-6 py-2 bg-red-600 dark:bg-red-700 text-white rounded-lg font-semibold hover:bg-red-700 dark:hover:bg-red-600 transition-colors"
            >
              Try Another Document
            </button>
          </div>
        )}

        {/* Footer Note */}
        <div className="text-center text-sm text-gray-500 dark:text-gray-400 mt-8">
          <p>Large PDFs may take slightly longer. Please don't close this window.</p>
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
}