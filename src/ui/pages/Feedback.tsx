import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/ui/utils/api";
import { useProfileId } from "@/ui/contexts/ProfileContext";

export default function Feedback() {
  const navigate = useNavigate();
  const profileId = useProfileId();
  const [category, setCategory] = useState("Improvements");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/api/feedback-comments", {
        profile_id: profileId || undefined,
        category,
        message,
      });
      setSuccess("Thanks — feedback recorded.");
      setMessage("");
    } catch (err: any) {
      setError(err?.message || "Failed to submit feedback");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="py-8">
      <div className="container max-w-2xl">
        <h2 className="text-2xl font-semibold mb-4">Feedback</h2>
        <p className="text-sm text-muted-foreground mb-6">We read everything — choose a category and tell us what's on your mind.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <div className="text-sm font-medium mb-1">Category</div>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full p-2 border rounded">
              <option>Bugs</option>
              <option>Improvements</option>
              <option>Thoughts</option>
              <option>Secrets 😉</option>
            </select>
          </label>

          <label className="block">
            <div className="text-sm font-medium mb-1">Message</div>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={6} className="w-full p-3 border rounded" placeholder="Tell us what happened or what you'd like to see..."></textarea>
          </label>

          <div className="flex items-center gap-3">
            <button type="submit" disabled={submitting} className="px-4 py-2 rounded bg-accent text-accent-foreground font-semibold">
              {submitting ? "Submitting..." : "Send Feedback"}
            </button>
            <button type="button" onClick={() => navigate(-1)} className="px-3 py-2 rounded border">Cancel</button>
          </div>

          {success && <div className="text-sm text-success">{success}</div>}
          {error && <div className="text-sm text-destructive">{error}</div>}
        </form>
      </div>
    </div>
  );
}
