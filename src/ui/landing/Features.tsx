import { Target, Zap, BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/ui/components/ui/card";

/**
 * Three-card feature row for MVP pillars:
 * - Onboarding & Profiling
 * - Adaptive Insight Engine
 * - Metrics & Feedback Loop
 * Each card: icon + 1-line header + 1 short benefit
 */
export function Features() {
  const features = [
    {
      icon: Target,
      title: "Onboarding & Profiling",
      benefit: "Capture context once. Get personalized actions every time.",
    },
    {
      icon: Zap,
      title: "Adaptive Insight Engine",
      benefit: "AI recalibrates based on your results, not generic advice.",
    },
    {
      icon: BarChart3,
      title: "Metrics & Feedback Loop",
      benefit: "Track implementation delta (Δ). Refine next steps automatically.",
    },
  ];

  return (
    <section className="container py-16 md:py-20">
      <div className="grid gap-6 md:grid-cols-3">
        {features.map((feature) => (
          <Card
            key={feature.title}
            className="border-border transition-smooth hover:shadow-lg hover:border-accent/50"
          >
            <CardContent className="flex flex-col items-start gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10">
                <feature.icon className="h-6 w-6 text-accent" aria-hidden="true" />
              </div>
              <h3 className="font-semibold text-lg text-foreground">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.benefit}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
