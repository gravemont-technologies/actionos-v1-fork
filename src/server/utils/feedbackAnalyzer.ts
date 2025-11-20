import { FeedbackRecord } from "../store/profileStore.js";

/**
 * Analyze feedback patterns to generate meaningful context for prompts
 */
export function analyzeFeedbackPatterns(feedback: FeedbackRecord[]): string | undefined {
  if (feedback.length === 0) {
    return undefined;
  }

  const patterns: string[] = [];

  // Calculate average slider
  const avgSlider = feedback.reduce((sum, f) => sum + f.slider, 0) / feedback.length;
  if (avgSlider >= 7) {
    patterns.push("high satisfaction (avg " + avgSlider.toFixed(1) + "/10)");
  } else if (avgSlider <= 4) {
    patterns.push("low satisfaction (avg " + avgSlider.toFixed(1) + "/10)");
  } else {
    patterns.push("moderate satisfaction (avg " + avgSlider.toFixed(1) + "/10)");
  }

  // Check for trends (improving/declining)
  if (feedback.length >= 2) {
    const recent = feedback[0].slider;
    const previous = feedback[1].slider;
    if (recent > previous + 1) {
      patterns.push("improving trend");
    } else if (recent < previous - 1) {
      patterns.push("declining trend");
    }
  }

  // Extract common outcome themes (if outcomes provided)
  const outcomes = feedback.filter(f => f.outcome).map(f => f.outcome!.toLowerCase());
  if (outcomes.length > 0) {
    const commonWords = extractCommonThemes(outcomes);
    if (commonWords.length > 0) {
      patterns.push("themes: " + commonWords.slice(0, 3).join(", "));
    }
  }

  // Check for consistency
  const sliderVariance = calculateVariance(feedback.map(f => f.slider));
  if (sliderVariance < 2) {
    patterns.push("consistent ratings");
  } else {
    patterns.push("variable ratings");
  }

  return patterns.join("; ");
}

/**
 * Extract common themes from outcome texts
 */
function extractCommonThemes(outcomes: string[]): string[] {
  // Simple word frequency analysis (stop words removed)
  const stopWords = new Set(["the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by", "from", "as", "is", "was", "were", "been", "be", "have", "has", "had", "do", "does", "did", "will", "would", "could", "should", "may", "might", "must", "can"]);
  
  const wordCounts = new Map<string, number>();
  
  outcomes.forEach(outcome => {
    const words = outcome.split(/\s+/).map(w => w.toLowerCase().replace(/[^\w]/g, ""));
    words.forEach(word => {
      if (word.length > 2 && !stopWords.has(word)) {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      }
    });
  });

  // Return top words that appear in at least 2 outcomes
  return Array.from(wordCounts.entries())
    .filter(([_, count]) => count >= 2)
    .sort(([_, a], [__, b]) => b - a)
    .slice(0, 5)
    .map(([word, _]) => word);
}

/**
 * Calculate variance of a number array
 */
function calculateVariance(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  return squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
}

