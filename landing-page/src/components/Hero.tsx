import { Button } from "@/components/ui/button";

/**
 * Hero section with two-column layout:
 * - Left: H1 + H2 microcopy + CTAs (primary navigates to app)
 * - Right: SVG device mockup (falls below fold on mobile)
 * - Desktop: side-by-side | Mobile: stacked (CTA primary)
 */
export function Hero() {
  const appUrl = import.meta.env.VITE_FRONTEND_URL || "http://localhost:3000";

  return (
    <section className="container py-16 md:py-24">
      <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
        {/* Left: Copy + CTAs */}
        <div className="space-y-6">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight md:text-5xl lg:text-6xl text-foreground">
            Get 1–3 exact, high-leverage actions in 60s.
          </h1>
          
          <h2 className="text-lg md:text-xl text-muted-foreground max-w-xl">
            Describe your situation. Receive tailored, implementable steps. Report results. Recalibrate.
          </h2>

          <div className="flex flex-wrap gap-4 pt-4">
            <Button
              size="lg"
              asChild
              aria-label="Get Action - navigate to app"
              className="transition-smooth hover:scale-105"
            >
              <a href={appUrl}>Get Action</a>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="transition-smooth"
            >
              <a href="/metrics">How it Works</a>
            </Button>
          </div>

          {/* Micro-note */}
          <p className="text-sm text-muted-foreground">
            ⚡ Typical response: <strong>30–90 seconds</strong>
          </p>
        </div>

        {/* Right: SVG mockup */}
        <div className="order-first lg:order-last flex justify-center lg:justify-end">
          <DeviceMockup />
        </div>
      </div>
    </section>
  );
}

/**
 * Inline SVG device mockup placeholder (optimized for performance)
 */
function DeviceMockup() {
  return (
    <svg
      width="400"
      height="500"
      viewBox="0 0 400 500"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full max-w-md drop-shadow-2xl"
      aria-hidden="true"
    >
      {/* Device frame */}
      <rect
        x="20"
        y="20"
        width="360"
        height="460"
        rx="32"
        fill="hsl(var(--card))"
        stroke="hsl(var(--border))"
        strokeWidth="2"
      />
      
      {/* Screen */}
      <rect
        x="40"
        y="60"
        width="320"
        height="380"
        rx="16"
        fill="hsl(var(--background))"
      />
      
      {/* UI elements simulation */}
      <rect x="60" y="80" width="120" height="12" rx="6" fill="hsl(var(--accent))" />
      <rect x="60" y="110" width="280" height="8" rx="4" fill="hsl(var(--muted))" />
      <rect x="60" y="130" width="240" height="8" rx="4" fill="hsl(var(--muted))" />
      <rect x="60" y="150" width="200" height="8" rx="4" fill="hsl(var(--muted))" />
      
      {/* Action cards */}
      <rect x="60" y="180" width="280" height="60" rx="12" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="1" />
      <rect x="60" y="252" width="280" height="60" rx="12" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="1" />
      <rect x="60" y="324" width="280" height="60" rx="12" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="1" />
      
      {/* Bottom button */}
      <rect x="60" y="400" width="280" height="28" rx="14" fill="hsl(var(--primary))" />
    </svg>
  );
}
