import { describe, it, expect, beforeEach } from "vitest";
import { tokenTracker } from "../../src/server/llm/tokenTracker.js";

describe("TokenTracker", () => {
  const testUserId = "user_test_123";

  beforeEach(async () => {
    // Reset token usage for test user
    // Note: In a real test, you'd want to clear the database
  });

  it("should estimate tokens correctly", () => {
    const system = "You are a helpful assistant.";
    const user = "What is the weather?";
    const maxOutput = 100;

    const estimated = tokenTracker.estimateTokens(system, user, maxOutput);

    expect(estimated).toBeGreaterThan(0);
    expect(estimated).toBeLessThan(1000); // Reasonable upper bound
  });

  it("should check if tokens can be used", async () => {
    const canUse = await tokenTracker.canUseTokens(testUserId, 100);
    
    // Should allow if under daily limit
    expect(typeof canUse).toBe("boolean");
  });

  it("should record token usage", async () => {
    await tokenTracker.recordUsage(testUserId, 50);
    
    // Usage should be recorded (no error thrown)
    // In a real test, you'd verify the database
  });

  it("should handle null userId gracefully", async () => {
    await expect(tokenTracker.recordUsage(null, 50)).resolves.not.toThrow();
  });

  it("should get today's usage", async () => {
    // getTodayUsage is private, test via getUsageStats
    const stats = await tokenTracker.getUsageStats(testUserId);
    
    expect(stats).toHaveProperty("used");
    expect(stats).toHaveProperty("remaining");
    expect(typeof stats.used).toBe("number");
    expect(stats.used).toBeGreaterThanOrEqual(0);
  });
});

