import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import { AnalysisResponse, AnalysisState } from "@/lib/types";

interface AnalysisContextType {
  state: AnalysisState;
  status: "idle" | "loading" | "success" | "error";
  error: string | null;
  analyze: (file: File) => Promise<AnalysisResponse>;
}

const AnalysisContext = createContext<AnalysisContextType | undefined>(
  undefined
);

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AnalysisState>({
    analysis: null,
    analysisId: null,
    lastUpdated: null,
    error: null,
  });
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);

  const analyze = async (file: File): Promise<AnalysisResponse> => {
    console.log("🔍 Starting analysis for file:", file.name);
    setStatus("loading");
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      console.log("📤 Sending POST to /api/analyze");
      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      console.log("📥 Response status:", response.status);
      console.log("📥 Response ok:", response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Backend error response:", errorText);
        throw new Error(`Backend returned ${response.status}: ${errorText}`);
      }

      const contentType = response.headers.get("content-type");
      console.log("📋 Content-Type:", contentType);

      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("❌ Non-JSON response:", text.substring(0, 200));
        throw new Error("Backend did not return JSON");
      }

      const data = await response.json();
      console.log("✅ Received JSON data:");
      console.log("   - Full data:", data);
      console.log("   - Keys:", Object.keys(data));
      console.log("   - page1:", data.page1);
      console.log("   - details:", data.details);
      console.log("   - recommendations:", data.recommendations);

      // Validate the data structure
      if (!data.page1) {
        console.error("❌ Missing page1 in data:", data);
        throw new Error("Backend response missing page1");
      }

      if (!data.details) {
        console.error("❌ Missing details in data:", data);
        throw new Error("Backend response missing details");
      }

      // Store in state
      setState({
        analysis: data,
        analysisId: data.id || `report-${Date.now()}`,
        lastUpdated: Date.now(),
        error: null,
      });

      // Store in sessionStorage (clear old data first to prevent race conditions)
      console.log("💾 Storing in sessionStorage...");
      sessionStorage.removeItem("ensured_report"); // Clear any old data first
      const jsonString = JSON.stringify(data);
      console.log("   - JSON length:", jsonString.length);
      sessionStorage.setItem("ensured_report", jsonString);

      // Verify storage
      const verify = sessionStorage.getItem("ensured_report");
      if (verify) {
        console.log("✓ SessionStorage verified - data length:", verify.length);
        const verifyParse = JSON.parse(verify);
        console.log("✓ Re-parsed from storage:", Object.keys(verifyParse));
      } else {
        console.error("❌ SessionStorage verification FAILED - data is null!");
      }

      setStatus("success");
      console.log("🎉 Analysis complete and stored successfully");
      return data;
    } catch (err: any) {
      console.error("❌ Analysis error:", err);
      console.error("   - Error name:", err.name);
      console.error("   - Error message:", err.message);
      if (err.stack) {
        console.error("   - Stack:", err.stack);
      }

      // Provide more helpful error messages
      let errorMessage =
        err.message || "Analysis failed - check console for details";

      if (err.name === "TypeError" && err.message === "Failed to fetch") {
        errorMessage =
          "Cannot connect to backend server. Please make sure the backend is running on port 8080. Run 'npm run dev' in a separate terminal.";
      } else if (
        err.message.includes("ERR_CONNECTION_RESET") ||
        err.message.includes("ECONNREFUSED")
      ) {
        errorMessage =
          "Backend server is not running. Please start it with 'npm run dev' in a separate terminal.";
      }

      setError(errorMessage);
      setState((prev: AnalysisState) => ({ ...prev, error: errorMessage }));
      setStatus("error");
      throw err;
    }
  };

  return (
    <AnalysisContext.Provider value={{ state, status, error, analyze }}>
      {children}
    </AnalysisContext.Provider>
  );
}

export function useAnalysis() {
  const context = useContext(AnalysisContext);
  if (!context) {
    throw new Error("useAnalysis must be used within AnalysisProvider");
  }
  return context;
}
