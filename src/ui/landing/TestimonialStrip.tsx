/**
 * 3-quote testimonial strip (initials only)
 * - Minimalist design with avatar initials
 * - Short, punchy quotes
 */
export function TestimonialStrip() {
  const testimonials = [
    {
      initials: "JD",
      quote: "Got exact steps. Implemented in 10m. Team velocity ↑40%.",
      role: "Engineering Lead",
    },
    {
      initials: "SM",
      quote: "No fluff. Just actions. Onboarded 3 clients in one sprint.",
      role: "Product Manager",
    },
    {
      initials: "AL",
      quote: "Stopped guessing. Started executing. Revenue ↑$50K/mo.",
      role: "Founder",
    },
  ];

  return (
    <section className="container py-16 md:py-20 border-y border-border">
      <div className="grid gap-8 md:grid-cols-3">
        {testimonials.map((t) => (
          <div key={t.initials} className="flex flex-col items-start gap-4">
            {/* Avatar initials */}
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/20 text-accent font-semibold text-sm">
              {t.initials}
            </div>
            
            {/* Quote */}
            <blockquote className="text-sm text-foreground leading-relaxed">
              "{t.quote}"
            </blockquote>
            
            {/* Role */}
            <p className="text-xs text-muted-foreground">{t.role}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
