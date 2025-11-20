import { useState, useEffect, useRef } from "react";
import { api } from "../utils/api.js";
import { useProfileId } from "../contexts/ProfileContext.js";
import { useAuthHeaders } from "../auth.js";

type Stats = {
  completed: number;
  totalDeltaIpp: string;
  streak: number;
};

export function useStats(): {
  stats: Stats | null;
  loading: boolean;
  error: string | null;
} {
  const profileId = useProfileId();
  const authHeaders = useAuthHeaders();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    if (!profileId) {
      setStats(null);
      setLoading(false);
      return;
    }

    const fetchStats = async () => {
      try {
        const response = await api.get<Stats>(
          `/api/step-feedback/stats?profile_id=${profileId}`,
          { headers: authHeaders }
        );
        
        if (isMountedRef.current) {
          setStats(response);
          setLoading(false);
          setError(null);
        }
      } catch (err) {
        if (isMountedRef.current) {
          // Graceful degradation: Return zeros on error
          setStats({ completed: 0, totalDeltaIpp: "0.0", streak: 0 });
          setLoading(false);
          setError(null); // Silent error handling
        }
        console.error("Failed to fetch stats:", err);
      }
    };

    fetchStats();

    // Auto-refresh every 60 seconds
    intervalRef.current = setInterval(fetchStats, 60000);

    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [profileId, authHeaders]);

  return { stats, loading, error };
}

