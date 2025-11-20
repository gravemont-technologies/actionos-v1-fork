import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { AnalyzeForm } from "./AnalyzeForm";
import { Dashboard } from "./Dashboard";
import { useProfileId, useProfileContext } from "./contexts/ProfileContext.js";
import { useEscapeKey } from "./hooks/useEscapeKey.js";
import { useAuthHeaders, useUserId } from "./auth.js";
import { api } from "./utils/api.js";

/**
 * Layout component for the main app routes (/app/*)
 * - Includes navigation between Analyze and Dashboard views
 * - Uses profile_id from ProfileContext (not Clerk user ID)
 */
export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const profileId = useProfileId();
  const { isLoading } = useProfileContext();
  const userId = useUserId();
  const authHeaders = useAuthHeaders();
  const [pulseNav, setPulseNav] = useState<string | null>(null);
  const [abandonedSteps, setAbandonedSteps] = useState<string[]>([]);

  // Determine current view from pathname
  const currentView = location.pathname.includes("/dashboard") 
    ? "dashboard" 
    : location.pathname.includes("/insights")
    ? "insights"
    : "analyze";

  // Global escape key handler
  useEscapeKey({
    onEscape: () => {
      if (location.pathname !== "/app/analyze") {
        navigate("/app/analyze");
      }
    },
    enabled: true
  });

  // Listen for step1.completed event with sessionStorage fallback
  useEffect(() => {
    const recentCompletion = sessionStorage.getItem('step1.completed');
    if (recentCompletion) {
      setPulseNav("dashboard");
      setTimeout(() => {
        setPulseNav(null);
        sessionStorage.removeItem('step1.completed');
      }, 2000);
    }
    
    const handleStep1Completed = () => {
      sessionStorage.setItem('step1.completed', Date.now().toString());
      setPulseNav("dashboard");
      setTimeout(() => setPulseNav(null), 2000);
    };

    window.addEventListener("step1.completed", handleStep1Completed);
    return () => {
      window.removeEventListener("step1.completed", handleStep1Completed);
    };
  }, []);

  // Check for abandoned steps (optimized: only when navigating to dashboard or on mount)
  useEffect(() => {
    if (currentView !== "dashboard" || !profileId || !userId) return;

    let isMounted = true;
    let intervalId: NodeJS.Timeout | null = null;

    const checkAbandonedSteps = async () => {
      try {
        const response = await api.get<{
          is_abandoned: boolean;
          hours_elapsed: number;
        }>(
          `/api/step-feedback/active-step?profile_id=${profileId}`,
          { headers: authHeaders }
        );

        if (!isMounted) return;

        if (response.is_abandoned) {
          setAbandonedSteps((prev) => {
            if (!prev.includes("dashboard")) {
              return [...prev, "dashboard"];
            }
            return prev;
          });
        } else {
          setAbandonedSteps((prev) => prev.filter((tab) => tab !== "dashboard"));
        }
      } catch (error) {
        // Silently handle errors
        if (isMounted) {
          console.error("[AppLayout] Failed to check abandoned steps:", error);
        }
      }
    };

    // Check immediately
    checkAbandonedSteps();
    
    // Then check every 10 minutes (reduced from 5 for performance)
    intervalId = setInterval(checkAbandonedSteps, 10 * 60 * 1000);

    return () => {
      isMounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [currentView, profileId, userId, authHeaders]);

  // Show loading state while profile is being resolved
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!profileId) {
    return null; // ProtectedRoute should handle this
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-void)' }}>
      <div className="container mx-auto max-w-4xl px-4" style={{ 
        paddingTop: "calc(2rem + 48px)" // Account for fixed StreakBar
      }}>
        <header className="mb-8">
          <h1 className="text-3xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Action OS</h1>
          <nav className="flex gap-4" style={{ fontFamily: 'var(--font-body)' }}>
            <button
              onClick={() => navigate("/app/analyze")}
              className={`px-4 py-2 transition-all ${
                currentView === "analyze"
                  ? "glow-cyan"
                  : "ghost-white"
              }`}
              style={{
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: currentView === "analyze" ? 600 : 400,
              }}
            >
              ANALYZE
            </button>
            <button
              onClick={() => navigate("/app/dashboard")}
              className={`px-4 py-2 transition-all ${
                currentView === "dashboard"
                  ? "glow-cyan"
                  : "ghost-white"
              } ${abandonedSteps.includes("dashboard") ? "abandoned" : ""} ${
                pulseNav === "dashboard" ? "pulse-cyan" : ""
              }`}
              style={{
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: currentView === "dashboard" ? 600 : 400,
              }}
            >
              DASHBOARD
            </button>
            <button
              onClick={() => navigate("/app/insights")}
              className={`px-4 py-2 transition-all ${
                currentView === "insights"
                  ? "glow-cyan"
                  : "ghost-white"
              }`}
              style={{
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: currentView === "insights" ? 600 : 400,
              }}
            >
              INSIGHTS
            </button>
          </nav>
        </header>
        <Outlet />
      </div>
    </div>
  );
}

/**
 * Analyze view component
 */
export function AnalyzeView() {
  const profileId = useProfileId();

  if (!profileId) return null;

  return <AnalyzeForm />;
}

/**
 * Dashboard view component
 */
export function DashboardView() {
  const profileId = useProfileId();

  if (!profileId) return null;

  return <Dashboard />;
}

