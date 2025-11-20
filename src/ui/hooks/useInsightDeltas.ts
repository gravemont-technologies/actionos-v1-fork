import { useState, useEffect, useRef } from "react";
import { api } from "../utils/api.js";
import { useProfileId } from "../contexts/ProfileContext.js";
import { useAuthHeaders } from "../auth.js";

type DeltaData = {
  slider: number;
  deltaIpp: number;
};

export function useInsightDeltas(signatures: string[]): Record<string, DeltaData> {
  const profileId = useProfileId();
  const authHeaders = useAuthHeaders();
  const [deltas, setDeltas] = useState<Record<string, DeltaData>>({});
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    if (!profileId || signatures.length === 0) {
      setDeltas({});
      return;
    }

    // PAGINATION FIX: Limit to 200 signatures per request
    const limitedSignatures = signatures.slice(0, 200);
    if (signatures.length > 200) {
      console.warn(`Limiting insight deltas fetch to 200 signatures (requested: ${signatures.length})`);
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const fetchDeltas = async () => {
      try {
        let response: { deltas: Record<string, DeltaData> };
        
        if (limitedSignatures.length > 50) {
          // POST endpoint for large batches
          response = await api.post<{ deltas: Record<string, DeltaData> }>(
            `/api/step-feedback/insight-deltas`,
            {
              profile_id: profileId,
              signatures: limitedSignatures
            },
            { headers: authHeaders, signal: abortController.signal }
          );
        } else {
          // GET endpoint for small batches
          const signaturesParam = limitedSignatures.join(",");
          response = await api.get<{ deltas: Record<string, DeltaData> }>(
            `/api/step-feedback/insight-deltas?profile_id=${profileId}&signatures=${signaturesParam}`,
            { headers: authHeaders, signal: abortController.signal }
          );
        }
        
        if (!abortController.signal.aborted && isMountedRef.current) {
          setDeltas(response.deltas || {});
        }
      } catch (err) {
        if (!abortController.signal.aborted && isMountedRef.current) {
          console.error("Failed to fetch insight deltas:", err);
        }
      }
    };

    fetchDeltas();

    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [profileId, authHeaders, signatures.slice(0, 200).join(",")]); // Use limited signatures for dependency

  return deltas;
}

