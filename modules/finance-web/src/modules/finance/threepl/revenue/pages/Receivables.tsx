import { useState } from "react";
import { useReceivables } from "@finance/lib/receivablesStore";
import { ReceivablesToggle, type ReceivablesView } from "@finance/modules/finance/threepl/revenue/pages/ReceivablesToggle";
import PendingPOD from "@finance/modules/finance/threepl/revenue/pages/PendingPOD";
import Invoicing from "@finance/modules/finance/threepl/revenue/pages/Invoicing";

/* Combined Receivables desk (3PL / aggregator) — Pending POD and Generate Invoice
   on one screen behind a toggle. Both halves read the same receivables store, so
   uploading a POD on the pending side shifts a unit to the ready side live. The
   toggle is rendered here and passed down; each sub-view places it only in its
   list view, so it auto-hides when drilling into a trip / customer / invoice. */
export default function Receivables({ toast }: { toast: (m: string) => void }) {
  const { trips } = useReceivables();
  const [view, setView] = useState<ReceivablesView>("pending");

  const pendingCount = trips.filter((t) => t.podStage === "pending" || t.podStage === "rejected").length;
  const readyCount = trips.filter((t) => t.podStage === "uploaded" || t.podStage === "validated").length;

  const toggle = (
    <ReceivablesToggle view={view} onChange={setView} pendingCount={pendingCount} readyCount={readyCount} />
  );

  return view === "pending"
    ? <PendingPOD toast={toast} toggle={toggle} />
    : <Invoicing toast={toast} toggle={toggle} />;
}
