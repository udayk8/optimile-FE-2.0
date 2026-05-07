import type { TripMilestone } from "@/types/trip";

export function TripTimeline({ events }: { events: TripMilestone[] }) {
  return (
    <div className="timeline">
      {events.map((event, index) => (
        <div key={`${event.status}-${index}`} className="timeline-item">
          <div className="timeline-dot" />
          <div>
            <div className="timeline-label">{event.status.replace(/_/g, " ")}</div>
            <div className="muted">{new Date(event.timestamp).toLocaleString()}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
