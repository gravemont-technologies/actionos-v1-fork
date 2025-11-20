import { createHash } from "crypto";
import { AnalyzeRequestInput, buildSignatureString } from "../../shared/signature.js";

export function computeServerSignature(payload: AnalyzeRequestInput): string {
  const signatureInput = buildSignatureString(payload);
  return createHash("sha256").update(signatureInput).digest("hex");
}

export function verifySignature(payload: AnalyzeRequestInput, signature?: string | null): boolean {
  if (!signature) {
    return false;
  }
  const computed = computeServerSignature(payload);
  return timingSafeEqual(computed, signature);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

