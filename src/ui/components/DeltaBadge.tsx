import React from "react";

type DeltaBadgeProps = {
  slider: number;
  deltaIpp: number;
};

export function DeltaBadge({ slider, deltaIpp }: DeltaBadgeProps) {
  // Color coding based on slider value
  const color = slider >= 7 
    ? "var(--accent-cyan, #00FFFF)" 
    : slider >= 5 
    ? "#FFA500" // amber
    : "#FF0000"; // red
  
  const sign = deltaIpp >= 0 ? "+" : "";
  
  return (
    <span
      style={{
        position: "absolute",
        top: "0.5rem",
        right: "0.5rem",
        padding: "0.25rem 0.5rem",
        background: "rgba(0, 0, 0, 0.8)",
        border: `1px solid ${color}`,
        color: color,
        fontSize: "0.75rem",
        fontFamily: "var(--font-mono, 'Geist Mono', 'SF Mono', 'Monaco', monospace)",
        fontWeight: 600,
        zIndex: 10,
      }}
    >
      {sign}{deltaIpp.toFixed(1)}
    </span>
  );
}

