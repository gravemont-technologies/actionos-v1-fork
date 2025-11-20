/**
 * 3-step "How it works" visual
 * - Onboard → Act → Recalibrate
 * - Numeric circles with arrows
 * - Minimalist, high information density
 */
export function HowItWorks() {
  const steps = [
    {
      number: 1,
      title: "Onboard",
      description: "Describe situation in 1-3 sentences. We capture context.",
    },
    {
      number: 2,
      title: "Act",
      description: "Get 1-3 exact actions. Implement Step-1 in ≤15 minutes.",
    },
    {
      number: 3,
      title: "Recalibrate",
      description: "Report result. Engine adapts. Next steps personalized.",
    },
  ];

  return (
    <section className="container py-16 md:py-24">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-semibold text-foreground mb-3">
          How It Works
        </h2>
        <p className="text-muted-foreground">
          Three steps to measurable results
        </p>
      </div>

      <div className="relative grid gap-8 md:grid-cols-3">
        {steps.map((step, index) => (
          <div key={step.number} className="flex flex-col items-center text-center space-y-4">
            {/* Numeric circle */}
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-white font-semibold text-2xl shadow-lg">
              {step.number}
            </div>

            {/* Arrow connector (hidden on last step) */}
            {index < steps.length - 1 && (
              <div className="hidden md:block absolute top-8 left-[calc(33.33%+2rem)] w-[calc(33.33%-4rem)] border-t-2 border-dashed border-accent/40" />
            )}

            {/* Title + Description */}
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-foreground">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                {step.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
