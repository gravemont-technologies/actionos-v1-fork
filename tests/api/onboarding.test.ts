import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/server/index.js";
import { getSupabaseClient } from "../../src/server/db/supabase.js";

const mockUserId = "user_test_123";

function authenticatedRequest(method: "get" | "post", path: string) {
  return request(app)[method](path).set("x-clerk-user-id", mockUserId);
}

describe("API: /api/onboarding", () => {
  afterAll(async () => {
    // Cleanup test profiles
    const supabase = getSupabaseClient();
    await supabase.from("profiles").delete().eq("user_id", mockUserId);
  });

  describe("GET /api/onboarding/questions", () => {
    it("should return quiz questions", async () => {
      const response = await authenticatedRequest("get", "/api/onboarding/questions")
        .expect(200);

      expect(response.body).toHaveProperty("questions");
      expect(response.body.questions).toBeInstanceOf(Array);
      expect(response.body.questions.length).toBeGreaterThan(0);
      
      const question = response.body.questions[0];
      expect(question).toHaveProperty("id");
      expect(question).toHaveProperty("prompt"); // Questions use "prompt" not "text"
      expect(question).toHaveProperty("options");
      expect(question.options).toBeInstanceOf(Array);
    });
  });

  describe("GET /api/onboarding/insights", () => {
    it("should return insight for valid question/option", async () => {
      // First get questions to get valid IDs
      const questionsResponse = await authenticatedRequest("get", "/api/onboarding/questions")
        .expect(200);
      
      const firstQuestion = questionsResponse.body.questions[0];
      const firstOption = firstQuestion.options[0];

      const response = await authenticatedRequest("get", `/api/onboarding/insights?questionId=${firstQuestion.id}&optionId=${firstOption.id}`)
        .expect(200);

      expect(response.body).toHaveProperty("insight");
      expect(typeof response.body.insight).toBe("string");
    });

    it("should handle invalid question/option IDs", async () => {
      const response = await authenticatedRequest("get", "/api/onboarding/insights?questionId=invalid&optionId=invalid")
        .expect(400);

      expect(response.body).toHaveProperty("error");
    });

    it("should handle rapid requests without rate limiting (dev mode)", async () => {
      // First get questions to get valid IDs
      const questionsResponse = await authenticatedRequest("get", "/api/onboarding/questions")
        .expect(200);
      
      const firstQuestion = questionsResponse.body.questions[0];
      const firstOption = firstQuestion.options[0];

      // Make 20 rapid requests (simulating rapid quiz clicking)
      const requests = Array.from({ length: 20 }, () =>
        authenticatedRequest("get", `/api/onboarding/insights?questionId=${firstQuestion.id}&optionId=${firstOption.id}`)
      );

      const responses = await Promise.all(requests);
      
      // All should succeed (rate limiter allows 10k req/min in dev)
      const successCount = responses.filter(r => r.status === 200).length;
      expect(successCount).toBe(20);
      
      // All should have insights
      responses.forEach(response => {
        expect(response.body).toHaveProperty("insight");
        expect(typeof response.body.insight).toBe("string");
      });
    });
  });

  describe("POST /api/onboarding/profile", () => {
    it("should validate responses format", async () => {
      const response = await authenticatedRequest("post", "/api/onboarding/profile")
        .send({
          // Missing responses
        })
        .expect(400);

      expect(response.body).toHaveProperty("error");
    });

    it("should generate profile from valid responses", async () => {
      // Get questions first
      const questionsResponse = await authenticatedRequest("get", "/api/onboarding/questions")
        .expect(200);
      
      const questions = questionsResponse.body.questions;
      const responses: Record<string, string> = {};
      
      // Create valid responses
      questions.forEach((q: any) => {
        responses[q.id] = q.options[0].id;
      });

      const response = await authenticatedRequest("post", "/api/onboarding/profile")
        .send({ responses })
        .expect(200);

      expect(response.body).toHaveProperty("profile");
      expect(response.body).toHaveProperty("insights");
      expect(response.body.profile).toHaveProperty("profile_id");
      expect(response.body.profile).toHaveProperty("tags");
      expect(response.body.profile).toHaveProperty("baseline");
      expect(response.body.profile.baseline).toHaveProperty("ipp");
      expect(response.body.profile.baseline).toHaveProperty("but");
      expect(response.body.profile).toHaveProperty("strengths");
      expect(response.body.insights).toBeInstanceOf(Array);
    });

    it("should create profile in database", async () => {
      const questionsResponse = await authenticatedRequest("get", "/api/onboarding/questions")
        .expect(200);
      
      const questions = questionsResponse.body.questions;
      const responses: Record<string, string> = {};
      questions.forEach((q: any) => {
        responses[q.id] = q.options[0].id;
      });

      const response = await authenticatedRequest("post", "/api/onboarding/profile")
        .send({ responses })
        .expect(200);

      const profileId = response.body.profile.profile_id;

      // Verify profile exists in database
      const supabase = getSupabaseClient();
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("profile_id", profileId)
        .single();

      expect(data).not.toBeNull();
      expect(data?.user_id).toBe(mockUserId);
      expect(data?.tags).toBeInstanceOf(Array);
    });

    it("should handle incomplete responses", async () => {
      const questionsResponse = await authenticatedRequest("get", "/api/onboarding/questions")
        .expect(200);
      
      const questions = questionsResponse.body.questions;
      const responses: Record<string, string> = {};
      
      // Only answer first question
      responses[questions[0].id] = questions[0].options[0].id;

      const response = await authenticatedRequest("post", "/api/onboarding/profile")
        .send({ responses })
        .expect(200); // Should still work with defaults

      expect(response.body).toHaveProperty("profile");
    });
  });
});

