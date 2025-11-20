import React from "react";
import { useStats } from "../hooks/useStats.js";

export function StreakBar() {
  const { stats, loading } = useStats();

  // Loading state: Return null until data is loaded (prevent layout shift)
  if (loading || !stats) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: "48px",
        borderBottom: "1px solid var(--accent-cyan, #00FFFF)",
        background: "var(--bg-void, #000000)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        fontFamily: "var(--font-mono, 'Geist Mono', 'SF Mono', 'Monaco', monospace)",
        fontSize: "0.875rem",
        color: "var(--text-primary, #FFFFFF)",
      }}
    >
      {stats.completed} Step-1s completed · {stats.totalDeltaIpp} total ΔIPP realized · Current streak: {stats.streak} days
    </div>
  );
}

