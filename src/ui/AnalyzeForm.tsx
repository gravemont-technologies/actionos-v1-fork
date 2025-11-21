import React, { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AnalyzeRequestInput,
  buildSignatureString,
  computeSignature,
  normalizeConstraints,
  normalizeValue,
} from "../shared/signature.js";
import { AnalyzeResponse, LLMResponse } from "../shared/types.js";
import { ResponseDisplay } from "./ResponseDisplay.js";
import { useAuthHeaders } from "./auth.js";
import { api } from "./utils/api.js";
import { useProfileId, useProfileContext } from "./contexts/ProfileContext.js";
import { Button } from "@/ui/components/ui/button";
import { useEscapeKey } from "./hooks/useEscapeKey.js";

type AnalyzeFormProps = {
  onComplete?: () => void;
};

type FormState = {
  situation: string;
  goal: string;
  constraints: string;
  currentSteps: string;
  deadline: string;
  stakeholders: string;
  resources: string;
};

const initialState: FormState = {
  situation: "",
  goal: "",
  constraints: "",
  currentSteps: "",
  deadline: "",
  stakeholders: "",
  resources: "",
};

// Demo data for new users to see a practical example
const demoData: FormState = {
  situation: "I'm 3 days from missing rent and need my SaaS MVP stable enough to onboard real users.",
  goal: "Functionalize and harden the core activation path so 500 test users can use it without failures, then scale to 10,000.",
  constraints: "money, independence, time (3 days)",
  currentSteps: "Integrating auth, fixing billing flow, stabilizing backend endpoints",
  deadline: "3 days",
  stakeholders: "",
  resources: "",
};

export function AnalyzeForm({ onComplete }: AnalyzeFormProps) {
  const profileId = useProfileId();
  const { clearProfileId } = useProfileContext();
  const authHeaders = useAuthHeaders();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [signature, setSignature] = useState("");
  const [response, setResponse] = useState<LLMResponse | null>(null);
  const [promptVersion, setPromptVersion] = useState<string | undefined>(undefined);
  const [originalResponse, setOriginalResponse] = useState<LLMResponse | null>(null); // Store original for follow-up context
  const [isFollowUp, setIsFollowUp] = useState(false); // Track if current response is a follow-up
  const [followUpLoading, setFollowUpLoading] = useState(false); // Separate loading state for follow-up
  const [followUpError, setFollowUpError] = useState<string | null>(null); // Separate error state for follow-up
  const [isSaved, setIsSaved] = useState(false); // NEW: Track saved status
  const [isTransitioning, setIsTransitioning] = useState(false);

  const payload: AnalyzeRequestInput | null = useMemo(
    () => {
      if (!profileId) return null;
      return {
      profileId,
      situation: formData.situation,
      goal: formData.goal,
      constraints: formData.constraints,
      currentSteps: formData.currentSteps,
      deadline: formData.deadline,
      stakeholders: formData.stakeholders,
      resources: formData.resources,
      };
    },
    [formData, profileId]
  );

  const normalizedPreview = useMemo(
    () => {
      if (!payload) {
        return {
          situation: "",
          goal: "",
          constraints: [],
          currentSteps: "",
          deadline: "",
          stakeholders: "",
          resources: "",
          signatureInput: "",
        };
      }
      return {
      situation: normalizeValue(payload.situation),
      goal: normalizeValue(payload.goal),
      constraints: normalizeConstraints(payload.constraints),
      currentSteps: normalizeValue(payload.currentSteps),
      deadline: normalizeValue(payload.deadline ?? ""),
      stakeholders: normalizeValue(payload.stakeholders ?? ""),
      resources: normalizeValue(payload.resources ?? ""),
      signatureInput: buildSignatureString(payload),
      };
    },
    [payload]
  );

  useEffect(() => {
    // Check for pre-filled data from Insights page
    const prefillData = sessionStorage.getItem("prefill_analysis");
    if (prefillData) {
      try {
        const parsed = JSON.parse(prefillData);
        setFormData(parsed);
        sessionStorage.removeItem("prefill_analysis"); // Clear after use
      } catch (error) {
        console.error("Failed to parse prefill data:", error);
      }
    }

    if (!payload) {
      setSignature("");
      return;
    }

    let cancelled = false;
    computeSignature(payload)
      .then((hash) => {
        if (!cancelled) {
          setSignature(hash);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSignature("");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [payload]);

  // Escape key handler - clear form when no response
  useEscapeKey({
    onEscape: () => {
      if (!response) {
        setFormData(initialState);
        setResponse(null);
        setPromptVersion(undefined);
        setOriginalResponse(null);
        setIsFollowUp(false);
        setServerError(null);
        setIsSaved(false);
      }
    },
    enabled: !response
  });

  // Demo preload on Enter key
  useEffect(() => {
    const handleKeyPress = async (e: KeyboardEvent) => {
      if (e.key === "Enter" && 
          !formData.situation && 
          !formData.goal && 
          !formData.constraints && 
          !formData.currentSteps && 
          !formData.deadline &&
          !response) {
        try {
          const demoData = await api.get<{
            situation: string;
            goal: string;
            constraints: string;
            current_steps: string;
            deadline: string;
          }>("/api/analyze/demo/data", { headers: authHeaders });
          
          setFormData({
            situation: demoData.situation || "",
            goal: demoData.goal || "",
            constraints: demoData.constraints || "",
            currentSteps: demoData.current_steps || "",
            deadline: demoData.deadline || "",
            stakeholders: "",
            resources: ""
          });
        } catch (error) {
          // Silently handle errors
          console.error("[AnalyzeForm] Failed to load demo data:", error);
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [formData.situation, formData.goal, formData.constraints, formData.currentSteps, formData.deadline, response, authHeaders]);

  const handleChange =
    (field: keyof FormState) =>
    (event: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      setFormData((prev) => ({ ...prev, [field]: event.target.value }));
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormState, string>> = {};
    (["situation", "goal", "constraints", "currentSteps"] as Array<keyof FormState>).forEach((field) => {
      if (!formData[field]?.trim()) {
        newErrors[field] = "Required";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setServerError(null);

    if (!validate() || !signature || !profileId || !payload) {
      return;
    }

    setSubmitting(true);
    setIsTransitioning(true);
    
    // Black screen for 800ms
    await new Promise(resolve => setTimeout(resolve, 800));
    
    try {
      const response: AnalyzeResponse = await api.post<AnalyzeResponse>(
        "/api/analyze",
        {
          profile_id: profileId,
          situation: formData.situation,
          goal: formData.goal,
          constraints: formData.constraints,
          current_steps: formData.currentSteps,
          deadline: formData.deadline,
          stakeholders: formData.stakeholders,
          resources: formData.resources,
        },
        {
          headers: {
            "x-signature": signature,
            ...authHeaders,
          },
          timeout: 60000, // 60 seconds for LLM calls
        }
      );
      setResponse(response.output);
      setPromptVersion(response.promptVersion);
      setOriginalResponse(response.output); // Store original for context
      setIsFollowUp(false); // This is the original analysis
      setFollowUpError(null); // Clear any previous follow-up errors
      onComplete?.();
    } catch (error) {
      const errorMessage = (error as Error).message;
      const errorStatus = (error as any)?.status;
      
      // Handle profile not found - redirect to onboarding
      if (
        errorStatus === 403 && 
        (errorMessage.includes("Profile not found") || errorMessage.includes("profile may not have been saved"))
      ) {
        // Clear the invalid profileId
        clearProfileId();
        localStorage.removeItem("action_os_profile_id");
        
        // Redirect to onboarding
        navigate("/onboarding", { replace: true });
        return;
      }
      
      setServerError(errorMessage);
    } finally {
      setSubmitting(false);
      setIsTransitioning(false);
    }
  };

  const handleNewAnalysis = () => {
    setResponse(null);
    setPromptVersion(undefined);
    setOriginalResponse(null);
    setIsFollowUp(false);
    setFormData(initialState);
    setServerError(null);
    setFollowUpError(null);
    setIsSaved(false); // NEW: Reset saved status
  };

  const handleSaveInsight = async (signature: string) => {
    if (!profileId || !authHeaders) return;
    
    try {
      await api.post(
        "/api/insights/save",
        { signature },
        { headers: authHeaders }
      );
      setIsSaved(true);
    } catch (error) {
      console.error("Failed to save insight:", error);
    }
  };

  const handleLoadDemo = () => {
    setFormData(demoData);
    setServerError(null);
    setErrors({});
    // Clear any existing response when loading demo
    setResponse(null);
    setPromptVersion(undefined);
    setOriginalResponse(null);
  };

  if (!profileId) {
    return <div>No profile ID available</div>;
  }

  const handleFollowUp = async (focusArea: string) => {
    if (!profileId || !response) {
      setFollowUpError("Missing profile ID or analysis response");
      return;
    }
    
    // Ensure we have original response stored before doing follow-up
    if (!originalResponse) {
      setOriginalResponse(response);
    }
    
    // Validate that we have all required context
    const originalContext = originalResponse || response;
    if (!originalContext.immediate_steps || originalContext.immediate_steps.length === 0) {
      setFollowUpError("Cannot perform follow-up: original analysis missing immediate steps");
      return;
    }
    
    setFollowUpLoading(true);
    setFollowUpError(null);
    
    try {
      // Pass full original response context, not just summary
      const followUpResponse = await api.post<{ status: string; output: LLMResponse; promptVersion: string }>(
        "/api/analyze/follow-up",
        {
          profile_id: profileId,
          original_analysis: originalContext.summary,
          original_immediate_steps: originalContext.immediate_steps.map(s => s.step).join(" | "),
          original_strategic_lens: originalContext.strategic_lens,
          original_top_risks: originalContext.top_risks.map(r => `${r.risk}: ${r.mitigation}`).join(" | "),
          original_kpi: `${originalContext.kpi.name}: ${originalContext.kpi.target}`,
          focus_area: focusArea,
          original_situation: formData.situation,
          original_goal: formData.goal,
          constraints: formData.constraints,
        },
        { 
          headers: authHeaders,
          timeout: 60000, // 60 seconds for LLM calls
        }
      );
      
      // Validate follow-up response
      if (!followUpResponse.output) {
        throw new Error("Invalid follow-up response: missing output");
      }
      
      setResponse(followUpResponse.output);
      setPromptVersion(followUpResponse.promptVersion);
      setIsFollowUp(true); // Mark as follow-up response
    } catch (error: any) {
      // Parse error message for better user feedback
      let errorMessage = "Failed to generate follow-up analysis";
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (typeof error === "string") {
        errorMessage = error;
      }
      
      setFollowUpError(`${errorMessage}${focusArea ? ` (Focus: ${focusArea.substring(0, 50)})` : ""}`);
      
      // Don't clear the current response on error - let user see it
      console.error("Follow-up analysis error:", error);
    } finally {
      setFollowUpLoading(false);
    }
  };

  const handleBackToOriginal = () => {
    if (originalResponse) {
      setResponse(originalResponse);
      setIsFollowUp(false);
      setFollowUpError(null);
    }
  };

  // Show response if available
  if (response) {
    return (
      <>
        {followUpLoading && (
          <div style={{ 
            position: "fixed", 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            backgroundColor: "rgba(0, 0, 0, 0.5)", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: "white", 
              padding: "2rem", 
              textAlign: "center"
            }}>
              <div style={{ marginBottom: "1rem" }}>🔍 Analyzing deeper...</div>
              <div className="spinner" style={{ 
                border: "4px solid #f3f3f3",
                borderTop: "4px solid #007bff",
                borderRadius: "50%",
                width: "40px",
                height: "40px",
                animation: "spin 1s linear infinite",
                margin: "0 auto"
              }}></div>
            </div>
          </div>
        )}
        {followUpError && (
          <div className="error-message" style={{ marginBottom: "1rem", padding: "1rem", backgroundColor: "#fee", border: "1px solid #fcc" }}>
            <div>
              <strong>Follow-up Analysis Error</strong>
            </div>
            <pre className="error-content" style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {followUpError}
            </pre>
            <button
              onClick={() => {
                setFollowUpError(null);
                // Extract focus area from error message if available
                const focusMatch = followUpError.match(/Focus: (.+?)\)/);
                if (focusMatch && focusMatch[1]) {
                  handleFollowUp(focusMatch[1]);
                }
              }}
              style={{
                marginTop: "0.5rem",
                padding: "0.5rem 1rem",
                border: "1px solid #007bff",
                backgroundColor: "#007bff",
                color: "white",
                cursor: "pointer",
              }}
            >
              Retry
            </button>
          </div>
        )}
      <ResponseDisplay
        response={response}
        onNewAnalysis={handleNewAnalysis}
        situation={formData.situation}
        goal={formData.goal}
        constraints={formData.constraints}
        currentSteps={formData.currentSteps}
        deadline={formData.deadline}
        onFollowUp={handleFollowUp}
        promptVersion={promptVersion}
        isFollowUp={isFollowUp}
        onBackToOriginal={isFollowUp && originalResponse ? handleBackToOriginal : undefined}
        profileId={profileId}
        authHeaders={authHeaders}
        onSaveInsight={handleSaveInsight} // NEW
        isSaved={isSaved} // NEW
      />
      </>
    );
  }

  return (
    <>
      {isTransitioning && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "var(--bg-void, #000000)",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }} />
      )}
      <form onSubmit={handleSubmit} className="analyze-form">
        <header>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", marginBottom: "0.5rem" }}>
          <div style={{ flex: 1 }}>
        <h2>Describe your situation</h2>
            <p>Situation → Analyze → Actions → Review 🏆 Achieve</p>
            <p className="text-xs text-muted-foreground mt-1">
              Insights are not persisted—leaving the page or closing the app clears every suggestion.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleLoadDemo}
            title="Load example inputs to see how the feature works"
          >
            📋 Load Demo
          </Button>
        </div>
      </header>

      {renderTextArea("situation", formData.situation, handleChange, errors, "Describe your situation...")}
      {renderTextArea("goal", formData.goal, handleChange, errors, "What's your goal?")}
      {renderTextArea("constraints", formData.constraints, handleChange, errors, "Constraints (comma-separated)...")}
      {renderTextArea("currentSteps", formData.currentSteps, handleChange, errors, "Current steps...")}
      {renderTextInput("deadline", formData.deadline, handleChange, errors, "Deadline (optional)")}
      {renderTextInput("stakeholders", formData.stakeholders, handleChange, errors, "Stakeholders (optional)")}
      {renderTextInput("resources", formData.resources, handleChange, errors, "Resources (optional)")}

      <section className="normalized-preview" style={{ display: "none" }}>
        <h3>Normalization Preview</h3>
        <pre>{JSON.stringify(normalizedPreview, null, 2)}</pre>
        <small>Signature (client-computed): {signature || "computing..."}</small>
      </section>

      {serverError && (
        <div className="error-message">
          <div className="error-header">
            <strong>Error</strong>
          </div>
          <pre className="error-content">{serverError}</pre>
        </div>
      )}

      {submitting && (
        <div style={{
          marginBottom: "1rem",
          background: "var(--background, #000)",
          border: "1px solid var(--accent-cyan, #00FFFF)",
          borderRadius: "4px",
          overflow: "hidden",
          height: "8px"
        }}>
          <div style={{
            height: "100%",
            background: "linear-gradient(90deg, var(--accent-cyan, #00FFFF), var(--accent-magenta, #FF00FF))",
            animation: "loadingBar 2s ease-in-out infinite",
            transformOrigin: "left"
          }} />
          <style>{`
            @keyframes loadingBar {
              0% { transform: scaleX(0.1); opacity: 0.6; }
              50% { transform: scaleX(0.7); opacity: 1; }
              100% { transform: scaleX(0.95); opacity: 0.8; }
            }
          `}</style>
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        aria-label="Generate action"
        style={{
          width: "100%",
          padding: "1rem",
          background: submitting ? "var(--muted, #ccc)" : "#dc2626",
          color: submitting ? "var(--muted-foreground, #666)" : "#FFFFFF",
          border: "none",
          borderRadius: "8px",
          boxShadow: submitting ? "none" : "0 6px 18px rgba(220,38,38,0.18)",
          fontWeight: "700",
          fontSize: "1rem",
          cursor: submitting ? "not-allowed" : "pointer",
          transition: "transform 120ms ease, box-shadow 120ms ease",
          marginTop: "1rem"
        }}
        onMouseDown={(e) => { if (!submitting) (e.currentTarget.style.transform = 'translateY(1px)'); }}
        onMouseUp={(e) => { if (!submitting) (e.currentTarget.style.transform = 'translateY(0)'); }}
      >
        {submitting ? "Analyzing..." : "ACTION"}
      </button>
    </form>
    </>
  );
}

function renderTextArea(
  field: keyof FormState,
  value: string,
  handleChange: (field: keyof FormState) => (event: React.ChangeEvent<HTMLTextAreaElement>) => void,
  errors: Partial<Record<keyof FormState, string>>,
  placeholder?: string
) {
  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <textarea
        value={value}
        onChange={handleChange(field)}
        placeholder={placeholder || `Enter ${field}...`}
        rows={3}
        style={{
          width: "100%",
          padding: "1rem",
          background: "transparent",
          border: "1px solid var(--accent-cyan, #00FFFF)",
          fontFamily: "var(--font-body, 'Inter Tight', 'Inter', system-ui, sans-serif)",
          fontSize: "1rem",
          resize: "vertical"
        }}
        className="text-foreground"
      />
      {errors[field] && (
        <div style={{ color: "#FF0000", fontSize: "0.875rem", marginTop: "0.5rem" }}>
          {errors[field]}
        </div>
      )}
    </div>
  );
}

function renderTextInput(
  field: keyof FormState,
  value: string,
  handleChange: (field: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement>) => void,
  errors: Partial<Record<keyof FormState, string>>,
  placeholder?: string
) {
  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <input
        type="text"
        value={value}
        onChange={handleChange(field)}
        placeholder={placeholder || `Enter ${field}...`}
        style={{
          width: "100%",
          padding: "0.75rem 1rem",
          background: "transparent",
          border: "1px solid var(--accent-cyan, #00FFFF)",
          fontFamily: "var(--font-body, 'Inter Tight', 'Inter', system-ui, sans-serif)",
          fontSize: "1rem"
        }}
        className="text-foreground"
      />
      {errors[field] && (
        <div style={{ color: "#FF0000", fontSize: "0.875rem", marginTop: "0.5rem" }}>
          {errors[field]}
        </div>
      )}
    </div>
  );
}

