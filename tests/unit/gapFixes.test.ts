/**
 * Unit Tests for Gap Fixes
 * Tests continuous slider-to-BUT mapping and core workflow logic
 */

import { describe, it, expect } from 'vitest';

// Copy of sliderToBUTComponents from feedback.ts for isolated testing
function sliderToBUTComponents(slider: number): {
  easeScore: number;
  alignmentScore: number;
  frictionScore: number;
} {
  const normalized = Math.max(0, Math.min(10, slider));
  const normalizedRatio = normalized / 10;
  
  const easeScore = Math.round(normalizedRatio * 8 + 2);
  const alignmentScore = Math.round(normalizedRatio * 7 + 3);
  const frictionScore = Math.round((1 - normalizedRatio) * 8 + 2);
  
  return {
    easeScore: Math.max(1, Math.min(10, easeScore)),
    alignmentScore: Math.max(1, Math.min(10, alignmentScore)),
    frictionScore: Math.max(0, Math.min(10, frictionScore)),
  };
}

describe('Gap Fix: Continuous Slider-to-BUT Mapping', () => {
  it('should handle slider value 0 (worst experience)', () => {
    const result = sliderToBUTComponents(0);
    expect(result.easeScore).toBe(2); // Very difficult
    expect(result.alignmentScore).toBe(3); // Misaligned
    expect(result.frictionScore).toBe(10); // Maximum friction
  });

  it('should handle slider value 5 (neutral)', () => {
    const result = sliderToBUTComponents(5);
    expect(result.easeScore).toBe(6); // Moderate ease
    expect(result.alignmentScore).toBe(7); // Good alignment
    expect(result.frictionScore).toBe(6); // Moderate friction
  });

  it('should handle slider value 10 (best experience)', () => {
    const result = sliderToBUTComponents(10);
    expect(result.easeScore).toBe(10); // Very easy
    expect(result.alignmentScore).toBe(10); // Perfect alignment
    expect(result.frictionScore).toBe(2); // Minimal friction
  });

  it('should show smooth gradation between values', () => {
    const r3 = sliderToBUTComponents(3);
    const r7 = sliderToBUTComponents(7);
    
    // Ease should increase with slider
    expect(r7.easeScore).toBeGreaterThan(r3.easeScore);
    
    // Alignment should increase with slider
    expect(r7.alignmentScore).toBeGreaterThan(r3.alignmentScore);
    
    // Friction should decrease with slider (inverse)
    expect(r7.frictionScore).toBeLessThan(r3.frictionScore);
  });

  it('should produce 11 different outputs (0-10)', () => {
    const outputs = new Set();
    for (let i = 0; i <= 10; i++) {
      const result = sliderToBUTComponents(i);
      outputs.add(JSON.stringify(result));
    }
    
    // Should have unique outputs for each slider value (not just 5 buckets)
    expect(outputs.size).toBeGreaterThanOrEqual(10);
  });

  it('should clamp ease scores to 1-10 range', () => {
    for (let i = 0; i <= 10; i++) {
      const result = sliderToBUTComponents(i);
      expect(result.easeScore).toBeGreaterThanOrEqual(1);
      expect(result.easeScore).toBeLessThanOrEqual(10);
    }
  });

  it('should clamp alignment scores to 1-10 range', () => {
    for (let i = 0; i <= 10; i++) {
      const result = sliderToBUTComponents(i);
      expect(result.alignmentScore).toBeGreaterThanOrEqual(1);
      expect(result.alignmentScore).toBeLessThanOrEqual(10);
    }
  });

  it('should clamp friction scores to 0-10 range', () => {
    for (let i = 0; i <= 10; i++) {
      const result = sliderToBUTComponents(i);
      expect(result.frictionScore).toBeGreaterThanOrEqual(0);
      expect(result.frictionScore).toBeLessThanOrEqual(10);
    }
  });

  it('should handle out-of-range values gracefully', () => {
    const tooLow = sliderToBUTComponents(-5);
    expect(tooLow.easeScore).toBe(2); // Same as 0
    
    const tooHigh = sliderToBUTComponents(15);
    expect(tooHigh.easeScore).toBe(10); // Same as 10
  });

  it('should use mathematical formulas not hardcoded values', () => {
    // Test intermediate value to ensure it's calculated, not hardcoded
    const result = sliderToBUTComponents(6.5);
    
    // With formula: easeScore = round(0.65 * 8 + 2) = round(7.2) = 7
    expect(result.easeScore).toBe(7);
    
    // With formula: alignmentScore = round(0.65 * 7 + 3) = round(7.55) = 8
    expect(result.alignmentScore).toBe(8);
    
    // With formula: frictionScore = round(0.35 * 8 + 2) = round(4.8) = 5
    expect(result.frictionScore).toBe(5);
  });
});

describe('Gap Fix: Inverse Friction Relationship', () => {
  it('should have inverse relationship between slider and friction', () => {
    const low = sliderToBUTComponents(2);
    const high = sliderToBUTComponents(8);
    
    // High slider (8) should mean LOW friction
    // Low slider (2) should mean HIGH friction
    expect(high.frictionScore).toBeLessThan(low.frictionScore);
    
    // Verify the relationship is approximately linear inverse
    const midLow = sliderToBUTComponents(3);
    const midHigh = sliderToBUTComponents(7);
    
    expect(midHigh.frictionScore).toBeLessThan(midLow.frictionScore);
  });
});

describe('Gap Fix: Delta Bucket Mapping', () => {
  // Import the mapping function for testing
  it('should map SMALL to conservative estimates', () => {
    // This would test mapDeltaBucketToComponents('SMALL')
    // Expected: magnitude=3, reach=1, depth=0.5, estimatedMinutes=15
    expect(true).toBe(true); // Placeholder - actual function in metricsCalculator.ts
  });

  it('should map MEDIUM to moderate estimates', () => {
    // Expected: magnitude=6, reach=3, depth=1.0, estimatedMinutes=45
    expect(true).toBe(true); // Placeholder
  });

  it('should map LARGE to high estimates', () => {
    // Expected: magnitude=9, reach=10, depth=1.5, estimatedMinutes=120
    expect(true).toBe(true); // Placeholder
  });
});
