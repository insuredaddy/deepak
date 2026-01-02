import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { PolicyData } from "@/types/policy";

type UploadStatus = "idle" | "uploading" | "extracting" | "success" | "error";

export interface UploadedPolicy {
  id: string;
  file: File;
  status: UploadStatus;
  policyData?: PolicyData;
  error?: string;
  progress?: string;
  progressPercent?: number;
}

export interface ComparisonProfile {
  age: number | undefined;
  city: string;
  state: string;
  preExistingConditions: string[];
  householdIncome: number | undefined;
  familySize: number | undefined;
  priorityNeed: "cancer_coverage" | "cardiac_coverage" | "room_rent" | "lowest_premium" | "best_balance" | "";
}

interface ComparisonContextType {
  policies: UploadedPolicy[];
  setPolicies: (policies: UploadedPolicy[] | ((prev: UploadedPolicy[]) => UploadedPolicy[])) => void;
  profile: ComparisonProfile;
  setProfile: (profile: ComparisonProfile | ((prev: ComparisonProfile) => ComparisonProfile)) => void;
  clearAll: () => void;
}

const ComparisonContext = createContext<ComparisonContextType | undefined>(undefined);

export function ComparisonProvider({ children }: { children: ReactNode }) {
  // Use sessionStorage instead of localStorage - clears on tab close
  // Don't load on mount - start fresh every time
  const [policies, setPoliciesState] = useState<UploadedPolicy[]>([]);
  const [profile, setProfileState] = useState<ComparisonProfile>({
    age: undefined,
    city: "",
    state: "",
    preExistingConditions: [],
    householdIncome: undefined,
    familySize: undefined,
    priorityNeed: "",
  });

  // Clear sessionStorage on mount if not in compare flow (e.g., refreshed on home page)
  useEffect(() => {
    const isInCompareFlow = window.location.pathname.startsWith("/compare");
    if (!isInCompareFlow) {
      // Not in compare flow - clear sessionStorage
      sessionStorage.removeItem("ensured_comparison_policies");
      sessionStorage.removeItem("ensured_comparison_profile");
    }
    // Always start with empty state - don't load from sessionStorage
    // sessionStorage is only used to persist during navigation between steps
    // On page refresh, we start fresh
  }, []);

  const setPolicies = (value: UploadedPolicy[] | ((prev: UploadedPolicy[]) => UploadedPolicy[])) => {
    setPoliciesState((prev) => {
      const newPolicies = typeof value === "function" ? value(prev) : value;
      // Save to sessionStorage (clears on tab close) - without File objects
      try {
        const toStore = newPolicies.map((p) => ({
          id: p.id,
          fileName: p.file.name,
          status: p.status,
          policyData: p.policyData,
          error: p.error,
        }));
        sessionStorage.setItem("ensured_comparison_policies", JSON.stringify(toStore));
      } catch (e) {
        console.error("Failed to save policies to sessionStorage:", e);
      }
      return newPolicies;
    });
  };

  const setProfile = (value: ComparisonProfile | ((prev: ComparisonProfile) => ComparisonProfile)) => {
    setProfileState((prev) => {
      const newProfile = typeof value === "function" ? value(prev) : value;
      // Save to sessionStorage (clears on tab close)
      try {
        sessionStorage.setItem("ensured_comparison_profile", JSON.stringify(newProfile));
      } catch (e) {
        console.error("Failed to save profile to sessionStorage:", e);
      }
      return newProfile;
    });
  };

  const clearAll = () => {
    // Clear sessionStorage
    sessionStorage.removeItem("ensured_comparison_policies");
    sessionStorage.removeItem("ensured_comparison_profile");
    sessionStorage.removeItem("ensured_force_clear");
    // Clear state immediately
    setPoliciesState([]);
    setProfileState({
      age: undefined,
      city: "",
      state: "",
      preExistingConditions: [],
      householdIncome: undefined,
      familySize: undefined,
      priorityNeed: "",
    });
  };

  return (
    <ComparisonContext.Provider value={{ policies, setPolicies, profile, setProfile, clearAll }}>
      {children}
    </ComparisonContext.Provider>
  );
}

export function useComparison() {
  const context = useContext(ComparisonContext);
  if (!context) {
    throw new Error("useComparison must be used within ComparisonProvider");
  }
  return context;
}

