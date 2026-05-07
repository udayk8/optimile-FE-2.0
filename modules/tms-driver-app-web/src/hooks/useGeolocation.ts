import { useEffect, useState } from "react";

export type GeoPoint = { lat: number; lng: number } | null;

export function useGeolocation() {
  const [location, setLocation] = useState<GeoPoint>(null);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        setLocation(null);
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  }, []);

  return location;
}
