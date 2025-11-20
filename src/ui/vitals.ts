// Lightweight Web Vitals capture in DEV
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { onCLS, onINP, onLCP } from "web-vitals/attribution";

export function initWebVitalsDev() {
  if (!(import.meta as any).env?.DEV) return;
  const push = (name: string, value: number, data: unknown) => {
    const entry = {
      kind: "vitals" as const,
      name,
      value: Math.round(value),
      time: new Date().toISOString(),
      data,
    };
    (window as any).__perfLogs = (window as any).__perfLogs || [];
    (window as any).__perfLogs.push(entry);
    // eslint-disable-next-line no-console
    console.table([entry]);
  };
  onCLS((m) => push("CLS", m.value, m));
  onINP((m) => push("INP", m.value, m));
  onLCP((m) => push("LCP", m.value, m));
}


