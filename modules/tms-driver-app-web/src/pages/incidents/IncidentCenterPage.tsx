import { IncidentForm } from "@/components/IncidentForm";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useAppStore } from "@/store/useAppStore";

export function IncidentCenterPage() {
  const { driver, trips, incidents, raiseIncident } = useAppStore();

  return (
    <div className="page-shell stack">
      <div>
        <h1 className="page-title">Incident Center</h1>
        <p className="page-meta">Raise trip issues and view linked operational exceptions.</p>
      </div>
      <div className="grid-2">
        <Card className="stack">
          <h2 className="heading">Incident Form</h2>
          <IncidentForm trips={trips} driver={driver} onSubmit={raiseIncident} />
        </Card>
        <Card className="stack">
          <h2 className="heading">Incident History</h2>
          <p className="subheading">High and critical incidents move the trip into EXCEPTION and block normal progression.</p>
          {incidents.map((incident) => (
            <div key={incident.id} className={`list-row ${incident.severity === "CRITICAL" ? "list-row-critical" : ""}`}>
              <div>
                <strong>{incident.type}</strong>
                <div className="muted">
                  {incident.tripId} · {incident.description}
                </div>
              </div>
              <div className="stack" style={{ gap: 8, justifyItems: "end" }}>
                <StatusBadge status={incident.severity} />
                <StatusBadge status={incident.status} />
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
