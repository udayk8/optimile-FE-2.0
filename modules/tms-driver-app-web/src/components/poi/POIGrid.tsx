import {
  BatteryCharging,
  Fuel,
  Hospital,
  Shield,
  UtensilsCrossed,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { POIOption, POIType } from "@/types/poi";

const iconMap: Record<string, LucideIcon> = {
  Fuel,
  BatteryCharging,
  Hospital,
  Shield,
  UtensilsCrossed,
  Wrench,
};

export function POIGrid({
  options,
  selected,
  onSelect,
}: {
  options: POIOption[];
  selected: POIType;
  onSelect: (id: POIType) => void;
}) {
  return (
    <div className="poi-grid">
      {options.map((option) => {
        const Icon = iconMap[option.icon];
        return (
          <button key={option.id} className="poi-grid-button" onClick={() => onSelect(option.id)}>
            <Card className={`poi-card ${selected === option.id ? "poi-card-active" : ""}`}>
              <Icon size={40} />
              <strong>{option.label}</strong>
            </Card>
          </button>
        );
      })}
    </div>
  );
}
