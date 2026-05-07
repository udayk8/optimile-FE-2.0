import { ChecklistItem } from "@/components/ChecklistItem";
import type { Checklist } from "@/types/trip";

export function PreDepartureChecklist({
  checklist,
  onChange,
}: {
  checklist: Checklist;
  onChange: (checklist: Partial<Checklist>) => void;
}) {
  const ready =
    checklist.vehicleConfirmed &&
    checklist.loadingComplete &&
    checklist.odometerStart.trim().length > 0;

  return (
    <div className="stack">
      <ChecklistItem label="Vehicle confirmation" required value={checklist.vehicleConfirmed} onChange={(value) => onChange({ vehicleConfirmed: Boolean(value) })} />
      <ChecklistItem label="Loading complete" required value={checklist.loadingComplete} onChange={(value) => onChange({ loadingComplete: Boolean(value) })} />
      <ChecklistItem label="Odometer start reading" required type="text" value={checklist.odometerStart} onChange={(value) => onChange({ odometerStart: String(value) })} />
      <ChecklistItem label="Loading photos" type="text" value={checklist.loadingPhotos.join(", ")} onChange={(value) => onChange({ loadingPhotos: String(value).trim() ? [String(value)] : [] })} />
      <ChecklistItem label="Cargo condition remark" type="textarea" value={checklist.cargoConditionRemark} onChange={(value) => onChange({ cargoConditionRemark: String(value) })} />
      <ChecklistItem label="Seal number" type="text" value={checklist.sealNumber} onChange={(value) => onChange({ sealNumber: String(value) })} />
      <div className={`chip ${ready ? "chip-success" : "chip-warning"}`}>
        {ready ? "Ready to start transit" : "Complete required checks to continue"}
      </div>
    </div>
  );
}
