import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/ui/components/ui/dialog";

type SupportPopupProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SupportPopup({ open, onOpenChange }: SupportPopupProps) {
  const handleSupportClick = () => {
    window.open('https://www.paypal.com/qrcodes/p2pqrc/MSFV7T2E9VWUU', '_blank', 'noopener,noreferrer');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-lg"
        style={{
          background: "var(--bg-void, #0A0A0A)",
          border: "2px solid var(--accent-cyan, #00FFFF)",
          boxShadow: "0 0 30px rgba(0, 255, 255, 0.2)",
        }}
      >
        <DialogHeader>
          <DialogTitle 
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "var(--accent-cyan, #00FFFF)",
              marginBottom: "0.5rem",
              textAlign: "center",
            }}
          >
            Love what we're building? Make it unstoppable—support us.
          </DialogTitle>
          <DialogDescription 
            style={{
              fontSize: "1.1rem",
              fontWeight: 600,
              color: "#fbbf24",
              textAlign: "center",
              marginBottom: "1rem",
            }}
          >
            Here's how we'll deploy your support:
          </DialogDescription>
        </DialogHeader>
        
        <div style={{ padding: "1rem 0" }}>
          <ul style={{ 
            listStyle: "none", 
            padding: 0, 
            margin: 0,
            color: "var(--text-secondary, #CCCCCC)",
            fontSize: "0.95rem",
            lineHeight: "1.8",
          }}>
            <li style={{ marginBottom: "0.75rem", paddingLeft: "1.5rem", position: "relative" }}>
              <span style={{ position: "absolute", left: 0, color: "#fbbf24", fontWeight: 700 }}>→</span>
              <strong style={{ color: "var(--text-primary, #FFFFFF)" }}>Unlock requested features first</strong> — the tools you've been asking for, now prioritized.
            </li>
            <li style={{ marginBottom: "0.75rem", paddingLeft: "1.5rem", position: "relative" }}>
              <span style={{ position: "absolute", left: 0, color: "#fbbf24", fontWeight: 700 }}>→</span>
              <strong style={{ color: "var(--text-primary, #FFFFFF)" }}>Speed & reliability improvements</strong> — fewer crashes, faster load times, smoother workflow.
            </li>
            <li style={{ marginBottom: "0.75rem", paddingLeft: "1.5rem", position: "relative" }}>
              <span style={{ position: "absolute", left: 0, color: "#fbbf24", fontWeight: 700 }}>→</span>
              <strong style={{ color: "var(--text-primary, #FFFFFF)" }}>UX & workflow enhancements</strong> — cleaner design, smarter navigation, and fewer clicks.
            </li>
            <li style={{ marginBottom: "0.75rem", paddingLeft: "1.5rem", position: "relative" }}>
              <span style={{ position: "absolute", left: 0, color: "#fbbf24", fontWeight: 700 }}>→</span>
              <strong style={{ color: "var(--text-primary, #FFFFFF)" }}>New tools for power-users</strong> — extra functionality for heavy users, early contributors get first access.
            </li>
          </ul>

          <div style={{ 
            marginTop: "1.5rem",
            padding: "1rem",
            background: "rgba(251, 191, 36, 0.05)",
            border: "1px solid rgba(251, 191, 36, 0.2)",
            borderRadius: "6px",
          }}>
            <p style={{ 
              fontSize: "0.9rem", 
              fontWeight: 600, 
              color: "#fbbf24",
              marginBottom: "0.75rem",
            }}>
              Your Benefits:
            </p>
            <ul style={{ 
              listStyle: "none", 
              padding: 0, 
              margin: 0,
              color: "var(--text-secondary, #CCCCCC)",
              fontSize: "0.875rem",
              lineHeight: "1.6",
            }}>
              <li style={{ marginBottom: "0.4rem" }}>
                <strong style={{ color: "var(--text-primary, #FFFFFF)" }}>Early access</strong> → try updates before everyone else.
              </li>
              <li style={{ marginBottom: "0.4rem" }}>
                <strong style={{ color: "var(--text-primary, #FFFFFF)" }}>Forever 50% off</strong> → lock in supporter pricing for life.
              </li>
              <li style={{ marginBottom: "0.4rem" }}>
                <strong style={{ color: "var(--text-primary, #FFFFFF)" }}>Direct influence</strong> → your contribution decides what features we build next.
              </li>
            </ul>
          </div>

          <div style={{ 
            marginTop: "1.5rem",
            display: "flex",
            gap: "0.75rem",
            justifyContent: "center",
          }}>
            <button
              onClick={handleSupportClick}
              style={{
                padding: "0.75rem 2rem",
                background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
                border: "2px solid #fbbf24",
                color: "#000000",
                fontSize: "1rem",
                fontWeight: 700,
                cursor: "pointer",
                borderRadius: "6px",
                boxShadow: "0 0 20px rgba(251, 191, 36, 0.4)",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 0 30px rgba(251, 191, 36, 0.6)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 0 20px rgba(251, 191, 36, 0.4)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              Fuel the next level → Support Now
            </button>
            <button
              onClick={() => onOpenChange(false)}
              style={{
                padding: "0.75rem 1.5rem",
                background: "transparent",
                border: "2px solid var(--text-secondary, #666666)",
                color: "var(--text-secondary, #CCCCCC)",
                fontSize: "0.95rem",
                fontWeight: 600,
                cursor: "pointer",
                borderRadius: "6px",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--text-primary, #FFFFFF)";
                e.currentTarget.style.color = "var(--text-primary, #FFFFFF)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--text-secondary, #666666)";
                e.currentTarget.style.color = "var(--text-secondary, #CCCCCC)";
              }}
            >
              Maybe Later
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
