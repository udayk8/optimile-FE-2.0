import { ComplianceAlert } from "@/components/ComplianceAlert";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useAppStore } from "@/store/useAppStore";

export function ProfileSupportPage() {
  const { driver, onDuty, toggleOnDuty } = useAppStore();

  return (
    <div className="page-shell stack">
      <div>
        <h1 className="page-title">Profile & Support</h1>
        <p className="page-meta">Driver profile, compliance, score, vehicle, and support details.</p>
      </div>

      <div className="grid-2">
        <Card className="stack">
          <h2 className="heading">Driver Profile</h2>
          <div className="trip-summary-grid">
            <div><div className="meta-label">Driver name</div><div>{driver.name}</div></div>
            <div><div className="meta-label">Mobile number</div><div>{driver.mobile}</div></div>
            <div><div className="meta-label">Driver type</div><div>{driver.driverType}</div></div>
            <div><div className="meta-label">License number</div><div>{driver.licenseNumber}</div></div>
            <div><div className="meta-label">License expiry</div><div>{driver.licenseExpiryDate}</div></div>
            <div><div className="meta-label">Assigned depot</div><div>{driver.depot}</div></div>
            <div><div className="meta-label">Operating zone</div><div>{driver.operatingZone}</div></div>
            <div><div className="meta-label">Assigned vehicle</div><div>{driver.assignedVehicle.registrationNo}</div></div>
            <div><div className="meta-label">Operational state</div><div>{onDuty ? "ON_DUTY" : "OFF_DUTY"}</div></div>
          </div>
        </Card>

        <Card className="stack">
          <h2 className="heading">Behavior Score</h2>
          <div className="space-between">
            <div className="score-display">{driver.score}</div>
            <StatusBadge status={driver.scoreBand} />
          </div>
          <div className="score-trend">
            {driver.scoreTrend.map((value, index) => (
              <div key={`${value}-${index}`} className="score-bar">
                <div className="score-bar-fill" style={{ height: `${value}%` }} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="stack">
        <h2 className="heading">Document Expiry Alerts</h2>
        <div className="stack">
          {driver.complianceDocs.map((doc) => (
            <ComplianceAlert key={doc.label} doc={doc} />
          ))}
        </div>
      </Card>

      <Card className="stack">
        <h2 className="heading">Support & Session Info</h2>
        <div className="trip-summary-grid">
          <div><div className="meta-label">Support contact</div><div>{driver.supportContact}</div></div>
          <div><div className="meta-label">Compliance status</div><StatusBadge status={driver.complianceStatus} /></div>
          <div><div className="meta-label">Identity state</div><StatusBadge status={driver.identityState} /></div>
          <div><div className="meta-label">Device/session</div><div>Mock web browser session</div></div>
        </div>
        <Button variant="ghost" onClick={toggleOnDuty}>
          {onDuty ? "Mark Off Duty" : "Mark On Duty"}
        </Button>
      </Card>
    </div>
  );
}
