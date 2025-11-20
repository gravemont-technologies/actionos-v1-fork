import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ClerkProvider } from "./landing/ClerkProvider";
import { ProtectedRoute } from "./landing/ProtectedRoute";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// Toasters removed - using silent state updates instead
import { TooltipProvider } from "./components/ui/tooltip";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ProfileProvider } from "./contexts/ProfileContext.js";
import Landing from "./pages/Landing";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import { OnboardingQuiz } from "./OnboardingQuiz";
import { AppLayout, AnalyzeView, DashboardView } from "./AppLayout";
import { InsightsView } from "./pages/InsightsView";
import NotFound from "./pages/NotFound";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { DevProbe } from "./components/DevProbe";
import { initWebVitalsDev } from "./vitals";

const queryClient = new QueryClient();

/**
 * Inner component that uses useLocation() - must be inside BrowserRouter
 */
function AppRoutes() {
  // Dev-only route transition timing
  const location = useLocation();
  useEffect(() => {
    if (!(import.meta as any).env?.DEV) return;
    initWebVitalsDev();
    const markStart = (window as any).__routeNavStart ?? performance.now();
    const now = performance.now();
    const durationMs = Math.round(now - markStart);
    // Track route perf entry
    (window as any).__perfLogs = (window as any).__perfLogs || [];
    (window as any).__perfLogs.push({
      kind: "route",
      path: location.pathname,
      duration_ms: durationMs,
      time: new Date().toISOString(),
    });
    // eslint-disable-next-line no-console
    console.table([
      {
        kind: "route",
        path: location.pathname,
        duration_ms: durationMs,
        time: new Date().toLocaleTimeString(),
      },
    ]);
    (window as any).__routeNavStart = performance.now();
  }, [location.pathname]);

  return (
    <>
      <ErrorBoundary>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/sign-in/*" element={<SignIn />} />
          <Route path="/sign-up/*" element={<SignUp />} />

          {/* Protected routes */}
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <OnboardingQuiz onComplete={() => {
                  // Navigation handled inside OnboardingQuiz
                }} />
              </ProtectedRoute>
            }
          />

          {/* Main app routes */}
          <Route
            path="/app"
            element={
              <ProtectedRoute requireOnboarding={true}>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/app/analyze" replace />} />
            <Route path="analyze" element={<AnalyzeView />} />
            <Route path="dashboard" element={<DashboardView />} />
            <Route path="insights" element={<InsightsView />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </ErrorBoundary>
      {(import.meta as any).env?.DEV ? <DevProbe /> : null}
    </>
  );
}

/**
 * Main App component with routing
 * Flow: Landing → Sign In/Up → Onboarding → Main App
 */
export function App() {
  // Dev-only global error hooks
  useEffect(() => {
    if (!(import.meta as any).env?.DEV) return;
    const onError = (event: ErrorEvent) => {
      // eslint-disable-next-line no-console
      console.error("[global] onerror:", event.message);
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      // eslint-disable-next-line no-console
      console.error("[global] unhandledrejection:", event.reason);
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return (
    <ErrorBoundary>
      <ClerkProvider>
        <ProfileProvider>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
            <QueryClientProvider client={queryClient}>
              <TooltipProvider>
                <BrowserRouter>
                  <AppRoutes />
                </BrowserRouter>
              </TooltipProvider>
            </QueryClientProvider>
          </ThemeProvider>
        </ProfileProvider>
      </ClerkProvider>
    </ErrorBoundary>
  );
}
