import { useState, useEffect } from "react";
import { useAuthHeaders, useUserId } from "./auth";
import { useNavigate } from "react-router-dom";
import { api } from "./utils/api.js";
import { useProfileContext } from "./contexts/ProfileContext.js";

type Question = {
  id: string;
  prompt: string;
  options: Array<{
    id: string;
    label: string;
    insight: string;
  }>;
};

type OnboardingQuizProps = {
  onComplete: (profileId: string) => void;
};

const STORAGE_KEY = "action_os_profile_id";

export function OnboardingQuiz({ onComplete }: OnboardingQuizProps) {
  const userId = useUserId();
  const authHeaders = useAuthHeaders();
  const navigate = useNavigate();
  const { setProfileId } = useProfileContext();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentInsight, setCurrentInsight] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ questions: Question[] }>("/api/onboarding/questions")
      .then((data) => {
        setQuestions(data.questions || []);
        setLoading(false);
      })
      .catch((err) => {
        setError("Failed to load questions");
        setLoading(false);
      });
  }, []);

  const handleSelect = (questionId: string, optionId: string) => {
    setResponses((prev) => ({ ...prev, [questionId]: optionId }));

    // Fetch insight for this answer
    api
      .get<{ insight: string }>(`/api/onboarding/insights?questionId=${questionId}&optionId=${optionId}`)
      .then((data) => {
        setCurrentInsight(data.insight || null);
        setTimeout(() => setCurrentInsight(null), 3000);
      })
      .catch(() => {});

    // Auto-advance after short delay
    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(currentIndex + 1);
      }
    }, 500);
  };

  const handleSubmit = async () => {
    if (Object.keys(responses).length < questions.length) {
      setError("Please answer all questions");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const data = await api.post<{
        profile: { profile_id: string };
        insights: unknown;
      }>(
        "/api/onboarding/profile",
        {
          responses,
          consent_to_store: true,
          user_id: userId, // Include Clerk user ID in body
        },
        {
          headers: authHeaders,
        }
      );
      const profileId = data.profile?.profile_id;

      if (!profileId) {
        throw new Error("No profile ID returned");
      }

      // Store profile_id in ProfileContext
      setProfileId(profileId);
      
      // Store in localStorage for backward compatibility (ProfileContext also does this, but keep for explicit backup)
      localStorage.setItem(STORAGE_KEY, profileId);
      
      // Call onComplete callback if provided
      onComplete(profileId);
      
      // Navigate to app after completion
      navigate("/app/analyze");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div>Loading questions...</div>;
  }

  if (questions.length === 0) {
    return <div>No questions available</div>;
  }

  const currentQuestion = questions[currentIndex];
  const isLast = currentIndex === questions.length - 1;
  const allAnswered = Object.keys(responses).length === questions.length;

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "2rem" }}>
      <header style={{ marginBottom: "2rem" }}>
        <h1>Action OS Onboarding</h1>
        <p>
          Question {currentIndex + 1} of {questions.length}
        </p>
        <progress value={currentIndex + 1} max={questions.length} style={{ width: "100%" }} />
      </header>

      <div style={{ marginBottom: "2rem" }}>
        <h2 style={{ marginBottom: "1rem" }}>{currentQuestion.prompt}</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {currentQuestion.options.map((option) => {
            const isSelected = responses[currentQuestion.id] === option.id;
            return (
              <button
                key={option.id}
                onClick={() => handleSelect(currentQuestion.id, option.id)}
                style={{
                  padding: "1rem",
                  textAlign: "left",
                  border: `2px solid ${isSelected ? "#007bff" : "#ddd"}`,
                  borderRadius: "4px",
                  backgroundColor: isSelected ? "#f0f8ff" : "white",
                  cursor: "pointer",
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {currentInsight && (
        <div
          style={{
            padding: "1rem",
            backgroundColor: "#e8f5e9",
            borderRadius: "4px",
            marginBottom: "1rem",
          }}
        >
          <strong>Insight:</strong> {currentInsight}
        </div>
      )}

      {error && (
        <div style={{ color: "red", marginBottom: "1rem" }}>{error}</div>
      )}

      <div style={{ display: "flex", gap: "1rem", justifyContent: "space-between" }}>
        <button
          onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
          disabled={currentIndex === 0}
        >
          Previous
        </button>
        {isLast && allAnswered && (
          <button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Creating profile..." : "Complete Onboarding"}
          </button>
        )}
      </div>
    </div>
  );
}

// Helper to get stored profileId (for Clerk integration later)
export function getStoredProfileId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY);
}

// Helper to clear stored profileId
export function clearStoredProfileId(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

