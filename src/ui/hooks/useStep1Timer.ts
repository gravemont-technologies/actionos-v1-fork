import { useState, useEffect, useRef } from "react";
import { api } from "../utils/api.js";

type TimerData = {
  elapsed_seconds: number;
  formatted_time: string;
  started_at: string | null;
};

// Extended type with computed fields (backward compatible)
type ExtendedTimerData = TimerData & {
  isExpired: boolean; // true if > 15:00
  elapsedMinutes: number;
};

/**
 * Hook to fetch and display Step-1 timer
 * Fetches timer every second and formats as MM:SS
 * Returns extended data with isExpired and elapsedMinutes
 */
export function useStep1Timer(
  profileId: string | null,
  signature: string | null,
  userId: string | null
): ExtendedTimerData | null {
  const [timerData, setTimerData] = useState<TimerData | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    if (!profileId || !signature || !userId) {
      setTimerData(null);
      return;
    }

    // Fetch immediately
    const fetchTimer = async () => {
      try {
        const response = await api.get<TimerData>(
          `/api/step-feedback/timer?profile_id=${profileId}&signature=${signature}`,
          { headers: { "x-clerk-user-id": userId } }
        );
        
        if (isMountedRef.current) {
          setTimerData(response);
        }
      } catch (error) {
        // Silently handle errors - timer is non-critical
        if (isMountedRef.current) {
          setTimerData(null);
        }
      }
    };

    fetchTimer();

    // Set up interval to fetch every second
    intervalRef.current = setInterval(() => {
      fetchTimer();
    }, 1000);

    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [profileId, signature, userId]);

  // Compute extended fields (backward compatible - all original fields preserved)
  if (!timerData) return null;

  const elapsedMinutes = Math.floor(timerData.elapsed_seconds / 60);
  const isExpired = timerData.elapsed_seconds > 15 * 60; // 15 minutes = 900 seconds

  return {
    ...timerData, // All original fields preserved
    isExpired,
    elapsedMinutes
  };
}


