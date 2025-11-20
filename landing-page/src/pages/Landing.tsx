import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { ActionGuaranteeBadge } from "@/components/ActionGuaranteeBadge";
import { TestimonialStrip } from "@/components/TestimonialStrip";
import { MetricsMicrocard } from "@/components/MetricsMicrocard";
import { HowItWorks } from "@/components/HowItWorks";
import { Footer } from "@/components/Footer";

/**
 * Performance-first landing page composition
 * - Sticky nav with auth + theme toggle
 * - Hero with modal CTA
 * - Features, Guarantee, Testimonials, Metrics, HowItWorks
 * - Footer
 * All components are semantic, accessible, keyboard-operable
 */
export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      
      <main className="flex-1">
        <Hero />
        <Features />
        <ActionGuaranteeBadge />
        <TestimonialStrip />
        <MetricsMicrocard />
        <HowItWorks />
      </main>
      
      <Footer />
    </div>
  );
}
