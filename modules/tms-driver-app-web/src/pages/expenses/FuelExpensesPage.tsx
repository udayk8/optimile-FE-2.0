import { useMemo, useState } from "react";
import { ExpenseForm } from "@/components/ExpenseForm";
import { FuelForm } from "@/components/FuelForm";
import { Tabs } from "@/components/ui/Tabs";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useAppStore } from "@/store/useAppStore";

type TabKey = "fuel" | "expenses" | "advance" | "settlement" | "rejected";

const tabs = [
  { value: "fuel" as const, label: "Fuel Submissions" },
  { value: "expenses" as const, label: "Trip Expenses" },
  { value: "advance" as const, label: "Advance Balance" },
  { value: "settlement" as const, label: "Settlement Summary" },
  { value: "rejected" as const, label: "Rejected Items" },
];

export function FuelExpensesPage() {
  const { driver, trips, fuelSubmissions, expenses, settlements, submitFuel, submitExpense } = useAppStore();
  const [tab, setTab] = useState<TabKey>("fuel");
  const eligibleTrips = useMemo(
    () => trips.filter((trip) => !["CANCELLED", "REASSIGNED"].includes(trip.status)),
    [trips]
  );
  const [selectedTripId, setSelectedTripId] = useState(eligibleTrips[0]?.id ?? "");
  const selectedTrip = eligibleTrips.find((trip) => trip.id === selectedTripId) ?? eligibleTrips[0] ?? null;
  const settlement = settlements[0];
  const rejectedItems = useMemo(() => expenses.filter((item) => item.status === "REJECTED"), [expenses]);

  return (
    <div className="page-shell stack">
      <div>
        <h1 className="page-title">Fuel & Expenses</h1>
        <p className="page-meta">Frontend-only submissions with policy validation and settlement visibility.</p>
      </div>
      <Tabs value={tab} options={tabs} onChange={setTab} />
      {selectedTrip ? (
        <Card className="stack">
          <div className="grid-2">
            <label>
              <span className="field-label">Selected trip</span>
              <select className="select" value={selectedTripId} onChange={(event) => setSelectedTripId(event.target.value)}>
                {eligibleTrips.map((trip) => (
                  <option key={trip.id} value={trip.id}>
                    {trip.id} · {trip.consignorName} · {trip.deliveries.length} deliveries
                  </option>
                ))}
              </select>
            </label>
            <div>
              <span className="field-label">Status</span>
              <StatusBadge status={selectedTrip.status} />
            </div>
          </div>
        </Card>
      ) : (
        <EmptyState title="No eligible trip" description="Fuel and expense submissions require a non-cancelled trip." />
      )}

      {tab === "fuel" && selectedTrip ? (
        <div className="grid-2">
          <Card className="stack">
            <h2 className="heading">Fuel Submission Form</h2>
            <FuelForm trip={selectedTrip} driver={driver} previousOdometer={44800} onSubmit={submitFuel} />
          </Card>
          <Card className="stack">
            <h2 className="heading">Fuel Submissions</h2>
            {fuelSubmissions.map((item) => (
              <div key={item.id} className="list-row">
                <div>
                  <strong>{item.pumpName}</strong>
                  <div className="muted">
                    {item.litres} L · INR {item.totalAmount}
                  </div>
                  <div className="muted">{item.tripId}</div>
                </div>
                <StatusBadge status={item.status} />
              </div>
            ))}
          </Card>
        </div>
      ) : null}

      {tab === "expenses" && selectedTrip ? (
        <div className="grid-2">
          <Card className="stack">
            <h2 className="heading">Expense Submission Form</h2>
            <ExpenseForm trip={selectedTrip} onSubmit={submitExpense} />
          </Card>
          <Card className="stack">
            <h2 className="heading">Expense List</h2>
            {expenses.map((item) => (
              <div key={item.id} className="list-row">
                <div>
                  <strong>{item.category}</strong>
                  <div className="muted">
                    INR {item.amount} · {item.description}
                  </div>
                  {item.rejectionReason ? <div className="form-error">{item.rejectionReason}</div> : null}
                </div>
                <StatusBadge status={item.status} />
              </div>
            ))}
          </Card>
        </div>
      ) : null}

      {tab === "advance" ? (
        <Card className="stack">
          <h2 className="heading">Advance Balance</h2>
          <div className="trip-summary-grid">
            <div>
              <div className="meta-label">Advance amount</div>
              <div>INR {settlement.advanceAmount}</div>
            </div>
            <div>
              <div className="meta-label">Pending expense total</div>
              <div>INR {settlement.pendingExpenseTotal}</div>
            </div>
            <div>
              <div className="meta-label">Settlement trip</div>
              <div>{settlement.tripId}</div>
            </div>
          </div>
        </Card>
      ) : null}

      {tab === "settlement" ? (
        <Card className="stack">
          <h2 className="heading">Settlement Summary</h2>
          <div className="trip-summary-grid">
            <div><div className="meta-label">Advance amount</div><div>INR {settlement.advanceAmount}</div></div>
            <div><div className="meta-label">Approved expense total</div><div>INR {settlement.approvedExpenseTotal}</div></div>
            <div><div className="meta-label">Pending expense total</div><div>INR {settlement.pendingExpenseTotal}</div></div>
            <div><div className="meta-label">Rejected expense total</div><div>INR {settlement.rejectedExpenseTotal}</div></div>
            <div><div className="meta-label">Net settlement amount</div><div>INR {settlement.netSettlementAmount}</div></div>
            <div><div className="meta-label">Status</div><StatusBadge status={settlement.status} /></div>
          </div>
        </Card>
      ) : null}

      {tab === "rejected" ? (
        <Card className="stack">
          <h2 className="heading">Rejected Items</h2>
          {rejectedItems.length ? (
            rejectedItems.map((item) => (
              <div key={item.id} className="list-row">
                <div>
                  <strong>{item.category}</strong>
                  <div className="muted">INR {item.amount}</div>
                  <div className="form-error">{item.rejectionReason}</div>
                </div>
                <StatusBadge status={item.status} />
              </div>
            ))
          ) : (
            <p className="subheading">No rejected items.</p>
          )}
        </Card>
      ) : null}
    </div>
  );
}
