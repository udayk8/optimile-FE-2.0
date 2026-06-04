import { useState } from "react";
import { useReceivables } from "@finance/lib/receivablesStore";
import { ReceivablesToggle, type ReceivablesView } from "@finance/modules/finance/threepl/revenue/pages/ReceivablesToggle";
import PendingPOD from "@finance/modules/finance/own-fleet/revenue/pages/PendingPOD";
import Invoicing from "@finance/modules/finance/threepl/revenue/pages/Invoicing";

/* Combined Receivables desk (own-fleet) — same as the 3PL wrapper but with the
   own-fleet Pending POD page; the Ready-to-invoice side reuses the shared
   Invoicing page (as fleet already did for Generate Invoice). */
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
