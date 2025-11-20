export type AnalyzeRequestInput = {
  profileId: string;
  situation: string;
  goal: string;
  constraints: string;
  currentSteps: string;
  deadline?: string;
  stakeholders?: string;
  resources?: string;
};

export function normalizeValue(value: string): string {
  if (!value) {
    return "";
  }

  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s/+-]/g, "");
}

export function normalizeConstraints(constraints: string): string[] {
  return constraints
    .split(/[\n,]+/g)
    .map((piece) => normalizeValue(piece))
    .filter(Boolean)
    .sort();
}

export function buildSignatureString(payload: AnalyzeRequestInput): string {
  const parts = [
    payload.profileId,
    normalizeValue(payload.situation),
    normalizeValue(payload.goal),
    normalizeValue(payload.currentSteps),
    normalizeValue(payload.deadline ?? ""),
    normalizeValue(payload.stakeholders ?? ""),
    normalizeValue(payload.resources ?? ""),
    normalizeConstraints(payload.constraints).join("|"),
  ];

  return parts.join("\n");
}

export async function computeSignature(payload: AnalyzeRequestInput): Promise<string> {
  const signatureInput = buildSignatureString(payload);
  return hashString(signatureInput);
}

export async function hashString(signatureInput: string): Promise<string> {
  const runtimeCrypto = globalThis.crypto as Crypto | undefined;

  if (runtimeCrypto?.subtle) {
    const data = new TextEncoder().encode(signatureInput);
    const hashBuffer = await runtimeCrypto.subtle.digest("SHA-256", data);
    return bufferToHex(hashBuffer);
  }

  const nodeCrypto = await import("crypto");
  return nodeCrypto.createHash("sha256").update(signatureInput).digest("hex");
}

function bufferToHex(buffer: ArrayBufferLike): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

