import { describe, expect, it } from "vitest";
import { buildSignatureString, normalizeConstraints, normalizeValue } from "../src/shared/signature.js";

describe("signature normalization", () => {
  it("normalizes values (lowercase, trim, spaces, strip)", () => {
    expect(normalizeValue("  Hello,  WORLD!!  ")).toBe("hello world");
  });

  it("normalizes constraints (split, normalize, sort, dedupe falsy)", () => {
    expect(normalizeConstraints("  Time,  Cost\nPeople ")).toEqual(["cost", "people", "time"]);
  });

  it("builds deterministic signature input", () => {
    const sig = buildSignatureString({
      profileId: "user_123",
      situation: " Need   Plan ",
      goal: " Ship MVP ",
      constraints: "  Time, Cost ",
      currentSteps: " Draft ",
      deadline: "",
      stakeholders: "",
      resources: "",
    });

    expect(sig).toEqual(
      [
        "user_123",
        "need plan",
        "ship mvp",
        "draft",
        "",
        "",
        "",
        "cost|time",
      ].join("\n")
    );
  });
});


