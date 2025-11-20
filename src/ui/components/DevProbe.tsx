import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

type PerfEntry = {
  kind: "api" | "route";
  method?: string;
  url?: string;
  status?: number | string;
  duration_ms: number;
  ok?: boolean;
  path?: string;
  time: string;
};

export function DevProbe() {
  const [entries, setEntries] = useState<PerfEntry[]>([]);
  const location = useLocation();

  useEffect(() => {
    if (!(import.meta as any).env?.DEV) return;
    const win = window as any;
    win.__perfLogs = win.__perfLogs || [];
    const interval = setInterval(() => {
      setEntries([...win.__perfLogs].slice(-10));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!(import.meta as any).env?.DEV) return null;

  return (
    <div
      style={{
        position: "fixed",
        right: 8,
        bottom: 8,
        background: "rgba(17,17,17,0.85)",
        color: "#e5e7eb",
        padding: "8px 10px",
        borderRadius: 6,
        fontSize: 12,
        maxWidth: 360,
        zIndex: 9999,
      }}
      aria-hidden
    >
      <div style={{ marginBottom: 4, fontWeight: 600 }}>
        DEV Probe — {location.pathname}
      </div>
      <div style={{ maxHeight: 160, overflow: "auto" }}>
        {entries.length === 0 ? (
          <div style={{ opacity: 0.7 }}>No perf entries yet</div>
        ) : (
          entries
            .slice()
            .reverse()
            .map((e, idx) => (
              <div key={idx} style={{ marginBottom: 2 }}>
                {e.kind === "api" ? (
                  <span>
                    [API] {e.method} {short(e.url)} → {String(e.status)} •{" "}
                    {e.duration_ms}ms
                  </span>
                ) : (
                  <span>
                    [ROUTE] {e.path} • {e.duration_ms}ms
                  </span>
                )}{" "}
                <span style={{ opacity: 0.6 }}>{formatTime(e.time)}</span>
              </div>
            ))
        )}
      </div>
    </div>
  );
}

function short(url?: string) {
  if (!url) return "";
  try {
    const u = new URL(url, window.location.origin);
    return u.pathname + (u.search ? "…" : "");
  } catch {
    return url;
  }
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString();
  } catch {
    return iso;
  }
}


