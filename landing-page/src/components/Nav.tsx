import { Button } from "@/components/ui/button";
import { SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Link } from "react-router-dom";
import { useState } from "react";
import { ActionModal } from "./ActionModal";

/**
 * Sticky navigation with logo, theme toggle, and auth CTAs
 * - Logo left
 * - Theme toggle center-right
 * - Auth buttons right (primary "Get Action" + ghost "See Demo")
 * - Fully keyboard accessible with focus rings
 * - Gracefully handles missing Clerk configuration
 */
export function Nav() {
  const { theme, setTheme } = useTheme();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Check if Clerk is configured
  const hasClerkKey = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-semibold text-sm">
            AE
          </div>
          <span className="font-semibold text-foreground">ActionEngine</span>
        </div>

        {/* Right: Theme toggle + Auth */}
        <div className="flex items-center gap-3">
          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
            className="transition-smooth"
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
          </Button>

          {/* Auth buttons - conditional rendering based on Clerk availability */}
          {hasClerkKey ? (
            <>
              <SignedOut>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/sign-in">Sign In</Link>
                </Button>
                <Button size="sm" aria-label="Get Action" asChild>
                  <Link to="/sign-up">Get Started</Link>
                </Button>
              </SignedOut>

              <SignedIn>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/dashboard">Dashboard</Link>
                </Button>
                <UserButton afterSignOutUrl="/" />
              </SignedIn>
            </>
          ) : (
            /* Fallback buttons when Clerk isn't configured */
            <>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setIsModalOpen(true)}
              >
                See Demo
              </Button>
              <Button 
                size="sm" 
                aria-label="Get Action"
                onClick={() => setIsModalOpen(true)}
              >
                Get Action
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Modal for non-authenticated users */}
      {!hasClerkKey && (
        <ActionModal open={isModalOpen} onOpenChange={setIsModalOpen} />
      )}
    </nav>
  );
}
