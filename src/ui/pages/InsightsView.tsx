import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuthHeaders, useUserId, useAuthReady } from "../auth.js";
import { api } from "../utils/api.js";
// Toast removed - using silent state updates
import { useNavigate } from "react-router-dom";
import { StreakBar } from "../components/StreakBar.js";
import { DeltaBadge } from "../components/DeltaBadge.js";
import { useInsightDeltas } from "../hooks/useInsightDeltas.js";

type Insight = {
  signature: string;
  title?: string;
  tags?: string[];
  situation: string;
  goal: string;
  summary: string;
  createdAt: number;
};

// Type for insight data from API (matches CacheEntry structure)
type InsightData = {
  signature: string;
  title?: string;
  tags?: string[];
  normalizedInput: {
    situation: string;
    goal: string;
    constraints: string[] | string;
    current_steps?: string;
  };
  response: {
    summary?: string;
    immediate_steps?: Array<{
      delta_bucket?: string;
    }>;
  };
  createdAt: number;
  userId?: string;
  isSaved?: boolean;
};

export function InsightsView() {
  const userId = useUserId(); // Get userId (stable string reference) for dependencies
  const authHeaders = useAuthHeaders(); // Memoized, but we use userId in deps for safety
  const isAuthReady = useAuthReady();
  const navigate = useNavigate();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [flashingSignature, setFlashingSignature] = useState<string | null>(null);
  const offsetRef = useRef(0); // Track offset in ref to avoid dependency issues
  const abortControllerRef = useRef<AbortController | null>(null); // Cancel requests on unmount/dependency change
  const isMountedRef = useRef(true); // Track component mount status
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch deltas for all displayed insights
  const insightDeltas = useInsightDeltas(insights.map(i => i.signature));

  // Check for flash effect on mount
  useEffect(() => {
    try {
      const justClosed = sessionStorage.getItem("just_closed");
      if (justClosed) {
        setFlashingSignature(justClosed);
        sessionStorage.removeItem("just_closed");
        
        // Flash for 400ms
        setTimeout(() => {
          setFlashingSignature(null);
        }, 400);
      }
    } catch (error) {
      console.debug("sessionStorage check failed:", error);
    }
  }, []);

  // Auto-focus and ⌘+K shortcut
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

  // Auto-focus on mount
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  /**
   * Fetches insights with pagination, search, and cancellation support.
   * 
   * Features:
   * - Request cancellation on unmount or dependency change
   * - Component mount checks to prevent state updates on unmounted components
   * - Pagination support with offset tracking via ref (avoids dependency issues)
   * - Search filtering with debouncing
   * - Auth readiness guard to prevent 401s during initial mount
   * 
   * @param reset - If true, resets pagination and fetches from the beginning
   */
  const fetchInsights = useCallback(async (reset = false) => {
    // Guard: Ensure user is authenticated
    if (!userId) {
      setLoading(false);
      return;
    }

    // Guard: Wait for auth to be ready before fetching
    if (!isAuthReady) {
      return;
    }

    // Cancel any pending requests from previous fetch
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this fetch
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    const signal = abortController.signal;

    // Build headers inside callback (stable within execution, avoids dependency issues)
    const headers = { "x-clerk-user-id": userId };

    if (reset) {
      setLoading(true);
      setOffset(0);
      offsetRef.current = 0;
    } else {
      setLoadingMore(true);
    }

    try {
      // Use ref to get current offset (avoids stale closure and dependency issues)
      const currentOffset = reset ? 0 : offsetRef.current;
      const response = await api.get<{
        insights: Insight[];
        pagination: { hasMore: boolean };
      }>(`/api/insights?limit=20&offset=${currentOffset}${debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : ""}`, {
        headers,
        signal,
      });

      // Only update state if request wasn't aborted and component is still mounted
      if (!signal.aborted && isMountedRef.current) {
        if (reset) {
          setInsights(response.insights);
          const newOffset = 20;
          setOffset(newOffset);
          offsetRef.current = newOffset; // Update ref directly (no need for separate useEffect)
        } else {
          setInsights((prev) => [...prev, ...response.insights]);
          setOffset((prev) => {
            const newOffset = prev + 20;
            offsetRef.current = newOffset; // Update ref directly
            return newOffset;
          });
        }
        setHasMore(response.pagination.hasMore);
      }
    } catch (error: any) {
      // Ignore aborted requests and unmounted components
      if (signal.aborted || error?.name === 'AbortError' || !isMountedRef.current) {
        return;
      }
      // Error logged silently - UI shows empty state
      console.error("Failed to load insights:", (error as Error).message);
    } finally {
      if (!signal.aborted && isMountedRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [userId, debouncedSearch, isAuthReady]); // CRITICAL: Include isAuthReady to re-trigger once auth is ready

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    isMountedRef.current = true;
    
    if (userId) {
      fetchInsights(true);
    }

    // Cleanup: Cancel requests on unmount or dependency change
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [debouncedSearch, userId, fetchInsights]); // Use userId instead of authHeaders

  const handleUnsave = async (signature: string) => {
    try {
      await api.delete(`/api/insights/${signature}`, { headers: authHeaders });
      setInsights((prev) => prev.filter((i) => i.signature !== signature));
      // Silent success - list update is enough
    } catch (error) {
      // Error logged silently
      console.error("Failed to remove insight:", (error as Error).message);
    }
  };

  // View full analysis (navigate to analyze with pre-filled data)
  const handleViewAnalysis = async (signature: string) => {
    try {
      // Fetch full insight data
      const { insight } = await api.get<{ insight: InsightData }>(
        `/api/insights/${signature}`,
        { headers: authHeaders }
      );

      if (!insight) {
        console.error("Insight not found");
        return;
      }

      // Navigate to analyze page with pre-filled form data
      // Store in sessionStorage for AnalyzeForm to pick up
      sessionStorage.setItem("prefill_analysis", JSON.stringify({
        situation: insight.normalizedInput.situation,
        goal: insight.normalizedInput.goal,
        constraints: Array.isArray(insight.normalizedInput.constraints) 
          ? insight.normalizedInput.constraints.join(", ")
          : insight.normalizedInput.constraints || "",
        currentSteps: insight.normalizedInput.current_steps || "",
        deadline: "",
        stakeholders: "",
        resources: "",
      }));

      navigate("/app/analyze");
    } catch (error) {
      // Error logged silently
      console.error("Failed to load analysis:", (error as Error).message);
    }
  };

  if (!authHeaders) {
    return <div>Please sign in to view your insights</div>;
  }

  return (
    <>
      <StreakBar />
      <div className="insights-view" style={{ 
        padding: "2rem",
        paddingTop: "calc(2rem + 48px)", // Account for fixed StreakBar (AppLayout already has calc, but this ensures consistency)
        maxWidth: "1200px", 
        margin: "0 auto" 
      }}>
        <header style={{ marginBottom: "2rem" }}>
        <h1>My Insights</h1>
        <p>Saved analyses and strategic insights</p>
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search insights... (⌘+K)"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          style={{
            width: "100%",
            maxWidth: "400px",
            padding: "0.75rem 1rem",
            background: "transparent",
            border: "1px solid var(--accent-cyan, #00FFFF)",
            color: "var(--text-primary, #FFFFFF)",
            fontFamily: "var(--font-body, 'Inter Tight', 'Inter', system-ui, sans-serif)",
            fontSize: "1rem",
            marginTop: "1rem",
          }}
        />
      </header>

      {loading && insights.length === 0 ? (
        <div>Loading insights...</div>
      ) : insights.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem" }}>
          <p>No insights saved yet.</p>
          <p>Save analyses from the Analyze page to see them here.</p>
        </div>
      ) : (
        <>
          <div className="insights-grid" style={{ display: "grid", gap: "1.5rem", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", padding: 0 }}>
            {insights.map((insight) => (
              <div
                key={insight.signature}
                style={{
                  position: "relative", // CRITICAL: For DeltaBadge absolute positioning
                  padding: "1.5rem",
                  border: "1px solid var(--accent-cyan, #00FFFF)",
                  background: flashingSignature === insight.signature 
                    ? "var(--accent-cyan, #00FFFF)" 
                    : "rgba(0, 255, 255, 0.03)",
                  transition: flashingSignature === insight.signature 
                    ? "background 0.4s ease-out" 
                    : "var(--transition-base, 0.2s ease)",
                  cursor: "pointer"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow = "0 0 20px var(--accent-cyan, #00FFFF)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {insightDeltas[insight.signature] && (
                  <DeltaBadge 
                    slider={insightDeltas[insight.signature].slider}
                    deltaIpp={insightDeltas[insight.signature].deltaIpp}
                  />
                )}
                <h3>{insight.title || "Untitled Insight"}</h3>
                {insight.tags && insight.tags.length > 0 && (
                  <div style={{ marginBottom: "0.5rem" }}>
                    {insight.tags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          display: "inline-block",
                          padding: "0.25rem 0.5rem",
                          backgroundColor: "#e0f2fe",
                          color: "#0369a1",
                          fontSize: "0.75rem",
                          marginRight: "0.25rem",
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <p style={{ color: "#666", fontSize: "0.9rem", marginBottom: "0.5rem" }}>
                  <strong>Goal:</strong> {insight.goal}
                </p>
                <p style={{ marginBottom: "1rem" }}>{insight.summary}</p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                  <small style={{ color: "#999" }}>
                    {new Date(insight.createdAt).toLocaleDateString()}
                  </small>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      onClick={() => handleViewAnalysis(insight.signature)}
                      style={{
                        padding: "0.25rem 0.75rem",
                        border: "1px solid #007bff",
                        backgroundColor: "transparent",
                        color: "#007bff",
                        cursor: "pointer",
                        fontSize: "0.875rem",
                      }}
                      title="View full analysis"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleUnsave(insight.signature)}
                      style={{
                        padding: "0.25rem 0.75rem",
                        border: "1px solid #dc2626",
                        backgroundColor: "transparent",
                        color: "#dc2626",
                        cursor: "pointer",
                        fontSize: "0.875rem",
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {hasMore && (
            <button
              onClick={() => fetchInsights(false)}
              disabled={loadingMore}
              style={{
                marginTop: "2rem",
                padding: "0.75rem 1.5rem",
                border: "1px solid #007bff",
                backgroundColor: "#007bff",
                color: "white",
                cursor: loadingMore ? "not-allowed" : "pointer",
                opacity: loadingMore ? 0.6 : 1,
              }}
            >
              {loadingMore ? "Loading..." : "Load More"}
          </button>
        )}
        </>
      )}
      </div>
    </>
  );
}


