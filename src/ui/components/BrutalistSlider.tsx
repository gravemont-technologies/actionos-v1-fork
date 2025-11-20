import React from "react";

type BrutalistSliderProps = {
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
};

export function BrutalistSlider({ 
  value, 
  min = 0, 
  max = 10, 
  onChange, 
  disabled = false 
}: BrutalistSliderProps) {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div style={{
      position: "relative",
      width: "100%",
      padding: "1rem 0"
    }}>
      <style>{`
        input[type="range"].brutalist-slider {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 8px;
          background: transparent;
          outline: none;
          cursor: ${disabled ? "not-allowed" : "pointer"};
          opacity: ${disabled ? 0.5 : 1};
        }
        
        input[type="range"].brutalist-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          background: var(--accent-cyan, #00FFFF);
          border: 2px solid var(--bg-void, #000000);
          box-shadow: 0 0 15px var(--accent-cyan, #00FFFF);
          cursor: ${disabled ? "not-allowed" : "pointer"};
        }
        
        input[type="range"].brutalist-slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          background: var(--accent-cyan, #00FFFF);
          border: 2px solid var(--bg-void, #000000);
          box-shadow: 0 0 15px var(--accent-cyan, #00FFFF);
          cursor: ${disabled ? "not-allowed" : "pointer"};
        }
        
        input[type="range"].brutalist-slider::-webkit-slider-runnable-track {
          width: 100%;
          height: 8px;
          background: transparent;
        }
        
        input[type="range"].brutalist-slider::-moz-range-track {
          width: 100%;
          height: 8px;
          background: transparent;
        }
      `}</style>
      <input
        type="range"
        className="brutalist-slider"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
      />
      {/* Custom track */}
      <div style={{
        position: "absolute",
        top: "50%",
        left: 0,
        transform: "translateY(-50%)",
        height: "8px",
        width: `${percentage}%`,
        background: "var(--accent-cyan, #00FFFF)",
        border: "none",
        pointerEvents: "none",
        transition: "width 0.1s ease",
        boxShadow: "0 0 10px var(--accent-cyan, #00FFFF)"
      }} />
      {/* Custom thumb indicator */}
      <div style={{
        position: "absolute",
        top: "50%",
        left: `${percentage}%`,
        transform: "translate(-50%, -50%)",
        width: "20px",
        height: "20px",
        background: "var(--accent-cyan, #00FFFF)",
        border: "2px solid var(--bg-void, #000000)",
        boxShadow: "0 0 15px var(--accent-cyan, #00FFFF)",
        pointerEvents: "none",
        transition: "left 0.1s ease"
      }} />
    </div>
  );
}

