type Labels = Record<string, string> | undefined;

type Counter = Map<string, number>;

class Observability {
  private counters: Counter = new Map();

  increment(name: string, labels?: Labels) {
    const key = this.key(name, labels);
    this.counters.set(key, (this.counters.get(key) || 0) + 1);
  }

  gauge(name: string, value: number, labels?: Labels) {
    const key = this.key(name, labels);
    this.counters.set(key, value);
  }

  getAll() {
    const out: Record<string, number> = {};
    for (const [k, v] of this.counters.entries()) {
      out[k] = v;
    }
    return out;
  }

  private key(name: string, labels?: Labels) {
    if (!labels || Object.keys(labels).length === 0) return name;
    const labelStr = Object.entries(labels).sort().map(([k, v]) => `${k}=${v}`).join(",");
    return `${name}{${labelStr}}`;
  }
}

export const obs = new Observability();

export const trackSignatureFailure = (reason: string) => obs.increment("signature_failure", { reason });
export const track401 = (endpoint: string) => obs.increment("http_401", { endpoint });
export const track403 = (endpoint: string) => obs.increment("http_403", { endpoint });
export const trackCacheHit = () => obs.increment("cache_hit");
export const trackCacheMiss = () => obs.increment("cache_miss");
export const trackAnalyzeLatency = (ms: number) => obs.gauge("analyze_latency_ms", ms);

export default obs;
