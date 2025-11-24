import { createHash, timingSafeEqual as cryptoTimingSafeEqual } from "crypto";
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

  // Use Buffer-based crypto.timingSafeEqual for constant-time comparison
  // This prevents timing attacks and avoids subtle char-code bugs.
  try {
    const computedBuf = Buffer.from(computed, "hex");
    const signatureBuf = Buffer.from(String(signature), "hex");

    // Length mismatch -> not equal
    if (computedBuf.length !== signatureBuf.length) {
      return false;
    }

    return cryptoTimingSafeEqual(computedBuf, signatureBuf);
  } catch (err) {
    // Any error (invalid hex, etc) should result in verification failure
    return false;
  }
}

