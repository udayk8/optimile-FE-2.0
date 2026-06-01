/* ============================================================
   MOCK DATA — believable Indian logistics finance data
   Demo only. No backend. No persistence.
   ============================================================ */

/* ---------- Clients & credit ---------- */
export const CLIENTS = [
  { id: "C1", name: "Britannia Industries", limit: 5000000, used: 5100000, status: "blocked", blockReason: "Payments overdue 45+ days. Aligned with KAM 18-May.", blockedBy: "Priya Nair" },
  { id: "C2", name: "Asian Paints Ltd", limit: 3000000, used: 2480000, status: "warning" },
  { id: "C3", name: "Marico Limited", limit: 4000000, used: 1180000, status: "healthy" },
  { id: "C4", name: "Dabur India", limit: 2500000, used: 900000, status: "healthy" },
];

/* ---------- Trips pending POD ---------- */
export const TRIPS = [
  { id: "TR-4471", client: "Britannia Industries", lane: "Mumbai → Delhi", truck: "32ft MXL", delivered: "2026-05-18", podStatus: "pending", daysPending: 3, revenue: 145000, vendor: "Sharma Transport", driver: "R. Yadav" },
  { id: "TR-4468", client: "Asian Paints Ltd", lane: "Chennai → Bengaluru", truck: "20ft", delivered: "2026-05-19", podStatus: "pending", daysPending: 2, revenue: 38000, vendor: "(market hire)", vehicle: "TN-09-CD-4521", driver: "S. Kumar" },
  { id: "TR-4465", client: "Marico Limited", lane: "Pune → Hyderabad", truck: "32ft SXL", delivered: "2026-05-20", podStatus: "pending", daysPending: 1, revenue: 92000, vendor: "Royal Carriers", driver: "M. Singh" },
  { id: "TR-4460", client: "Dabur India", lane: "Delhi → Jaipur", truck: "14ft", delivered: "2026-05-17", podStatus: "pending", daysPending: 4, revenue: 24500, vendor: "(market hire)", vehicle: "RJ-14-GH-8890", driver: "A. Khan" },
  { id: "TR-4455", client: "Asian Paints Ltd", lane: "Mumbai → Nagpur", truck: "32ft MXL", delivered: "2026-05-19", podStatus: "pending", daysPending: 2, revenue: 67000, vendor: "Sharma Transport", driver: "P. Patil" },
];

/* ---------- Daily POD → invoice funnel (BRD 3.2) ---------- */
export const POD_FUNNEL = { tripsCompleted: 18, podsReceived: 13, invoicesGenerated: 11 };

/* ---------- Invoices (AR) ---------- */
export const INVOICES = [
  { id: "INV-2026-0142", client: "Britannia Industries", trip: "TR-4401", lane: "Mumbai → Delhi", date: "2026-04-12", due: "2026-05-12", amount: 145000, terms: "Net 30", status: "overdue", daysOverdue: 9 },
  { id: "INV-2026-0151", client: "Britannia Industries", trip: "TR-4419", lane: "Surat → Delhi", date: "2026-04-20", due: "2026-05-20", amount: 132000, terms: "Net 30", status: "overdue", daysOverdue: 1 },
  { id: "INV-2026-0158", client: "Asian Paints Ltd", trip: "TR-4430", lane: "Chennai → Bengaluru", date: "2026-04-28", due: "2026-05-28", amount: 38000, terms: "Net 30", status: "due-soon", daysUntil: 7 },
  { id: "INV-2026-0163", client: "Marico Limited", trip: "TR-4441", lane: "Pune → Hyderabad", date: "2026-05-02", due: "2026-06-01", amount: 92000, terms: "Net 30", status: "current", daysUntil: 11 },
  { id: "INV-2026-0166", client: "Dabur India", trip: "TR-4448", lane: "Delhi → Jaipur", date: "2026-05-05", due: "2026-05-25", amount: 24500, terms: "Net 20", status: "due-soon", daysUntil: 4 },
  { id: "INV-2026-0170", client: "Asian Paints Ltd", trip: "TR-4452", lane: "Mumbai → Nagpur", date: "2026-04-15", due: "2026-05-05", amount: 67000, terms: "Net 20", status: "overdue", daysOverdue: 16 },
];

/* ---------- Invoice numbering / series (BRD 4.2) ---------- */
export const INVOICE_SERIES = [
  { series: "INV-2026-", label: "Standard invoices", next: 172, fy: "2026-27" },
  { series: "CN-2026-", label: "Credit notes", next: 15, fy: "2026-27" },
  { series: "DN-2026-", label: "Debit notes", next: 10, fy: "2026-27" },
];

/* ---------- Vendor bills (AP 3-way match) ---------- */
export const VENDOR_BILLS = [
  { id: "VB-8801", vendor: "Sharma Transport", trip: "TR-4401", lane: "Mumbai → Delhi", contractRate: 118000, billed: 118000, pod: true, status: "matched", terms: "Net 30", due: "2026-05-24" },
  { id: "VB-8809", vendor: "Royal Carriers", trip: "TR-4441", lane: "Pune → Hyderabad", contractRate: 74000, billed: 84900, pod: true, status: "variance", variance: 14.7, terms: "Net 30", due: "2026-05-26" },
  { id: "VB-8814", vendor: "Sharma Transport", trip: "TR-4452", lane: "Mumbai → Nagpur", contractRate: 52000, billed: 52000, pod: false, status: "no-pod", terms: "Net 20", due: "2026-05-28" },
  { id: "VB-8820", vendor: "Royal Carriers", trip: "TR-4419", lane: "Surat → Delhi", contractRate: 108000, billed: 109500, pod: true, status: "matched", terms: "Net 30", due: "2026-05-24" },
];

/* ---------- AR aging ---------- */
export const AGING = [
  { bucket: "Current", amount: 116500, color: "#10b981" },
  { bucket: "Due 1-7d", amount: 62500, color: "#f59e0b" },
  { bucket: "OD 1-7d", amount: 132000, color: "#fb923c" },
  { bucket: "OD 8-15d", amount: 0, color: "#f87171" },
  { bucket: "OD 16-30d", amount: 67000, color: "#ef4444" },
  { bucket: "OD 31-60d", amount: 145000, color: "#dc2626" },
  { bucket: "OD 60d+", amount: 0, color: "#991b1b" },
];

/* ---------- Cash flow (30 / 60 / 90) ---------- */
export const CASHFLOW = Array.from({ length: 90 }, (_, i) => {
  const base = 850000 - i * 12000 + Math.sin(i / 3) * 120000;
  const dip = i > 18 && i < 40 ? -180000 : 0;
  return { day: i + 1, balance: Math.round(base + dip) };
});

/* ---------- Margins (aggregator) ---------- */
export const MARGINS = [
  { trip: "TR-4401", lane: "Mumbai → Delhi", charged: 145000, paid: 118000 },
  { trip: "TR-4441", lane: "Pune → Hyderabad", charged: 92000, paid: 74000 },
  { trip: "TR-4419", lane: "Surat → Delhi", charged: 132000, paid: 108000 },
  { trip: "TR-4452", lane: "Mumbai → Nagpur", charged: 67000, paid: 52000 },
  { trip: "TR-4430", lane: "Chennai → Bengaluru", charged: 38000, paid: 31500 },
];

/* ---------- Own fleet vehicles ---------- */
export const VEHICLES = [
  { id: "MH-12-AB-1234", type: "32ft MXL", revenue: 412000, fuel: 152000, driver: 25000, maint: 18000, emi: 50000, toll: 28000 },
  { id: "MH-14-XY-7788", type: "32ft SXL", revenue: 388000, fuel: 148000, driver: 25000, maint: 92000, emi: 48000, toll: 26000 },
  { id: "GJ-01-PQ-5566", type: "20ft", revenue: 245000, fuel: 88000, driver: 22000, maint: 14000, emi: 38000, toll: 17000 },
];

/* ---------- Daily fuel log ---------- */
export const FUEL = [
  { vehicle: "MH-12-AB-1234", date: "2026-05-20", loc: "Vadodara HP", litres: 220, rate: 94.2, odo: 142300, kmpl: 4.1, anomaly: false },
  { vehicle: "MH-14-XY-7788", date: "2026-05-20", loc: "Nashik IOC", litres: 240, rate: 93.8, odo: 98750, kmpl: 2.9, anomaly: true },
  { vehicle: "GJ-01-PQ-5566", date: "2026-05-19", loc: "Surat BPCL", litres: 140, rate: 94.0, odo: 67200, kmpl: 5.2, anomaly: false },
];

/* ---------- Invoice disputes (BRD 4.3) ---------- */
export const DISPUTES = [
  { id: "INV-2026-0142", client: "Britannia Industries", amount: 145000, reason: "Rate mismatch — billed ₹1,45,000 vs agreed ₹1,38,000", stage: "vendor-response", raised: "2026-05-19", slaHrs: 12, owner: "Priya Nair" },
  { id: "INV-2026-0170", client: "Asian Paints Ltd", amount: 67000, reason: "Detention charge not authorised by consignee", stage: "raised", raised: "2026-05-20", slaHrs: 40, owner: "Priya Nair" },
  { id: "INV-2026-0158", client: "Asian Paints Ltd", amount: 38000, reason: "Wrong trip details — TR reference incorrect", stage: "escalated", raised: "2026-05-18", slaHrs: -6, owner: "Finance Head" },
  { id: "INV-2026-0131", client: "Marico Limited", amount: 54000, reason: "Duplicate invoice — already settled in April", stage: "resolved", raised: "2026-05-10", slaHrs: 0, owner: "Priya Nair", resolution: "Credit note CN-2026-014 issued" },
  { id: "VB-8790", client: "Royal Carriers", amount: 96000, reason: "Billed above contract — accessorial added without authorisation", stage: "vendor-response", raised: "2026-05-21", slaHrs: 30, owner: "Royal Carriers", kind: "subvendor", notifiedAt: "2026-05-21", respondedAt: "2026-05-22", vendorResponseType: "reject", vendorResponse: "Accessorial reflects a documented multi-pickup; LR annexure attached. Requesting approval at the billed amount.", vendorDocs: ["Multi-pickup-LR-annexure.pdf"] },
  { id: "VB-8782", client: "Sharma Transport", amount: 61000, reason: "Detention charge not authorised by consignee", stage: "escalated", raised: "2026-05-17", slaHrs: -8, owner: "Finance Head", kind: "subvendor", notifiedAt: "2026-05-17", respondedAt: "2026-05-18", vendorResponseType: "reject", vendorResponse: "Detention was authorised verbally on site; awaiting written confirmation.", vendorDocs: ["Site-detention-log.pdf"] },
];

/* Canned vendor replies for disputes raised from Vendor Match (mock — finance-side only).
   Vendor either accepts (issues corrected invoice / credit note) or rejects with a
   counter-argument + supporting documents — BRD step 14. */
export type VendorDisputeReply = { type: "accept" | "reject"; message: string; docs: string[] };
export const VENDOR_DISPUTE_RESPONSES: Record<string, VendorDisputeReply> = {
  "Royal Carriers": { type: "reject", message: "Rate revised per fuel-surcharge clause 4.2 of the contract — the billed amount is correct. Requesting approval at the invoiced value.", docs: ["Signed-rate-annexure.pdf", "Fuel-surcharge-clause-4.2.pdf"] },
  "Sharma Transport": { type: "accept", message: "Agreed — rate keyed in error. We will issue a corrected invoice / credit note for the difference.", docs: ["Corrected-invoice-draft.pdf"] },
};
export const DEFAULT_VENDOR_DISPUTE_RESPONSE: VendorDisputeReply =
  { type: "reject", message: "We stand by the billed amount; supporting documents attached for your review.", docs: ["POD.pdf", "E-way-bill.pdf"] };

/* ---------- Credit & debit notes (BRD 6) ---------- */
export const DEBIT_NOTES = [
  { id: "DN-2026-009", vendor: "Royal Carriers", trip: "TR-4441", amount: 12000, reason: "Late delivery penalty — TAT breached by 11h", stage: "issued", raisedBy: "Ops — A. Mehta", approvedBy: "VP Ops" },
  { id: "DN-2026-010", vendor: "Sharma Transport", trip: "TR-4452", amount: 8500, reason: "Cargo shortage — 4 cartons short on delivery", stage: "pending-approval", raisedBy: "Ops — R. Das", approvedBy: null },
  { id: "DN-2026-011", vendor: "(market hire)", trip: "TR-4460", amount: 15000, reason: "Non-placement penalty — spot rate differential", stage: "pending-approval", raisedBy: "Ops — A. Mehta", approvedBy: null },
];
export const CREDIT_NOTES = [
  { id: "CN-2026-014", client: "Marico Limited", trip: "TR-4441", amount: 8000, reason: "Dispute resolved in client favour — rate correction", stage: "issued", raisedBy: "Finance — Priya Nair", approvedBy: "Finance Head" },
  { id: "CN-2026-015", client: "Britannia Industries", trip: "TR-4419", amount: 6000, reason: "Accessorial billed in error", stage: "pending-approval", raisedBy: "Finance — Priya Nair", approvedBy: null },
];

/* ---------- Sub-vendor / vehicle-number accounting (BRD 5.2) ---------- */
export const SUBVENDOR_ROWS = [
  { mode: "invoice", ref: "VB-8809", party: "Royal Carriers", trip: "TR-4441", lane: "Pune → Hyderabad", agreed: 74000, payable: 84900, status: "variance" },
  { mode: "invoice", ref: "VB-8801", party: "Sharma Transport", trip: "TR-4401", lane: "Mumbai → Delhi", agreed: 118000, payable: 118000, status: "matched" },
  { mode: "vehicle", ref: "TN-09-CD-4521", party: "Market transporter (informal)", trip: "TR-4468", lane: "Chennai → Bengaluru", agreed: 31500, payable: 31500, status: "no-invoice" },
  { mode: "vehicle", ref: "RJ-14-GH-8890", party: "Market transporter (informal)", trip: "TR-4460", lane: "Delhi → Jaipur", agreed: 19000, payable: 19000, status: "no-invoice" },
];

/* ---------- Retention & withholding (BRD 5.3) ---------- */
export const RETENTION = [
  { vendor: "Sharma Transport", earned: 470000, retained: 23500, released: 18000, forfeited: 0, condition: "Release 5% on ≥95% OTD over 90d", otd: 96.2 },
  { vendor: "Royal Carriers", earned: 392000, retained: 19600, released: 0, forfeited: 4200, condition: "Release 5% on ≥95% OTD over 90d", otd: 92.8 },
];

/* ---------- Contract & budget planning (BRD 3.1) ---------- */
export const CONTRACT_BUDGET = {
  client: "Marico Limited",
  lanes: 6,
  monthlyVolume: "₹38L est.",
  breakdown: [
    { head: "Market hire charges", amount: 2200000 },
    { head: "Fuel (own fleet legs)", amount: 850000 },
    { head: "Toll charges", amount: 320000 },
    { head: "Driver expenses & advances", amount: 280000 },
    { head: "Loading / detention / other", amount: 350000 },
  ],
};

/* ---------- Maintenance (BRD 7.3) ---------- */
export const MAINTENANCE = [
  { vehicle: "MH-14-XY-7788", date: "2026-05-12", category: "Bodyshop (accident)", workshop: "Nashik Auto Works", cost: 68000, bill: true },
  { vehicle: "MH-14-XY-7788", date: "2026-04-28", category: "Scheduled service", workshop: "Tata Authorised, Pune", cost: 18000, bill: true },
  { vehicle: "MH-12-AB-1234", date: "2026-05-08", category: "Tyres (set of 2)", workshop: "MRF Fleet, Vadodara", cost: 32000, bill: true },
  { vehicle: "GJ-01-PQ-5566", date: "2026-05-15", category: "Breakdown — clutch", workshop: "Roadside, Surat", cost: 9500, bill: false },
];

/* ---------- Driver advances (BRD 7.4) ---------- */
export const DRIVER_ADVANCES = [
  { driver: "R. Yadav", trip: "TR-4471", vehicle: "MH-12-AB-1234", advance: 18000, submitted: 16400, status: "return-due", delta: 1600 },
  { driver: "M. Singh", trip: "TR-4465", vehicle: "MH-14-XY-7788", advance: 15000, submitted: 17200, status: "shortfall", delta: -2200 },
  { driver: "S. Kumar", trip: "TR-4468", vehicle: "GJ-01-PQ-5566", advance: 9000, submitted: 9000, status: "settled", delta: 0 },
  { driver: "A. Khan", trip: "TR-4460", vehicle: "MH-12-AB-1234", advance: 12000, submitted: null, status: "pending-submission", delta: null },
];

/* ---------- Vehicle lifecycle costs (BRD 7.5) ---------- */
export const LIFECYCLE = [
  { vehicle: "MH-12-AB-1234", insurance: { amount: 62000, expiry: "2026-08-14" }, permit: { expiry: "2026-06-10" }, fitness: { expiry: "2027-01-22" }, emi: { monthly: 50000, remaining: 14 }, depreciation: 95000 },
  { vehicle: "MH-14-XY-7788", insurance: { amount: 58000, expiry: "2026-06-02" }, permit: { expiry: "2026-09-30" }, fitness: { expiry: "2026-06-18" }, emi: { monthly: 48000, remaining: 9 }, depreciation: 88000 },
  { vehicle: "GJ-01-PQ-5566", insurance: { amount: 41000, expiry: "2026-11-05" }, permit: { expiry: "2026-07-12" }, fitness: { expiry: "2026-12-01" }, emi: { monthly: 38000, remaining: 21 }, depreciation: 64000 },
];

/* ---------- Profitability (BRD 8.6) ---------- */
export const PROFIT_CLIENT = [
  { name: "Britannia Industries", revenue: 1420000, cost: 1180000 },
  { name: "Asian Paints Ltd", revenue: 880000, cost: 690000 },
  { name: "Marico Limited", revenue: 640000, cost: 700000 },
  { name: "Dabur India", revenue: 410000, cost: 320000 },
];
export const PROFIT_LANE = [
  { name: "Mumbai → Delhi", revenue: 620000, cost: 480000 },
  { name: "Pune → Hyderabad", revenue: 410000, cost: 360000 },
  { name: "Surat → Delhi", revenue: 380000, cost: 410000 },
  { name: "Chennai → Bengaluru", revenue: 290000, cost: 220000 },
];
export const PROFIT_VEHICLE = [
  { name: "MH-12-AB-1234", revenue: 412000, cost: 273000 },
  { name: "MH-14-XY-7788", revenue: 388000, cost: 339000 },
  { name: "GJ-01-PQ-5566", revenue: 245000, cost: 179000 },
];

/* ---------- Payment reconciliation (BRD 9.1) ---------- */
export const RECON_ROWS = [
  { ref: "NEFT-882201", amount: 145000, date: "2026-05-20", match: "INV-2026-0142", confidence: 98, status: "matched" },
  { ref: "RTGS-119043", amount: 100000, date: "2026-05-19", match: "INV-2026-0151 (partial)", confidence: 84, status: "matched" },
  { ref: "IMPS-557120", amount: 38000, date: "2026-05-20", match: "INV-2026-0158", confidence: 71, status: "review" },
  { ref: "NEFT-882640", amount: 52340, date: "2026-05-21", match: null, confidence: 0, status: "unmatched" },
];

/* ---------- TDS / GST compliance (BRD 9.2) ---------- */
export const TDS_ROWS = [
  { vendor: "Sharma Transport", pan: "AAACS1234F", section: "194C", rate: 1, gross: 118000, tds: 1180, net: 116820 },
  { vendor: "Royal Carriers", pan: "AAFCR5678K", section: "194C", rate: 2, gross: 84900, tds: 1698, net: 83202 },
];
export const GST_ROWS = [
  { invoice: "VB-8801", gstin: "27AAACS1234F1Z5", taxable: 100000, igst: 0, cgst: 9000, sgst: 9000, gstr2a: true },
  { invoice: "VB-8809", gstin: "27AAFCR5678K1Z2", taxable: 71949, igst: 12951, cgst: 0, sgst: 0, gstr2a: false },
];
export const EWAY_BILLS = [
  { indent: "IND-7741", value: 480000, generated: true, ewb: "3812 4456 9921" },
  { indent: "IND-7745", value: 38000, generated: false, ewb: null },
];

/* ---------- Working capital (BRD 9.3) ---------- */
export const DISCOUNT_OFFERS = [
  { vendor: "Sharma Transport", invoice: "VB-8801", amount: 118000, payIn: 7, discount: 1.5, saving: 1770 },
  { vendor: "Royal Carriers", invoice: "VB-8820", amount: 109500, payIn: 10, discount: 1.2, saving: 1314 },
];
export const FACTORING = [
  { invoice: "INV-2026-0163", client: "Marico Limited", amount: 92000, advance: 85, fee: 1.8, eligible: true },
  { invoice: "INV-2026-0158", client: "Asian Paints Ltd", amount: 38000, advance: 80, fee: 2.0, eligible: true },
];
export const CREDIT_LINE = { limit: 5000000, used: 3200000 };

/* ---------- Month-end close (BRD 9.4) ---------- */
export const CLOSE_CHECKLIST = [
  { task: "All PODs reconciled against delivered trips", done: true },
  { task: "All vendor invoices 3-way matched", done: true },
  { task: "All credit / debit notes settled", done: false },
  { task: "Bank reconciliation complete", done: false },
  { task: "TDS deducted & GST input reconciled", done: true },
];

/* ---------- Audit trail (BRD 9.5) ---------- */
export const AUDIT_LOG = [
  { ts: "2026-05-21 09:14", user: "Priya Nair", action: "Invoice approved", entity: "INV-2026-0163", from: "Draft", to: "Approved" },
  { ts: "2026-05-21 08:52", user: "Priya Nair", action: "Indents blocked", entity: "Britannia Industries", from: "Active", to: "Blocked" },
  { ts: "2026-05-20 18:30", user: "VP Ops", action: "Debit note approved", entity: "DN-2026-009", from: "Pending", to: "Issued" },
  { ts: "2026-05-20 16:05", user: "Finance Head", action: "Credit note issued", entity: "CN-2026-014", from: "Pending", to: "Issued" },
  { ts: "2026-05-20 11:20", user: "Priya Nair", action: "Payment scheduled", entity: "VB-8801", from: "Approved", to: "Scheduled" },
];

/* ---------- Client ledger (sample, append-only) ---------- */
export const CLIENT_LEDGER = [
  { date: "2026-04-12", type: "Invoice", ref: "INV-2026-0142", amt: 145000, bal: 145000 },
  { date: "2026-04-20", type: "Invoice", ref: "INV-2026-0151", amt: 132000, bal: 277000 },
  { date: "2026-05-02", type: "Payment", ref: "RCPT-3301", amt: -100000, bal: 177000 },
  { date: "2026-05-10", type: "Credit Note", ref: "CN-2026-014", amt: -8000, bal: 169000 },
  { date: "2026-05-15", type: "Debit Note", ref: "DN-2026-009", amt: 12000, bal: 181000 },
];

/* ---------- Enterprise Reports hub (freight analytics cards) ---------- */
const _S = "#94a3b8", _G = "#34d399", _R = "#f87171", _A = "#fbbf24", _T = "#2dd4bf";

export const ENTERPRISE_REPORTS = [
  {
    id: "spend-plant", title: "Freight Spend by Plant", icon: "package", tint: "indigo",
    desc: "Plant-wise freight cost breakdown for the selected period",
    bars: [{ label: "BRK", value: 92 }, { label: "BMPG", value: 38 }, { label: "BPRH", value: 30 }, { label: "BHD", value: 64 }, { label: "BDNW", value: 22 }, { label: "BPGU", value: 30 }],
    stats: [{ label: "Total Spend (YTD)", value: "₹0.14 Cr" }, { label: "Highest Plant", value: "BRK" }, { label: "Plants Active", value: "6" }, { label: "Annual Budget", value: "₹420 Cr" }],
  },
  {
    id: "spend-vendor", title: "Freight Spend by Vendor", icon: "users", tint: "blue",
    desc: "Vendor-wise freight spend and share of wallet",
    bars: [{ label: "Shree", value: 70 }, { label: "Saraswati", value: 30 }, { label: "Deccan", value: 60 }, { label: "Punjab", value: 28 }, { label: "Western", value: 30 }, { label: "Central", value: 26 }, { label: "South", value: 24 }],
    stats: [{ label: "Active Vendors", value: "7" }, { label: "Top Vendor", value: "Shree" }, { label: "Avg Spend/Vendor", value: "₹1.7L" }, { label: "Vendor Concentration", value: "3 vendors = 68%" }],
  },
  {
    id: "spend-lane", title: "Freight Spend by Lane", icon: "truck", tint: "blue",
    desc: "Per-corridor freight cost and per-km rate analysis",
    bars: [{ label: "Jod→Mum", value: 80 }, { label: "Jod→Ahm", value: 26 }, { label: "Jod→Jai", value: 22 }, { label: "Jod→Del", value: 30 }, { label: "Sat→Kol", value: 26 }, { label: "Sat→Rai", value: 22 }, { label: "Sat→Var", value: 24 }, { label: "Sat→Bho", value: 18 }],
    stats: [{ label: "Active Lanes", value: "19" }, { label: "Top Lane", value: "Jodhpur→Mumbai" }, { label: "Avg Cost/km", value: "₹61/km" }, { label: "Longest Lane", value: "1250 km" }],
  },
  {
    id: "contract-util", title: "Contract Utilization", badge: "Utilization %", icon: "fileText", tint: "emerald",
    desc: "Actual freight dispatched vs committed contract volume by BU",
    bars: [{ label: "CD", value: 90, color: _R }, { label: "RMC", value: 85, color: _R }, { label: "WCP", value: 92, color: _R }],
    stats: [{ label: "Active Contracts", value: "9" }, { label: "Avg Utilization", value: "28%" }, { label: "Under-utilized (<30%)", value: "3" }, { label: "Contract Value (FY)", value: "₹19 Cr" }],
  },
  {
    id: "savings", title: "Savings Realization", badge: "Savings %", icon: "rupee", tint: "emerald",
    desc: "Contract vs market rate savings and negotiation effectiveness",
    bars: [{ label: "CD", value: 55, color: _G }, { label: "RMC", value: 48, color: _G }, { label: "WCP", value: 92, color: _G }],
    stats: [{ label: "Est. Savings (YTD)", value: "₹3.2 Cr" }, { label: "Savings vs Budget", value: "7.6%" }, { label: "Disputes Resolved", value: "1" }, { label: "Amount Recovered", value: "₹3K" }],
  },
  {
    id: "spot-leakage", title: "Spot Buy Leakage", badge: "% of Indents", icon: "alertTriangle", tint: "amber",
    desc: "Indents fulfilled via spot vs contracted routes — leakage analysis",
    bars: [{ label: "Contract", value: 90, color: _G }, { label: "Spot", value: 18, color: _A }],
    stats: [{ label: "Spot Buy %", value: "18%" }, { label: "Spot Contracts", value: "2" }, { label: "Target Spot %", value: "<10%" }, { label: "Excess Spot Cost", value: "₹28.4L" }],
  },
  {
    id: "sla-breach", title: "Placement SLA Breach", icon: "clock", tint: "red",
    desc: "Vendor SLA breaches during indent placement by vendor and plant",
    bars: [{ label: "Shree", value: 30 }, { label: "Saraswati", value: 34 }, { label: "Deccan", value: 44 }, { label: "Punjab", value: 22 }, { label: "Western", value: 56 }, { label: "Central", value: 50 }, { label: "South", value: 18 }, { label: "Rapid", value: 70 }],
    stats: [{ label: "Total Breaches (Q1)", value: "25" }, { label: "Worst Vendor", value: "Rapid" }, { label: "Avg Breach Rate", value: "13%" }, { label: "Penalty Accrued", value: "₹50K" }],
  },
  {
    id: "otd", title: "On-Time Delivery", badge: "OTD %", icon: "truck", tint: "blue",
    desc: "Delivery OTD% by plant and vendor for the selected period",
    bars: [{ label: "BRK", value: 60, color: _R }, { label: "BMPG", value: 55, color: _R }, { label: "BPRH", value: 92, color: _G }, { label: "BHD", value: 58, color: _R }, { label: "BDNW", value: 88, color: _G }, { label: "BPGU", value: 90, color: _G }],
    stats: [{ label: "Overall OTD %", value: "78%" }, { label: "Late Deliveries", value: "5" }, { label: "Exceptions", value: "3" }, { label: "In Transit", value: "7" }],
  },
  {
    id: "pod-aging", title: "POD Aging", icon: "fileText", tint: "violet",
    desc: "Days outstanding for pending Proof of Delivery submissions",
    bars: [{ label: "<24h", value: 70, color: _S }, { label: "24–48h", value: 30, color: _S }, { label: ">48h", value: 40, color: _R }, { label: "Accepted", value: 64, color: _G }],
    stats: [{ label: "POD Pending", value: "4" }, { label: "Overdue > 48h", value: "3" }, { label: "Disputed PODs", value: "1" }, { label: "PODs Accepted", value: "7" }],
  },
  {
    id: "invoice-mismatch", title: "Invoice Mismatch", icon: "shield", tint: "orange",
    desc: "Invoices where billed amount exceeds contracted rate — by vendor",
    bars: [{ label: "Shree", value: 70 }, { label: "Deccan", value: 48 }, { label: "Punjab", value: 46 }, { label: "Central", value: 42 }],
    stats: [{ label: "Total Variance (₹)", value: "₹14K" }, { label: "Invoices w/ Mismatch", value: "5" }, { label: "Avg Variance %", value: "9.3%" }, { label: "Open Audit Cases", value: "5" }],
  },
  {
    id: "accrual", title: "Accrual Report", badge: "₹K by BU", icon: "rupee", tint: "teal",
    desc: "Freight accruals for shipments delivered but not yet invoiced or paid",
    bars: [{ label: "CD", value: 92, color: _T }, { label: "RMC", value: 60, color: _T }, { label: "WCP", value: 20, color: _T }],
    stats: [{ label: "Accrual Amount", value: "₹5.4L" }, { label: "Shipments Pending", value: "34" }, { label: "Invoiced (Unpaid)", value: "2" }, { label: "Under Audit", value: "4" }],
  },
  {
    id: "detention", title: "Detention & Extra Charges", icon: "alertCircle", tint: "red",
    desc: "Vendor-claimed detention hours, loading extras, and toll disputes",
    bars: [{ label: "Shree", value: 30 }, { label: "Saraswati", value: 34 }, { label: "Deccan", value: 40 }, { label: "Punjab", value: 16 }, { label: "Western", value: 44 }, { label: "Central", value: 40 }, { label: "South", value: 22 }, { label: "Rapid", value: 50 }],
    stats: [{ label: "Detention Cases", value: "1" }, { label: "Total Disputed (₹)", value: "₹2K" }, { label: "Avg Free Hours", value: "24h / contract" }, { label: "Excess Detention", value: "3 cases" }],
  },
  {
    id: "vendor-risk", title: "Vendor Risk Report", badge: "Risk Score", icon: "alertTriangle", tint: "violet",
    desc: "Composite risk score based on SLA breaches, invoice disputes, and POD TAT",
    bars: [{ label: "Shree", value: 30, color: _G }, { label: "Saraswati", value: 44, color: _A }, { label: "Deccan", value: 30, color: _G }, { label: "Punjab", value: 34, color: _G }, { label: "Western", value: 46, color: _A }, { label: "Central", value: 48, color: _A }, { label: "South", value: 30, color: _G }, { label: "Rapid", value: 64, color: _R }],
    stats: [{ label: "High-Risk Vendors", value: "1" }, { label: "Avg Risk Score", value: "21/100" }],
  },
];

/* ---------- Enterprise Command Center (enterprise-mode dashboard) ---------- */
export const ENTERPRISE_COMMAND = {
  org: "Bharat Cement & Industries Ltd",
  asOf: "22 May 2026",
  badge: "Enterprise Shipper · Vendor-Only Mode",
  kpis: [
    { label: "Freight Spend MTD", value: "₹12.1 L", sub: "April 2025", trend: { dir: "up", text: "vs last month" }, icon: "rupee", tone: "blue" },
    { label: "Active Shipments", value: "13", sub: "7 in transit", icon: "truck", tone: "blue" },
    { label: "On-Time Delivery", value: "78%", sub: "of delivered shipments", trend: { dir: "down", text: "above 80% target" }, icon: "check", tone: "green" },
    { label: "Pending PODs", value: "5", sub: "Proof of delivery overdue", icon: "clock", tone: "amber" },
    { label: "Invoice Mismatches", value: "5", sub: "₹11,505 in dispute", icon: "alert", tone: "red" },
    { label: "SLA Breaches", value: "1", sub: "Placement SLA missed", icon: "warning", tone: "amber" },
    { label: "Spot Buy Leakage", value: "0%", sub: "of placements on spot", trend: { dir: "up", text: "within 10% threshold" }, icon: "zap", tone: "amber" },
    { label: "Contract Utilization", value: "1%", sub: "of annual contract value", icon: "bars", tone: "green" },
  ],
  delayed: [
    { id: "BCIL/SHP/2025/002", status: "PAID",      route: "Satna → Raipur",        vehicle: "MP09JK0800", vendor: "Central India Movers",            delay: "1d delay" },
    { id: "BCIL/SHP/2025/003", status: "INVOICED",  route: "Hyderabad → Bengaluru", vehicle: "TS07EF1100", vendor: "Deccan Freight Solutions",        delay: "1d delay" },
    { id: "BCIL/SHP/2025/010", status: "EXCEPTION", route: "Jodhpur → Ahmedabad",   vehicle: "GJ01BX4503", vendor: "Western Express Logistics",       delay: "1d delay" },
    { id: "BCIL/SHP/2025/019", status: "EXCEPTION", route: "Jodhpur → Delhi",       vehicle: "UP14CK5500", vendor: "Saraswati Transport & Logistics", delay: "1d delay" },
    { id: "BCIL/SHP/2025/037", status: "EXCEPTION", route: "Satna → Raipur",        vehicle: "MP09JK1205", vendor: "Central India Movers",            delay: "1d delay" },
  ],
  plantExceptions: [
    { plant: "Jodhpur", code: "BRK",  open: 1, total: 2 },
    { plant: "Satna",   code: "BMPG", open: 2, total: 3 },
  ],
  vendorScorecard: [
    { vendor: "Shree Ram Carriers Pvt Ltd",      score: 87, trend: "flat", tone: "green" },
    { vendor: "Saraswati Transport & Logistics", score: 79, trend: "up",   tone: "amber" },
    { vendor: "Deccan Freight Solutions",        score: 83, trend: "flat", tone: "amber" },
    { vendor: "Punjab Roadways Corporation",     score: 91, trend: "up",   tone: "green" },
    { vendor: "Western Express Logistics",       score: 76, trend: "down", tone: "amber" },
    { vendor: "Central India Movers",            score: 72, trend: "flat", tone: "red" },
    { vendor: "South Star Carriers",             score: 85, trend: "up",   tone: "green" },
    { vendor: "Rapid Haul Transport",            score: 58, trend: "down", tone: "red" },
  ],
  topLanes: [
    { lane: "Jodhpur → Mumbai",      shipments: 7, type: "SXL",  spend: "₹4.6 L",   pct: 100 },
    { lane: "Hyderabad → Bengaluru", shipments: 5, type: "SXL",  spend: "₹1.7 L",   pct: 37 },
    { lane: "Satna → Raipur",        shipments: 5, type: "HCV",  spend: "₹1.2 L",   pct: 26 },
    { lane: "Jodhpur → Ahmedabad",   shipments: 4, type: "MXL",  spend: "₹1.1 L",   pct: 24 },
    { lane: "Pune → Nagpur",         shipments: 2, type: "32ft", spend: "₹83,780",  pct: 18 },
    { lane: "Satna → Kolkata",       shipments: 1, type: "SXL",  spend: "₹77,500",  pct: 17 },
  ],
};

/* ---------- Vendor bill detail: invoice + shipment trace + comparison ---------- */
export const OPTIMILE_BILL_TO = {
  name: "Optimile Pvt Ltd",
  address: "161, Basavanagar Main Rd, above Reliance Trends, Vignan Nagar, Doddanekkundi Road, Bengaluru, Karnataka – 560037",
  gstin: "29ABCDE1234F1Z5",
  customerCode: "OPT-001",
};

const _VENDOR_META = {
  "Sharma Transport": { address: "Plot 14, Bhiwandi Logistics Park, Thane, Maharashtra – 421302", gstin: "27AAACS1234F1Z5", pan: "AAACS1234F", bank: { holder: "Sharma Transport", acc: "5021 4456 7781", branch: "HDFC Bank, Bhiwandi", ifsc: "HDFC0001245", type: "Current" } },
  "Royal Carriers": { address: "27, Transport Nagar, Pune, Maharashtra – 411019", gstin: "27AAFCR5678K1Z2", pan: "AAFCR5678K", bank: { holder: "Royal Carriers", acc: "9920 1183 4456", branch: "ICICI Bank, Pune Camp", ifsc: "ICIC0000391", type: "Current" } },
};

export const VENDOR_BILL_DETAILS = {
  "VB-8801": {
    invoice: {
      invoiceNo: "STR-2026-0142", billDate: "2026-05-10", dueDate: "2026-06-09", terms: "30 Days",
      bookingId: "BKG-4401", lrNo: "LR-77120", qty: 1, shippingDate: "2026-04-08", deliveryDate: "2026-04-11",
      truckNo: "MH-04-KL-2231", origin: "Mumbai", destination: "Delhi",
      lineItems: { freight: 118000, advance: 0, detention: 0, loading: 0, other: 0, freightCost: 118000 },
      taxableValue: 118000, igstPct: 18, igst: 21240, cgst: 0, sgst: 0, total: 139240,
      amountInWords: "Rupees One Lakh Thirty Nine Thousand Two Hundred Forty Only",
    },
    trace: [
      { label: "Booking created", ts: "2026-04-06 10:12", actor: "TMS · Indent IND-4401", done: true },
      { label: "Indent assigned to vendor", ts: "2026-04-06 14:40", actor: "Sharma Transport", done: true },
      { label: "Dispatched from origin", ts: "2026-04-08 07:30", actor: "Mumbai hub", done: true },
      { label: "In transit", ts: "2026-04-08 → 04-11", actor: "MH-04-KL-2231 · R. Yadav", done: true },
      { label: "Delivered at destination", ts: "2026-04-11 16:05", actor: "Delhi · consignee signed", done: true },
      { label: "POD uploaded", ts: "2026-04-11 18:20", actor: "e-POD via driver app", done: true },
      { label: "POD verified", ts: "2026-04-12 09:10", actor: "Ops desk", done: true },
      { label: "Vendor invoice received", ts: "2026-05-10 11:00", actor: "Sharma Transport portal", done: true },
      { label: "3-way match passed", ts: "2026-05-10 11:01", actor: "System · within tolerance", done: true },
    ],
    comparison: [
      { head: "Base freight", contracted: 118000, invoiced: 118000 },
      { head: "Detention charges", contracted: 0, invoiced: 0 },
      { head: "Loading / unloading", contracted: 0, invoiced: 0 },
      { head: "Other charges", contracted: 0, invoiced: 0 },
      { head: "Advance adjusted", contracted: 0, invoiced: 0 },
    ],
  },
  "VB-8809": {
    invoice: {
      invoiceNo: "RC-2026-0331", billDate: "2026-05-12", dueDate: "2026-06-11", terms: "30 Days",
      bookingId: "BKG-4441", lrNo: "LR-77245", qty: 1, shippingDate: "2026-04-30", deliveryDate: "2026-05-02",
      truckNo: "MH-12-GH-7781", origin: "Pune", destination: "Hyderabad",
      lineItems: { freight: 74000, advance: 0, detention: 7000, loading: 2400, other: 1500, freightCost: 84900 },
      taxableValue: 84900, igstPct: 18, igst: 15282, cgst: 0, sgst: 0, total: 100182,
      amountInWords: "Rupees One Lakh One Hundred Eighty Two Only",
    },
    trace: [
      { label: "Booking created", ts: "2026-04-28 09:05", actor: "TMS · Indent IND-4441", done: true },
      { label: "Indent assigned to vendor", ts: "2026-04-28 12:20", actor: "Royal Carriers", done: true },
      { label: "Dispatched from origin", ts: "2026-04-30 06:50", actor: "Pune hub", done: true },
      { label: "In transit", ts: "2026-04-30 → 05-02", actor: "MH-12-GH-7781 · M. Singh", done: true },
      { label: "Delivered at destination", ts: "2026-05-02 19:40", actor: "Hyderabad · consignee signed", done: true },
      { label: "POD uploaded", ts: "2026-05-02 21:10", actor: "e-POD via driver app", done: true },
      { label: "POD verified", ts: "2026-05-03 10:25", actor: "Ops desk", done: true },
      { label: "Vendor invoice received", ts: "2026-05-12 15:30", actor: "Royal Carriers portal", done: true },
      { label: "3-way match — variance flagged", ts: "2026-05-12 15:31", actor: "System · +14.7% over contract", done: true, warn: true },
    ],
    comparison: [
      { head: "Base freight", contracted: 74000, invoiced: 74000 },
      { head: "Detention charges", contracted: 0, invoiced: 7000 },
      { head: "Loading / unloading", contracted: 0, invoiced: 2400 },
      { head: "Other charges", contracted: 0, invoiced: 1500 },
      { head: "Advance adjusted", contracted: 0, invoiced: 0 },
    ],
  },
  "VB-8814": {
    invoice: {
      invoiceNo: "STR-2026-0158", billDate: "2026-05-14", dueDate: "2026-06-03", terms: "20 Days",
      bookingId: "BKG-4452", lrNo: "LR-77390", qty: 1, shippingDate: "2026-05-12", deliveryDate: "2026-05-13",
      truckNo: "MH-04-AB-9087", origin: "Mumbai", destination: "Nagpur",
      lineItems: { freight: 52000, advance: 0, detention: 0, loading: 0, other: 0, freightCost: 52000 },
      taxableValue: 52000, igstPct: 18, igst: 9360, cgst: 0, sgst: 0, total: 61360,
      amountInWords: "Rupees Sixty One Thousand Three Hundred Sixty Only",
    },
    trace: [
      { label: "Booking created", ts: "2026-05-10 08:30", actor: "TMS · Indent IND-4452", done: true },
      { label: "Indent assigned to vendor", ts: "2026-05-10 11:15", actor: "Sharma Transport", done: true },
      { label: "Dispatched from origin", ts: "2026-05-12 07:10", actor: "Mumbai hub", done: true },
      { label: "In transit", ts: "2026-05-12 → 05-13", actor: "MH-04-AB-9087 · P. Patil", done: true },
      { label: "Delivered at destination", ts: "2026-05-13 17:55", actor: "Nagpur · consignee signed", done: true },
      { label: "POD uploaded", ts: "Pending", actor: "Awaiting upload from vendor", done: false },
      { label: "POD verified", ts: "Pending", actor: "—", done: false },
      { label: "Vendor invoice received", ts: "2026-05-14 10:00", actor: "Sharma Transport portal", done: true },
      { label: "3-way match — gated", ts: "Blocked", actor: "Approval gated until POD verified", done: false, warn: true },
    ],
    comparison: [
      { head: "Base freight", contracted: 52000, invoiced: 52000 },
      { head: "Detention charges", contracted: 0, invoiced: 0 },
      { head: "Loading / unloading", contracted: 0, invoiced: 0 },
      { head: "Other charges", contracted: 0, invoiced: 0 },
      { head: "Advance adjusted", contracted: 0, invoiced: 0 },
    ],
  },
  "VB-8820": {
    invoice: {
      invoiceNo: "RC-2026-0345", billDate: "2026-05-11", dueDate: "2026-06-10", terms: "30 Days",
      bookingId: "BKG-4419", lrNo: "LR-77150", qty: 1, shippingDate: "2026-04-18", deliveryDate: "2026-04-20",
      truckNo: "GJ-05-CD-3344", origin: "Surat", destination: "Delhi",
      lineItems: { freight: 108000, advance: 0, detention: 1500, loading: 0, other: 0, freightCost: 109500 },
      taxableValue: 109500, igstPct: 18, igst: 19710, cgst: 0, sgst: 0, total: 129210,
      amountInWords: "Rupees One Lakh Twenty Nine Thousand Two Hundred Ten Only",
    },
    trace: [
      { label: "Booking created", ts: "2026-04-16 11:45", actor: "TMS · Indent IND-4419", done: true },
      { label: "Indent assigned to vendor", ts: "2026-04-16 16:00", actor: "Royal Carriers", done: true },
      { label: "Dispatched from origin", ts: "2026-04-18 06:20", actor: "Surat hub", done: true },
      { label: "In transit", ts: "2026-04-18 → 04-20", actor: "GJ-05-CD-3344 · A. Khan", done: true },
      { label: "Delivered at destination", ts: "2026-04-20 14:30", actor: "Delhi · consignee signed", done: true },
      { label: "POD uploaded", ts: "2026-04-20 16:00", actor: "e-POD via driver app", done: true },
      { label: "POD verified", ts: "2026-04-21 09:40", actor: "Ops desk", done: true },
      { label: "Vendor invoice received", ts: "2026-05-11 12:10", actor: "Royal Carriers portal", done: true },
      { label: "3-way match passed", ts: "2026-05-11 12:11", actor: "System · within tolerance", done: true },
    ],
    comparison: [
      { head: "Base freight", contracted: 108000, invoiced: 108000 },
      { head: "Detention charges", contracted: 0, invoiced: 1500 },
      { head: "Loading / unloading", contracted: 0, invoiced: 0 },
      { head: "Other charges", contracted: 0, invoiced: 0 },
      { head: "Advance adjusted", contracted: 0, invoiced: 0 },
    ],
  },
  // Disputed bills surfaced on the Disputes page (not in the live Vendor Match list)
  "VB-8790": {
    invoice: {
      invoiceNo: "RC-2026-0309", billDate: "2026-05-19", dueDate: "2026-06-18", terms: "30 Days",
      bookingId: "BKG-4438", lrNo: "LR-77201", qty: 1, shippingDate: "2026-04-26", deliveryDate: "2026-04-29",
      truckNo: "MH-12-GH-5521", origin: "Pune", destination: "Nagpur",
      lineItems: { freight: 84000, advance: 0, detention: 0, loading: 6000, other: 6000, freightCost: 96000 },
      taxableValue: 96000, igstPct: 18, igst: 17280, cgst: 0, sgst: 0, total: 113280,
      amountInWords: "Rupees One Lakh Thirteen Thousand Two Hundred Eighty Only",
    },
    trace: [
      { label: "Booking created", ts: "2026-04-24 09:30", actor: "TMS · Indent IND-4438", done: true },
      { label: "Indent assigned to vendor", ts: "2026-04-24 13:10", actor: "Royal Carriers", done: true },
      { label: "Dispatched from origin", ts: "2026-04-26 06:40", actor: "Pune hub", done: true },
      { label: "In transit", ts: "2026-04-26 → 04-29", actor: "MH-12-GH-5521 · S. Rao", done: true },
      { label: "Delivered at destination", ts: "2026-04-29 18:20", actor: "Nagpur · consignee signed", done: true },
      { label: "POD uploaded", ts: "2026-04-29 20:05", actor: "e-POD via driver app", done: true },
      { label: "POD verified", ts: "2026-04-30 10:15", actor: "Ops desk", done: true },
      { label: "Vendor invoice received", ts: "2026-05-19 14:20", actor: "Royal Carriers portal", done: true },
      { label: "3-way match — variance flagged", ts: "2026-05-19 14:21", actor: "System · unauthorised accessorial", done: true, warn: true },
    ],
    comparison: [
      { head: "Base freight", contracted: 84000, invoiced: 84000 },
      { head: "Detention charges", contracted: 0, invoiced: 0 },
      { head: "Loading / unloading", contracted: 0, invoiced: 6000 },
      { head: "Other charges", contracted: 0, invoiced: 6000 },
      { head: "Advance adjusted", contracted: 0, invoiced: 0 },
    ],
  },
  "VB-8782": {
    invoice: {
      invoiceNo: "STR-2026-0121", billDate: "2026-05-17", dueDate: "2026-06-06", terms: "20 Days",
      bookingId: "BKG-4425", lrNo: "LR-77098", qty: 1, shippingDate: "2026-05-08", deliveryDate: "2026-05-10",
      truckNo: "MH-04-AB-6612", origin: "Mumbai", destination: "Indore",
      lineItems: { freight: 52000, advance: 0, detention: 9000, loading: 0, other: 0, freightCost: 61000 },
      taxableValue: 61000, igstPct: 18, igst: 10980, cgst: 0, sgst: 0, total: 71980,
      amountInWords: "Rupees Seventy One Thousand Nine Hundred Eighty Only",
    },
    trace: [
      { label: "Booking created", ts: "2026-05-06 10:40", actor: "TMS · Indent IND-4425", done: true },
      { label: "Indent assigned to vendor", ts: "2026-05-06 15:00", actor: "Sharma Transport", done: true },
      { label: "Dispatched from origin", ts: "2026-05-08 07:15", actor: "Mumbai hub", done: true },
      { label: "In transit", ts: "2026-05-08 → 05-10", actor: "MH-04-AB-6612 · K. Joshi", done: true },
      { label: "Delivered at destination", ts: "2026-05-10 16:45", actor: "Indore · consignee signed", done: true },
      { label: "POD uploaded", ts: "2026-05-10 18:30", actor: "e-POD via driver app", done: true },
      { label: "POD verified", ts: "2026-05-11 09:50", actor: "Ops desk", done: true },
      { label: "Vendor invoice received", ts: "2026-05-17 11:25", actor: "Sharma Transport portal", done: true },
      { label: "3-way match — variance flagged", ts: "2026-05-17 11:26", actor: "System · unauthorised detention", done: true, warn: true },
    ],
    comparison: [
      { head: "Base freight", contracted: 52000, invoiced: 52000 },
      { head: "Detention charges", contracted: 0, invoiced: 9000 },
      { head: "Loading / unloading", contracted: 0, invoiced: 0 },
      { head: "Other charges", contracted: 0, invoiced: 0 },
      { head: "Advance adjusted", contracted: 0, invoiced: 0 },
    ],
  },
};

export const vendorMeta = (vendor: string) => (_VENDOR_META as Record<string, any>)[vendor] || { address: "—", gstin: "—", pan: "—", bank: { holder: vendor, acc: "—", branch: "—", ifsc: "—", type: "Current" } };

/* ---------- Pending POD follow-up: trace + whom-to-contact ---------- */
export const PENDING_POD_DETAILS = {
  "TR-4471": {
    contacts: {
      vendorDispatcher: { name: "Rakesh Sharma", role: "Sharma Transport · Dispatch", phone: "+91 98200 11223", email: "dispatch@sharmatransport.in" },
      driver: { name: "R. Yadav", role: "Driver · MH-04-KL-2231", phone: "+91 99300 55102" },
      owner: { name: "Anil Mehta", role: "Ops Coordinator (internal)", phone: "+91 80471 20001" },
      consignee: { name: "Britannia DC, Delhi", role: "Consignee receiving desk", phone: "+91 11 4567 8900" },
    },
    trace: [
      { label: "Booking created", ts: "2026-05-15 10:12", actor: "TMS · IND-4471", done: true },
      { label: "Indent assigned to vendor", ts: "2026-05-15 14:40", actor: "Sharma Transport", done: true },
      { label: "Dispatched from origin", ts: "2026-05-16 07:30", actor: "Mumbai hub", done: true },
      { label: "In transit", ts: "2026-05-16 → 05-18", actor: "MH-04-KL-2231 · R. Yadav", done: true },
      { label: "Delivered at destination", ts: "2026-05-18 16:05", actor: "Delhi · consignee signed", done: true },
      { label: "POD pending upload", ts: "3 days overdue", actor: "Awaiting e-POD from vendor", done: false, warn: true },
    ],
    followUps: [
      { ts: "2026-05-20 11:00", note: "Reminder SMS sent to driver — no response." },
      { ts: "2026-05-19 16:30", note: "Called Sharma Transport dispatch; promised POD by EOD." },
    ],
  },
  "TR-4468": {
    contacts: {
      vendorDispatcher: { name: "Spot Market Desk", role: "Market hire · broker", phone: "+91 98400 77881", email: "spot@optimile.co" },
      driver: { name: "S. Kumar", role: "Driver · TN-09-CD-4521", phone: "+91 95000 23145" },
      owner: { name: "Anil Mehta", role: "Ops Coordinator (internal)", phone: "+91 80471 20001" },
      consignee: { name: "Asian Paints, Bengaluru", role: "Consignee receiving desk", phone: "+91 80 2345 6700" },
    },
    trace: [
      { label: "Booking created", ts: "2026-05-16 09:20", actor: "TMS · IND-4468", done: true },
      { label: "Market vehicle hired", ts: "2026-05-16 12:10", actor: "Spot · TN-09-CD-4521", done: true },
      { label: "Dispatched from origin", ts: "2026-05-17 06:50", actor: "Chennai hub", done: true },
      { label: "In transit", ts: "2026-05-17 → 05-19", actor: "TN-09-CD-4521 · S. Kumar", done: true },
      { label: "Delivered at destination", ts: "2026-05-19 18:20", actor: "Bengaluru · consignee signed", done: true },
      { label: "POD pending upload", ts: "2 days overdue", actor: "Informal transporter — no portal", done: false, warn: true },
    ],
    followUps: [
      { ts: "2026-05-20 10:15", note: "Driver asked to share POD photo on WhatsApp." },
    ],
  },
  "TR-4465": {
    contacts: {
      vendorDispatcher: { name: "Vijay Rao", role: "Royal Carriers · Dispatch", phone: "+91 98220 44556", email: "ops@royalcarriers.in" },
      driver: { name: "M. Singh", role: "Driver · MH-12-GH-7781", phone: "+91 99220 88134" },
      owner: { name: "Sneha Iyer", role: "Ops Coordinator (internal)", phone: "+91 80471 20002" },
      consignee: { name: "Marico, Hyderabad", role: "Consignee receiving desk", phone: "+91 40 6677 8800" },
    },
    trace: [
      { label: "Booking created", ts: "2026-05-18 08:30", actor: "TMS · IND-4465", done: true },
      { label: "Indent assigned to vendor", ts: "2026-05-18 11:00", actor: "Royal Carriers", done: true },
      { label: "Dispatched from origin", ts: "2026-05-19 07:15", actor: "Pune hub", done: true },
      { label: "In transit", ts: "2026-05-19 → 05-20", actor: "MH-12-GH-7781 · M. Singh", done: true },
      { label: "Delivered at destination", ts: "2026-05-20 19:40", actor: "Hyderabad · consignee signed", done: true },
      { label: "POD pending upload", ts: "1 day overdue", actor: "Awaiting e-POD from vendor", done: false, warn: true },
    ],
    followUps: [
      { ts: "2026-05-21 09:05", note: "Auto-reminder triggered to Royal Carriers portal." },
    ],
  },
  "TR-4460": {
    contacts: {
      vendorDispatcher: { name: "Spot Market Desk", role: "Market hire · broker", phone: "+91 98400 77881", email: "spot@optimile.co" },
      driver: { name: "A. Khan", role: "Driver · RJ-14-GH-8890", phone: "+91 96100 34509" },
      owner: { name: "Sneha Iyer", role: "Ops Coordinator (internal)", phone: "+91 80471 20002" },
      consignee: { name: "Dabur, Jaipur", role: "Consignee receiving desk", phone: "+91 141 220 1100" },
    },
    trace: [
      { label: "Booking created", ts: "2026-05-14 11:45", actor: "TMS · IND-4460", done: true },
      { label: "Market vehicle hired", ts: "2026-05-14 15:30", actor: "Spot · RJ-14-GH-8890", done: true },
      { label: "Dispatched from origin", ts: "2026-05-16 06:20", actor: "Delhi hub", done: true },
      { label: "In transit", ts: "2026-05-16 → 05-17", actor: "RJ-14-GH-8890 · A. Khan", done: true },
      { label: "Delivered at destination", ts: "2026-05-17 14:30", actor: "Jaipur · consignee signed", done: true },
      { label: "POD pending upload", ts: "4 days overdue", actor: "Informal transporter — escalate", done: false, warn: true },
    ],
    followUps: [
      { ts: "2026-05-20 17:20", note: "Escalated to ops — POD oldest in queue (4 days)." },
      { ts: "2026-05-19 12:00", note: "Two reminder calls to driver; line unreachable." },
    ],
  },
  "TR-4455": {
    contacts: {
      vendorDispatcher: { name: "Rakesh Sharma", role: "Sharma Transport · Dispatch", phone: "+91 98200 11223", email: "dispatch@sharmatransport.in" },
      driver: { name: "P. Patil", role: "Driver · MH-04-AB-9087", phone: "+91 99300 71245" },
      owner: { name: "Anil Mehta", role: "Ops Coordinator (internal)", phone: "+91 80471 20001" },
      consignee: { name: "Asian Paints, Nagpur", role: "Consignee receiving desk", phone: "+91 712 255 4400" },
    },
    trace: [
      { label: "Booking created", ts: "2026-05-16 10:00", actor: "TMS · IND-4455", done: true },
      { label: "Indent assigned to vendor", ts: "2026-05-16 13:20", actor: "Sharma Transport", done: true },
      { label: "Dispatched from origin", ts: "2026-05-17 07:10", actor: "Mumbai hub", done: true },
      { label: "In transit", ts: "2026-05-17 → 05-19", actor: "MH-04-AB-9087 · P. Patil", done: true },
      { label: "Delivered at destination", ts: "2026-05-19 17:55", actor: "Nagpur · consignee signed", done: true },
      { label: "POD pending upload", ts: "2 days overdue", actor: "Awaiting e-POD from vendor", done: false, warn: true },
    ],
    followUps: [
      { ts: "2026-05-20 14:40", note: "POD reminder emailed to Sharma Transport." },
    ],
  },
};

/* ---------- Fleet ledgers — vehicle / driver / trip (own-fleet owner) ----------
   Entry: { date, type, ref, desc, debit, credit }. Running balance = Σ(credit − debit),
   computed in the component. Spans Mar–May 2026 (recent May rows feed the weekly view). */
export const FLEET_LEDGERS = {
  vehicles: {
    "MH-12-AB-1234": [
      { date: "2026-03-05", type: "Trip revenue", ref: "TR-4362", desc: "Mumbai → Delhi", credit: 138000 },
      { date: "2026-03-06", type: "Fuel", ref: "FU-3301", desc: "Diesel · Vadodara HP", debit: 48000 },
      { date: "2026-03-11", type: "Toll", ref: "TL-3301", desc: "FASTag · NH48", debit: 9000 },
      { date: "2026-03-22", type: "Maintenance", ref: "MNT-2901", desc: "Oil + filter service", debit: 8500 },
      { date: "2026-03-31", type: "Driver salary", ref: "SAL-0312", desc: "R. Yadav · March", debit: 25000 },
      { date: "2026-03-31", type: "Loan EMI", ref: "EMI-0312", desc: "Vehicle loan instalment", debit: 50000 },
      { date: "2026-03-31", type: "Depreciation", ref: "DEP-0312", desc: "SLM 8yr · monthly", debit: 30000 },
      { date: "2026-04-08", type: "Trip revenue", ref: "TR-4401", desc: "Mumbai → Delhi", credit: 145000 },
      { date: "2026-04-09", type: "Fuel", ref: "FU-3388", desc: "Diesel · Nashik IOC", debit: 52000 },
      { date: "2026-04-12", type: "Toll", ref: "TL-3388", desc: "FASTag · NH48", debit: 9500 },
      { date: "2026-04-20", type: "Maintenance", ref: "MNT-3012", desc: "Tyres (set of 2) · MRF", debit: 32000 },
      { date: "2026-04-30", type: "Driver salary", ref: "SAL-0412", desc: "R. Yadav · April", debit: 25000 },
      { date: "2026-04-30", type: "Loan EMI", ref: "EMI-0412", desc: "Vehicle loan instalment", debit: 50000 },
      { date: "2026-05-04", type: "Trip revenue", ref: "TR-4470", desc: "Mumbai → Delhi", credit: 142000 },
      { date: "2026-05-05", type: "Fuel", ref: "FU-3420", desc: "Diesel · Vadodara HP", debit: 51000 },
      { date: "2026-05-16", type: "Trip revenue", ref: "TR-4478", desc: "Delhi → Mumbai (return)", credit: 138000 },
      { date: "2026-05-18", type: "Fuel", ref: "FU-3451", desc: "220 L @ ₹94.2 · Vadodara HP", debit: 20724 },
      { date: "2026-05-20", type: "Toll", ref: "TL-3451", desc: "FASTag · NH48", debit: 9200 },
      { date: "2026-05-21", type: "Driver advance", ref: "TR-4471", desc: "Advance to R. Yadav", debit: 18000 },
    ],
    "MH-14-XY-7788": [
      { date: "2026-03-10", type: "Trip revenue", ref: "TR-4365", desc: "Pune → Hyderabad", credit: 96000 },
      { date: "2026-03-12", type: "Fuel", ref: "FU-3310", desc: "Diesel · Solapur BPCL", debit: 49000 },
      { date: "2026-03-31", type: "Driver salary", ref: "SAL-0314", desc: "M. Singh · March", debit: 25000 },
      { date: "2026-03-31", type: "Loan EMI", ref: "EMI-0314", desc: "Vehicle loan instalment", debit: 48000 },
      { date: "2026-04-15", type: "Trip revenue", ref: "TR-4422", desc: "Pune → Hyderabad", credit: 92000 },
      { date: "2026-04-18", type: "Maintenance", ref: "MNT-3055", desc: "Bodyshop (accident) · Nashik", debit: 68000 },
      { date: "2026-04-30", type: "Driver salary", ref: "SAL-0414", desc: "M. Singh · April", debit: 25000 },
      { date: "2026-05-12", type: "Maintenance", ref: "MNT-3120", desc: "Scheduled service · Tata Pune", debit: 18000 },
      { date: "2026-05-17", type: "Trip revenue", ref: "TR-4476", desc: "Pune → Hyderabad", credit: 92000 },
      { date: "2026-05-18", type: "Fuel", ref: "FU-3455", desc: "240 L @ ₹93.8 · Nashik IOC", debit: 22512 },
      { date: "2026-05-20", type: "Toll", ref: "TL-3455", desc: "FASTag · NH65", debit: 7800 },
    ],
    "GJ-01-PQ-5566": [
      { date: "2026-03-14", type: "Trip revenue", ref: "TR-4370", desc: "Surat → Mumbai", credit: 58000 },
      { date: "2026-03-15", type: "Fuel", ref: "FU-3320", desc: "Diesel · Surat BPCL", debit: 28000 },
      { date: "2026-03-31", type: "Driver salary", ref: "SAL-0301", desc: "S. Kumar · March", debit: 22000 },
      { date: "2026-04-22", type: "Trip revenue", ref: "TR-4435", desc: "Surat → Delhi", credit: 64000 },
      { date: "2026-04-25", type: "Maintenance", ref: "MNT-3088", desc: "Clutch repair", debit: 9500 },
      { date: "2026-04-30", type: "Loan EMI", ref: "EMI-0401", desc: "Vehicle loan instalment", debit: 38000 },
      { date: "2026-05-15", type: "Trip revenue", ref: "TR-4474", desc: "Surat → Ahmedabad", credit: 42000 },
      { date: "2026-05-19", type: "Fuel", ref: "FU-3460", desc: "140 L @ ₹94 · Surat BPCL", debit: 13160 },
    ],
  },
  drivers: {
    "R. Yadav": [
      { date: "2026-03-31", type: "Salary credited", ref: "SAL-0312", desc: "March wages", credit: 25000 },
      { date: "2026-04-08", type: "Advance issued", ref: "TR-4401", desc: "Trip cash advance", debit: 18000 },
      { date: "2026-04-12", type: "Expenses settled", ref: "TR-4401", desc: "Tolls + food submitted", credit: 16400 },
      { date: "2026-04-12", type: "Balance recovered", ref: "TR-4401", desc: "Unused advance returned", credit: 1600 },
      { date: "2026-04-30", type: "Salary credited", ref: "SAL-0412", desc: "April wages", credit: 25000 },
      { date: "2026-05-16", type: "Advance issued", ref: "TR-4471", desc: "Trip cash advance", debit: 18000 },
      { date: "2026-05-21", type: "Advance issued", ref: "TR-4478", desc: "Return-leg advance", debit: 6000 },
    ],
    "M. Singh": [
      { date: "2026-03-31", type: "Salary credited", ref: "SAL-0314", desc: "March wages", credit: 25000 },
      { date: "2026-04-15", type: "Advance issued", ref: "TR-4422", desc: "Trip cash advance", debit: 15000 },
      { date: "2026-04-19", type: "Expenses settled", ref: "TR-4422", desc: "Actual expenses submitted", credit: 17200 },
      { date: "2026-04-30", type: "Salary credited", ref: "SAL-0414", desc: "April wages", credit: 25000 },
      { date: "2026-05-18", type: "Advance issued", ref: "TR-4465", desc: "Trip cash advance", debit: 15000 },
      { date: "2026-05-20", type: "Expenses settled", ref: "TR-4465", desc: "Shortfall to be paid", credit: 17200 },
    ],
    "S. Kumar": [
      { date: "2026-03-31", type: "Salary credited", ref: "SAL-0301", desc: "March wages", credit: 22000 },
      { date: "2026-04-30", type: "Salary credited", ref: "SAL-0401", desc: "April wages", credit: 22000 },
      { date: "2026-05-17", type: "Advance issued", ref: "TR-4468", desc: "Trip cash advance", debit: 9000 },
      { date: "2026-05-19", type: "Expenses settled", ref: "TR-4468", desc: "Settled in full", credit: 9000 },
    ],
    "A. Khan": [
      { date: "2026-04-30", type: "Salary credited", ref: "SAL-0402", desc: "April wages", credit: 22000 },
      { date: "2026-05-14", type: "Advance issued", ref: "TR-4460", desc: "Trip cash advance", debit: 12000 },
      { date: "2026-05-20", type: "Awaiting expenses", ref: "TR-4460", desc: "Submission pending", debit: 0, credit: 0 },
    ],
    "P. Patil": [
      { date: "2026-03-31", type: "Salary credited", ref: "SAL-0305", desc: "March wages", credit: 24000 },
      { date: "2026-04-30", type: "Salary credited", ref: "SAL-0405", desc: "April wages", credit: 24000 },
      { date: "2026-05-16", type: "Advance issued", ref: "TR-4455", desc: "Trip cash advance", debit: 14000 },
    ],
  },
  trips: {
    "TR-4471": [
      { date: "2026-05-16", type: "Driver advance", ref: "R. Yadav", desc: "Advance issued for trip", debit: 18000 },
      { date: "2026-05-18", type: "Fuel allocated", ref: "FU-3451", desc: "Mumbai → Delhi leg", debit: 20724 },
      { date: "2026-05-20", type: "Toll allocated", ref: "TL-3451", desc: "NH48 FASTag", debit: 9200 },
      { date: "2026-05-21", type: "Revenue (accrued)", ref: "INV pending", desc: "Awaiting POD to invoice", credit: 145000 },
    ],
    "TR-4465": [
      { date: "2026-05-18", type: "Driver advance", ref: "M. Singh", desc: "Advance issued for trip", debit: 15000 },
      { date: "2026-05-19", type: "Fuel allocated", ref: "FU-3452", desc: "Pune → Hyderabad leg", debit: 21000 },
      { date: "2026-05-20", type: "Toll allocated", ref: "TL-3452", desc: "NH65 FASTag", debit: 6500 },
      { date: "2026-05-20", type: "Revenue (accrued)", ref: "INV pending", desc: "Awaiting POD to invoice", credit: 92000 },
    ],
    "TR-4460": [
      { date: "2026-05-14", type: "Driver advance", ref: "A. Khan", desc: "Advance issued for trip", debit: 12000 },
      { date: "2026-05-16", type: "Fuel allocated", ref: "FU-3445", desc: "Delhi → Jaipur leg", debit: 11000 },
      { date: "2026-05-17", type: "Toll allocated", ref: "TL-3445", desc: "NH48 FASTag", debit: 3200 },
      { date: "2026-05-17", type: "Revenue (accrued)", ref: "INV pending", desc: "Awaiting POD to invoice", credit: 24500 },
    ],
  },
};
