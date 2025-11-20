import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

/**
 * Anonymized before/after metric microcard
 * - Demonstrates ΔIPP (Implementation Progress Percentile) bucket examples
 * - SMALL/MEDIUM/LARGE buckets with concrete metrics
 */
export function MetricsMicrocard() {
  const buckets = [
    { size: "SMALL", before: "2h/day overhead", after: "20m/day", delta: "↑ 5x efficiency" },
    { size: "MEDIUM", before: "0 new leads", after: "12 leads/week", delta: "↑ ∞ pipeline" },
    { size: "LARGE", before: "$0 MRR", after: "$50K MRR", delta: "↑ $50K/mo" },
  ];

  return (
    <section className="container py-16 md:py-20">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-semibold text-foreground mb-3">
          Measurable Delta (Δ)
        </h2>
        <p className="text-muted-foreground">
          Real anonymized results across ΔIPP buckets
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {buckets.map((bucket) => (
          <Card key={bucket.size} className="border-accent/20 transition-smooth hover:border-accent hover:shadow-lg">
            <CardContent className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-accent uppercase tracking-wide">
                  {bucket.size}
                </span>
                <TrendingUp className="h-5 w-5 text-accent" aria-hidden="true" />
              </div>
              
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Before: {bucket.before}</p>
                <p className="text-sm text-foreground font-medium">After: {bucket.after}</p>
              </div>
              
              <p className="text-base font-semibold text-accent">{bucket.delta}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
