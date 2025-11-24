import { describe, it, expect } from 'vitest';
import { computeServerSignature, verifySignature } from '../../src/server/utils/signature';
import { AnalyzeRequestInput } from '../../src/shared/signature';

describe('Signature Utils', () => {
  const samplePayload: AnalyzeRequestInput = {
    profileId: 'test-profile-123',
    situation: 'Need to ship MVP in 3 days',
    goal: 'Launch with 100 users',
    constraints: 'time, money',
    currentSteps: 'Building auth flow',
    deadline: '3 days',
    stakeholders: '',
    resources: '',
  };

  it('should compute consistent signatures for identical payloads', () => {
    const sig1 = computeServerSignature(samplePayload);
    const sig2 = computeServerSignature(samplePayload);
    
    expect(sig1).toBe(sig2);
    expect(sig1).toMatch(/^[a-f0-9]{64}$/); // Valid SHA-256 hex
  });

  it('should verify valid signatures', () => {
    const signature = computeServerSignature(samplePayload);
    const isValid = verifySignature(samplePayload, signature);
    
    expect(isValid).toBe(true);
  });

  it('should reject invalid signatures', () => {
    const isValid = verifySignature(samplePayload, 'invalid-signature-abc123');
    
    expect(isValid).toBe(false);
  });

  it('should reject missing signatures', () => {
    const isValid = verifySignature(samplePayload, null);
    
    expect(isValid).toBe(false);
  });

  it('should reject undefined signatures', () => {
    const isValid = verifySignature(samplePayload, undefined);
    
    expect(isValid).toBe(false);
  });

  it('should produce different signatures for different payloads', () => {
    const sig1 = computeServerSignature(samplePayload);
    const sig2 = computeServerSignature({
      ...samplePayload,
      situation: 'Different situation',
    });
    
    expect(sig1).not.toBe(sig2);
  });

  it('should handle whitespace normalization consistently', () => {
    const payload1 = { ...samplePayload, situation: 'Test   with   spaces' };
    const payload2 = { ...samplePayload, situation: 'Test with spaces' };
    
    const sig1 = computeServerSignature(payload1);
    const sig2 = computeServerSignature(payload2);
    
    // Normalization should make these equal
    expect(sig1).toBe(sig2);
  });

  it('should handle case normalization consistently', () => {
    const payload1 = { ...samplePayload, goal: 'LAUNCH APP' };
    const payload2 = { ...samplePayload, goal: 'launch app' };
    
    const sig1 = computeServerSignature(payload1);
    const sig2 = computeServerSignature(payload2);
    
    // Case should be normalized
    expect(sig1).toBe(sig2);
  });

  it('should handle constraint ordering consistently', () => {
    const payload1 = { ...samplePayload, constraints: 'time, money, energy' };
    const payload2 = { ...samplePayload, constraints: 'money, time, energy' };
    
    const sig1 = computeServerSignature(payload1);
    const sig2 = computeServerSignature(payload2);
    
    // Constraints are sorted, so order doesn't matter
    expect(sig1).toBe(sig2);
  });

  it('should reject signatures with wrong length', () => {
    const isValid = verifySignature(samplePayload, 'abc123');
    
    expect(isValid).toBe(false);
  });

  it('should handle malformed hex gracefully', () => {
    const isValid = verifySignature(samplePayload, 'zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz');
    
    expect(isValid).toBe(false);
  });

  it('should handle whitespace normalization consistently', () => {
    const payload1 = { ...samplePayload, situation: 'Test   with   spaces' };
    const payload2 = { ...samplePayload, situation: 'Test with spaces' };
    
    const sig1 = computeServerSignature(payload1);
    const sig2 = computeServerSignature(payload2);
    
    // Normalization should make these equal
    expect(sig1).toBe(sig2);
  });

  it('should reject signatures with wrong length', () => {
    const isValid = verifySignature(samplePayload, 'abc123'); // Too short
    
    expect(isValid).toBe(false);
  });

  it('should handle case sensitivity properly', () => {
    const signature = computeServerSignature(samplePayload);
    const upperCaseSig = signature.toUpperCase();
    
    // Hex is case-insensitive, but Buffer.from handles this
    // Our implementation should reject case differences since we compare as hex strings
    const isValid = verifySignature(samplePayload, upperCaseSig);
    
    // Buffer.from('hex') is case-insensitive, so this should work
    expect(isValid).toBe(true);
  });

  it('should handle constraint ordering consistently', () => {
    const payload1 = { ...samplePayload, constraints: 'time, money, resources' };
    const payload2 = { ...samplePayload, constraints: 'money, time, resources' };
    
    const sig1 = computeServerSignature(payload1);
    const sig2 = computeServerSignature(payload2);
    
    // Constraints are sorted, so these should be equal
    expect(sig1).toBe(sig2);
  });
});
