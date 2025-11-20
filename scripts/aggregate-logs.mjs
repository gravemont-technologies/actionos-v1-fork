#!/usr/bin/env node
/**
 * Aggregate pino logs to compute latency percentiles per route.
 * Reads from a file path argument or stdin.
 *
 * Usage:
 *   node scripts/aggregate-logs.mjs ./server.log
 *   cat server.log | node scripts/aggregate-logs.mjs
 */
import fs from "node:fs";
import readline from "node:readline";

const file = process.argv[2];

function parseLine(line) {
  // Try JSON first
  try {
    const obj = JSON.parse(line);
    return obj;
  } catch {}
  // pino-pretty line -> extract fields crudely
  // Example contains "Request completed" with duration and path fields from our middleware logs
  const durationMatch = line.match(/duration:\s*(\d+)/i);
  const pathMatch = line.match(/path:\s*([/a-zA-Z0-9\-_?=]+)/i);
  const statusMatch = line.match(/statusCode:\s*(\d{3})/i);
  return {
    msg: line,
    duration: durationMatch ? Number(durationMatch[1]) : undefined,
    path: pathMatch ? pathMatch[1] : undefined,
    statusCode: statusMatch ? Number(statusMatch[1]) : undefined,
  };
}

function percentile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))];
}

async function main() {
  const rl = readline.createInterface({
    input: file ? fs.createReadStream(file, "utf8") : process.stdin,
    crlfDelay: Infinity,
  });

  const byRoute = new Map(); // route -> { durations: number[], count, errors }

  for await (const line of rl) {
    if (!line.trim()) continue;
    const obj = parseLine(line);
    const duration = obj?.duration ?? obj?.responseTime ?? obj?.time_ms;
    const path = obj?.path ?? obj?.req?.path;
    const statusCode = obj?.statusCode ?? obj?.res?.statusCode;
    if (typeof duration !== "number" || !path) continue;
    const key = path.split("?")[0];
    const entry = byRoute.get(key) ?? { durations: [], count: 0, errors: 0 };
    entry.durations.push(duration);
    entry.count += 1;
    if (typeof statusCode === "number" && statusCode >= 400) entry.errors += 1;
    byRoute.set(key, entry);
  }

  const table = [];
  for (const [route, { durations, count, errors }] of byRoute.entries()) {
    table.push({
      route,
      count,
      errors,
      error_rate: count ? `${((errors / count) * 100).toFixed(2)}%` : "0.00%",
      p50_ms: Math.round(percentile(durations, 50)),
      p95_ms: Math.round(percentile(durations, 95)),
      p99_ms: Math.round(percentile(durations, 99)),
    });
  }

  console.table(table.sort((a, b) => a.route.localeCompare(b.route)));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


