import React from "react";
import { useEscapeKey } from "../hooks/useEscapeKey.js";

export type RetrospectiveInsights = {
  insights: string;
  what_worked: string;
  what_didnt: string;
  improvements: string[];
};

type RetrospectiveModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  insights: RetrospectiveInsights;
  promptVersion?: string;
};

export function RetrospectiveModal({
  open,
  onOpenChange,
  insights,
  promptVersion,
}: RetrospectiveModalProps) {
  useEscapeKey({
    onEscape: () => onOpenChange(false),
    enabled: open
  });

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "var(--bg-void, #000000)",
        zIndex: 10000,
        padding: "2rem",
        overflowY: "auto"
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onOpenChange(false);
        }
      }}
    >
      <div style={{
        maxWidth: "800px",
        margin: "0 auto",
        padding: "2rem",
        border: "2px solid #FF0000"
      }}>
        <header style={{
          marginBottom: "2rem",
          paddingBottom: "1rem",
          borderBottom: "2px solid #FF0000"
        }}>
          <h2 style={{
            color: "#FF0000",
            fontFamily: "var(--font-mono, 'Geist Mono', 'SF Mono', 'Monaco', monospace)",
            fontSize: "1.5rem",
            margin: 0,
            textTransform: "uppercase"
          }}>
            RETROSPECTIVE
            {promptVersion && (
              <span style={{
                fontSize: "0.875rem",
                fontFamily: "var(--font-body, 'Inter Tight', 'Inter', system-ui, sans-serif)",
                opacity: 0.7,
                marginLeft: "1rem",
                textTransform: "none"
              }}>
                (Prompt v{promptVersion})
              </span>
            )}
          </h2>
        </header>

        <div style={{
          color: "var(--text-primary, #FFFFFF)",
          fontFamily: "var(--font-body, 'Inter Tight', 'Inter', system-ui, sans-serif)",
          lineHeight: "1.6"
        }}>
          <section style={{ marginBottom: "2rem" }}>
            <h3 style={{
              color: "#FF0000",
              fontFamily: "var(--font-mono, 'Geist Mono', 'SF Mono', 'Monaco', monospace)",
              fontSize: "1.1rem",
              marginBottom: "1rem"
            }}>
              KEY INSIGHTS
            </h3>
            <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>
              {insights.insights}
            </p>
          </section>

          <section style={{ marginBottom: "2rem" }}>
            <h3 style={{
              color: "#00FF00",
              fontFamily: "var(--font-mono, 'Geist Mono', 'SF Mono', 'Monaco', monospace)",
              fontSize: "1.1rem",
              marginBottom: "1rem"
            }}>
              WHAT WORKED
            </h3>
            <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>
              {insights.what_worked}
            </p>
          </section>

          <section style={{ marginBottom: "2rem" }}>
            <h3 style={{
              color: "#FF0000",
              fontFamily: "var(--font-mono, 'Geist Mono', 'SF Mono', 'Monaco', monospace)",
              fontSize: "1.1rem",
              marginBottom: "1rem"
            }}>
              WHAT DIDN'T WORK
            </h3>
            <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>
              {insights.what_didnt}
            </p>
          </section>

          <section style={{ marginBottom: "2rem" }}>
            <h3 style={{
              color: "var(--accent-cyan, #00FFFF)",
              fontFamily: "var(--font-mono, 'Geist Mono', 'SF Mono', 'Monaco', monospace)",
              fontSize: "1.1rem",
              marginBottom: "1rem"
            }}>
              IMPROVEMENTS
            </h3>
            <ol style={{
              listStyle: "decimal",
              listStylePosition: "inside",
              margin: 0,
              padding: 0
            }}>
              {insights.improvements.map((improvement, index) => (
                <li key={index} style={{
                  marginBottom: "0.5rem",
                  color: "var(--text-primary, #FFFFFF)"
                }}>
                  {improvement}
                </li>
              ))}
            </ol>
          </section>
        </div>

        <button
          onClick={() => onOpenChange(false)}
          style={{
            marginTop: "2rem",
            padding: "0.75rem 1.5rem",
            background: "transparent",
            border: "2px solid #FF0000",
            color: "#FF0000",
            cursor: "pointer",
            fontFamily: "var(--font-body, 'Inter Tight', 'Inter', system-ui, sans-serif)",
            fontSize: "0.875rem",
            fontWeight: 600
          }}
        >
          CLOSE
        </button>
      </div>
    </div>
  );
}
