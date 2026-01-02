import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Shield,
  AlertTriangle,
  Check,
  ShieldCheck,
  ZoomIn,
  Lightbulb,
  TrendingUp,
  X,
  AlertCircle,
  CheckCircle2,
  Info,
  Download,
  Menu,
  X as XIcon,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { PDFReport } from "@/components/PDFReport";
import { pdf } from "@react-pdf/renderer";
import React from "react";

/* ---------- helpers ---------- */

function ProgressRing({ 
  progress, 
  size = 120, 
  strokeWidth = 8,
  label 
}: { 
  progress: number; 
  size?: number; 
  strokeWidth?: number;
  label?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;
  
  const getColor = () => {
    if (progress >= 80) return "#3CBBA0";
    if (progress >= 60) return "#4A9B9E";
    if (progress >= 40) return "#F59E0B";
    return "#E07856";
  };

  const getGradient = () => {
    if (progress >= 80) return "from-emerald-400 to-teal-500";
    if (progress >= 60) return "from-cyan-400 to-blue-500";
    if (progress >= 40) return "from-amber-400 to-orange-500";
    return "from-orange-400 to-red-500";
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      {/* Outer glow ring */}
      <div className="absolute inset-0 rounded-full blur-xl opacity-40" style={{ background: getColor() }}></div>
      
      <svg width={size} height={size} className="transform -rotate-90 relative z-10">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-white/20"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={getColor()}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-[2000ms] ease-out drop-shadow-lg"
          style={{ filter: `drop-shadow(0 0 8px ${getColor()})` }}
        />
      </svg>
      
      <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
        <div className={`text-5xl font-black bg-gradient-to-br ${getGradient()} bg-clip-text text-transparent mb-1`}>
          {Math.round(progress)}%
        </div>
        {label && <span className="text-xs font-semibold text-blue-200 uppercase tracking-wide">{label}</span>}
      </div>
    </div>
  );
}

function VerdictBadge({ verdict }: { verdict: string }) {
  const config = {
    "Sufficient": { 
      bg: "bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30", 
      text: "text-emerald-800 dark:text-emerald-200",
      border: "border-emerald-200 dark:border-emerald-700",
      icon: CheckCircle2,
      iconColor: "text-emerald-600 dark:text-emerald-400"
    },
    "Sufficient, with gaps": { 
      bg: "bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30", 
      text: "text-blue-800 dark:text-blue-200",
      border: "border-blue-200 dark:border-blue-700",
      icon: Info,
      iconColor: "text-blue-600 dark:text-blue-400"
    },
    "Borderline": { 
      bg: "bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30", 
      text: "text-amber-800 dark:text-amber-200",
      border: "border-amber-200 dark:border-amber-700",
      icon: AlertCircle,
      iconColor: "text-amber-600 dark:text-amber-400"
    },
    "Insufficient": { 
      bg: "bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/30 dark:to-rose-900/30", 
      text: "text-red-800 dark:text-red-200",
      border: "border-red-200 dark:border-red-700",
      icon: AlertTriangle,
      iconColor: "text-red-600 dark:text-red-400"
    },
  };

  const style = config[verdict as keyof typeof config] || config["Borderline"];
  const Icon = style.icon;

  return (
    <div className={`${style.bg} ${style.border} border-2 rounded-2xl p-6 flex items-center gap-4`}>
      <div className={`p-3 rounded-xl bg-white/80 dark:bg-gray-800/80 ${style.iconColor}`}>
        <Icon className="w-8 h-8" />
      </div>
      <div>
        <div className="text-sm font-medium opacity-70 dark:opacity-80 text-[#1A3A52] dark:text-[#4A9B9E]">Coverage Assessment</div>
        <div className={`text-2xl font-bold ${style.text}`}>{verdict}</div>
      </div>
    </div>
  );
}

function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  color = "blue" 
}: { 
  icon: any; 
  label: string; 
  value: string; 
  color?: "blue" | "green" | "orange" | "red";
}) {
  const colors = {
    blue: "from-blue-500 to-cyan-500",
    green: "from-emerald-500 to-teal-500",
    orange: "from-orange-500 to-amber-500",
    red: "from-red-500 to-rose-500",
  };

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${colors[color]} p-2.5 mb-4`}>
        <Icon className="w-full h-full text-white" />
      </div>
      <div className="text-sm text-gray-600 mb-1">{label}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
    </div>
  );
}

function BulletList({ items, variant = "default" }: { items: string[] | string; variant?: "success" | "warning" | "danger" | "default" }) {
  const itemArray = Array.isArray(items) 
    ? items 
    : items.split('\n').filter(line => line.trim());

  if (!itemArray || itemArray.length === 0) {
    return <p className="text-sm text-gray-400">No items available</p>;
  }

  const variants = {
    success: { icon: Check, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/30" },
    warning: { icon: AlertTriangle, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/30" },
    danger: { icon: X, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/30" },
    default: { icon: CheckCircle2, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/30" },
  };

  const style = variants[variant];
  const Icon = style.icon;

  return (
    <ul className="space-y-3">
      {itemArray.map((item, i) => (
        <li 
          key={i} 
          className="flex gap-3 items-start group hover:bg-gray-50/50 dark:hover:bg-gray-700/30 rounded-lg p-2 -m-2 transition-colors cursor-default"
        >
          <div className={`${style.bg} ${style.color} p-1.5 rounded-lg mt-0.5 group-hover:scale-110 group-hover:rotate-3 transition-all duration-200`}>
            <Icon className="w-4 h-4" />
          </div>
          <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed flex-1 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors">{item}</span>
        </li>
      ))}
    </ul>
  );
}

/* ---------- page ---------- */

export default function Report() {
  const [, setLocation] = useLocation();
  const { theme, toggle } = useTheme();
  
  // Debug: Log theme changes
  useEffect(() => {
    console.log('Report page - Current theme:', theme);
    console.log('Report page - HTML has dark class:', document.documentElement.classList.contains('dark'));
    // Force a re-render check
    const root = document.documentElement;
    if (theme === "dark" && !root.classList.contains("dark")) {
      console.warn('Theme mismatch! Adding dark class manually');
      root.classList.add("dark");
    } else if (theme === "light" && root.classList.contains("dark")) {
      console.warn('Theme mismatch! Removing dark class manually');
      root.classList.remove("dark");
    }
  }, [theme]);

  const [fontScale, setFontScale] = useState("base" as "base" | "lg");
  const [data, setData] = useState(null as any | null);
  const [loading, setLoading] = useState(true);
  const [showTOC, setShowTOC] = useState(false);

  useEffect(() => {
    console.log("📄 Report page mounted, checking for data...");
    
    const checkData = () => {
      const raw = sessionStorage.getItem("ensured_report");
      console.log("📦 SessionStorage data:", raw ? `Found ${raw.length} chars` : "NOT FOUND");
      
      if (!raw) {
        console.warn("⚠️ No report data found, redirecting to home");
        setLocation("/");
        return;
      }
      
      try {
        const parsed = JSON.parse(raw);
        console.log("✅ Parsed data, keys:", Object.keys(parsed));
        console.log("   - Has page1:", !!parsed.page1);
        console.log("   - Has details:", !!parsed.details);
        console.log("   - Policyholder name:", parsed.policyholderInfo?.name);
        
        // Verify the data has required fields before showing it
        if (parsed && parsed.page1 && parsed.details) {
          console.log("✅ Valid data, setting state");
          setData(parsed);
          setLoading(false);
        } else {
          // Invalid data, redirect to home
          console.error("❌ Invalid report data structure:", parsed);
          setLocation("/");
        }
      } catch (err) {
        console.error("❌ Failed to parse report:", err);
        setLocation("/");
      }
    };
    
    // Small delay to ensure we get the latest data after navigation
    const timeoutId = setTimeout(checkData, 100);
    return () => clearTimeout(timeoutId);
  }, [setLocation]);

  const coverageScore = useMemo(() => {
    if (!data?.page1?.verdict) return 50;
    const verdict = data.page1.verdict.toLowerCase();
    if (verdict.includes("sufficient") && !verdict.includes("gaps")) return 90;
    if (verdict.includes("sufficient")) return 75;
    if (verdict.includes("borderline")) return 55;
    return 35;
  }, [data?.page1?.verdict]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-cyan-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#1A3A52]/20 border-t-[#1A3A52] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading your report...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4 text-lg font-semibold">No report data available</p>
          <Button onClick={() => setLocation("/")}>Return Home</Button>
        </div>
      </div>
    );
  }

  const { page1, details, recommendations } = data;

  // Table of Contents sections
  const tocSections = [
    { id: 'policyholder', label: 'Policyholder Information', icon: Info },
    { id: 'assessment', label: 'Coverage Assessment', icon: ShieldCheck },
    { id: 'covered', label: 'What You\'re Covered For', icon: Check },
    { id: 'risks', label: 'Potential Risks', icon: AlertTriangle },
    { id: 'scenarios', label: 'Cost Scenarios', icon: TrendingUp },
    { id: 'details', label: 'Policy Details', icon: FileText },
    { id: 'recommendations', label: 'Recommended Actions', icon: Lightbulb },
  ];

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const headerOffset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
      setShowTOC(false);
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 pb-20 ${fontScale === "lg" ? "text-[1.05rem]" : "text-base"} relative`}>
      {/* Animated background elements - matching homepage */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-20 -left-40 w-80 h-80 bg-blue-400/20 dark:bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 -right-40 w-96 h-96 bg-cyan-400/20 dark:bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-teal-400/20 dark:bg-teal-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>
      {/* ---------- header ---------- */}
      <header className="relative z-10 border-b bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg sticky top-0 z-50 shadow-sm border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
          <Link href="/" className="font-bold flex items-center gap-2 text-[#1A3A52] dark:text-[#4A9B9E] hover:text-[#4A9B9E] dark:hover:text-[#3CBBA0] transition-colors">
            <Shield className="w-5 h-5" />
            Ensured
          </Link>
          <div className="flex gap-2">
            <Button 
              type="button"
              size="sm" 
              variant="outline" 
              onClick={async (e: any) => {
                e.preventDefault();
                e.stopPropagation();
                try {
                  console.log('Generating PDF...');
                  const blob = await pdf(React.createElement(PDFReport, { data })).toBlob();
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `ensured-report-${data.policyholderInfo?.policyNumber || Date.now()}.pdf`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  URL.revokeObjectURL(url);
                  console.log('PDF generated successfully');
                } catch (error) {
                  console.error('PDF generation failed:', error);
                  alert('Failed to generate PDF. Please try again.');
                }
              }}
            >
              <Download className="w-4 h-4 mr-1" />
              Download PDF
            </Button>
            <Button 
              type="button"
              size="sm" 
              variant="outline" 
              onClick={(e: any) => {
                e.preventDefault();
                e.stopPropagation();
                console.log("Button clicked, calling toggle, current theme:", theme);
                toggle();
                // Force a re-check after toggle
                setTimeout(() => {
                  console.log("After toggle - HTML has dark class:", document.documentElement.classList.contains('dark'));
                }, 100);
              }}
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setFontScale((p: "base" | "lg") => (p === "lg" ? "base" : "lg"))}
            >
              <ZoomIn className="w-4 h-4 mr-1" />
              {fontScale === "lg" ? "A" : "A+"}
            </Button>
          </div>
        </div>
      </header>

      {/* Table of Contents - Sticky Sidebar */}
      <div className={`fixed right-6 top-24 z-40 transition-all duration-300 ${showTOC ? 'translate-x-0' : 'translate-x-full'} md:translate-x-0`}>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 w-64 max-h-[calc(100vh-8rem)] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-[#1A3A52] dark:text-[#4A9B9E]">Table of Contents</h3>
            <button
              onClick={() => setShowTOC(false)}
              className="md:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>
          <nav className="space-y-1">
            {tocSections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors group"
                >
                  <Icon className="w-3 h-3 text-[#4A9B9E] dark:text-[#3CBBA0] group-hover:scale-110 transition-transform" />
                  <span className="flex-1">{section.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* TOC Toggle Button - Mobile */}
      <button
        onClick={() => setShowTOC(!showTOC)}
        className="md:hidden fixed right-6 top-24 z-50 bg-white dark:bg-gray-800 rounded-full p-3 shadow-lg border border-gray-200 dark:border-gray-700 hover:scale-110 transition-transform"
      >
        <Menu className="w-5 h-5 text-[#1A3A52] dark:text-[#4A9B9E]" />
      </button>

      {/* ---------- content ---------- */}
      <main id="report-content" className="relative z-10 max-w-7xl mx-auto px-6 py-10 space-y-10 md:pr-80">
        
        {/* Hero Section */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#0f2537] via-[#1A3A52] to-[#2d5a7b] dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 rounded-3xl shadow-2xl">
          {/* Animated background elements */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-20 left-20 w-72 h-72 bg-cyan-400 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-400 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          </div>
          
          <div className="relative z-10 p-8 md:p-12">
            <div className="flex flex-col md:flex-row items-center justify-between gap-12">
              <div className="flex-1 space-y-6">
                <div className="inline-flex items-center gap-2 bg-emerald-500/20 backdrop-blur border border-emerald-400/30 px-5 py-2.5 rounded-full">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                  <ShieldCheck className="w-4 h-4 text-emerald-300" />
                  <span className="text-sm font-semibold text-emerald-100">Analysis Complete</span>
                </div>
                
                <div>
                  <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-white via-blue-100 to-cyan-200 bg-clip-text text-transparent">
                    Your Coverage Report
                  </h1>
                  <p className="text-xl text-blue-200 font-medium">{page1?.asOf || "Generated today"}</p>
                </div>

                <div className="flex flex-wrap gap-4 pt-2">
                  <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl px-6 py-3">
                    <div className="text-xs text-blue-200 mb-1">Policy Status</div>
                    <div className="text-lg font-bold text-white">Active</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl px-6 py-3">
                    <div className="text-xs text-blue-200 mb-1">Assessment Type</div>
                    <div className="text-lg font-bold text-white">Sufficiency</div>
                  </div>
                </div>
              </div>
              
              <div className="relative">
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-3xl blur-2xl opacity-30 animate-pulse"></div>
                
                {/* Score card */}
                <div className="relative bg-white/10 backdrop-blur-xl border-2 border-white/20 rounded-3xl p-10 shadow-2xl">
                  <div className="absolute top-4 right-4">
                    <div className="w-3 h-3 bg-emerald-400 rounded-full animate-ping"></div>
                    <div className="absolute inset-0 w-3 h-3 bg-emerald-400 rounded-full"></div>
                  </div>
                  
                  <ProgressRing progress={coverageScore} size={180} strokeWidth={12} />
                  
                  <div className="text-center mt-6 space-y-1">
                    <div className="text-sm font-semibold text-blue-200">Coverage Score</div>
                    <div className="text-xs text-blue-300 opacity-75">Based on policy analysis</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Policyholder Info Card */}
        {data.policyholderInfo && (
          <div id="policyholder" className="scroll-mt-24 bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-[#1A3A52] dark:text-[#4A9B9E]">
              <Info className="w-5 h-5 text-[#1A3A52] dark:text-[#4A9B9E]" />
              Policy Holder Information
            </h3>
            
            {/* Policy Type Badge */}
            {data.policyholderInfo.policyType && (
              <div className="mb-4">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#4A9B9E]/10 text-[#4A9B9E] dark:bg-[#4A9B9E]/20 dark:text-[#3CBBA0]">
                  {data.policyholderInfo.policyType}
                </span>
              </div>
            )}

            {/* Family Floater - Show all members */}
            {data.policyholderInfo.policyType === "Family Floater" && data.policyholderInfo.members && data.policyholderInfo.members.length > 0 ? (
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {data.policyholderInfo.members.map((member: any, index: number) => (
                    <div key={index} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">
                        {member.relationship || (index === 0 ? "Self" : "Member")}
                      </div>
                      <div className="font-semibold text-gray-900 dark:text-white mb-2">{member.name || "—"}</div>
                      <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-300">
                        {member.age && (
                          <span>{member.age} years</span>
                        )}
                        {member.gender && member.gender !== "Not specified" && (
                          <span>{member.gender}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="grid md:grid-cols-2 gap-4 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">City</div>
                    <div className="font-semibold text-gray-900 dark:text-white">{data.policyholderInfo.city || "—"}</div>
                  </div>
                  {data.policyholderInfo.policyNumber && (
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Policy Number</div>
                      <div className="font-semibold text-gray-900 dark:text-white font-mono text-sm">{data.policyholderInfo.policyNumber}</div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Individual Policy - Show single member */
              <div className="grid md:grid-cols-4 gap-4">
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Name</div>
                  <div className="font-semibold text-gray-900 dark:text-white">{data.policyholderInfo.name || "—"}</div>
                </div>
                {data.policyholderInfo.age && (
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Age</div>
                    <div className="font-semibold text-gray-900 dark:text-white">{data.policyholderInfo.age} years</div>
                  </div>
                )}
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">City</div>
                  <div className="font-semibold text-gray-900 dark:text-white">{data.policyholderInfo.city || "—"}</div>
                </div>
                {data.policyholderInfo.policyNumber && (
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Policy Number</div>
                    <div className="font-semibold text-gray-900 dark:text-white font-mono text-sm">{data.policyholderInfo.policyNumber}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Verdict Section */}
        <div id="assessment" className="scroll-mt-24 grid md:grid-cols-2 gap-6">
          <VerdictBadge verdict={page1?.verdict || "Unknown"} />
          
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-[#1A3A52] dark:text-[#4A9B9E]">
              <Info className="w-5 h-5 text-[#1A3A52] dark:text-[#4A9B9E]" />
              Key Insights
            </h3>
            <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">
              {page1?.why || "No explanation available"}
            </div>
          </div>
        </div>

        {/* Coverage Overview */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* What You're Covered For */}
          <div id="covered" className="scroll-mt-24 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 rounded-2xl p-8 border-2 border-emerald-200 dark:border-emerald-700 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-emerald-600 dark:bg-emerald-500 rounded-xl">
                <Check className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-2xl text-emerald-900 dark:text-emerald-200">What You're Covered For</h3>
            </div>
            <BulletList items={page1?.coveredFor || []} variant="success" />
          </div>

          {/* Where This Can Hurt */}
          <div id="risks" className="scroll-mt-24 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/30 dark:to-red-900/30 rounded-2xl p-8 border-2 border-orange-200 dark:border-orange-700 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-orange-600 dark:bg-orange-500 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-2xl text-orange-900 dark:text-orange-200">Potential Risks</h3>
            </div>
            <BulletList items={page1?.whereItHurts || []} variant="warning" />
          </div>
        </div>

        {/* Cost Context */}
        {page1?.costContext && page1.costContext.length > 0 && (
          <div id="scenarios" className="scroll-mt-24 bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="font-bold text-xl mb-6 flex items-center gap-2 text-[#1A3A52] dark:text-[#4A9B9E]">
              <TrendingUp className="w-6 h-6 text-[#4A9B9E] dark:text-[#3CBBA0]" />
              Real-World Cost Scenarios
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              {page1.costContext.map((scenario: string, i: number) => (
                <div 
                  key={i} 
                  className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30 rounded-xl p-5 border border-blue-100 dark:border-blue-800/50 hover:shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-default"
                >
                  <div className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">Scenario {i + 1}</div>
                  <div className="text-sm text-gray-700 dark:text-gray-300">{scenario}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Policy Details */}
        {details && (
          <div id="details" className="scroll-mt-24 bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
            <h2 className="text-2xl font-bold mb-6 text-[#1A3A52] dark:text-[#4A9B9E]">Policy Details</h2>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Policy Summary */}
              {details.policySummary && details.policySummary.length > 0 && (
                <div>
                  <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-gray-100">📋 Policy Summary</h3>
                  <BulletList items={details.policySummary} variant="default" />
                </div>
              )}

              {/* Active Waiting Periods */}
              {details.activeWaitingPeriods && details.activeWaitingPeriods.length > 0 && (
                <div>
                  <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-gray-100">⏳ Active Waiting Periods</h3>
                  <BulletList items={details.activeWaitingPeriods} variant="warning" />
                </div>
              )}
            </div>

            {/* Gaps */}
            {details.gaps && (
              <div className="grid md:grid-cols-2 gap-6 mt-8">
                {details.gaps.serious && details.gaps.serious.length > 0 && (
                  <div className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/30 dark:to-rose-900/30 border-2 border-red-200 dark:border-red-700 rounded-xl p-6">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-red-900 dark:text-red-200">
                      <AlertTriangle className="w-5 h-5" />
                      Serious Gaps
                    </h3>
                    <BulletList items={details.gaps.serious} variant="danger" />
                  </div>
                )}

                {details.gaps.nonSerious && details.gaps.nonSerious.length > 0 && (
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 border-2 border-amber-200 dark:border-amber-700 rounded-xl p-6">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-amber-900 dark:text-amber-200">
                      <Info className="w-5 h-5" />
                      Minor Gaps
                    </h3>
                    <BulletList items={details.gaps.nonSerious} variant="warning" />
                  </div>
                )}
              </div>
            )}

            {/* Clause Explanations */}
            {details.clauseExplanations && details.clauseExplanations.length > 0 && (
              <div className="mt-8">
                <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-gray-100">📝 Important Clauses</h3>
                <BulletList items={details.clauseExplanations} variant="default" />
              </div>
            )}
          </div>
        )}

        {/* Recommendations */}
        {recommendations && recommendations.length > 0 && (
          <div id="recommendations" className="scroll-mt-24 bg-gradient-to-br from-[#4A9B9E] to-[#3CBBA0] rounded-2xl p-8 text-white shadow-xl hover:shadow-2xl transition-shadow">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-white/20 backdrop-blur rounded-xl">
                <Lightbulb className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold">Recommended Actions</h2>
            </div>
            <div className="space-y-3">
              {recommendations.map((rec: string, i: number) => {
                // Extract priority from recommendation text
                const priorityMatch = rec.match(/\*\*\[Priority:\s*(High|Medium|Low)\]\*\*/);
                const priority = priorityMatch ? priorityMatch[1] : null;
                const cleanText = rec.replace(/\*\*\[Priority:\s*(High|Medium|Low)\]\*\*\s*/, '');
                
                const priorityColors = {
                  High: "bg-red-500/30 border-red-400/50 text-red-100",
                  Medium: "bg-amber-500/30 border-amber-400/50 text-amber-100",
                  Low: "bg-blue-500/30 border-blue-400/50 text-blue-100"
                };
                
                return (
                  <div key={i} className="flex gap-3 items-start bg-white/10 backdrop-blur rounded-xl p-4 hover:bg-white/20 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold flex-shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      {priority && (
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold mb-2 border ${priorityColors[priority as keyof typeof priorityColors]}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                          Priority: {priority}
                        </div>
                      )}
                      <span className="text-white/95 leading-relaxed block">{cleanText}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center pt-8 pb-4">
          <div className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 rounded-full px-6 py-3 shadow-sm border border-gray-200 dark:border-gray-700">
            <Shield className="w-4 h-4 text-[#1A3A52] dark:text-[#4A9B9E]" />
            <span>No sales. No storage. Decision-first analysis only.</span>
          </div>
        </div>
      </main>
    </div>
  );
}