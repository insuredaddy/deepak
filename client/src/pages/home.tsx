import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Upload,
  ShieldCheck,
  FileText,
  ChevronRight,
  Lock,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Zap,
  Clock,
  TrendingUp,
  Award,
  Shield,
  Calculator,
  Scale,
} from "lucide-react";
import { useDropzone } from "react-dropzone";
import { useAnalysis } from "@/hooks/use-analysis";
import { mockReport } from "@/lib/mock-data";
import { useTheme } from "@/hooks/use-theme";

export default function Home() {
  const [, setLocation] = useLocation();
  const { analyze } = useAnalysis();
  const { theme, toggle } = useTheme();

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const onDrop = async (acceptedFiles: File[]) => {
    if (!acceptedFiles.length) return;

    const file = acceptedFiles[0];
    setSelectedFile(file);
    setError(null);
    
    // Clear old report data immediately to prevent showing stale data
    sessionStorage.removeItem("ensured_report");
    
    // Show file name briefly before processing
    await new Promise(resolve => setTimeout(resolve, 800));
    
    setUploading(true);
    setLocation("/processing");

    try {
      // Start analysis - the processing page will handle the redirect when complete
      await analyze(file);
      // Don't redirect here - let processing page handle it
    } catch (err: any) {
      console.error("Analysis failed in home:", err);
      setError(err?.message || "Analysis failed");
      setLocation("/");
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    multiple: false,
    disabled: uploading,
  });

  const handleSample = () => {
    sessionStorage.setItem("ensured_report", JSON.stringify(mockReport));
    setLocation("/report");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex flex-col font-sans">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 -left-40 w-80 h-80 bg-blue-400/20 dark:bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 -right-40 w-96 h-96 bg-cyan-400/20 dark:bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-teal-400/20 dark:bg-teal-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Header */}
      <header className="relative z-10 w-full py-5 px-6 backdrop-blur-xl bg-white/70 dark:bg-gray-800/70 border-b border-white/20 dark:border-gray-700/50 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1A3A52] to-[#4A9B9E] flex items-center justify-center shadow-lg">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="font-bold text-2xl bg-gradient-to-r from-[#1A3A52] to-[#4A9B9E] bg-clip-text text-transparent">
                Ensured
              </span>
              <div className="text-[10px] text-gray-500 dark:text-gray-400 -mt-1">Decision-first. No sales.</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="border-[#1A3A52]/20 dark:border-[#4A9B9E]/30 bg-white/50 dark:bg-gray-800/50 hover:bg-[#1A3A52]/5 dark:hover:bg-[#4A9B9E]/10 text-[#1A3A52] dark:text-[#4A9B9E] font-medium"
              onClick={() => setLocation("/calculator")}
            >
              <Calculator className="w-4 h-4 mr-2" />
              Calculate Coverage
            </Button>
            <Button
              variant="outline"
              className="border-[#1A3A52]/20 dark:border-[#4A9B9E]/30 bg-white dark:bg-gray-800 hover:bg-[#1A3A52]/5 dark:hover:bg-[#4A9B9E]/10 text-[#1A3A52] dark:text-[#4A9B9E] font-medium"
              onClick={() => setLocation("/compare")}
            >
              <Scale className="w-4 h-4 mr-2" />
              Compare Policies
            </Button>
            <Button
              variant="outline"
              className="border-[#1A3A52]/20 dark:border-[#4A9B9E]/30 bg-white dark:bg-gray-800 hover:bg-[#1A3A52]/5 dark:hover:bg-[#4A9B9E]/10 text-[#1A3A52] dark:text-[#4A9B9E] font-medium"
              onClick={handleSample}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              View Sample Report
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="border-gray-200 dark:border-gray-700"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log("Button clicked, calling toggle");
                toggle();
              }}
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-16">
        <div className="max-w-7xl w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            
            {/* Left: Hero Content */}
            <div className="space-y-8">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 border border-emerald-200 dark:border-emerald-700 shadow-sm">
                <div className="w-2 h-2 bg-emerald-500 dark:bg-emerald-400 rounded-full animate-pulse"></div>
                <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                  AI-Powered Insurance Analysis
                </span>
              </div>

              {/* Headline */}
              <div className="space-y-4">
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-black leading-tight">
                  <span className="bg-gradient-to-r from-[#1A3A52] via-[#2d5a7b] to-[#4A9B9E] bg-clip-text text-transparent">
                    Know if your health policy
                  </span>
                  <br />
                  <span className="text-[#1A3A52]">actually protects you</span>
                </h1>
                <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed max-w-xl">
                  Upload your policy PDF. Get a deterministic sufficiency verdict in 60 seconds. 
                  <span className="font-semibold text-[#1A3A52] dark:text-[#4A9B9E]"> No forms, no upsell, no storage.</span>
                </p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 max-w-xl">
                <div className="text-center">
                  <div className="text-3xl font-bold text-[#1A3A52] dark:text-[#4A9B9E]">60s</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Analysis Time</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-[#3CBBA0] dark:text-[#3CBBA0]">100%</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Private</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-[#4A9B9E] dark:text-[#3CBBA0]">0</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Sales Calls</div>
                </div>
              </div>

              {/* Features */}
              <div className="grid sm:grid-cols-2 gap-3 max-w-xl">
                {[
                  { icon: Zap, text: "Instant AI Analysis" },
                  { icon: Lock, text: "Zero Data Storage" },
                  { icon: Award, text: "Decision-First Report" },
                  { icon: Shield, text: "100% Unbiased" },
                ].map((item) => (
                  <div 
                    key={item.text} 
                    className="flex items-center gap-3 bg-white/60 dark:bg-gray-800/60 backdrop-blur rounded-xl p-3 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200 cursor-default group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1A3A52] to-[#4A9B9E] dark:from-[#4A9B9E] dark:to-[#3CBBA0] flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                      <item.icon className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 group-hover:text-[#1A3A52] dark:group-hover:text-[#4A9B9E] transition-colors">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Upload Area */}
            <div className="space-y-6">
              {error && (
                <div className="rounded-xl border border-red-200 dark:border-red-800 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/30 dark:to-rose-900/30 px-5 py-4 shadow-sm animate-in fade-in slide-in-from-top">
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5">⚠️</div>
                    <div className="flex-1">
                      <p className="font-semibold text-red-900 dark:text-red-200 mb-1">Upload Failed</p>
                      <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Upload Card */}
              <div
                {...getRootProps()}
                className={`relative group overflow-hidden transition-all duration-300 ${
                  uploading 
                    ? "cursor-wait" 
                    : isDragActive 
                    ? "scale-[1.02]" 
                    : "hover:scale-[1.01] cursor-pointer"
                }`}
              >
                {/* Gradient border effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#1A3A52] via-[#4A9B9E] to-[#3CBBA0] rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity blur-xl"></div>
                
                <div className={`relative bg-white dark:bg-gray-800 rounded-3xl border-2 transition-all shadow-xl ${
                  isDragActive 
                    ? "border-[#1A3A52] dark:border-[#4A9B9E] bg-blue-50 dark:bg-blue-900/20 ring-4 ring-[#1A3A52]/20 dark:ring-[#4A9B9E]/20" 
                    : selectedFile && !uploading
                    ? "border-[#3CBBA0] dark:border-[#3CBBA0] bg-emerald-50/50 dark:bg-emerald-900/10"
                    : "border-gray-200 dark:border-gray-700 hover:border-[#4A9B9E] dark:hover:border-[#3CBBA0]"
                }`}>
                  <input {...getInputProps()} />
                  
                  <div className="p-12">
                    {selectedFile && !uploading ? (
                      <div className="flex flex-col items-center justify-center gap-6 text-center animate-in fade-in slide-in-from-bottom">
                        <div className="relative">
                          <div className="absolute inset-0 bg-emerald-500 rounded-2xl blur-2xl opacity-30 animate-pulse"></div>
                          <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-xl">
                            <CheckCircle2 className="w-10 h-10 text-white" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <p className="text-xl font-bold text-gray-900 dark:text-white">
                            File Selected
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-300 font-mono bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded">
                            {selectedFile.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Processing will begin shortly...
                          </p>
                        </div>
                      </div>
                    ) : uploading ? (
                      <div className="flex flex-col items-center justify-center gap-6 text-center">
                        <div className="relative">
                          <div className="w-20 h-20 border-4 border-[#1A3A52]/20 border-t-[#1A3A52] rounded-full animate-spin"></div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <FileText className="w-8 h-8 text-[#1A3A52]" />
                          </div>
                        </div>
                        <div>
                          <p className="text-xl font-bold text-[#1A3A52] dark:text-[#4A9B9E] mb-2">
                            Analyzing your policy...
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Reading document and extracting coverage details
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-6 text-center">
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-[#1A3A52] to-[#4A9B9E] rounded-2xl blur-2xl opacity-30 animate-pulse"></div>
                          <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-[#1A3A52] to-[#4A9B9E] flex items-center justify-center shadow-xl">
                            <Upload className="w-10 h-10 text-white" />
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            Drop your policy PDF here
                          </p>
                          <p className="text-gray-600 dark:text-gray-300 max-w-sm">
                            or <span className="text-[#1A3A52] dark:text-[#4A9B9E] font-semibold">click to browse</span>
                            <br />
                            <span className="text-sm">Analysis starts immediately • No signup required</span>
                          </p>
                        </div>

                        <div className="flex flex-wrap justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-700 px-3 py-1.5 rounded-full">
                            <FileText className="w-3 h-3" />
                            PDF Only
                          </div>
                          <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-700 px-3 py-1.5 rounded-full">
                            <Clock className="w-3 h-3" />
                            ~60 seconds
                          </div>
                          <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-700 px-3 py-1.5 rounded-full">
                            <Lock className="w-3 h-3" />
                            Not stored
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Sample Button */}
              <Button
                variant="outline"
                size="lg"
                className="w-full border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-[#1A3A52] dark:hover:border-[#4A9B9E] hover:bg-[#1A3A52]/5 dark:hover:bg-[#4A9B9E]/10 text-[#1A3A52] dark:text-[#4A9B9E] font-semibold group"
                onClick={handleSample}
              >
                <Sparkles className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform" />
                View Sample Report
                <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>

              {/* Trust Indicators */}
              <div className="flex items-center justify-center gap-6 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#3CBBA0]" />
                  <span>No sales pitch</span>
                </div>
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#3CBBA0]" />
                  <span>Privacy first</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-8 px-6 border-t border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 backdrop-blur">
        <div className="max-w-7xl mx-auto text-center text-sm text-gray-600 dark:text-gray-400">
          <p>Decision-first insurance review. No chatbots. No upsell. No storage after analysis.</p>
        </div>
      </footer>
    </div>
  );
}