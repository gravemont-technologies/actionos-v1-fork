import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";

/**
 * Action Guarantee badge component:
 * - Small SVG badge + one sentence guarantee
 * - "Implement Step-1 (≤15m). Report result. See measurable Δ."
 */
export function ActionGuaranteeBadge() {
  return (
    <section className="container py-12">
      <div className="flex flex-col items-center justify-center gap-4 text-center">
        <div className="flex items-center gap-2">
          <GuaranteeBadgeSVG />
          <Badge variant="outline" className="text-sm font-semibold border-accent text-accent px-4 py-1">
            Action Guarantee
          </Badge>
        </div>
        <p className="text-base text-muted-foreground max-w-2xl">
          Implement Step-1 (≤15m). Report result. See measurable <strong>Δ</strong>.
        </p>
      </div>
    </section>
  );
}

/**
 * Inline guarantee badge SVG (optimized)
 */
function GuaranteeBadgeSVG() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-accent"
      aria-hidden="true"
    >
      <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2" fill="none" />
      <CheckCircle2 className="h-8 w-8 text-accent" />
    </svg>
  );
}
