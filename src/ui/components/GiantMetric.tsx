import React from "react";

type GiantMetricProps = {
  label: string;
  value: number;
  previousValue?: number | null;
  delta?: number;
};

export function GiantMetric({ label, value, previousValue, delta }: GiantMetricProps) {
  const calculatedDelta = previousValue !== undefined && previousValue !== null 
    ? value - previousValue 
    : delta ?? 0;
  const hasDelta = calculatedDelta !== 0;

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      padding: "1.5rem",
      border: "1px solid var(--accent-cyan, #00FFFF)",
      background: "rgba(0, 255, 255, 0.03)",
      minWidth: "200px"
    }}>
      <div style={{
        fontFamily: "var(--font-body, 'Inter Tight', 'Inter', system-ui, sans-serif)",
        fontSize: "0.75rem",
        color: "var(--text-secondary, #CCCCCC)",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        marginBottom: "0.5rem",
        opacity: 0.7
      }}>
        {label}
      </div>
      <div style={{
        display: "flex",
        alignItems: "baseline",
        gap: "0.5rem"
      }}>
        <div style={{
          fontFamily: "var(--font-mono, 'Geist Mono', 'SF Mono', 'Monaco', monospace)",
          fontSize: "3rem",
          fontWeight: 700,
          color: "var(--accent-cyan, #00FFFF)",
          lineHeight: 1.2
        }}>
          {value.toFixed(1)}
        </div>
        {hasDelta && (
          <span style={{
            fontFamily: "var(--font-mono, 'Geist Mono', 'SF Mono', 'Monaco', monospace)",
            fontSize: "1rem",
            fontWeight: 600,
            color: calculatedDelta > 0 ? "#00FF00" : "#FF0000",
            opacity: 0.9
          }}>
            {calculatedDelta > 0 ? "+" : ""}{calculatedDelta.toFixed(1)}
          </span>
        )}
      </div>
    </div>
  );
}

