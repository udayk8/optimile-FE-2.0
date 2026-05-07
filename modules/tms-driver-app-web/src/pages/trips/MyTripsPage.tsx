import { useMemo, useState } from "react";
import { TripCard } from "@/components/trip/TripCard";
import { Tabs } from "@/components/ui/Tabs";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAppStore } from "@/store/useAppStore";
import type { TripStatus } from "@/types/trip";

type FilterKey = "active" | "upcoming" | "completed" | "cancelled" | "exception";

const tabs: { value: FilterKey; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "upcoming", label: "Upcoming" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled / Reassigned" },
  { value: "exception", label: "Exception Trips" },
];

const activeStatuses: TripStatus[] = ["DISPATCHED", "READY_FOR_TRANSIT", "IN_TRANSIT", "ARRIVED", "DELIVERED"];

const matches = (filter: FilterKey, status: TripStatus) => {
  if (filter === "active") return activeStatuses.includes(status);
  if (filter === "upcoming") return status === "ASSIGNED";
  if (filter === "completed") return status === "COMPLETED";
  if (filter === "cancelled") return status === "CANCELLED" || status === "REASSIGNED";
  return status === "EXCEPTION";
};

export function MyTripsPage() {
  const { trips } = useAppStore();
  const [filter, setFilter] = useState<FilterKey>("active");
  const filteredTrips = useMemo(() => trips.filter((trip) => matches(filter, trip.status)), [filter, trips]);

  return (
    <div className="page-shell stack">
      <div>
        <h1 className="page-title">My Trips</h1>
        <p className="page-meta">Assigned, active, completed, and exception trips with delivery-level execution.</p>
      </div>
      <Tabs value={filter} options={tabs} onChange={setFilter} />
      {filteredTrips.length ? (
        <div className="stack">
          {filteredTrips.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </div>
      ) : (
        <EmptyState title="No trips found" description="No mock trips match this status bucket." />
      )}
    </div>
  );
}
