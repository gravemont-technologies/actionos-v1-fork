import React, { useState, useEffect } from "react";
import { LLMResponse } from "../shared/types.js";
import { generatePDFReport } from "./utils/pdfExport.js";
import { Button } from "@/ui/components/ui/button";
// Toast removed - using silent state updates
import { api } from "./utils/api.js";
import { useStep1Timer } from "./hooks/useStep1Timer.js";
import { useUserId } from "./auth.js";

type ResponseDisplayProps = {
  response: LLMResponse;
  onNewAnalysis?: () => void;
  situation?: string;
  goal?: string;
  constraints?: string; // Added for micro nudge generation
  currentSteps?: string; // Added for micro nudge generation
  deadline?: string; // Added for micro nudge generation
  onFollowUp?: (focusArea: string) => void;
  onRetrospective?: () => void;
  promptVersion?: string;
  isFollowUp?: boolean; // Indicates if this is a follow-up analysis
  onBackToOriginal?: () => void; // Callback to return to original analysis
  profileId?: string; // Added for micro nudge generation
  authHeaders?: Record<string, string>; // Added for micro nudge generation
  onSaveInsight?: (signature: string) => Promise<void>;
  isSaved?: boolean;
};

export function ResponseDisplay({ response, onNewAnalysis, situation, goal, constraints, currentSteps, deadline, onFollowUp, onRetrospective, promptVersion, isFollowUp = false, onBackToOriginal, profileId, authHeaders, onSaveInsight, isSaved: initialIsSaved = false }: ResponseDisplayProps) {
  const stepOne = response.immediate_steps[0];
  const userId = useUserId();
  const timerData = useStep1Timer(
    profileId || null,
    response?.meta?.signature_hash || null,
    userId || null
  );

  const getTitle = (): string => {
    if (response?.meta?.title) {
      return response.meta.title;
    }
    const summary = response?.summary?.trim() || "";
    if (!summary) return "Analysis";
    const firstLine = summary.split("\n")[0] || "";
    const title = firstLine.length > 60 ? firstLine.substring(0, 60) + "..." : firstLine;
    return title || "Analysis";
  };

  const [copiedCTA, setCopiedCTA] = useState<string | null>(null);
  const [expandedRisks, setExpandedRisks] = useState<Set<number>>(new Set()); // FIXED: Use Set for expanded state
  const [isSaved, setIsSaved] = useState(initialIsSaved);
  const [saving, setSaving] = useState(false);
  const [checkingSaved, setCheckingSaved] = useState(true);

  // Check saved status on mount
  useEffect(() => {
    if (!authHeaders || !response?.meta?.signature_hash) {
      setCheckingSaved(false);
      return;
    }

    const checkSaved = async () => {
      try {
        const saved = await api.get<{ insight: { signature: string } }>(
          `/api/insights/${response.meta.signature_hash}`,
          { headers: authHeaders }
        );
        setIsSaved(!!saved.insight);
      } catch (error) {
        // 404 means not saved, which is fine
        if ((error as any)?.status !== 404) {
          console.error("Failed to check saved status:", error);
        }
        setIsSaved(false);
      } finally {
        setCheckingSaved(false);
      }
    };

    checkSaved();
  }, [authHeaders, response?.meta?.signature_hash]); // Remove profileId - insights are user-based

  // Save insight handler with optimistic updates and retry logic
  const handleSaveInsight = async (signature: string) => {
    if (!authHeaders || saving || isSaved) return;

    // Optimistic update
    setIsSaved(true);
    setSaving(true);
    
    let retryCount = 0;
    const maxRetries = 2;
    
    while (retryCount <= maxRetries) {
      try {
        if (onSaveInsight) {
          await onSaveInsight(signature);
        } else {
          await api.post(
            "/api/insights/save",
            { signature },
            { headers: authHeaders }
          );
        }
        
        // Success - keep optimistic state
        // Silent success - state update is enough
        console.log("Insight saved");
        return; // Exit on success
      } catch (error) {
        retryCount++;
        
        if (retryCount > maxRetries) {
          // Revert optimistic update on final failure
          setIsSaved(false);
          // Error logged silently
          console.error("Failed to save insight:", (error as Error).message);
        } else {
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }
    }
    
    setSaving(false);
  };

  // Toggle risk expansion (FIXED: Proper React hooks usage)
  const toggleRiskExpansion = (index: number) => {
    const newSet = new Set(expandedRisks);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setExpandedRisks(newSet);
  };

  // Parse CTA templates from Step-1 step description
  // Format: "action text | Email template — ... | Calendar template — ... | Slack template — ... | TODO template — ..."
  const parseCTAs = (stepDescription: string) => {
    const parts = stepDescription.split("|").map((p) => p.trim());
    
    // First part is the action text (may include "(Execute in ≤15 minutes)")
    let actionText = parts[0] || "";
    actionText = actionText.replace(/\s*\(Execute in ≤15 minutes\)/i, "").trim();

    // Find templates
    const emailPart = parts.find((p) => p.toLowerCase().includes("email template"));
    const calendarPart = parts.find((p) => p.toLowerCase().includes("calendar template"));
    const slackPart = parts.find((p) => p.toLowerCase().includes("slack template"));
    const todoPart = parts.find((p) => p.toLowerCase().includes("todo template"));

    const extractTemplateContent = (part: string | undefined) => {
      if (!part) return null;
      // Remove "Template —" or "Template:" prefix
      return part.replace(/^[^—:]+[—:]\s*/, "").trim();
    };

    return {
      actionText,
      email: extractTemplateContent(emailPart),
      calendar: extractTemplateContent(calendarPart),
      slack: extractTemplateContent(slackPart),
      todo: extractTemplateContent(todoPart),
    };
  };

  const ctas = parseCTAs(stepOne.step);

  const handleCopyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCTA(type);
      setTimeout(() => setCopiedCTA(null), 2000);
    } catch (error) {
      // Fallback: show text in alert
      alert(`Copy this text:\n\n${text}`);
    }
  };

  const handleEmailCTA = () => {
    if (!ctas.email) return;
    // Extract subject and body from email template
    // Format: Subject: "Quick: [Action] — 15m to test" | Body: Hi [Name], ...
    const subjectMatch = ctas.email.match(/Subject:\s*"([^"]+)"/i);
    const bodyMatch = ctas.email.match(/Body:\s*(.+?)(?:\s*—\s*\[You\]|$)/i);
    
    let subject = "Quick: Action — 15m to test";
    let body = ctas.email;
    
    if (subjectMatch) {
      subject = subjectMatch[1].replace(/\[Action\]/g, ctas.actionText.substring(0, 50));
    } else {
      subject = `Quick: ${ctas.actionText.substring(0, 30)} — 15m to test`;
    }
    
    if (bodyMatch) {
      body = bodyMatch[1]
        .replace(/\[Action short description\]/g, ctas.actionText.substring(0, 100))
        .replace(/\[Action\]/g, ctas.actionText.substring(0, 50))
        .trim();
    } else {
      body = `Hi, I'll run a 15-minute experiment now: ${ctas.actionText.substring(0, 100)}. Can you briefly watch for results? I'll report results soon.`;
    }
    
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleCalendarCTA = () => {
    if (!ctas.calendar) return;
    // Extract title and description from calendar template
    // Format: Title: "15m: Execute Step-1 — [Action short]" | Description: Do this: [Action sentence]. Goal: [KPI target]. After: mark complete & submit 3-word result.
    const titleMatch = ctas.calendar.match(/Title:\s*"([^"]+)"/i);
    const descMatch = ctas.calendar.match(/Description:\s*(.+?)(?:\s*After:|$)/i);
    
    let title = "15m: Execute Step-1";
    let description = ctas.actionText;
    
    if (titleMatch) {
      title = titleMatch[1].replace(/\[Action short\]/g, ctas.actionText.substring(0, 30));
    } else {
      title = `15m: ${ctas.actionText.substring(0, 30)}`;
    }
    
    if (descMatch) {
      description = descMatch[1]
        .replace(/\[Action sentence\]/g, ctas.actionText)
        .replace(/\[Action\]/g, ctas.actionText)
        .trim();
    } else {
      description = `Do this: ${ctas.actionText}. After: mark complete & submit 3-word result.`;
    }

    // Generate ICS file
    const startDate = new Date();
    startDate.setMinutes(startDate.getMinutes() + 15); // 15 minutes from now
    const endDate = new Date(startDate);
    endDate.setMinutes(endDate.getMinutes() + 15); // 15 minute duration

    const formatICSDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    };

    // Escape special characters for ICS format
    const escapeICS = (text: string) => {
      return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
    };

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Action OS//EN
BEGIN:VEVENT
DTSTART:${formatICSDate(startDate)}
DTEND:${formatICSDate(endDate)}
SUMMARY:${escapeICS(title)}
DESCRIPTION:${escapeICS(description)}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "step-1.ics";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSlackCTA = () => {
    if (!ctas.slack) return;
    // Extract message from slack template
    // Format: "@here Quick 15m test: [Action]. Goal: [KPI]. Ping me when done — I'll post result."
    let message = ctas.slack;
    message = message
      .replace(/\[Action\]/g, ctas.actionText.substring(0, 100))
      .replace(/\[KPI\]/g, response.kpi.name)
      .trim();
    
    // Remove quotes if present
    if (message.startsWith('"') && message.endsWith('"')) {
      message = message.slice(1, -1);
    }
    
    handleCopyToClipboard(message, "slack");
  };

  const handleTodoCTA = () => {
    if (!ctas.todo) return;
    // Extract task from todo template
    // Format: "Create task: [Action], timebox: 15m, due: today + 1h."
    let task = ctas.todo;
    task = task
      .replace(/\[Action\]/g, ctas.actionText)
      .trim();
    
    // Remove quotes if present
    if (task.startsWith('"') && task.endsWith('"')) {
      task = task.slice(1, -1);
    }
    
    handleCopyToClipboard(task, "todo");
  };

  const getDeltaBucketLabel = (bucket: string) => {
    switch (bucket) {
      case "SMALL":
        return "+3-6%";
      case "MEDIUM":
        return "+7-12%";
      case "LARGE":
        return "+13%+";
      default:
        return bucket;
    }
  };

  const getConfidenceBadge = (confidence: string) => {
    const colors = {
      HIGH: "#22c55e",
      MED: "#eab308",
      LOW: "#ef4444",
    };
    return (
      <span
        style={{
          display: "inline-block",
          padding: "2px 8px",
          backgroundColor: colors[confidence as keyof typeof colors] || "#gray",
          color: "white",
          fontSize: "0.75rem",
          fontWeight: "bold",
        }}
      >
        {confidence}
      </span>
    );
  };

  return (
    <div 
      className="response-display" 
      style={{ 
        marginTop: "2rem", 
        padding: "1.5rem", 
        border: "1px solid var(--accent-cyan, #00FFFF)",
        animation: response ? "explode-up 0.4s ease-out" : "none"
      }}
    >
      <header style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <h2 style={{ margin: 0, color: "var(--text-primary, #FFFFFF)", fontFamily: "var(--font-body, 'Inter Tight', 'Inter', system-ui, sans-serif)" }}>
            {getTitle()}
          </h2>
          {timerData && stepOne && (
            <span style={{ 
              fontFamily: "var(--font-mono, 'Geist Mono', 'SF Mono', 'Monaco', monospace)", 
              fontSize: "0.875rem", 
              color: "var(--accent-cyan, #00FFFF)",
              opacity: 0.8
            }}>
              {timerData.formatted_time}
            </span>
          )}
          {isFollowUp && (
            <span style={{
              padding: "0.25rem 0.75rem",
              backgroundColor: "#e0f2fe",
              color: "#0369a1",
              fontSize: "0.75rem",
              fontWeight: "600",
              border: "1px solid #bae6fd"
            }}>
              🔍 Deep Dive
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {onBackToOriginal && (
            <button
              onClick={onBackToOriginal}
              style={{
                padding: "0.5rem 1rem",
                border: "1px solid #6b7280",
                backgroundColor: "white",
                color: "#374151",
                cursor: "pointer",
                fontSize: "0.9rem",
              }}
              title="Return to original analysis"
            >
              ← Back to Original
            </button>
          )}
          <button
            onClick={() => generatePDFReport(response, situation, goal, promptVersion)}
            style={{
              padding: "0.5rem 1rem",
              border: "1px solid #007bff",
              backgroundColor: "#007bff",
              color: "white",
              cursor: "pointer",
              fontSize: "0.9rem",
            }}
            title="Download PDF Report"
          >
            📄 Download PDF
          </button>
          {onSaveInsight && response.meta.signature_hash && (
            <button
              onClick={() => handleSaveInsight(response.meta.signature_hash)}
              disabled={saving || checkingSaved || isSaved}
              style={{
                padding: "0.5rem 1rem",
                border: "1px solid #22c55e",
                backgroundColor: isSaved ? "#dcfce7" : "transparent",
                color: isSaved ? "#16a34a" : "#22c55e",
                cursor: isSaved || saving ? "not-allowed" : "pointer",
                fontSize: "0.9rem",
                opacity: saving || checkingSaved ? 0.6 : 1,
              }}
              title={isSaved ? "Already saved" : "Save this analysis for later"}
            >
              {saving ? "⏳ Saving..." : checkingSaved ? "⏳ Checking..." : isSaved ? "✓ Saved" : "💾 Save Insight"}
            </button>
          )}
          {onNewAnalysis && (
            <button
              onClick={onNewAnalysis}
              style={{
                padding: "0.5rem 1rem",
                border: "1px solid #ddd",
                backgroundColor: "white",
                cursor: "pointer",
                fontSize: "0.9rem",
              }}
            >
              New Analysis
            </button>
          )}
        </div>
      </header>

      {/* Summary */}
      <section style={{ marginBottom: "1.5rem" }}>
        <h3 style={{ marginBottom: "0.5rem", fontSize: "1.1rem" }}>Summary</h3>
        <p style={{ margin: 0, color: "#666" }}>{response.summary}</p>
      </section>

      {/* Step-1 Action Guarantee */}
      {stepOne && (
        <section
          style={{
            marginBottom: "1.5rem",
            padding: "1rem",
            background: "rgba(0, 255, 255, 0.05)",
            border: "2px solid var(--accent-cyan, #00FFFF)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <h3 style={{ 
              marginBottom: "0.5rem", 
              fontSize: "1.1rem", 
              color: "var(--accent-cyan, #00FFFF)",
              fontFamily: "var(--font-mono, 'Geist Mono', 'SF Mono', 'Monaco', monospace)"
            }}>
              STEP-1: Action Guarantee
            </h3>
            {timerData && (
              <span style={{
                fontFamily: "var(--font-mono, 'Geist Mono', 'SF Mono', 'Monaco', monospace)",
                fontSize: "0.875rem",
                color: "var(--accent-cyan, #00FFFF)"
              }}>
                {timerData.formatted_time}
              </span>
            )}
          </div>
          <p style={{ marginBottom: "0.5rem", fontWeight: "bold" }}>{ctas.actionText}</p>
          <p style={{ marginBottom: "1rem", fontSize: "0.9rem", color: "#666" }}>
            Action Guarantee: Implement Step-1 in ≤15 minutes and record outcome.
          </p>

          {/* CTA Buttons */}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {ctas.email && (
              <button
                onClick={handleEmailCTA}
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
                📧 Email
              </button>
            )}
            {ctas.calendar && (
              <button
                onClick={handleCalendarCTA}
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
                📅 Calendar
              </button>
            )}
            {ctas.slack && (
              <button
                onClick={handleSlackCTA}
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
                {copiedCTA === "slack" ? "✓ Copied" : "💬 Slack"}
              </button>
            )}
            {ctas.todo && (
              <button
                onClick={handleTodoCTA}
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
                {copiedCTA === "todo" ? "✓ Copied" : "✓ TODO"}
              </button>
            )}
          </div>

          {/* Step-1 Metadata */}
          <div style={{ marginTop: "1rem", display: "flex", gap: "1rem", fontSize: "0.85rem", color: "#666" }}>
            <span>
              <strong>ΔIPP/BUT:</strong> {getDeltaBucketLabel(stepOne.delta_bucket)}
            </span>
            <span>
              <strong>Confidence:</strong> {getConfidenceBadge(stepOne.confidence)}
            </span>
            <span>
              <strong>Effort:</strong> {stepOne.effort}
            </span>
            <span>
              <strong>Time:</strong> {stepOne.TTI}
            </span>
          </div>
        </section>
      )}

      {/* Additional Steps */}
      {response.immediate_steps.length > 1 && (
        <section style={{ marginBottom: "1.5rem" }}>
          <h3 style={{ marginBottom: "0.5rem", fontSize: "1.1rem" }}>Additional Steps</h3>
          <ul style={{ margin: 0, paddingLeft: "1.5rem" }}>
            {response.immediate_steps.slice(1).map((step, index) => (
              <li key={index} style={{ marginBottom: "0.5rem" }}>
                <strong>{step.step}</strong> ({getDeltaBucketLabel(step.delta_bucket)}, {step.confidence})
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Strategic Lens */}
      <section style={{ marginBottom: "1.5rem" }}>
        <h3 style={{ marginBottom: "0.5rem", fontSize: "1.1rem" }}>Strategic Lens</h3>
        <p style={{ margin: 0, color: "#666" }}>{response.strategic_lens}</p>
      </section>

      {/* Top Risks */}
      {response.top_risks.length > 0 && (
        <section style={{ marginBottom: "1.5rem" }}>
          <h3 style={{ marginBottom: "0.5rem", fontSize: "1.1rem" }}>Top Risks</h3>
          <ul style={{ margin: 0, paddingLeft: "1.5rem" }}>
            {response.top_risks.map((risk, index) => {
              const isExpanded = expandedRisks.has(index); // FIXED: Use Set lookup
              const hasDeeperDive = risk.deeper_dive && 
                risk.deeper_dive.extended_mitigation && 
                risk.deeper_dive.action_steps?.length > 0;

              return (
                <li key={index} style={{ marginBottom: "1rem" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: "200px" }}>
                      <strong>{risk.risk}:</strong> {risk.mitigation}
                    </div>
                    {hasDeeperDive && (
                      <button
                        onClick={() => toggleRiskExpansion(index)} // FIXED: Use proper handler
                        style={{
                          padding: "0.25rem 0.75rem",
                          border: "1px solid #007bff",
                          backgroundColor: isExpanded ? "#007bff" : "transparent",
                          color: isExpanded ? "white" : "#007bff",
                          cursor: "pointer",
                          fontSize: "0.875rem",
                          fontWeight: "500",
                          transition: "all 0.2s ease",
                        }}
                        title="View deeper dive analysis"
                      >
                        {isExpanded ? "▼ Hide Deeper Dive" : "🔍 Deeper Dive"}
                      </button>
                    )}
                    {!hasDeeperDive && onFollowUp && (
                      <button
                        onClick={() => onFollowUp(`Risk: ${risk.risk} - ${risk.mitigation}`)}
                        style={{
                          padding: "0.25rem 0.75rem",
                          border: "1px solid #007bff",
                          backgroundColor: "transparent",
                          color: "#007bff",
                          cursor: "pointer",
                          fontSize: "0.875rem",
                        }}
                      >
                        🔍 Analyze Deeper
                      </button>
                    )}
                  </div>

                  {/* Preloaded Deeper Dive Content (Instant Display) */}
                  {isExpanded && hasDeeperDive && risk.deeper_dive && (
                    <div style={{
                      marginTop: "1rem",
                      marginLeft: "1rem",
                      padding: "1rem",
                      backgroundColor: "#f0f9ff",
                      border: "1px solid #bae6fd",
                      animation: "fadeIn 0.2s ease-in",
                    }}>
                      <h4 style={{ marginTop: 0, marginBottom: "0.75rem", fontSize: "1rem", color: "#0369a1" }}>
                        Deeper Dive: {risk.risk}
                      </h4>

                      {/* Extended Mitigation */}
                      <div style={{ marginBottom: "1rem" }}>
                        <strong style={{ color: "#075985" }}>Extended Mitigation:</strong>
                        <p style={{ margin: "0.5rem 0 0 0", color: "#0c4a6e" }}>
                          {risk.deeper_dive.extended_mitigation}
                        </p>
                      </div>

                      {/* Action Steps */}
                      {risk.deeper_dive.action_steps && risk.deeper_dive.action_steps.length > 0 && (
                        <div style={{ marginBottom: "1rem" }}>
                          <strong style={{ color: "#075985" }}>Action Steps:</strong>
                          <ul style={{ margin: "0.5rem 0 0 1.5rem", padding: 0, color: "#0c4a6e" }}>
                            {risk.deeper_dive.action_steps.map((step, stepIndex) => (
                              <li key={stepIndex} style={{ marginBottom: "0.25rem" }}>
                                {step}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Warning Signals */}
                      {risk.deeper_dive.warning_signals && risk.deeper_dive.warning_signals.length > 0 && (
                        <div style={{ marginBottom: "1rem" }}>
                          <strong style={{ color: "#075985" }}>Warning Signals:</strong>
                          <ul style={{ margin: "0.5rem 0 0 1.5rem", padding: 0, color: "#0c4a6e" }}>
                            {risk.deeper_dive.warning_signals.map((signal, signalIndex) => (
                              <li key={signalIndex} style={{ marginBottom: "0.25rem" }}>
                                ⚠️ {signal}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Timeline */}
                      {risk.deeper_dive.timeline && (
                        <div>
                          <strong style={{ color: "#075985" }}>Timeline:</strong>
                          <p style={{ margin: "0.5rem 0 0 0", color: "#0c4a6e" }}>
                            {risk.deeper_dive.timeline}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* KPI */}
      <section style={{ marginBottom: "1.5rem" }}>
        <h3 style={{ marginBottom: "0.5rem", fontSize: "1.1rem" }}>KPI</h3>
        <p style={{ margin: 0 }}>
          <strong>{response.kpi.name}:</strong> {response.kpi.target} ({response.kpi.cadence})
        </p>
      </section>

      {/* Micro Nudge - Interactive */}
      <MicroNudgeSection 
        nudge={response.micro_nudge} 
        situation={situation}
        goal={goal}
        constraints={constraints}
        currentSteps={currentSteps}
        deadline={deadline}
        profileId={profileId}
        authHeaders={authHeaders}
      />

      {/* Module */}
      <section style={{ marginBottom: "1.5rem" }}>
        <h3 style={{ marginBottom: "0.5rem", fontSize: "1.1rem" }}>Module: {response.module.name}</h3>
        <ol style={{ margin: 0, paddingLeft: "1.5rem" }}>
          {response.module.steps.map((step, index) => (
            <li key={index} style={{ marginBottom: "0.5rem" }}>
              {step}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

// Interactive Micro Nudge Component
type MicroNudgeSectionProps = {
  nudge: string;
  situation?: string;
  goal?: string;
  constraints?: string;
  currentSteps?: string;
  deadline?: string;
  profileId?: string;
  authHeaders?: Record<string, string>;
};

function MicroNudgeSection({ nudge, situation, goal, constraints, currentSteps, deadline, profileId, authHeaders }: MicroNudgeSectionProps) {
  // Persist completion state in localStorage
  const storageKey = `micro_nudge_completed_${nudge.substring(0, 50).replace(/[^a-zA-Z0-9]/g, "_")}`;
  const [completed, setCompleted] = useState(() => {
    try {
      return localStorage.getItem(storageKey) === "true";
    } catch {
      return false;
    }
  });
  const [currentNudge, setCurrentNudge] = useState(nudge);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleComplete = () => {
    setCompleted(true);
    try {
      localStorage.setItem(storageKey, "true");
    } catch {
      // Ignore localStorage errors
    }
  };

  const handleGetNew = async () => {
    if (!profileId || !situation || !goal || !constraints || !authHeaders) {
      // Fallback: just reset if context not available
      setCompleted(false);
      try {
        localStorage.removeItem(storageKey);
      } catch {
        // Ignore localStorage errors
      }
      setError("Missing context - cannot generate new nudge");
      setTimeout(() => setError(null), 5000);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/analyze/micro-nudge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          profile_id: profileId,
          situation,
          goal,
          constraints,
          current_steps: currentSteps,
          deadline,
          previous_nudge: currentNudge,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to generate new nudge: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.nudge && typeof data.nudge === "string" && data.nudge.trim().length > 0) {
        // Generate new storage key for the new nudge
        const newStorageKey = `micro_nudge_completed_${data.nudge.substring(0, 50).replace(/[^a-zA-Z0-9]/g, "_")}`;
        
        // Clear old completion state
        try {
          localStorage.removeItem(storageKey);
        } catch {
          // Ignore localStorage errors
        }
        
        // Update nudge and reset completion state
        setCurrentNudge(data.nudge);
        setCompleted(false);
        
        // Update storage key reference (for next completion)
        // Note: We can't update the const, but the next completion will use the new key
        
        // Show subtle indicator if fallback was used (for transparency)
        if (data.fallback) {
          setError("Note: Using default nudge (generation had issues)");
          // Clear error after 5 seconds
          setTimeout(() => setError(null), 5000);
        }
      } else {
        throw new Error("Invalid nudge in response");
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to generate new nudge";
      setError(errorMsg);
      // On error, keep current nudge but reset completion state
      setCompleted(false);
      try {
        localStorage.removeItem(storageKey);
      } catch {
        // Ignore localStorage errors
      }
      // Clear error after 5 seconds
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  // Improved actionable element detection using patterns
  const hasActionableElements = (() => {
    const lower = currentNudge.toLowerCase();
    // Action verbs that indicate immediate actionability
    const actionPatterns = [
      /\b(send|email|message|text|call|block|schedule|book|create|update|write|post|share|forward|reply|respond|submit|upload|download|install|configure|set|enable|disable|start|stop|begin|end|complete|finish|mark|check|verify|confirm|approve|reject|accept|decline|add|remove|delete|edit|modify|change|replace|switch|move|copy|paste|cut|save|export|import|generate|build|make|do|take|give|get|put|set|use|try|test|run|execute|perform|implement|apply|activate|deactivate)\b/,
      /\b(now|today|immediately|asap|right now|this (morning|afternoon|evening)|within (an? hour|15 minutes?|30 minutes?|1 hour|2 hours?))\b/,
      /\b(before|by|until|by end of|by EOD|by COB)\b/,
    ];
    return actionPatterns.some(pattern => pattern.test(lower));
  })();

  return (
    <section style={{ 
      marginTop: "2rem",
      padding: "1.5rem",
      border: "1px solid var(--accent-cyan, #00FFFF)",
      background: "rgba(0, 255, 255, 0.03)",
      boxShadow: "0 0 15px rgba(0, 255, 255, 0.2)"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
        <h3 style={{ margin: 0, fontSize: "1.1rem", color: completed ? "#16a34a" : "#d97706" }}>
          Micro Nudge {completed && "✓"}
        </h3>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {!completed ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleComplete}
              disabled={loading}
              style={{
                padding: "0.25rem 0.75rem",
                fontSize: "0.875rem",
              }}
            >
              ✓ Done
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGetNew}
              disabled={loading || !profileId}
              style={{
                padding: "0.25rem 0.75rem",
                fontSize: "0.875rem",
              }}
            >
              {loading ? "⏳ Generating..." : "🔄 New Nudge"}
            </Button>
          )}
        </div>
      </div>
      <p style={{ 
        margin: 0, 
        fontStyle: "italic", 
        color: completed ? "#16a34a" : "#92400e",
        textDecoration: completed ? "line-through" : "none",
        opacity: completed ? 0.7 : 1
      }}>
        {currentNudge}
      </p>
      {hasActionableElements && !completed && (
        <div style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "#92400e" }}>
          💡 This nudge contains actionable steps you can take right now
        </div>
      )}
      {error && (
        <div style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "#dc2626" }}>
          ⚠️ {error}
        </div>
      )}
    </section>
  );
}

