import { useState } from "react";
import { POIGrid } from "@/components/poi/POIGrid";
import { Card } from "@/components/ui/Card";
import { mockNearbyPOI, poiTypes } from "@/mocks/poi";
import type { POIType } from "@/types/poi";

export function PointsOfInterestPage() {
  const [selected, setSelected] = useState<POIType>("fuel");

  return (
    <div className="page-shell stack">
      <div>
        <h1 className="page-title">Points of Interest</h1>
        <p className="page-meta">Nearby essential services for the driver during trip execution.</p>
      </div>
      <POIGrid options={poiTypes} selected={selected} onSelect={setSelected} />
      <Card className="stack">
        <h2 className="heading">{poiTypes.find((item) => item.id === selected)?.label}</h2>
        {mockNearbyPOI[selected].map((item) => (
          <div key={`${item.name}-${item.distance}`} className="list-row">
            <div>
              <strong>{item.name}</strong>
              <div className="muted">{item.address}</div>
            </div>
            <div className="muted">{item.distance}</div>
          </div>
        ))}
      </Card>
    </div>
  );
}
