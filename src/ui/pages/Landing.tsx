import { Nav } from "../landing/Nav";
import { Hero } from "../landing/Hero";
import { Features } from "../landing/Features";
import { ActionGuaranteeBadge } from "../landing/ActionGuaranteeBadge";
import { TestimonialStrip } from "../landing/TestimonialStrip";
import { MetricsMicrocard } from "../landing/MetricsMicrocard";
import { HowItWorks } from "../landing/HowItWorks";
import { Footer } from "../landing/Footer";

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
