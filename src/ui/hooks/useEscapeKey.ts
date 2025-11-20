import { useEffect } from "react";

type EscapeKeyHandler = {
  onEscape: () => void;
  enabled?: boolean;
};

/**
 * Global escape key handler with context-aware actions
 * - Clear form
 * - Close modal
 * - Navigate back
 */
export function useEscapeKey({ onEscape, enabled = true }: EscapeKeyHandler): void {
  useEffect(() => {
    if (!enabled) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onEscape();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [onEscape, enabled]);
}


