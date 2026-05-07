import type { Trip } from "@/types/trip";

export function RouteMap({ trip }: { trip: Trip }) {
  const viewBox = "0 0 640 280";
  const points = trip.routePoints
    .map((point, index) => `${90 + index * 150},${190 - (index % 2 === 0 ? 0 : 70)}`)
    .join(" ");

  return (
    <div className="map-card">
      <svg viewBox={viewBox} className="map-svg" role="img" aria-label="Mock route map">
        <defs>
          <linearGradient id="map-bg" x1="0" x2="1">
            <stop offset="0%" stopColor="#edf5f7" />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="640" height="280" rx="26" fill="url(#map-bg)" />
        <path d="M40 220 C130 120, 240 260, 330 160 S470 90, 600 100" fill="none" stroke="#c6d8dc" strokeWidth="6" />
        <polyline points={points} fill="none" stroke="#1b6b7b" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        {trip.routePoints.map((point, index) => {
          const x = 90 + index * 150;
          const y = 190 - (index % 2 === 0 ? 0 : 70);
          const fill = point.tone === "driver" ? "#1b6b7b" : point.tone === "pickup" ? "#4f88c6" : "#2e7d32";

          return (
            <g key={point.label}>
              <circle cx={x} cy={y} r="12" fill={fill} />
              <text x={x} y={y + 4} textAnchor="middle" fontSize="11" fill="#ffffff">
                {index + 1}
              </text>
              <text x={x + 18} y={y + 5} fontSize="13" fill="#162126">
                {point.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
