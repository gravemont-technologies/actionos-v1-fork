import { Button } from "@/ui/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Target, Zap, TrendingUp, CheckCircle, AlertCircle } from "lucide-react";
import { Card } from "@/ui/components/ui/card";

/**
 * Metrics explanation page - user-friendly guide to IPP, BUT, RSI
 * Shows how ActionOS measures real progress vs vanity metrics
 */
export default function MetricsPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="flex-1">
        {/* Hero */}
        <section className="container py-12 md:py-16">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
              How We Measure <span className="text-primary">Real Progress</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Most apps measure activity. We measure impact. Here's how ActionOS captures what actually matters.
            </p>
          </div>
        </section>

        {/* The Problem */}
        <section className="container pb-12">
          <Card className="p-6 md:p-8 border-destructive/50 bg-destructive/5">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="text-destructive mt-1 flex-shrink-0" size={24} />
              <h2 className="text-2xl font-semibold">Why Traditional Metrics Fail</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <h3 className="font-medium">They Measure Activity, Not Results</h3>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  <li>❌ Checked 15 tasks → But did anything change?</li>
                  <li>❌ Worked 8 hours → But what value did you create?</li>
                  <li>❌ 30-day streak → But are you moving forward?</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h3 className="font-medium">They Miss What Matters</h3>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  <li>• No measure of <strong>external impact</strong></li>
                  <li>• No measure of <strong>alignment</strong> with values</li>
                  <li>• No measure of <strong>momentum</strong> or direction</li>
                </ul>
              </div>
            </div>
          </Card>
        </section>

        {/* Our Solution */}
        <section className="container pb-12">
          <Card className="p-6 md:p-8 border-primary/50 bg-primary/5">
            <div className="flex items-start gap-3 mb-4">
              <CheckCircle className="text-primary mt-1 flex-shrink-0" size={24} />
              <h2 className="text-2xl font-semibold">Our Solution: Full-Spectrum Progress</h2>
            </div>
            <p className="text-muted-foreground mb-6">
              We measure both <strong>external impact</strong> (what changed in the world) and{' '}
              <strong>internal alignment</strong> (how smoothly and purposefully you work).
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Target className="text-primary" size={20} />
                  <h3 className="font-semibold">IPP (Outer Progress)</h3>
                </div>
                <p className="text-sm text-muted-foreground">Impact Per Person — measures real-world value creation</p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Zap className="text-purple-600" size={20} />
                  <h3 className="font-semibold">BUT (Inner Progress)</h3>
                </div>
                <p className="text-sm text-muted-foreground">Barakah Per Unit Time — measures alignment and flow</p>
              </Card>
            </div>
          </Card>
        </section>

        {/* IPP Metric */}
        <section className="container pb-12">
          <div className="border-l-4 border-primary pl-6 space-y-6">
            <div>
              <h2 className="text-3xl font-semibold mb-2">IPP — Impact Per Person</h2>
              <p className="text-lg text-muted-foreground">
                How much did your action <strong>change the world</strong>?
              </p>
            </div>
            
            <Card className="p-6">
              <h3 className="font-semibold mb-3">The Formula</h3>
              <div className="text-center py-4 bg-muted rounded border">
                <code className="text-lg font-mono text-primary">
                  IPP = Magnitude × Reach × Depth
                </code>
              </div>
              <div className="grid md:grid-cols-3 gap-4 mt-4 text-sm">
                <div>
                  <strong>Magnitude (1-10)</strong>
                  <p className="text-muted-foreground">How big was the change?</p>
                </div>
                <div>
                  <strong>Reach (1-∞)</strong>
                  <p className="text-muted-foreground">How many people affected?</p>
                </div>
                <div>
                  <strong>Depth (0.1-3.0)</strong>
                  <p className="text-muted-foreground">Surface or transformative?</p>
                </div>
              </div>
            </Card>

            <div className="space-y-3">
              <h3 className="font-semibold">Real Examples</h3>
              <div className="space-y-2">
                <Card className="p-4">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium text-sm">Organized my notes</span>
                    <span className="px-2 py-1 bg-muted rounded text-xs font-mono">IPP: 0</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Busy work. No one else benefited.</p>
                </Card>
                <Card className="p-4 border-primary/30">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium text-sm">Clear email saved 3 people 2 hours each</span>
                    <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs font-mono">IPP: 18</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Magnitude 3 × Reach 3 × Depth 2.0</p>
                </Card>
                <Card className="p-4 border-green-500/30">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium text-sm">Process helping 20 teammates work 30% faster</span>
                    <span className="px-2 py-1 bg-green-500/10 text-green-600 rounded text-xs font-mono">IPP: 240</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Magnitude 8 × Reach 20 × Depth 1.5</p>
                </Card>
              </div>
            </div>

            <Card className="p-4 bg-primary/5 border-primary/50">
              <p className="text-sm">
                <strong>Why IPP matters:</strong> Only impact compounds. Promotions, trust, and career growth come from changing things for others—not checking boxes.
              </p>
            </Card>
          </div>
        </section>

        {/* BUT Metric */}
        <section className="container pb-12">
          <div className="border-l-4 border-purple-600 pl-6 space-y-6">
            <div>
              <h2 className="text-3xl font-semibold mb-2">BUT — Barakah Per Unit Time</h2>
              <p className="text-lg text-muted-foreground">
                How <strong>smoothly and aligned</strong> was your action?
              </p>
            </div>
            
            <Card className="p-6">
              <h3 className="font-semibold mb-3">What It Measures</h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-medium mb-2">✨ Flow & Ease</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• How smooth was the process?</li>
                    <li>• Mental ease vs mental drain</li>
                    <li>• Flow state vs forcing it</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">🎯 Alignment & Momentum</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Aligned with your values?</li>
                    <li>• Unexpected wins or help?</li>
                    <li>• Building or draining energy?</li>
                  </ul>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-purple-600/5 border-purple-600/50">
              <p className="text-sm">
                <strong>Why BUT matters:</strong> No app measures alignment, momentum, or blessed ease—yet you <em>feel</em> them. BUT prevents burnout and ensures sustainable growth.
              </p>
            </Card>
          </div>
        </section>

        {/* RSI Metric */}
        <section className="container pb-12">
          <div className="border-l-4 border-green-600 pl-6 space-y-6">
            <div>
              <h2 className="text-3xl font-semibold mb-2">RSI — Reality Shift Index</h2>
              <p className="text-lg text-muted-foreground">
                Is your life <strong>moving in the direction you want</strong>?
              </p>
            </div>
            
            <Card className="p-6">
              <h3 className="font-semibold mb-3">The Meta-Metric</h3>
              <div className="text-center py-4 bg-muted rounded border">
                <code className="text-lg font-mono text-green-600">
                  RSI = (IPP Trend × 0.6) + (BUT Trend × 0.4)
                </code>
              </div>
              <p className="text-muted-foreground mt-4 text-sm text-center">
                Combines <strong>external impact growth</strong> with <strong>internal alignment growth</strong>
              </p>
            </Card>

            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <Card className="p-4">
                <h4 className="font-semibold mb-2">What It Tells You</h4>
                <ul className="space-y-1.5">
                  <li><strong className="text-green-600">RSI &gt; 0.2:</strong> Strong momentum</li>
                  <li><strong className="text-primary">RSI 0-0.2:</strong> Steady progress</li>
                  <li><strong className="text-yellow-600">RSI -0.2-0:</strong> Stagnation</li>
                  <li><strong className="text-destructive">RSI &lt; -0.2:</strong> Decline</li>
                </ul>
              </Card>
              <Card className="p-4">
                <h4 className="font-semibold mb-2">The Ultimate Question</h4>
                <p className="text-muted-foreground">
                  This is what high-performers care about: <strong>directional certainty</strong>. Not "Am I productive?" but "Am I progressing with momentum?"
                </p>
              </Card>
            </div>
          </div>
        </section>

        {/* Measurable Delta */}
        <section className="container pb-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-semibold mb-2">
              Measurable Delta (Δ)
            </h2>
            <p className="text-muted-foreground">
              Real anonymized results across ΔIPP buckets
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {/* SMALL */}
            <Card className="p-6 border-primary/50">
              <div className="text-center mb-4">
                <span className="inline-block px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-semibold mb-2">
                  SMALL
                </span>
                <h3 className="text-xl font-semibold">ΔIPP: 0-50</h3>
              </div>
              <div className="space-y-3 text-sm">
                <div className="p-3 bg-muted rounded">
                  <div className="font-medium mb-1">Before</div>
                  <div className="text-muted-foreground">2h/day overhead</div>
                </div>
                <div className="p-3 bg-primary/5 rounded border border-primary/20">
                  <div className="font-medium mb-1">After</div>
                  <div className="text-muted-foreground">20m/day</div>
                </div>
                <div className="text-center py-2">
                  <div className="text-2xl font-bold text-primary">↑ 5x</div>
                  <div className="text-xs text-muted-foreground">efficiency</div>
                </div>
              </div>
            </Card>

            {/* MEDIUM */}
            <Card className="p-6 border-purple-600/50">
              <div className="text-center mb-4">
                <span className="inline-block px-3 py-1 bg-purple-600/10 text-purple-600 rounded-full text-sm font-semibold mb-2">
                  MEDIUM
                </span>
                <h3 className="text-xl font-semibold">ΔIPP: 50-500</h3>
              </div>
              <div className="space-y-3 text-sm">
                <div className="p-3 bg-muted rounded">
                  <div className="font-medium mb-1">Before</div>
                  <div className="text-muted-foreground">0 new leads</div>
                </div>
                <div className="p-3 bg-purple-600/5 rounded border border-purple-600/20">
                  <div className="font-medium mb-1">After</div>
                  <div className="text-muted-foreground">12 leads/week</div>
                </div>
                <div className="text-center py-2">
                  <div className="text-2xl font-bold text-purple-600">↑ ∞</div>
                  <div className="text-xs text-muted-foreground">pipeline</div>
                </div>
              </div>
            </Card>

            {/* LARGE */}
            <Card className="p-6 border-green-600/50">
              <div className="text-center mb-4">
                <span className="inline-block px-3 py-1 bg-green-600/10 text-green-600 rounded-full text-sm font-semibold mb-2">
                  LARGE
                </span>
                <h3 className="text-xl font-semibold">ΔIPP: 500+</h3>
              </div>
              <div className="space-y-3 text-sm">
                <div className="p-3 bg-muted rounded">
                  <div className="font-medium mb-1">Before</div>
                  <div className="text-muted-foreground">$0 MRR</div>
                </div>
                <div className="p-3 bg-green-600/5 rounded border border-green-600/20">
                  <div className="font-medium mb-1">After</div>
                  <div className="text-muted-foreground">$50K MRR</div>
                </div>
                <div className="text-center py-2">
                  <div className="text-2xl font-bold text-green-600">↑ $50K</div>
                  <div className="text-xs text-muted-foreground">/month</div>
                </div>
              </div>
            </Card>
          </div>

          <Card className="mt-6 p-4 bg-muted/50">
            <p className="text-sm text-center text-muted-foreground">
              <strong>Note:</strong> Results are anonymized from real ActionOS users. Individual outcomes vary based on context, industry, and execution quality. ΔIPP measures external impact created, not effort expended.
            </p>
          </Card>
        </section>

        {/* How It Works */}
        <section className="container pb-16">
          <h2 className="text-3xl font-semibold text-center mb-8">
            How It Works In ActionOS
          </h2>
          <div className="grid md:grid-cols-4 gap-4">
            {[
              { num: "1", title: "Get Your Insight", desc: "Analyze your situation. Get a clear Step-1 action.", color: "primary" },
              { num: "2", title: "Complete It", desc: "Execute your Step-1. Do the work.", color: "purple" },
              { num: "3", title: "Score Impact", desc: "30-second assessment: magnitude, reach, depth, ease, alignment.", color: "green" },
              { num: "4", title: "Track Progress", desc: "See your IPP, BUT, and RSI grow. Identify patterns.", color: "yellow" },
            ].map((step) => (
              <Card key={step.num} className="p-4">
                <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center mb-3">
                  <span className="text-lg font-bold text-primary">{step.num}</span>
                </div>
                <h3 className="font-semibold mb-1 text-sm">{step.title}</h3>
                <p className="text-xs text-muted-foreground">{step.desc}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="container pb-16">
          <Card className="p-8 md:p-12 text-center bg-gradient-to-br from-primary/5 to-purple-600/5">
            <h2 className="text-3xl font-semibold mb-4">
              Ready to measure real progress?
            </h2>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Start tracking impact, alignment, and momentum. See what actually changes.
            </p>
            <Button size="lg" asChild>
              <Link to="/app/analyze">
                Get Started <ArrowRight className="ml-2" size={18} />
              </Link>
            </Button>
          </Card>
        </section>
      </main>
    </div>
  );
}
