/**
 * Minimal footer with links and copyright
 * - Company name
 * - Navigation links
 * - Copyright notice
 */
export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="container py-8">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          {/* Left: Brand */}
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary text-primary-foreground font-semibold text-xs">
              AE
            </div>
            <span className="text-sm font-semibold">ActionEngine</span>
          </div>

          {/* Center: Links */}
          <nav className="flex gap-6 text-sm text-muted-foreground">
            <a href="#" className="transition-smooth hover:text-foreground focus-visible:text-foreground">
              Docs
            </a>
            <a href="#" className="transition-smooth hover:text-foreground focus-visible:text-foreground">
              Pricing
            </a>
            <a href="#" className="transition-smooth hover:text-foreground focus-visible:text-foreground">
              Support
            </a>
            <a href="#" className="transition-smooth hover:text-foreground focus-visible:text-foreground">
              Privacy
            </a>
          </nav>

          {/* Right: Copyright */}
          <p className="text-sm text-muted-foreground">
            © 2025 ActionEngine. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
