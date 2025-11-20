import { describe, it, expect } from "vitest";
import { analyzeFeedbackPatterns } from "../src/server/utils/feedbackAnalyzer.js";
import { FeedbackRecord } from "../src/server/store/profileStore.js";

describe("Feedback Analyzer", () => {
  it("should analyze high satisfaction patterns", () => {
    const feedback: FeedbackRecord[] = [
      {
        profileId: "test123",
        signature: "abc123",
        slider: 9,
        outcome: "excellent results",
        recordedAt: Date.now(),
        deltaIpp: 4,
        deltaBut: 3.2,
      },
      {
        profileId: "test123",
        signature: "def456",
        slider: 8,
        outcome: "good progress",
        recordedAt: Date.now() - 86400000,
        deltaIpp: 3,
        deltaBut: 2.4,
      },
    ];

    const patterns = analyzeFeedbackPatterns(feedback);

    expect(patterns).toBeDefined();
    expect(patterns).toContain("high satisfaction");
    expect(patterns).toContain("avg");
  });

  it("should detect improving trends", () => {
    const feedback: FeedbackRecord[] = [
      {
        profileId: "test123",
        signature: "abc123",
        slider: 8,
        outcome: "great",
        recordedAt: Date.now(),
        deltaIpp: 4,
        deltaBut: 3.2,
      },
      {
        profileId: "test123",
        signature: "def456",
        slider: 5,
        outcome: "okay",
        recordedAt: Date.now() - 86400000,
        deltaIpp: 0,
        deltaBut: 0,
      },
    ];

    const patterns = analyzeFeedbackPatterns(feedback);

    expect(patterns).toBeDefined();
    expect(patterns).toContain("improving trend");
  });

  it("should extract common themes from outcomes", () => {
    const feedback: FeedbackRecord[] = [
      {
        profileId: "test123",
        signature: "abc123",
        slider: 8,
        outcome: "completed successfully",
        recordedAt: Date.now(),
        deltaIpp: 4,
        deltaBut: 3.2,
      },
      {
        profileId: "test123",
        signature: "def456",
        slider: 7,
        outcome: "successfully finished",
        recordedAt: Date.now() - 86400000,
        deltaIpp: 3,
        deltaBut: 2.4,
      },
    ];

    const patterns = analyzeFeedbackPatterns(feedback);

    expect(patterns).toBeDefined();
    expect(patterns).toContain("themes:");
  });

  it("should return undefined for empty feedback", () => {
    const patterns = analyzeFeedbackPatterns([]);
    expect(patterns).toBeUndefined();
  });
});

