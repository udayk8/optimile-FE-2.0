import { useEffect, useState } from "react";
import { tripService } from "@/services/tripService";
import type { Trip } from "@/types/trip";

export function useActiveTrip(refreshKey = 0) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    tripService.getActiveTrip().then((nextTrip) => {
      if (active) {
        setTrip(nextTrip);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [refreshKey]);

  return { trip, loading };
}
