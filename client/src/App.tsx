import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Processing from "@/pages/processing";
import Report from "@/pages/report";
import CalculatorPage from "@/pages/calculator";
import UploadStep from "@/pages/compare/upload-step";
import ProfileStep from "@/pages/compare/profile-step";
import ResultsStep from "@/pages/compare/results-step";
import { AnalysisProvider } from "@/hooks/use-analysis";
import { ThemeProvider } from "@/hooks/use-theme";
import { ComparisonProvider } from "@/hooks/use-comparison";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/processing" component={Processing} />

      {/* Support BOTH report routes */}
      <Route path="/report" component={Report} />
      <Route path="/report/:id" component={Report} />

      {/* Optimal Insurance Calculator */}
      <Route path="/calculator" component={CalculatorPage} />

      {/* Policy Comparison - Multi-step with separate routes */}
      <Route path="/compare" component={UploadStep} />
      <Route path="/compare/profile" component={ProfileStep} />
      <Route path="/compare/results" component={ResultsStep} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AnalysisProvider>
        <ComparisonProvider>
          <Toaster />
          <Router />
        </ComparisonProvider>
      </AnalysisProvider>
    </ThemeProvider>
  );
}

export default App;
