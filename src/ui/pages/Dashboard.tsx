import { useUser } from "@clerk/clerk-react";
import { Nav } from "@/ui/landing/Nav";
import { Button } from "@/ui/components/ui/button";
import { useState } from "react";
import { ActionModal } from "@/ui/landing/ActionModal";

/**
 * Protected dashboard page
 * - Shows authenticated user info
 * - Demonstrates protected content
 * - Action Engine interface
 */
export default function Dashboard() {
  const { user } = useUser();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      
      <main className="flex-1 bg-surface">
        <div className="container mx-auto max-w-4xl px-4 py-12">
          <div className="mb-8">
            <h1 className="mb-2 text-3xl font-semibold text-primary">
              Welcome, {user?.firstName || user?.emailAddresses[0]?.emailAddress}
            </h1>
            <p className="text-foreground/70">
              You're signed in and ready to get actionable insights.
            </p>
          </div>

          <div className="rounded-2xl bg-background p-8 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold text-primary">
              Get Your Next Action
            </h2>
            <p className="mb-6 text-foreground/70">
              Describe your situation in 1-3 sentences and get 1-3 exact, high-leverage actions in 60 seconds.
            </p>
            <Button 
              size="lg" 
              onClick={() => setIsModalOpen(true)}
              className="font-semibold"
            >
              Get Action Now
            </Button>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-border bg-background p-6">
              <h3 className="mb-2 font-semibold text-primary">Recent Actions</h3>
              <p className="text-sm text-foreground/70">
                Your action history will appear here once you start using the engine.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background p-6">
              <h3 className="mb-2 font-semibold text-primary">Impact Metrics</h3>
              <p className="text-sm text-foreground/70">
                Track your progress and measure the impact of your actions.
              </p>
            </div>
          </div>
        </div>
      </main>

      <ActionModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </div>
  );
}
