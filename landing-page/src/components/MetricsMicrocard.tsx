import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

/**
 * Anonymized before/after metric microcard
 * - Demonstrates ΔIPP (Implementation Progress Percentile) bucket examples
 * - SMALL/MEDIUM/LARGE buckets with concrete metrics
 */
export function MetricsMicrocard() {
  const metrics = [
    { 
      label: "IPP", 
      name: "Impact Per Person",
      before: "Busy work", 
      after: "IPP 240", 
      delta: "20 people helped",
      description: "External impact that compounds"
    },
    { 
      label: "BUT", 
      name: "Barakah Per Unit Time",
      before: "Grinding", 
      after: "2.5× multiplier", 
      delta: "Aligned & flowing",
      description: "Internal momentum & ease"
    },
    { 
      label: "RSI", 
      name: "Reality Shift Index",
      before: "Stagnant", 
      after: "+0.45 trajectory", 
      delta: "Compounding",
      description: "Directional certainty"
    },
  ];

  return (
    <section className="container py-16 md:py-20">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-semibold text-foreground mb-3">
          Real Progress, Not Vanity Metrics
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          We measure what actually matters: external impact (IPP), internal alignment (BUT), and directional momentum (RSI)
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {metrics.map((metric) => (
          <Card key={metric.label} className="border-accent/20 transition-smooth hover:border-accent hover:shadow-lg">
            <CardContent className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-lg font-bold text-accent">
                    {metric.label}
                  </span>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {metric.name}
                  </p>
                </div>
                <TrendingUp className="h-5 w-5 text-accent" aria-hidden="true" />
              </div>
              
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Before: {metric.before}</p>
                <p className="text-sm text-foreground font-medium">After: {metric.after}</p>
              </div>
              
              <p className="text-base font-semibold text-accent">{metric.delta}</p>
              
              <p className="text-xs text-muted-foreground border-t border-border pt-3">
                {metric.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
