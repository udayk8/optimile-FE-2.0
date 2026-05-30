import React, { useState } from "react";
import {
  FileWarning, ArrowLeft, Download,
  Phone, Mail, User, Truck, Building2, Bell, AlertTriangle, ChevronRight,
} from "lucide-react";
import { Card, Pill, Money, SectionTitle } from "@finance/components/primitives";
import { TRIPS, PENDING_POD_DETAILS } from "@finance/data/mock";
import { Trace } from "@finance/modules/finance/enterprise/payables/pages/VendorMatch";
import { exportCsv } from "@finance/lib/csv";

const POD_REPORT_COLUMNS = [
  { key: "id", label: "Trip" },
  { key: "client", label: "Client" },
  { key: "lane", label: "Lane" },
  { key: "truck", label: "Truck" },
  { key: "daysPending", label: "Days Pending" },
  { key: "revenue", label: "Revenue at Risk" },
  { key: "vendor", label: "Vendor" },
  { key: "responsible", label: "Vehicle / Driver", value: (t: any) => t.vehicle || t.driver || "" },
];

const CONTACT_ICON = { vendorDispatcher: Building2, driver: Truck, owner: User, consignee: Building2 };
const CONTACT_LABEL = { vendorDispatcher: "Vendor dispatcher", driver: "Driver", owner: "Internal owner", consignee: "Consignee" };

function ContactCard({ kind, c, toast }: any) {
  const Icon = CONTACT_ICON[kind as keyof typeof CONTACT_ICON] || User;
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        <Icon size={13} className="text-slate-400" />{CONTACT_LABEL[kind as keyof typeof CONTACT_LABEL]}
      </div>
      <div className="mt-1.5 font-semibold text-slate-800">{c.name}</div>
      <div className="text-xs text-slate-400">{c.role}</div>
      <div className="mt-2 space-y-0.5 text-xs text-slate-500">
        {c.phone && <div className="font-mono">{c.phone}</div>}
        {c.email && <div>{c.email}</div>}
      </div>
      <div className="mt-3 flex gap-2">
        {c.phone && <button onClick={() => toast(`Calling ${c.name} (${c.phone})`)} className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"><Phone size={12} />Call</button>}
        {c.email && <button onClick={() => toast(`Email drafted to ${c.email}`)} className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"><Mail size={12} />Email</button>}
      </div>
    </Card>
  );
}

function PodFollowUp({ trip, onBack, toast }: any) {
  const d = (PENDING_POD_DETAILS as Record<string, any>)[trip.id];
  const contacts = d?.contacts || {};
  return (
    <div>
      <button onClick={onBack} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft size={15} />Back to pending PODs
      </button>

      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>{trip.id}</h1>
            <Pill tone={trip.daysPending >= 3 ? "red" : "amber"}>{trip.daysPending}d pending</Pill>
          </div>
          <p className="mt-1 text-sm text-slate-500">{trip.client} · {trip.lane} · {trip.truck} · revenue at risk <Money value={trip.revenue} className="font-semibold text-red-600" /></p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-4 font-semibold text-slate-800">Shipment trace</div>
          {d ? <Trace steps={d.trace} /> : <div className="text-sm text-slate-400">No trace available.</div>}
        </Card>

        <div>
          <div className="mb-3 font-semibold text-slate-800">Whom to contact</div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {["vendorDispatcher", "driver", "owner", "consignee"].filter((k) => contacts[k]).map((k) => (
              <ContactCard key={k} kind={k} c={contacts[k]} toast={toast} />
            ))}
          </div>
        </div>
      </div>

      <Card className="mt-6 p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <span className="font-semibold text-slate-800">Follow-up</span>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => toast(`POD reminder sent for ${trip.id}`)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"><Bell size={12} />Send POD reminder</button>
            <button onClick={() => toast(`${trip.id} escalated to ops`)} className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100"><AlertTriangle size={12} />Escalate to ops</button>
            {contacts.driver?.phone && <button onClick={() => toast(`Calling ${contacts.driver.name}`)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"><Phone size={12} />Call driver</button>}
          </div>
        </div>
        <div className="space-y-2">
          {(d?.followUps || []).map((f: any, i: number) => (
            <div key={i} className="flex gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
              <span className="font-mono text-xs text-slate-400">{f.ts}</span>
              <span className="text-slate-600">{f.note}</span>
            </div>
          ))}
          {(!d?.followUps || d.followUps.length === 0) && <div className="text-sm text-slate-400">No follow-ups logged yet.</div>}
        </div>
      </Card>
    </div>
  );
}

export default function PendingPOD({ toast }: any) {
  const [trips] = useState(TRIPS);
  const [open, setOpen] = useState<any>(null);
  const totalRisk = trips.reduce((s, t) => s + t.revenue, 0);

  const downloadReport = () => {
    exportCsv("pending-pod-report.csv", POD_REPORT_COLUMNS, trips);
    toast(`Downloaded pending-pod-report.csv (${trips.length} trips)`);
  };

  const openTrip = open ? trips.find((t) => t.id === open) : null;
  if (openTrip) {
    return <PodFollowUp trip={openTrip} onBack={() => setOpen(null)} toast={toast} />;
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <SectionTitle sub="Every trip without a POD is revenue you can't bill yet. Click a trip to trace it and follow up.">Pending POD Tracker</SectionTitle>
        <button onClick={downloadReport} disabled={trips.length === 0}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50">
          <Download size={15} />Download report
        </button>
      </div>

      <Card className="mb-6 overflow-hidden p-5 ring-1 ring-red-200">
        <div className="flex items-center gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-lg bg-red-50 text-red-600"><FileWarning size={24} /></div>
          <div>
            <div className="text-3xl font-bold text-red-600"><Money value={totalRisk} /></div>
            <div className="text-sm text-slate-500">Total revenue at risk across {trips.length} trips</div>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-left text-xs uppercase tracking-wide text-slate-500">
              {["Trip", "Lane", "Days Pending", "Revenue", "Responsible"].map((h) => <th key={h} className="px-5 py-3 font-semibold">{h}</th>)}
              <th className="px-5 py-3 text-right font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {trips.map((t) => (
              <tr key={t.id} onClick={() => setOpen(t.id)} className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                <td className="px-5 py-3.5 font-mono text-xs font-medium text-slate-700">{t.id}<div className="text-slate-400">{t.client}</div></td>
                <td className="px-5 py-3.5 text-slate-600">{t.lane}<div className="text-xs text-slate-400">{t.truck}</div></td>
                <td className="px-5 py-3.5"><Pill tone={t.daysPending >= 3 ? "red" : "amber"}>{t.daysPending}d</Pill></td>
                <td className="px-5 py-3.5"><Money value={t.revenue} className="font-semibold text-slate-800" /></td>
                <td className="px-5 py-3.5 text-slate-600">{t.vendor}<div className="text-xs text-slate-400">{t.vehicle || t.driver}</div></td>
                <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => setOpen(t.id)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                    Trace &amp; follow up<ChevronRight size={12} />
                  </button>
                </td>
              </tr>
            ))}
            {trips.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-400">🎉 All PODs received. Nothing blocking revenue.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
