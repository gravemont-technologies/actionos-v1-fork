import React from "react";

type SparklineDataPoint = {
  timestamp: string;
  predicted: number;
  realized: number;
};

type SparklineProps = {
  data: SparklineDataPoint[];
};

export function Sparkline({ data }: SparklineProps) {
  if (data.length === 0) return null;

  const width = 400;
  const height = 60;
  const padding = 10;
  const maxValue = 3; // Both predicted and realized are normalized to 0-3

  // Generate points for predicted line (cyan)
  const predictedPoints = data.map((d, i) => {
    const x = padding + (i / (data.length - 1 || 1)) * (width - 2 * padding);
    const y = padding + (1 - Math.min(d.predicted / maxValue, 1)) * (height - 2 * padding);
    return { x, y };
  });

  // Generate points for realized line (white)
  const realizedPoints = data.map((d, i) => {
    const x = padding + (i / (data.length - 1 || 1)) * (width - 2 * padding);
    const y = padding + (1 - Math.min(d.realized / maxValue, 1)) * (height - 2 * padding);
    return { x, y };
  });

  return (
    <svg
      width={width}
      height={height}
      style={{
        display: "block",
        background: "transparent",
      }}
    >
      {/* Predicted line (cyan) */}
      <polyline
        points={predictedPoints.map(p => `${p.x},${p.y}`).join(" ")}
        fill="none"
        stroke="var(--accent-cyan, #00FFFF)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Realized line (white, opacity 0.8) */}
      <polyline
        points={realizedPoints.map(p => `${p.x},${p.y}`).join(" ")}
        fill="none"
        stroke="var(--text-primary, #FFFFFF)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.8}
      />
    </svg>
  );
}

