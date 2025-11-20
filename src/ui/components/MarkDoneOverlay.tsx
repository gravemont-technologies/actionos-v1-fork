import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { BrutalistSlider } from "./BrutalistSlider.js";
import { useEscapeKey } from "../hooks/useEscapeKey.js";
import { api } from "../utils/api.js";

type MarkDoneOverlayProps = {
  open: boolean;
  onClose: () => void;
  signature: string;
  profileId: string;
  authHeaders: Record<string, string>;
  onSuccess: (signature: string) => void;
};

export function MarkDoneOverlay({
  open,
  onClose,
  signature,
  profileId,
  authHeaders,
  onSuccess,
}: MarkDoneOverlayProps) {
  const navigate = useNavigate();
  const [slider, setSlider] = useState(5);
  const [outcome, setOutcome] = useState("");
  const [outcomes, setOutcomes] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingOutcomes, setLoadingOutcomes] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEscapeKey({
    onEscape: () => {
      if (open && !submitting) {
        onClose();
      }
    },
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      setLoadingOutcomes(true);
      api
        .get<{ outcomes: string[] }>(
          `/api/step-feedback/outcome-autocomplete?profile_id=${profileId}`,
          { headers: authHeaders }
        )
        .then((res) => {
          setOutcomes(res.outcomes || []);
        })
        .catch((error) => {
          console.error("Failed to fetch outcomes:", error);
        })
        .finally(() => {
          setLoadingOutcomes(false);
        });

      // Focus input after a short delay
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      // Reset form on close
      setSlider(5);
      setOutcome("");
    }
  }, [open, profileId, authHeaders]);

  const handleSubmit = async () => {
    if (submitting) return;

    setSubmitting(true);
    try {
      await api.post<{
        status: string;
        baseline: { ipp: number; but: number };
        previous_baseline: { ipp: number; but: number };
        delta: number;
      }>(
        "/api/step-feedback",
        {
          profile_id: profileId,
          signature,
          slider,
          outcome: outcome.trim() || undefined,
        },
        { headers: authHeaders }
      );

      // Play sound (with Web Audio API fallback)
      try {
        const audio = new Audio("/sounds/metallic-clang.mp3");
        audio.volume = 0.5;
        await audio.play();
      } catch (audioError) {
        // Fallback: Generate synthetic sound using Web Audio API
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (!AudioContextClass) {
            console.debug("Web Audio API not supported");
            return;
          }
          const audioContext = new AudioContextClass();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.value = 200;
          oscillator.type = "sine";
          
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.08);
          
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.08);
        } catch (webAudioError) {
          console.debug("Sound playback failed:", webAudioError);
        }
      }

      // Set sessionStorage for flash effect
      try {
        sessionStorage.setItem("just_closed", signature);
      } catch (storageError) {
        console.debug("sessionStorage failed:", storageError);
      }

      // Call onSuccess (which should refresh data and navigate)
      onSuccess(signature);
      
      // Navigate to insights
      navigate("/app/insights");
    } catch (error) {
      console.error("Failed to submit feedback:", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "var(--bg-void, #000000)",
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) {
          onClose();
        }
      }}
    >
      <div
        style={{
          width: "90%",
          maxWidth: "500px",
          padding: "2rem",
          border: "1px solid var(--accent-cyan, #00FFFF)",
          background: "var(--bg-void, #000000)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          style={{
            marginTop: 0,
            marginBottom: "1.5rem",
            color: "var(--text-primary, #FFFFFF)",
            fontFamily: "var(--font-body, 'Inter Tight', 'Inter', system-ui, sans-serif)",
          }}
        >
          Mark Step-1 Done
        </h2>

        <div style={{ marginBottom: "1.5rem" }}>
          <BrutalistSlider
            value={slider}
            min={0}
            max={10}
            onChange={setSlider}
            disabled={submitting}
          />
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <input
            ref={inputRef}
            type="text"
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            placeholder="3-word outcome"
            maxLength={80}
            list="outcomes"
            disabled={submitting}
            style={{
              width: "100%",
              padding: "0.75rem 1rem",
              background: "transparent",
              border: "1px solid var(--accent-cyan, #00FFFF)",
              color: "var(--text-primary, #FFFFFF)",
              fontFamily: "var(--font-body, 'Inter Tight', 'Inter', system-ui, sans-serif)",
              fontSize: "1rem",
            }}
          />
          <datalist id="outcomes">
            {outcomes.map((out, i) => (
              <option key={i} value={out} />
            ))}
          </datalist>
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{
            width: "100%",
            padding: "0.75rem 1.5rem",
            border: "2px solid var(--accent-cyan, #00FFFF)",
            background: submitting ? "rgba(0, 255, 255, 0.1)" : "transparent",
            color: "var(--accent-cyan, #00FFFF)",
            cursor: submitting ? "not-allowed" : "pointer",
            fontFamily: "var(--font-body, 'Inter Tight', 'Inter', system-ui, sans-serif)",
            fontSize: "1rem",
            fontWeight: 600,
            transition: "background 0.2s",
          }}
        >
          {submitting ? "Submitting..." : "[ LOCK IN ]"}
        </button>
      </div>
    </div>
  );
}

