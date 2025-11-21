import React, { useEffect, useState, useCallback, useRef } from "react";
import { useAuthHeaders, useUserId } from "./auth.js";
import { api } from "./utils/api.js";
import { useProfileId } from "./contexts/ProfileContext.js";
import { useNavigate } from "react-router-dom";
// Toast removed - using silent state updates
import { RetrospectiveModal, RetrospectiveInsights } from "./components/RetrospectiveModal.js";
import { useStep1Timer } from "./hooks/useStep1Timer.js";
import { GiantMetric } from "./components/GiantMetric.js";
import { BrutalistSlider } from "./components/BrutalistSlider.js";
import { StreakBar } from "./components/StreakBar.js";
import { MarkDoneOverlay } from "./components/MarkDoneOverlay.js";
import { DeltaBadge } from "./components/DeltaBadge.js";
import { Sparkline } from "./components/Sparkline.js";

/**
 * Type for insight data from API (matches CacheEntry structure)
 * Used for Recent Wins navigation
 */
type InsightData = {
  signature: string;
  title?: string;
  normalizedInput: {
    situation: string;
    goal: string;
    constraints: string[] | string;
    current_steps?: string;
  };
};

/**
 * Helper type for fetch operation result
 */
type FetchResult<T> = {
  data?: T;
  error?: string;
};

/**
 * Helper function to create a safe fetch operation with cancellation and mount checks
 * Reduces code duplication in parallel fetch patterns
 */
function createSafeFetch<T>(
  fetchFn: () => Promise<T>,
  options: {
    signal: AbortSignal;
    isMounted: () => boolean;
    setLoading: (loading: boolean) => void;
    setData: (data: T) => void;
    setError: (error: string | undefined) => void;
    onError?: (error: any) => void;
  }
): Promise<FetchResult<T>> {
  return (async () => {
    options.setLoading(true);
    try {
      const data = await fetchFn();
      if (!options.signal.aborted && options.isMounted()) {
        options.setData(data);
        options.setError(undefined);
        return { data };
      }
      return {};
    } catch (error: any) {
      if (options.signal.aborted || !options.isMounted()) {
        return {};
      }
      
      // Handle specific error cases
      const errorStatus = error?.status;
      const errorMsg = error?.message || "Request failed";
      
      // 404/403 are valid states for some endpoints
      if (errorStatus === 404 || errorStatus === 403) {
        options.setError(undefined);
        return {};
      }
      
      options.setError(errorMsg);
      if (options.onError) {
        options.onError(error);
      }
      return { error: errorMsg };
    } finally {
      if (!options.signal.aborted && options.isMounted()) {
        options.setLoading(false);
      }
    }
  })();
}

type FeedbackItem = {
  signature: string;
  slider: number;
  outcome?: string;
  recordedAt: number;
};

export function Dashboard() {
  const profileId = useProfileId();
  const userId = useUserId(); // Get userId (stable string reference) for dependencies
  const authHeaders = useAuthHeaders(); // Memoized, but we use userId in deps for safety
  const [slider, setSlider] = useState(5);
  const [outcome, setOutcome] = useState("");
  const [recentFeedback, setRecentFeedback] = useState<FeedbackItem[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<{ signature: string; description: string } | undefined>(undefined);
  const [baseline, setBaseline] = useState<{ ipp: number; but: number } | undefined>(undefined);
  const [previousBaseline, setPreviousBaseline] = useState<{ ipp: number; but: number } | null>(null);
  const [recentInsights, setRecentInsights] = useState<Array<{
    signature: string;
    title?: string;
    summary: string;
    createdAt: number;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [loadingBaseline, setLoadingBaseline] = useState(false);
  const [loadingActiveStep, setLoadingActiveStep] = useState(false);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [errors, setErrors] = useState<{
    baseline?: string;
    activeStep?: string;
    feedback?: string;
    insights?: string;
    wins?: string;
    sparkline?: string;
  }>({});
  const [retrospectiveOpen, setRetrospectiveOpen] = useState(false);
  const [retrospectiveLoading, setRetrospectiveLoading] = useState(false);
  const [retrospectiveData, setRetrospectiveData] = useState<{
    insights: RetrospectiveInsights;
    promptVersion?: string;
  } | null>(null);
  const [markDoneOpen, setMarkDoneOpen] = useState(false);
  const [recentWins, setRecentWins] = useState<Array<{
    signature: string;
    title: string;
    slider: number;
    deltaIpp: number;
    outcome: string | null;
    recordedAt: string;
  }>>([]);
  const [loadingWins, setLoadingWins] = useState(false);
  const [sparklineData, setSparklineData] = useState<Array<{
    timestamp: string;
    predicted: number;
    realized: number;
  }>>([]);
  const [loadingSparkline, setLoadingSparkline] = useState(false);
  const [tokenUsage, setTokenUsage] = useState<{
    used: number;
    remaining: number;
    limit: number;
    percentage: number;
  } | null>(null);
  const [loadingTokenUsage, setLoadingTokenUsage] = useState(false);
  const navigate = useNavigate();
  const fetchingRef = useRef(false); // Prevent parallel calls
  const abortControllerRef = useRef<AbortController | null>(null); // Cancel requests on unmount/dependency change
  const isMountedRef = useRef(true); // Track component mount status

  // Timer hook for active step
  const timerData = useStep1Timer(
    profileId || null,
    activeStep?.signature || null,
    userId || null
  );

  /**
   * Fetches all dashboard data in parallel with proper error handling and cancellation.
   * 
   * Features:
   * - Parallel fetching for optimal performance
   * - Request cancellation on unmount or dependency change
   * - Component mount checks to prevent state updates on unmounted components
   * - Individual error handling per endpoint
   * - Graceful handling of 404/403 (valid empty states)
   * 
   * @returns Promise that resolves when all fetches complete (or fail)
   */
  const fetchDashboardData = useCallback(async () => {
    // Guard: Prevent parallel calls and ensure required dependencies
    if (!profileId || !userId || fetchingRef.current) {
      return;
    }

    // Cancel any pending requests from previous fetch
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this fetch cycle
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    const signal = abortController.signal;

    fetchingRef.current = true;
    setLoading(true);
    setErrors({});

    // Build headers inside callback (stable within execution, avoids dependency issues)
    const headers = { "x-clerk-user-id": userId };
    
    // ENHANCED: Fetch all data in parallel for better performance
    // Using helper function to reduce code duplication and ensure consistent error handling
    const fetchPromises = [
      // Fetch baseline
      createSafeFetch(
        () => api.get<{ baseline: { ipp: number; but: number } }>(
          `/api/step-feedback/baseline?profile_id=${profileId}`,
          { headers, signal }
        ).then(res => res.baseline),
        {
          signal,
          isMounted: () => isMountedRef.current,
          setLoading: setLoadingBaseline,
          setData: (data) => {
            setBaseline(data);
            setErrors(prev => ({ ...prev, baseline: undefined }));
          },
          setError: (error) => {
            setBaseline(undefined);
            setErrors(prev => ({ ...prev, baseline: error }));
          },
          onError: (error) => {
            if (error?.status !== 404 && error?.status !== 403) {
              console.error("Baseline fetch error:", error);
            }
          },
        }
      ),

      // Fetch active step
      createSafeFetch(
        () => api.get<{ activeStep: { signature: string; description: string } | null }>(
          `/api/step-feedback/active-step?profile_id=${profileId}`,
          { headers, signal }
        ).then(res => res.activeStep || undefined),
        {
          signal,
          isMounted: () => isMountedRef.current,
          setLoading: setLoadingActiveStep,
          setData: (data) => {
            setActiveStep(data);
            setErrors(prev => ({ ...prev, activeStep: undefined }));
          },
          setError: (error) => {
            setActiveStep(undefined);
            setErrors(prev => ({ ...prev, activeStep: error }));
          },
          onError: (error) => {
            if (error?.status !== 404 && error?.status !== 403) {
              console.error("Active step fetch error:", error);
            }
          },
        }
      ),

      // Fetch recent feedback
      createSafeFetch(
        () => api.get<{ feedback: FeedbackItem[] }>(
          `/api/step-feedback/recent?profile_id=${profileId}`,
          { headers, signal }
        ).then(res => res.feedback ?? []),
        {
          signal,
          isMounted: () => isMountedRef.current,
          setLoading: setLoadingFeedback,
          setData: (data) => {
            setRecentFeedback(data);
            setErrors(prev => ({ ...prev, feedback: undefined }));
          },
          setError: (error) => {
            setRecentFeedback([]);
            setErrors(prev => ({ ...prev, feedback: error }));
          },
          onError: (error) => {
            if (error?.status !== 404) {
              console.error("Recent feedback fetch error:", error);
            }
          },
        }
      ),

      // Fetch recent insights
      createSafeFetch(
        () => api.get<{ insights: Array<{ signature: string; title?: string; summary: string; createdAt: number }> }>(
          `/api/insights?limit=5&offset=0`,
          { headers, signal }
        ).then(res => res.insights ?? []),
        {
          signal,
          isMounted: () => isMountedRef.current,
          setLoading: setLoadingInsights,
          setData: (data) => {
            setRecentInsights(data);
            setErrors(prev => ({ ...prev, insights: undefined }));
          },
          setError: (error) => {
            setRecentInsights([]);
            setErrors(prev => ({ ...prev, insights: error }));
          },
          onError: (error) => {
            if (error?.status !== 404 && error?.status !== 403) {
              console.error("Insights fetch error:", error);
            }
          },
        }
      ),

      // Fetch recent wins
      createSafeFetch(
        () => api.get<{ wins: Array<{ signature: string; title: string; slider: number; deltaIpp: number; outcome: string | null; recordedAt: string }> }>(
          `/api/step-feedback/recent-wins?profile_id=${profileId}`,
          { headers, signal }
        ).then(res => res.wins ?? []),
        {
          signal,
          isMounted: () => isMountedRef.current,
          setLoading: setLoadingWins,
          setData: (data) => {
            setRecentWins(data);
            setErrors(prev => ({ ...prev, wins: undefined }));
          },
          setError: (error) => {
            setRecentWins([]);
            setErrors(prev => ({ ...prev, wins: error }));
          },
          onError: (error) => {
            if (error?.status !== 404 && error?.status !== 403) {
              console.error("Recent wins fetch error:", error);
            }
          },
        }
      ),

      // Fetch sparkline data
      createSafeFetch(
        () => api.get<{ data: Array<{ timestamp: string; predicted: number; realized: number }> }>(
          `/api/step-feedback/sparkline-data?profile_id=${profileId}`,
          { headers, signal }
        ).then(res => res.data ?? []),
        {
          signal,
          isMounted: () => isMountedRef.current,
          setLoading: setLoadingSparkline,
          setData: (data) => {
            setSparklineData(data);
            setErrors(prev => ({ ...prev, sparkline: undefined }));
          },
          setError: (error) => {
            setSparklineData([]);
            setErrors(prev => ({ ...prev, sparkline: error }));
          },
          onError: (error) => {
            if (error?.status !== 404 && error?.status !== 403) {
              console.error("Sparkline data fetch error:", error);
            }
          },
        }
      ),

      // Fetch token usage (OpenAI credits)
      createSafeFetch(
        () => api.get<{ used: number; remaining: number; limit: number; percentage: number }>(
          `/api/usage/tokens`,
          { headers, signal }
        ),
        {
          signal,
          isMounted: () => isMountedRef.current,
          setLoading: setLoadingTokenUsage,
          setData: (data) => {
            setTokenUsage(data);
          },
          setError: (error) => {
            setTokenUsage(null);
          },
          onError: (error) => {
            if (error?.status !== 401 && error?.status !== 404) {
              console.error("Token usage fetch error:", error);
            }
          },
        }
      ),
    ];

    // Wait for all requests to complete (or fail)
    try {
      await Promise.allSettled(fetchPromises);
    } finally {
      if (!signal.aborted && isMountedRef.current) {
      setLoading(false);
        fetchingRef.current = false;
      }
    }
  }, [profileId, userId]); // CRITICAL: Use userId (string) instead of authHeaders (object) to prevent infinite loops

  useEffect(() => {
    isMountedRef.current = true;
    
    if (profileId && userId) {
    fetchDashboardData();
    }

    // Cleanup: Cancel requests on unmount or dependency change
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      fetchingRef.current = false;
    };
  }, [profileId, userId, fetchDashboardData]); // fetchDashboardData is stable because deps are primitives

  const handleSubmit = async () => {
    if (!activeStep || !profileId) {
      return;
    }

    setStatus("Submitting...");
    try {
      const response = await api.post<{
        status: string;
        baseline: { ipp: number; but: number };
        previous_baseline: { ipp: number; but: number };
        delta: number;
      }>(
        "/api/step-feedback",
        {
          profile_id: profileId,
          signature: activeStep.signature,
          slider,
          outcome,
        },
        {
          headers: authHeaders,
        }
      );

      // Store previous baseline for animation before updating
      if (response.previous_baseline) {
        setPreviousBaseline(response.previous_baseline);
      }

      // Verify baseline was updated correctly
      if (response.baseline) {
        setBaseline(response.baseline);
      }

      setStatus("Recorded. Keep momentum!");
      setOutcome("");
      setSlider(5); // Reset slider to default
      
      // Dispatch event for navigation pulse
      try {
        window.dispatchEvent(new CustomEvent("step1.completed", {
          detail: { signature: activeStep.signature }
        }));
      } catch (error) {
        // Silently handle event dispatch errors
        console.error("[Dashboard] Failed to dispatch step1.completed:", error);
      }
      
      // Refresh dashboard data to show updated baseline and clear active step
      await fetchDashboardData();
      
      // Silent success - state update is enough
    } catch (error: any) {
      const errorMsg = error?.message || "Failed to submit feedback";
      setStatus(errorMsg);
      // Error shown in status state
    }
  };

  const handleViewAnalysis = async (signature: string) => {
    try {
      const { insight } = await api.get<{ insight: InsightData }>(
        `/api/insights/${signature}`,
        { headers: authHeaders }
      );
      
      // Store in sessionStorage for AnalyzeForm to pick up
      sessionStorage.setItem("prefill_analysis", JSON.stringify({
        situation: insight.normalizedInput.situation,
        goal: insight.normalizedInput.goal,
        constraints: Array.isArray(insight.normalizedInput.constraints)
          ? insight.normalizedInput.constraints
          : insight.normalizedInput.constraints.split(",").map(s => s.trim()),
        current_steps: insight.normalizedInput.current_steps || "",
      }));
      
      navigate("/app/analyze");
    } catch (error) {
      console.error("Failed to fetch insight:", error);
    }
  };

  if (!profileId) {
    return <div>No profile ID available</div>;
  }

  if (loading && !baseline && !activeStep && recentFeedback.length === 0) {
    return (
      <section className="dashboard">
        <header>
          <h2>Action Guarantee Dashboard</h2>
          <p>Loading...</p>
        </header>
      </section>
    );
  }

  return (
    <>
      <StreakBar />
      <section className="dashboard" style={{ 
        paddingTop: "calc(2rem + 48px)" // Account for fixed StreakBar
      }}>
        <header>
        <h2>Action Guarantee Dashboard</h2>
        <p>Track IPP/BUT shifts and close the loop on Step-1.</p>
      </header>

      <div className="metrics">
        {loadingBaseline ? (
          <div>Loading baseline...</div>
        ) : errors.baseline ? (
          <div style={{ color: "#dc2626" }}>Error loading baseline: {errors.baseline}</div>
        ) : (
          <>
        <GiantMetric 
          label="IPP (Impact per Person)" 
          value={baseline?.ipp ?? 50} 
          previousValue={previousBaseline?.ipp}
        />
        <GiantMetric 
          label="BUT (Barakah per Unit Time)" 
          value={baseline?.but ?? 50} 
          previousValue={previousBaseline?.but}
        />
          </>
        )}
      </div>

      {/* Token Usage Display (OpenAI Credits) */}
      {tokenUsage && (
        <section style={{
          marginTop: "2rem",
          padding: "1.5rem",
          border: `2px solid ${tokenUsage.percentage >= 100 ? "#dc2626" : tokenUsage.percentage >= 80 ? "#f59e0b" : "var(--accent-cyan, #00FFFF)"}`,
          background: tokenUsage.percentage >= 100 ? "rgba(220, 38, 38, 0.05)" : tokenUsage.percentage >= 80 ? "rgba(245, 158, 11, 0.05)" : "rgba(0, 255, 255, 0.03)",
          borderRadius: "8px"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 style={{
              margin: 0,
              color: tokenUsage.percentage >= 100 ? "#dc2626" : tokenUsage.percentage >= 80 ? "#f59e0b" : "var(--accent-cyan, #00FFFF)",
              fontFamily: "var(--font-mono, 'Geist Mono', 'SF Mono', 'Monaco', monospace)",
              fontSize: "1.1rem"
            }}>
              OpenAI Credits (Today)
            </h3>
            <span style={{
              fontFamily: "var(--font-mono, 'Geist Mono', 'SF Mono', 'Monaco', monospace)",
              fontSize: "0.875rem",
              color: tokenUsage.percentage >= 100 ? "#dc2626" : tokenUsage.percentage >= 80 ? "#f59e0b" : "var(--text-secondary, #AAAAAA)",
              fontWeight: 600
            }}>
              {tokenUsage.percentage}%
            </span>
          </div>
          
          <div style={{
            width: "100%",
            height: "12px",
            background: "var(--muted, #1a1a1a)",
            borderRadius: "6px",
            overflow: "hidden",
            marginBottom: "1rem",
            border: "1px solid rgba(255, 255, 255, 0.1)"
          }}>
            <div style={{
              height: "100%",
              width: `${Math.min(tokenUsage.percentage, 100)}%`,
              background: tokenUsage.percentage >= 100 
                ? "linear-gradient(90deg, #dc2626, #b91c1c)" 
                : tokenUsage.percentage >= 80 
                ? "linear-gradient(90deg, #f59e0b, #d97706)"
                : "linear-gradient(90deg, var(--accent-cyan, #00FFFF), var(--accent-magenta, #FF00FF))",
              transition: "width 0.3s ease",
              boxShadow: tokenUsage.percentage >= 80 ? "0 0 10px rgba(245, 158, 11, 0.5)" : "0 0 8px rgba(0, 255, 255, 0.3)"
            }} />
          </div>

          <div style={{
            display: "flex",
            justifyContent: "space-between",
            fontFamily: "var(--font-mono, 'Geist Mono', 'SF Mono', 'Monaco', monospace)",
            fontSize: "0.875rem"
          }}>
            <span style={{ color: "var(--text-secondary, #AAAAAA)" }}>
              Used: <strong style={{ color: "var(--text-primary, #FFFFFF)" }}>{tokenUsage.used.toLocaleString()}</strong>
            </span>
            <span style={{ color: "var(--text-secondary, #AAAAAA)" }}>
              Remaining: <strong style={{ color: tokenUsage.percentage >= 100 ? "#dc2626" : "var(--text-primary, #FFFFFF)" }}>
                {tokenUsage.remaining.toLocaleString()}
              </strong>
            </span>
            <span style={{ color: "var(--text-secondary, #AAAAAA)" }}>
              Limit: <strong style={{ color: "var(--text-primary, #FFFFFF)" }}>{tokenUsage.limit.toLocaleString()}</strong>
            </span>
          </div>

          {tokenUsage.percentage >= 100 && (
            <div style={{
              marginTop: "1rem",
              padding: "0.75rem",
              background: "rgba(220, 38, 38, 0.1)",
              border: "1px solid #dc2626",
              borderRadius: "4px",
              color: "#dc2626",
              fontSize: "0.875rem",
              fontWeight: 600,
              textAlign: "center"
            }}>
              ⚠️ Daily limit reached. New requests will be blocked until tomorrow.
            </div>
          )}
          {tokenUsage.percentage >= 80 && tokenUsage.percentage < 100 && (
            <div style={{
              marginTop: "1rem",
              padding: "0.75rem",
              background: "rgba(245, 158, 11, 0.1)",
              border: "1px solid #f59e0b",
              borderRadius: "4px",
              color: "#f59e0b",
              fontSize: "0.875rem",
              fontWeight: 600,
              textAlign: "center"
            }}>
              ⚡ Approaching daily limit ({tokenUsage.remaining.toLocaleString()} tokens remaining)
            </div>
          )}
        </section>
      )}

      {loadingActiveStep ? (
        <section className="step">
          <p>Loading active step...</p>
        </section>
      ) : errors.activeStep ? (
        <section className="step">
          <p style={{ color: "#dc2626" }}>Error loading active step: {errors.activeStep}</p>
        </section>
      ) : activeStep ? (
        <section className="step" style={{
          padding: "1.5rem",
          border: "1px solid var(--accent-cyan, #00FFFF)",
          background: "rgba(0, 255, 255, 0.03)",
          marginTop: "2rem"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 style={{ 
              margin: 0, 
              color: "var(--accent-cyan, #00FFFF)", 
              fontFamily: "var(--font-mono, 'Geist Mono', 'SF Mono', 'Monaco', monospace)",
              fontSize: "1.1rem"
            }}>
              Current Step-1
            </h3>
            {timerData && (
              <span style={{
                fontFamily: "var(--font-mono, 'Geist Mono', 'SF Mono', 'Monaco', monospace)",
                fontSize: "0.875rem",
                color: timerData.isExpired ? "#FF0000" : "var(--accent-cyan, #00FFFF)",
                opacity: 0.8
              }}>
                {timerData.formatted_time}
              </span>
            )}
          </div>
          <p style={{ 
            marginBottom: "1.5rem", 
            color: "var(--text-primary, #FFFFFF)",
            fontFamily: "var(--font-body, 'Inter Tight', 'Inter', system-ui, sans-serif)"
          }}>
            {activeStep.description}
          </p>
          
          <button
            onClick={() => setMarkDoneOpen(true)}
            style={{
              padding: "0.75rem 1.5rem",
              background: "transparent",
              border: "2px solid var(--accent-cyan, #00FFFF)",
              color: "var(--accent-cyan, #00FFFF)",
              cursor: "pointer",
              fontFamily: "var(--font-body, 'Inter Tight', 'Inter', system-ui, sans-serif)",
              fontSize: "0.875rem",
              fontWeight: 600,
              boxShadow: "0 0 20px var(--accent-cyan, #00FFFF)",
              transition: "var(--transition-base, 0.2s ease)"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = "0 0 30px var(--accent-cyan, #00FFFF)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "0 0 20px var(--accent-cyan, #00FFFF)";
            }}
          >
            Mark Step-1 Done
          </button>
          
          {status && (
            <div style={{
              marginTop: "1rem",
              fontSize: "0.875rem",
              color: "var(--text-secondary, #CCCCCC)",
              fontFamily: "var(--font-body, 'Inter Tight', 'Inter', system-ui, sans-serif)"
            }}>
              {status}
            </div>
          )}
          {activeStep && outcome && (
            <button
              onClick={async () => {
                setRetrospectiveLoading(true);
                try {
                  const retrospectiveResponse = await api.post<{
                    status: string;
                    insights: RetrospectiveInsights;
                    promptVersion: string;
                  }>(
                    "/api/step-feedback/retrospective",
                    {
                      profile_id: profileId,
                      signature: activeStep.signature,
                      step_description: activeStep.description,
                      outcome: outcome,
                      slider: slider,
                      original_situation: "", // Will be retrieved from cache automatically
                    },
                    { headers: authHeaders }
                  );
                  
                  setRetrospectiveData({
                    insights: retrospectiveResponse.insights,
                    promptVersion: retrospectiveResponse.promptVersion,
                  });
                  setRetrospectiveOpen(true);
                  // Silent success - modal opening is enough
                } catch (error: any) {
                  const errorMsg = error?.message || "Failed to generate retrospective insights";
                  // Error can be shown in modal or console
                  console.error("Retrospective error:", errorMsg);
                } finally {
                  setRetrospectiveLoading(false);
                }
              }}
              disabled={retrospectiveLoading}
              style={{
                marginTop: "0.5rem",
                padding: "0.5rem 1rem",
                border: "1px solid #28a745",
                backgroundColor: retrospectiveLoading ? "#6c757d" : "#28a745",
                color: "white",
                cursor: retrospectiveLoading ? "not-allowed" : "pointer",
                opacity: retrospectiveLoading ? 0.6 : 1,
              }}
            >
              {retrospectiveLoading ? "⏳ Generating..." : "📊 Get Retrospective Insights"}
            </button>
          )}
        </section>
      ) : (
        <p>No active Step-1 yet. Run analysis to generate one.</p>
      )}

      {/* Recent Wins Section */}
      {loadingWins ? (
        <section className="recent-wins" style={{ marginTop: "2rem" }}>
          <h3 style={{
            color: "var(--text-primary, #FFFFFF)",
            fontFamily: "var(--font-body)",
            marginBottom: "1rem",
          }}>
            Recent Wins
          </h3>
          <p>Loading wins...</p>
        </section>
      ) : errors.wins ? (
        <section className="recent-wins" style={{ marginTop: "2rem" }}>
          <h3 style={{
            color: "var(--text-primary, #FFFFFF)",
            fontFamily: "var(--font-body)",
            marginBottom: "1rem",
          }}>
            Recent Wins
          </h3>
          <p style={{ color: "#dc2626" }}>Error: {errors.wins}</p>
        </section>
      ) : recentWins.length > 0 ? (
        <section className="recent-wins" style={{ marginTop: "2rem" }}>
          <h3 style={{
            color: "var(--text-primary, #FFFFFF)",
            fontFamily: "var(--font-body)",
            marginBottom: "1rem",
          }}>
            Recent Wins
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {recentWins.map((win) => (
              <div
                key={win.signature}
                onClick={() => handleViewAnalysis(win.signature)}
                style={{
                  padding: "1rem",
                  border: "1px solid var(--accent-cyan, #00FFFF)",
                  background: "rgba(0, 255, 255, 0.03)",
                  cursor: "pointer",
                  position: "relative",
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(0, 255, 255, 0.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(0, 255, 255, 0.03)";
                }}
              >
                <DeltaBadge slider={win.slider} deltaIpp={win.deltaIpp} />
                <strong style={{
                  color: "var(--text-primary, #FFFFFF)",
                  fontFamily: "var(--font-body)",
                  display: "block",
                  marginBottom: "0.25rem",
                }}>
                  {win.title}
                </strong>
                <p style={{
                  margin: 0,
                  fontSize: "0.9rem",
                  color: "var(--text-secondary, #CCCCCC)",
                  fontFamily: "var(--font-body)",
                }}>
                  {new Date(win.recordedAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Sparkline Section (hidden if <15 entries) */}
      {sparklineData.length > 0 && (
        <section className="sparkline" style={{ marginTop: "2rem" }}>
          <h3 style={{
            color: "var(--text-primary, #FFFFFF)",
            fontFamily: "var(--font-body)",
            marginBottom: "1rem",
          }}>
            Prediction vs Reality
          </h3>
          <Sparkline data={sparklineData} />
        </section>
      )}

      <section className="recent-feedback">
        <h3>Recent Feedback</h3>
        {loadingFeedback ? (
          <p>Loading feedback...</p>
        ) : errors.feedback ? (
          <p style={{ color: "#dc2626" }}>Error: {errors.feedback}</p>
        ) : recentFeedback.length === 0 ? (
          <p>No feedback yet. Complete a Step-1 to see feedback here.</p>
        ) : (
        <ul>
          {recentFeedback.map((item) => (
            <li key={item.signature}>
              <strong>{item.slider}/10</strong> — {item.outcome ?? "No note"} (
              {new Date(item.recordedAt).toLocaleString()})
            </li>
          ))}
        </ul>
        )}
      </section>

      {/* Recent Insights */}
      {loadingInsights ? (
        <section className="recent-insights" style={{ marginTop: "2rem" }}>
          <h3>Recent Insights</h3>
          <p>Loading insights...</p>
        </section>
      ) : errors.insights ? (
        <section className="recent-insights" style={{ marginTop: "2rem" }}>
          <h3>Recent Insights</h3>
          <p style={{ color: "#dc2626" }}>Error: {errors.insights}</p>
        </section>
      ) : recentInsights.length > 0 ? (
        <section className="recent-insights" style={{ marginTop: "2rem" }}>
          <h3>Recent Insights</h3>
          <ul>
            {recentInsights.map((insight) => (
              <li key={insight.signature} style={{ marginBottom: "0.5rem" }}>
                <strong>{insight.title || "Untitled"}</strong>
                <p style={{ margin: "0.25rem 0", fontSize: "0.9rem", color: "#666" }}>
                  {insight.summary.substring(0, 100)}...
                </p>
                <small style={{ color: "#999" }}>
                  {new Date(insight.createdAt).toLocaleString()}
                </small>
              </li>
            ))}
          </ul>
          <button 
            onClick={() => navigate("/app/insights")} 
            style={{ 
              marginTop: "0.5rem", 
              padding: "0.5rem 1rem", 
              border: "1px solid #007bff", 
              backgroundColor: "#007bff", 
              color: "white", 
              cursor: "pointer" 
            }}
          >
            View All Insights →
          </button>
        </section>
      ) : null}

      {/* Retrospective Modal */}
      {retrospectiveData && (
        <RetrospectiveModal
          open={retrospectiveOpen}
          onOpenChange={setRetrospectiveOpen}
          insights={retrospectiveData.insights}
          promptVersion={retrospectiveData.promptVersion}
        />
      )}

      {/* Mark Done Overlay */}
      {activeStep && (
        <MarkDoneOverlay
          open={markDoneOpen}
          onClose={() => setMarkDoneOpen(false)}
          signature={activeStep.signature}
          profileId={profileId!}
          authHeaders={authHeaders}
          onSuccess={async (signature) => {
            await fetchDashboardData();
            setMarkDoneOpen(false);
            // Navigation happens in MarkDoneOverlay component
          }}
        />
      )}
    </section>
    </>
  );
}


