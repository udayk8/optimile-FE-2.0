import { FileWarning, ReceiptIndianRupee } from "lucide-react";

export type ReceivablesView = "pending" | "ready";

/* Segmented control that switches the combined Receivables screen between the
   pending-POD side and the ready-to-invoice side. Lives in the list view of each
   sub-page (not the drill/detail views) so it auto-hides while drilling in.
   Counts come from the shared receivables store via the wrapper, so uploading a
   POD on the pending side visibly shifts a unit from one badge to the other. */
export function ReceivablesToggle({
  view,
  onChange,
  pendingCount,
  readyCount,
}: {
  view: ReceivablesView;
  onChange: (v: ReceivablesView) => void;
  pendingCount: number;
  readyCount: number;
}) {
  const segments: { key: ReceivablesView; label: string; count: number; icon: typeof FileWarning }[] = [
    { key: "pending", label: "Pending POD", count: pendingCount, icon: FileWarning },
    { key: "ready", label: "Ready to invoice", count: readyCount, icon: ReceiptIndianRupee },
  ];
  return (
    <div className="mb-5 inline-flex rounded-lg bg-slate-100 p-1 text-sm">
      {segments.map(({ key, label, count, icon: Icon }) => {
        const active = view === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={`flex items-center gap-2 rounded-md px-4 py-1.5 font-medium transition ${
              active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Icon size={15} className={active ? "text-slate-700" : "text-slate-400"} />
            {label}
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                active ? "bg-slate-100 text-slate-600" : "bg-slate-200/70 text-slate-500"
              }`}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
