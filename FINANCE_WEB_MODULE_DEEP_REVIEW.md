# Finance-Web Module — Complete Deep Code Review
**Module:** `/modules/finance-web/`
**Scan Date:** 2026-06-03
**Stack:** React + TypeScript + Vite | Zustand stores | html2canvas + jsPDF | Inter + Fraunces fonts
**Purpose:** Multi-mode financial management — AR/AP workflows, 3-way vendor matching, invoice lifecycle, dispute threading, retention, month-end close, audit trail, and analytics

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Finance Modes](#2-finance-modes)
3. [Route Hierarchy](#3-route-hierarchy)
4. [Navigation Structure (All 3 Modes)](#4-navigation-structure-all-3-modes)
5. [Screen Inventory](#5-screen-inventory)
6. [Feature Inventory](#6-feature-inventory)
7. [POD → Invoice Pipeline (BRD 4.1)](#7-pod--invoice-pipeline-brd-41)
8. [3-Way Vendor Match (BRD 5.1)](#8-3-way-vendor-match-brd-51)
9. [Sub-Vendor Payment (BRD 5.2)](#9-sub-vendor-payment-brd-52)
10. [Retention Workflow (BRD 5.3)](#10-retention-workflow-brd-53)
11. [Dispute Workflow](#11-dispute-workflow)
12. [Month-End Close (BRD 9.4)](#12-month-end-close-brd-94)
13. [Audit Trail (BRD 9.5)](#13-audit-trail-brd-95)
14. [Form Analysis](#14-form-analysis)
15. [API Catalog](#15-api-catalog)
16. [State Management (4 Stores)](#16-state-management-4-stores)
17. [RBAC & Permissions](#17-rbac--permissions)
18. [Business Rules Catalog](#18-business-rules-catalog)
19. [Dependency Matrix](#19-dependency-matrix)
20. [Edge Cases](#20-edge-cases)
21. [Hidden Features & Technical Debt](#21-hidden-features--technical-debt)
22. [Missing Features Report](#22-missing-features-report)
23. [Complete Type & Constant Reference](#23-complete-type--constant-reference)

---

## 1. Architecture Overview

### Problem Domain
A multi-mode financial management system for logistics companies. Handles accounts receivable (customer invoices, collections, credit notes), accounts payable (vendor bill matching, sub-vendor payments, retention), dispute resolution, month-end close with auto P&L generation, and an immutable audit trail. Supports three distinct business model configurations.

### Deployment Models

| Mode | Description |
|---|---|
| **Standalone** | Runs independently at `/finance` with internal sidebar + mode switcher |
| **Embedded** | Mounted in tenant-admin shell; single page at a time; no internal chrome |

### Embedded Integration
- Host injects `FinanceEmbeddedModeProvider` + `FinanceDataBridge`
- Receivables trips/invoices can come from shared tenant store via bridge
- POD actions, generateInvoice route through bridge when available
- Series/accessorial helpers always remain local

### Key Libraries
- **PDF Export:** `html2canvas` + `jsPDF` (dynamically imported on demand)
- **CSV Export:** Native `Blob` + anchor download
- **Font:** Inter (body) + Fraunces (serif headings)

---

## 2. Finance Modes

| Mode Key | Label | Color | Business Model |
|---|---|---|---|
| `aggregator` | Aggregator / 3PL | `#0ea5e9` (sky blue) | Seller with customer receivables + vendor payables |
| `fleet` | Own Fleet Owner | `#8b5cf6` (violet) | Logistics operator with own vehicles |
| `enterprise` | Enterprise | `#10b981` (emerald) | Large buyer with vendor-only payables focus |

### Mode-Specific Features

| Feature | Aggregator | Fleet | Enterprise |
|---|---|---|---|
| Receivables (POD → Invoice → Collections) | ✅ | ✅ | ❌ |
| Customer Disputes | ✅ | ✅ | ❌ |
| Vendor Match (3-way) | ✅ | ✅ | ✅ |
| Sub-Vendor/Vehicle Payments | ✅ | ✅ | ✅ |
| Retention Management | ✅ | ✅ | ❌ |
| Vendor Disputes | ✅ | ✅ | ✅ |
| Vehicle P&L | ❌ | ✅ | ❌ |
| Driver Advances | ❌ | ✅ | ❌ |
| Daily Fuel Log | ❌ | ✅ | ❌ |
| Vehicle Lifecycle | ❌ | ✅ | ❌ |
| Margin Tracker | ✅ | ❌ | ❌ |
| Working Capital | ✅ | ❌ | ❌ |
| Enterprise Analytics (14 reports) | ❌ | ❌ | ✅ |

---

## 3. Route Hierarchy

```
/finance                    → FinanceModeRouter (index)
/finance/:pageId            → FinanceModeRouter (single page — embedded)

* → Redirect → /finance/dashboard
```

> **Note:** All navigation is page-ID based (`pageId` string). No deep sub-routes. Section switching is state-driven within the `FinanceModeRouter`.

### Page IDs (by section)
See Navigation Structure below for all valid `pageId` values.

---

## 4. Navigation Structure (All 3 Modes)

### AGGREGATOR MODE (3PL)

```
DASHBOARD
  command-centre         Command Centre

RECEIVABLES
  pending-pod            Pending POD
  invoicing              Generate Invoice
  collections            Debtors
  invoice-series         Invoice Series
  notes                  Credit/Debit Notes

PAYABLES
  vendor-match           Vendor Match
  sub-vendor             Sub-Vendor/Vehicle
  retention              Retention
  scheduled-payments     Scheduled Payments

DISPUTES
  disputes               Disputes

CONTROLS
  credit-limits          Credit Limits
  contract-budget        Contract & Budget
  margins                Margin Tracker

REPORTS
  ar-report              AR/Collections Report
  ap-report              AP Report
  profitability          Profitability
  cashflow               Cash Flow
  reconciliation         Reconciliation
  working-capital        Working Capital

COMPLIANCE & CLOSE
  compliance             Tax (TDS/GST)
  audit-trail            Audit Trail
  month-close            Month-End Close

LEDGERS
  ledger                 Ledgers
```

### FLEET MODE (Own Fleet Owner)

```
DASHBOARD
  command-centre         Command Centre

FLEET
  fleet                  Vehicle P&L
  maintenance            Maintenance
  driver-advances        Driver Advances
  lifecycle              Vehicle Lifecycle

REVENUE
  pending-pod            Pending POD
  invoicing              Generate Invoice
  collections            Debtors
  invoice-series         Invoice Series
  notes                  Credit/Debit Notes

REPORTS
  ar-report              AR/Collections Report
  fuel                   Daily Fuel Report
  profitability          Profitability
  cashflow               Cash Flow
  reconciliation         Reconciliation

COMPLIANCE & CLOSE
  compliance             Tax
  audit-trail            Audit Trail
  month-close            Month-End Close

LEDGERS
  fleet-ledger           Fleet Ledgers
  ledger                 Ledgers
```

### ENTERPRISE MODE (Buyer)

```
DASHBOARD
  command-centre         Command Centre

PAYABLES
  vendor-match           Vendor Match
  notes                  Notes
  pending-pod            Pending POD
  scheduled-payments     Scheduled Payments

DISPUTES
  disputes               Disputes (vendor-only)

CONTROLS
  credit-limits          Credit Limits
  contract-budget        Contract & Budget

REPORTS
  reports                Reports (14 analytics cards)
  ap-report              AP Report

COMPLIANCE & CLOSE
  compliance             Tax
  audit-trail            Audit Trail
  month-close            Month-End Close

LEDGERS
  ledger                 Ledgers
```

---

## 5. Screen Inventory

### Screen 1: Command Centre (`command-centre`)

#### AGGREGATOR Dashboard
**KPI Cards (6):**
| Card | Tone | Data |
|---|---|---|
| Today's Collections | green/amber/red | Amount + status |
| Revenue at Risk (No POD) | red | Count of trips with pending POD |
| Overdue Receivables | red | Amount overdue |
| Invoices Pending Approval | amber | Count |
| Today's Payables | blue | Scheduled + pending |
| Cash Position 7-day | green | Projected balance |

**POD → Invoice Funnel (3 metrics):**
- Trips Completed → PODs Received (gap highlight) → Invoices Generated (process gap warning)

**Receivables Aging Chart (Bar):**
- Buckets: Current, Due 1-7d, OD 1-7d, OD 8-15d, OD 16-30d, OD 31-60d, OD 60d+
- Color progression: green → amber → orange → red

**Credit Limit Alerts Grid:**
| Client | Used % | Status |
|---|---|---|
| Britannia Industries | 102% (₹51L) | blocked — "Payments overdue 45+ days" |
| Asian Paints Ltd | 83% (₹24.8L) | warning |
| Marico Limited | 30% (₹11.8L) | healthy |
| Dabur India | 36% (₹9L) | healthy |

#### ENTERPRISE Dashboard (EnterpriseCommandCenter)
**Organization:** Bharat Cement & Industries Ltd — "Enterprise Shipper · Vendor-Only Mode"

**KPI Cards (8):**
Freight Spend MTD (₹12.1L) | Active Shipments (13) | On-Time Delivery (78%) | Pending PODs (5) | Invoice Mismatches (5, ₹11,505) | SLA Breaches (1) | Spot Buy Leakage (0%) | Contract Utilization (1%)

**Delayed Shipments Table (5 rows):** ID, Status, Route, Vehicle, Vendor, Delay

**Vendor Scorecard (8 vendors):**
Scores 58–91, tone green/amber/red by score, trend up/flat/down indicators

**Top Lanes (6 corridors):** Shipments, type, spend, contract utilization %

**Plant Exceptions (2):** Jodhpur (1 open/2 total), Satna (2 open/3 total)

---

### Screen 2: Pending POD (`pending-pod`)

**Purpose:** Trip-level POD upload and validation before invoice generation.

#### Table Columns
Trip ID | Booking | Client | Lane | Truck | Delivered | Days Pending | Revenue | Vendor

#### POD Stage Chips
`pending` | `uploaded` | `validated` | `rejected` | `invoiced`

#### Stage Badge Colors
| Stage | Color |
|---|---|
| uploaded | blue |
| validated | green |
| rejected | red |
| invoiced | slate |

#### Row Actions (stage-dependent)
| Stage | Available Actions |
|---|---|
| pending | Upload POD |
| uploaded | Validate POD, Reject POD, Generate Invoice |
| validated | Generate Invoice, Generate Consolidated Invoice |
| rejected | Upload POD (re-upload) |
| invoiced | View only |

---

### Screen 3: Generate Invoice (`invoicing`)

**Purpose:** Draft, add accessorials, submit, and approve customer invoices.

#### Workflow Steps (Stepper)
`Draft (0)` → `Submitted (1)` → `Client Review (2)` → `Approved/Ledger (3)`

#### Step Index Logic
- `draft` / `correction` → stepIndex 0
- `submitted` → stepIndex 1
- `disputed` / `correction` → stepIndex 2
- `approved` → stepIndex 3

#### Accessorial Library (4 charge types)
| Code | Label | Rate |
|---|---|---|
| DET | Detention (beyond free period) | ₹7,000 |
| LUL | Loading / unloading assistance | ₹2,400 |
| WKND | Weekend surcharge | ₹3,500 |
| MULTI | Multi-pickup / multi-drop | ₹6,000 |

#### Variance Tolerance
- `AR_TOLERANCE_PCT = 2%`
- VariancePill: green (matches), amber (within tolerance), red (flagged beyond ±2%)

#### Stage-Driven Actions
| Stage | Available Buttons |
|---|---|
| draft / correction | Preview, Submit |
| submitted | Approve, Request Correction, Dispute |
| approved | "Approved — recorded in AR ledger, due {date}" |
| disputed | "Disputed — tracked on Disputes page" |

#### PDF Preview Modal
- Renders `InvoiceDocument` component
- Download PDF via `html2canvas` → `jsPDF`
- Paginated to A4 vertically

---

### Screen 4: Debtors / Collections (`collections`)

**Purpose:** AR collection management, dispute raising, and overdue tracking.

#### KPI Summary (4)
| Metric | Value |
|---|---|
| Invoiced MTD | ₹12.45L |
| Collected MTD | ₹7.22L |
| Overdue | ₹3.44L |
| Collection Efficiency | 58% |

#### Dispute Summary (live from store)
- Count of open disputes
- Total amount in dispute
- Grid by customer: customer → disputed amount

#### Debtors Table Columns
Invoice | Customer | Lane | Amount | Due Date | Status Pill | Actions

#### Collection Status Pills
| Status | Tone | Color |
|---|---|---|
| overdue | red | |
| due-soon | amber | |
| current | green | |

#### Row Actions
| Status | Actions |
|---|---|
| overdue | Remind (sends email) |
| disputed | Disputed pill (no action) |
| not disputed | Raise Dispute button |

#### Raise Dispute Modal
- Invoice details (read-only)
- Reason textarea
- Submit → `addDispute()` with `stage='raised'`, `slaHrs=48`

---

### Screen 5: Invoice Series (`invoice-series`)

**Purpose:** Manage invoice number series across fiscal years.

#### Default Series
| Series | Label | Next # | FY |
|---|---|---|---|
| INV-2026- | Standard invoices | 172 | 2026-27 |
| CN-2026- | Credit notes | 15 | 2026-27 |
| DN-2026- | Debit notes | 10 | 2026-27 |

#### Actions
- Add new series
- Update next number
- `resetFinancialYear()` — increments year in series string, resets next=1

---

### Screen 6: Credit/Debit Notes (`notes`)

**Purpose:** Issue credit notes (seller to customer) and debit notes (customer to seller).

#### Credit Notes (Sample)
| ID | Client | Amount | Reason | Stage |
|---|---|---|---|---|
| CN-2026-014 | Marico Limited | ₹8,000 | Dispute resolved — rate correction | issued |
| CN-2026-015 | Britannia Industries | ₹6,000 | Accessorial billed in error | pending-approval |

#### Debit Notes (Sample)
| ID | Vendor | Amount | Reason | Stage |
|---|---|---|---|---|
| DN-2026-009 | Royal Carriers | ₹12,000 | Late delivery penalty — TAT breached 11h | issued |
| DN-2026-010 | Sharma Transport | ₹8,500 | Cargo shortage — 4 cartons short | pending-approval |
| DN-2026-011 | (market hire) | ₹15,000 | Non-placement penalty | pending-approval |

---

### Screen 7: Vendor Match (`vendor-match`)

**Purpose:** 3-way matching of vendor bills against contract rates and POD status.

#### 3-Way Match Status
| Status | Condition | Color |
|---|---|---|
| matched | `\|variancePct\| ≤ tolerancePct` AND `pod=true` | green |
| variance | `\|variancePct\| > tolerancePct` AND `pod=true` | red (shows +X%) |
| no-pod | `pod=false` | amber ("POD pending") |

#### Bills List Table
Bill ID | Vendor | 3-Way Match Pills (Contract/POD/Billed) | Actions

#### Per-Bill Actions
| Condition | Actions |
|---|---|
| disputed | Dispute closed (green) or In Dispute (amber) → Disputes page |
| no POD | Dispute only (Approve disabled) |
| POD + matched | Dispute, Approve & Schedule |
| POD + variance | Dispute, Approve Anyway |

#### Auto-Approve Matched
- Button → `autoApproveMatched()`
- Loops all PENDING bills where `computeMatch().autoEligible = true`
- Each: `approveBill()` + audit log "System (auto) — Bill auto-approved"
- Returns count approved

#### Tolerance Control
- Input field (default: `AP_TOLERANCE_PCT = 2%`)
- `setTolerance(pct)` → updates store, auto-recalculates all match statuses

#### VendorBillDetail Component (full detail view)
**Sections:**
1. 3-Way Match Summary (Contract ✅, POD ✅/❌, Billed ✅/⚠)
2. Validation Table (Head, Contracted, Invoiced, Variance — per line item)
3. Shipment Trace Timeline (Origin → Destination → Shipped → Delivered → POD verified)
4. Invoice Document (PDF-exportable letterhead format)
5. Proof of Delivery (PDF-exportable)

---

### Screen 8: Sub-Vendor/Vehicle (`sub-vendor`)

**Purpose:** Pay sub-vendors or market transporters (informal vehicle operators).

#### Row Modes
| Mode | Ref | Party |
|---|---|---|
| `invoice` | Bill ID (e.g. VB-8809) | Vendor name |
| `vehicle` | Vehicle registration (e.g. TN-09-CD-4521) | "Market transporter (informal)" |

#### Sample Data
| Ref | Party | Trip | Lane | Agreed | Payable | Status |
|---|---|---|---|---|---|---|
| VB-8809 | Royal Carriers | TR-4441 | Pune → Hyd | ₹74,000 | ₹84,900 | variance |
| TN-09-CD-4521 | Market transporter | TR-4468 | Chennai → Blr | ₹31,500 | ₹31,500 | no-invoice |

#### Actions
- Mark as paid → `recordSubvendorPayment(ref)` → stage='paid', AP ledger entry

---

### Screen 9: Retention (`retention`)

**Purpose:** Manage vendor performance-linked retention withheld amounts.

#### Retention Columns
Vendor | Earned | Retained | Released | Forfeited | Condition | OTD % | Actions

#### Sample Data
```
Sharma Transport: ₹4.70L earned, ₹23,500 retained, ₹18,000 released
Condition: "Release 5% on ≥95% OTD over 90d" | OTD: 96.2%
```

#### Actions
- **Release** → `releaseRetention(vendor)` — retained → released, AP ledger entry
- **Forfeit** → `forfeitRetention(vendor)` — retained → forfeited, debit note auto-generated (DN-2026-{next})

---

### Screen 10: Scheduled Payments (`scheduled-payments`)

**Purpose:** View and batch-process scheduled vendor payments.

#### Payment Table
Vendor | Amount | Due Date | Status (scheduled/paid)

#### Batch Processing
- Select payments → "Process Batch" button
- `processBatch(paymentIds)`:
  - `batchId = "BATCH-{batchSeq}"`
  - All selected: `status → 'paid'`, `batchId` assigned
  - Bills marked stage='paid'
  - AP ledger entries posted per payment
  - Audit log: "Payment processed"

---

### Screen 11: Disputes (`disputes`)

**Purpose:** Manage customer and sub-vendor dispute threads with full SLA tracking.

#### Tabs
`All` | `Customer` | `Sub-vendor` (Aggregator/Fleet)
`Vendor` (Enterprise only)

#### Dispute Stages (Stepper, 4 steps)
`Raised (0)` → `Vendor Response (1)` → `Escalated/SLA (2)` → `Resolved (3)`

#### SLA Pill
- Green: "Xh to SLA"
- Red: "SLA breached Xh"

#### Dispute Card Actions
| Condition | Actions |
|---|---|
| vendorResponse exists (accept) | Green response box + docs |
| vendorResponse exists (reject) | Red response box + Reply button |
| SLA breached + not escalated | Escalate button |
| Any open dispute | Approve invoice & close, Resubmit invoice & close |

#### Dispute Chat Modal
- Full conversation thread (vendor + admin messages)
- Admin messages: right-aligned, slate-900 bg
- Vendor messages: left-aligned, white bg with border
- Reply input (disabled if closed)
- Auto vendor followup replies rotate through 3 canned responses

#### Mode-Specific Disputes
- Aggregator/Fleet: customer disputes + subvendor disputes seeded
- Enterprise: vendor bill disputes only (ENTERPRISE_DISPUTES)

---

### Screen 12: Profitability (`profitability`)

**Purpose:** Margin analysis by client, lane, or vehicle with drill-down.

#### Tab Views
`By client` | `By lane` | `By vehicle`

#### Margin Calculation
```
margin = revenue - cost
pct = (margin / revenue) * 100
```

#### Margin Pill Colors
| Margin % | Color |
|---|---|
| negative | red |
| < 15% | amber |
| ≥ 15% | green |

#### Bar Chart
- Red bars: loss-making (margin < 0)
- Green bars: profitable

#### Drill-Down Modal
- Click row → trip-level detail filtered by dimension

#### Sample Data (Client)
| Client | Revenue | Cost | Margin | Margin % |
|---|---|---|---|---|
| Britannia Industries | ₹14.20L | ₹11.80L | ₹2.40L | 16.9% |
| Asian Paints Ltd | ₹8.80L | ₹6.90L | ₹1.90L | 21.6% |
| Marico Limited | ₹6.40L | ₹7.00L | **-₹0.60L** | **-9.4% (LOSS)** |
| Dabur India | ₹4.10L | ₹3.20L | ₹0.90L | 22% |

---

### Screen 13: Cash Flow (`cashflow`)

**Purpose:** 90-day projected cash flow with daily inflow/outflow chart.

#### Chart
- Line: balance over 90 days
- Bar overlay: inflow (green) vs outflow (red)
- Simulated with sine/cosine waves + dip at days 30-40

#### KPI Cards (3)
Ending Balance | Avg Daily Inflow | Avg Daily Outflow

---

### Screen 14: Reconciliation (`reconciliation`)

**Purpose:** Match bank payments to invoices.

#### Reconciliation Rows
| Ref | Amount | Date | Matched To | Confidence | Status |
|---|---|---|---|---|---|
| NEFT-882201 | ₹1.45L | 2026-05-20 | INV-2026-0142 | 98% | matched |
| RTGS-119043 | ₹1.00L | 2026-05-19 | INV-2026-0151 (partial) | 84% | matched |
| IMPS-557120 | ₹38,000 | 2026-05-20 | INV-2026-0158 | 71% | review |
| NEFT-882640 | ₹52,340 | 2026-05-21 | null | 0% | unmatched |

---

### Screen 15: Working Capital (`working-capital`) — Aggregator only

#### Early Payment Discounts
| Vendor | Invoice | Amount | Pay In | Discount |
|---|---|---|---|---|
| Sharma Transport | VB-8801 | ₹1.18L | 7 days | ₹1,770 (1.5%) |
| Royal Carriers | VB-8820 | ₹1.095L | 10 days | ₹1,314 (1.2%) |

#### Invoice Factoring
| Invoice | Client | Amount | Advance % | Fee % | Eligible |
|---|---|---|---|---|---|
| INV-2026-0163 | Marico Limited | ₹0.92L | 85% | 1.8% | ✅ |
| INV-2026-0158 | Asian Paints Ltd | ₹0.38L | 80% | 2.0% | ✅ |

#### Credit Line
- Limit: ₹50L | Used: ₹32L

---

### Screen 16: Vehicle P&L (`fleet`) — Fleet mode only

#### Vehicle Cards
| Vehicle | Revenue | Net Profit | Margin % |
|---|---|---|---|
| MH-12-AB-1234 | ₹4.12L | ₹1.39L | 33.7% |
| MH-14-XY-7788 | ₹3.88L | ₹0.49L | 12.6% (WARN: maint ₹0.92L > ₹50K) |
| GJ-01-PQ-5566 | ₹2.45L | ₹0.66L | 26.9% |

**Cost Breakdown per Vehicle:**
Fuel | Driver | Maintenance | Loan EMI | Toll & misc

**Vehicle Ledger Modal:**
- Each owned vehicle is its own P&L centre
- Rows: Revenue, Fuel (−), Driver (−), Maintenance (−), EMI (−), Toll (−), Net profit
- Append-only — fully auditable

---

### Screen 17: Daily Fuel Log (`fuel`) — Fleet mode only

#### Fuel Table Columns
Vehicle | Date · Location | Litres | Rate | Cost | Km/L | Anomaly

#### Anomaly Detection
`kmpl deviates > 15% from avg30Kmpl` → 🚩 Anomaly flag

#### Sample Data
| Vehicle | Location | Litres | Rate | Cost | Km/L | Anomaly |
|---|---|---|---|---|---|---|
| MH-12-AB-1234 | Vadodara HP | 220L | ₹94.2 | ₹20,724 | 4.1 | — |
| MH-14-XY-7788 | Nashik IOC | 240L | ₹93.8 | ₹22,512 | **2.9** | 🚩 >15% deviation |
| GJ-01-PQ-5566 | Surat BPCL | 140L | ₹94.0 | ₹13,160 | 5.2 | — |

---

### Screen 18: Maintenance (`maintenance`) — Fleet mode only

#### Maintenance Table
Vehicle | Date | Category | Workshop | Cost | Bill Attached

#### Sample Data
| Vehicle | Category | Cost | Note |
|---|---|---|---|
| MH-14-XY-7788 | Bodyshop (accident) | ₹68,000 | High cost |
| MH-12-AB-1234 | Tyres (set of 2) | ₹32,000 | — |
| GJ-01-PQ-5566 | Breakdown — clutch | ₹9,500 | No bill |

---

### Screen 19: Driver Advances (`driver-advances`) — Fleet mode only

#### Advance Status Values
`return-due` | `shortfall` | `settled` | `pending-submission`

#### Sample Data
| Driver | Trip | Advance | Submitted | Status | Delta |
|---|---|---|---|---|---|
| R. Yadav | TR-4471 | ₹18,000 | ₹16,400 | return-due | +₹1,600 |
| M. Singh | TR-4465 | ₹15,000 | ₹17,200 | shortfall | -₹2,200 |
| S. Kumar | TR-4468 | ₹9,000 | ₹9,000 | settled | ₹0 |
| A. Khan | TR-4460 | ₹12,000 | null | pending-submission | — |

---

### Screen 20: Vehicle Lifecycle (`lifecycle`) — Fleet mode only

#### Lifecycle Fields per Vehicle
Insurance (amount + expiry) | Permit (expiry) | Fitness (expiry) | EMI (monthly + remaining months) | Depreciation (₹)

#### Expiry Warning Logic
- Insurance or Fitness expiring within 30 days → ⚠ shown

---

### Screen 21: Month-End Close (`month-close`)

**Purpose:** Lock the financial period with checklist verification and auto P&L generation.

#### Closing Checklist (5 items)
| # | Item | Type | Auto Check |
|---|---|---|---|
| 0 | All PODs reconciled against delivered trips | AUTO | `trips.filter(podStage ≠ 'invoiced').length === 0` |
| 1 | All vendor invoices 3-way matched | AUTO | `bills.filter(stage === 'pending').length === 0` |
| 2 | All credit/debit notes settled | MANUAL | Toggle |
| 3 | Bank reconciliation complete | MANUAL | Toggle |
| 4 | TDS deducted & GST input reconciled | MANUAL | Toggle |

#### Close Actions
- Close button: enabled when `allDone = true`
- `closeMonth()` → `locked = true`, `closedAt = stamp()`
- `reopen()` → `locked = false`, `overrides += 1` (audit logged)

#### Auto-Generated P&L on Close
- Revenue = sum(PROFIT_CLIENT.revenue)
- Cost = sum(PROFIT_CLIENT.cost)
- Profit = Revenue − Cost
- Tables: By client | By lane | By vehicle

---

### Screen 22: Audit Trail (`audit-trail`)

**Purpose:** Immutable append-only log of all financial actions.

#### Audit Entry Fields
`ts` (timestamp) | `user` | `action` | `entity` (ID) | `type` | `amount?` | `from?` | `to?`

#### Filters
- Search: user, action, entity (combined `includes`)
- Type dropdown
- Date range (from/to)
- Amount range (min/max)

#### Table Columns
Timestamp | User | Action | Entity | Amount | Change (from → to pills)

#### Export
CSV download → `audit-trail.csv`

#### Sample Entries
```
2026-05-21 09:14 | Priya Nair | Invoice approved | INV-2026-0163 | Draft → Approved | ₹0.92L
2026-05-21 08:52 | Priya Nair | Indents blocked | Britannia Industries | Active → Blocked | —
2026-05-20 18:30 | VP Ops | Debit note approved | DN-2026-009 | Pending → Issued | ₹0.12L
2026-05-20 16:05 | Finance Head | Credit note issued | CN-2026-014 | Pending → Issued | ₹0.08L
2026-05-20 11:20 | Priya Nair | Payment scheduled | VB-8801 | Approved → Scheduled | ₹1.18L
```

---

### Screen 23: Tax/Compliance (`compliance`)

#### TDS Section
| Vendor | PAN | Section | Rate | Gross | TDS | Net |
|---|---|---|---|---|---|---|
| Sharma Transport | AAACS1234F | 194C | 1% | ₹1.18L | ₹1,180 | ₹1.1682L |
| Royal Carriers | AAFCR5678K | 194C | 2% | ₹0.849L | ₹1,698 | ₹0.8322L |

#### GST Section
| Invoice | GSTIN | Taxable | IGST | CGST | SGST | GSTR-2A |
|---|---|---|---|---|---|---|
| VB-8801 | 27AAACS1234F1Z5 | ₹1.00L | 0 | ₹9,000 | ₹9,000 | ✅ |
| VB-8809 | 27AAFCR5678K1Z2 | ₹0.7195L | ₹12,951 | 0 | 0 | ❌ |

#### E-Way Bills
| Indent | Value | Generated | EWB No. |
|---|---|---|---|
| IND-7741 | ₹4.80L | ✅ | 3812 4456 9921 |
| IND-7745 | ₹0.38L | ❌ | null |

---

### Screen 24: Credit Limits (`credit-limits`)

#### Client Credit Status
| Client | Limit | Used | % | Status |
|---|---|---|---|---|
| Britannia Industries | ₹50L | ₹51L | **102%** | blocked |
| Asian Paints Ltd | ₹30L | ₹24.8L | 83% | warning |
| Marico Limited | ₹40L | ₹11.8L | 30% | healthy |
| Dabur India | ₹25L | ₹9L | 36% | healthy |

**Block Details (Britannia):**
- Reason: "Payments overdue 45+ days. Aligned with KAM 18-May."
- Blocked by: "Priya Nair"

---

### Screen 25: Enterprise Reports (`reports`) — Enterprise only

**14 Report Cards** — each with icon, description, mini bar chart, and 4 stats:

| # | Report | Color | Key Metric |
|---|---|---|---|
| 1 | Spend by Plant | indigo | Total Spend YTD ₹0.14Cr, 6 plants |
| 2 | Spend by Vendor | blue | 7 vendors, 3 = 68% concentration |
| 3 | Spend by Lane | blue | 19 lanes, ₹61/km avg |
| 4 | Contract Utilization | emerald | 28% avg, 3 under-utilized |
| 5 | Savings Realization | emerald | ₹3.2Cr YTD, 7.6% vs budget |
| 6 | Spot Buy Leakage | amber | 18% spot, <10% target |
| 7 | Placement SLA Breach | red | 25 breaches Q1, Rapid worst |
| 8 | On-Time Delivery | blue | 78% overall, 5 late |
| 9 | POD Aging | violet | 4 pending, 3 overdue >48h |
| 10 | Invoice Mismatch | orange | ₹14K variance, 9.3% avg |
| 11 | Accrual Report | teal | ₹5.4L accruals, 34 pending |
| 12 | Detention & Extra Charges | red | 1 case, ₹2K disputed |
| 13 | Vendor Risk Report | violet | 1 high-risk, 21/100 avg score |
| 14 | AP Report | — | Aging buckets |

---

## 6. Feature Inventory

| # | Feature | Status | Mode |
|---|---|---|---|
| F-01 | Multi-mode dashboard (Aggregator/Fleet/Enterprise) | Live (mock) | All |
| F-02 | POD upload per trip | Live (mock + bridge) | Aggregator, Fleet |
| F-03 | POD validate / reject | Live | Aggregator, Fleet |
| F-04 | Draft invoice generation (single trip) | Live | Aggregator, Fleet |
| F-05 | Consolidated multi-drop invoice | Live | Aggregator, Fleet |
| F-06 | Accessorial charges (4 types, add/remove) | Live | Aggregator, Fleet |
| F-07 | Variance tolerance check (AR, ±2%) | Live | Aggregator, Fleet |
| F-08 | Invoice stepper (Draft→Submitted→Approved) | Live | Aggregator, Fleet |
| F-09 | PDF invoice export (html2canvas + jsPDF) | Live | All |
| F-10 | Client decision (approve/dispute/correction) | Live | Aggregator, Fleet |
| F-11 | AR ledger posting on approval | Live | Aggregator, Fleet |
| F-12 | Collections (debtors) table with aging | Live | Aggregator, Fleet |
| F-13 | Raise dispute from collections | Live | Aggregator, Fleet |
| F-14 | Invoice series management + FY reset | Live | Aggregator, Fleet |
| F-15 | Credit / debit notes | Live (mock) | All |
| F-16 | 3-way vendor bill match | Live | All |
| F-17 | Tolerance control (AP, adjustable) | Live | All |
| F-18 | Auto-approve matched bills | Live | All |
| F-19 | VendorBillDetail (3-way summary + trace + PDF) | Live | All |
| F-20 | Sub-vendor payment (invoice + vehicle mode) | Live | Aggregator, Fleet |
| F-21 | Scheduled payment batch processing | Live | All |
| F-22 | Retention release / forfeit + debit note | Live | Aggregator, Fleet |
| F-23 | Dispute management with SLA tracking | Live | All |
| F-24 | Dispute chat / vendor thread | Live | All |
| F-25 | Dispute escalation | Live | All |
| F-26 | Dispute resolve (approve / resubmit) | Live | All |
| F-27 | Profitability by client/lane/vehicle + drill-down | Live (mock) | All |
| F-28 | Cash flow 90-day projection | Live (mock) | Aggregator, Fleet |
| F-29 | Reconciliation (payment → invoice match) | Live (mock) | Aggregator, Fleet |
| F-30 | Working capital (discounts + factoring) | Live (mock) | Aggregator only |
| F-31 | Margin tracker | Live (mock) | Aggregator only |
| F-32 | Vehicle P&L per vehicle | Live (mock) | Fleet only |
| F-33 | Vehicle ledger modal (append-only P&L) | Live | Fleet only |
| F-34 | Daily fuel log + anomaly detection | Live (mock) | Fleet only |
| F-35 | Maintenance tracking | Live (mock) | Fleet only |
| F-36 | Driver advances management | Live (mock) | Fleet only |
| F-37 | Vehicle lifecycle (insurance/permit/fitness/EMI) | Live (mock) | Fleet only |
| F-38 | Month-end close (auto + manual checklist) | Live | All |
| F-39 | Auto P&L generation on close | Live | All |
| F-40 | Month reopen with override count | Live | All |
| F-41 | Immutable audit trail | Live | All |
| F-42 | Audit trail CSV export | Live | All |
| F-43 | TDS/GST compliance view | Live (mock) | All |
| F-44 | E-way bill tracking | Live (mock) | All |
| F-45 | Credit limits management (4 clients) | Live (mock) | Aggregator, Enterprise |
| F-46 | Enterprise command center (8 KPIs) | Live (mock) | Enterprise only |
| F-47 | Enterprise 14-report analytics hub | Live (mock) | Enterprise only |
| F-48 | Vendor scorecard | Live (mock) | Enterprise only |
| F-49 | POD aging analysis | Live (mock) | Enterprise only |
| F-50 | Real HTTP API | **MISSING** | All modes |

---

## 7. POD → Invoice Pipeline (BRD 4.1)

```
Trip created
  └──► podStage: 'pending'

Upload POD
  └──► podStage: 'uploaded'

Validate POD (ok=true)
  └──► podStage: 'validated'
Reject POD (ok=false)
  └──► podStage: 'rejected' + podRejectReason

Generate Draft Invoice
  Requires: podStage === 'validated'
  └──► Pulls contract rate from contractRateFor(lane, truck, client)
  └──► Allocates invoice ID: allocate('INV-') → INV-2026-0{next}
  └──► Creates ARInvoice (stage='draft', base=contractRate, accessorials=[])
  └──► trip.podStage → 'invoiced'
  └──► Audit: "Invoice generated"

Add Accessorials (optional, at draft stage)
  └──► addAccessorial(invoiceId, code) → appends charge, recalculates invoiced/variance/flagged

Submit Invoice
  └──► stage: 'draft' → 'submitted'
  └──► Audit: "Invoice submitted"

Client Decision:
  ├──► 'approve' → computes due date (today + termsDays)
  │              → computes status: overdue/due-soon/current
  │              → Posts to AR ledger: { type: 'Invoice', amt: invoiced }
  │              → Audit: "Invoice approved"
  ├──► 'dispute' → stage: 'disputed'
  │              → Audit: "Invoice disputed"
  └──► 'correction' → stage: 'correction'
                   → Audit: "Invoice sent for correction"
```

---

## 8. 3-Way Vendor Match (BRD 5.1)

```typescript
computeMatch(bill, tolerancePct): {
  variancePct = (bill.billed - bill.contractRate) / bill.contractRate * 100
  if (!bill.pod): return { status: 'no-pod', autoEligible: false }
  within = Math.abs(variancePct) <= tolerancePct
  return {
    status: within ? 'matched' : 'variance',
    autoEligible: within
  }
}
```

### Manual Approval Flow
```
Approve Bill (manual):
  Requires: bill.pod === true AND bill.stage === 'pending'
  └──► Creates Payment: { id: PAY-{seq}, status: 'scheduled', dueDate, amount }
  └──► bill.stage → 'scheduled'
  └──► AP ledger: { type: 'Bill approved', ref: billId, amt: bill.billed }
  └──► Audit: "Bill approved"

Auto-Approve:
  └──► Filters: pending bills where computeMatch().autoEligible = true
  └──► Each: approveOne + Audit: "System (auto) — Bill auto-approved"
  └──► Returns count
```

---

## 9. Sub-Vendor Payment (BRD 5.2)

```
recordSubvendorPayment(ref):
  Mode 'invoice': type = "Payment (invoice-wise)"
  Mode 'vehicle': type = "Payment (vehicle-wise)"

  └──► subvendorRow.stage → 'paid'
  └──► AP ledger: { type, ref, amt: -payable }
  └──► Audit: action = type
```

---

## 10. Retention Workflow (BRD 5.3)

```
Release Retention:
  releaseRetention(vendor)
  └──► amount = row.retained
  └──► row.released += amount, row.retained = 0
  └──► AP ledger: { type: 'Retention released', ref: vendor, amt: -amount }
  └──► Audit: "Retention released"

Forfeit Retention:
  forfeitRetention(vendor)
  └──► amount = row.retained
  └──► debitNote = "DN-2026-{dnNext.padStart(4, '0')}"
  └──► row.forfeited += amount, row.retained = 0, row.debitNote = debitNote
  └──► dnNext++
  └──► AP ledger: { type: 'Debit note (retention forfeited)', ref: debitNote, amt: -amount }
  └──► Audit: "Debit note issued (forfeiture)"
```

---

## 11. Dispute Workflow

```
Raise Dispute (AR or AP):
  addDispute(dispute)
  └──► stage: 'raised', slaHrs: 48
  └──► Prepended to disputes list (no duplicates)

SLA Breach:
  └──► If (now - raisedAt) > slaHrs: SLA pill shows "SLA breached Xh" in red
  └──► Escalate button enabled

Vendor Response (auto-injected in mock):
  └──► vendorResponseType: 'accept' | 'reject'
  └──► vendorResponse text + vendorDocs[]

Admin Reply:
  replyToDispute(id, text)
  └──► Appends admin message to thread
  └──► Auto-appends rotating vendor followup (3 canned responses)

Escalate:
  escalateDispute(id)
  └──► stage: 'escalated', owner: 'Finance Head'
  └──► Audit: "Dispute escalated"

Resolve:
  resolveDispute(id, 'approve' | 'resubmit')
  ├──► 'approve': stage='resolved', resolution="Invoice approved as billed..."
  │              Audit: "Dispute resolved (approved)"
  └──► 'resubmit': stage='resolved', resolution="Vendor to resubmit..."
                  Audit: "Dispute resolved (resubmit)"
```

---

## 12. Month-End Close (BRD 9.4)

```
Auto checks (computed):
  ✅ item[0]: trips.filter(podStage ≠ 'invoiced').length === 0
  ✅ item[1]: bills.filter(stage === 'pending').length === 0

Manual checks (toggleable, 3 items):
  □ Credit/debit notes settled
  □ Bank reconciliation complete
  □ TDS/GST reconciled

When allDone = true:
  └──► Close button enabled
  └──► closeMonth() → locked=true, closedAt=stamp()
  └──► Auto P&L generated (revenue, cost, profit by client/lane/vehicle)
  └──► Audit: "Month closed"

Reopen:
  └──► reopen() → locked=false, overrides++
  └──► Audit: "Month reopened (override {N})"
```

---

## 13. Audit Trail (BRD 9.5)

### All Actions That Log Audit Entries

| Action | Actor | Type |
|---|---|---|
| POD uploaded | User | Invoice |
| Invoice generated | User | Invoice |
| Invoice submitted | User | Invoice |
| Invoice approved | User | Invoice |
| Invoice disputed | User | Invoice |
| Invoice correction | User | Invoice |
| Bill approved | User | Payable |
| Bill auto-approved | System (auto) | Payable |
| Vendor bill disputed | User | Payable |
| Payment processed (batch) | User | Payable |
| Subvendor payment (invoice/vehicle) | User | Payable |
| Retention released | User | Payable |
| Debit note issued (forfeiture) | User | Debit Note |
| Dispute escalated | User | Dispute |
| Dispute resolved | User | Dispute |
| Month closed | User | Close |
| Month reopened | User | Close |

**Immutable:** Append-only. No delete/update operations. `ts` auto-stamped as `"YYYY-MM-DD HH:mm"`.

---

## 14. Form Analysis

### Form 1: Accessorial Charge (Add to Invoice)
| Field | Type | Source |
|---|---|---|
| Charge code | dropdown | ACCESSORIAL_LIBRARY (4 types) |
| Rate | auto-filled | From library |

### Form 2: Raise Dispute (AR — from Collections)
| Field | Type | Required |
|---|---|---|
| Invoice details | read-only | Pre-filled |
| Reason | textarea | Yes |

### Form 3: Raise Dispute (AP — from VendorMatch)
| Field | Type | Required |
|---|---|---|
| Bill ID, Vendor, Trip, Lane, Amount | read-only | Pre-filled |
| Reason | textarea | Yes |

### Form 4: Validate/Reject POD
| Field | Type | Required |
|---|---|---|
| Decision | button (Validate/Reject) | Yes |
| Rejection reason | text | Yes (if reject) |

### Form 5: Tolerance Control (AP)
| Field | Type | Default |
|---|---|---|
| Tolerance % | number input | 2 |

### Form 6: Invoice Series (Add)
| Field | Type | Required |
|---|---|---|
| Series prefix | text | Yes |
| Label | text | Yes |
| Next number | number | Yes |
| Fiscal year | text | Yes |

### Form 7: Record Payment (Scheduled Payments)
| Field | Type | Required |
|---|---|---|
| Invoice | dropdown | Yes |
| Entry Type | dropdown | Yes |
| Amount | number | Yes (> 0, ≤ balance) |
| Payment Date | date | Yes (default: today) |
| Description | textarea | Yes |

### Form 8: Dispute Reply (Chat)
| Field | Type | Required |
|---|---|---|
| Message | textarea | Yes |
| Attachments | file[] | No |

### Form 9: Month-End Checklist (Manual Items)
| Field | Type | Condition |
|---|---|---|
| Credit/debit notes settled | toggle | Unlocked |
| Bank reconciliation | toggle | Unlocked |
| TDS/GST reconciled | toggle | Unlocked |

---

## 15. API Catalog

> **CRITICAL:** There are **zero HTTP API calls** in this module. All data is driven by Zustand stores with mock data. The module has no `axios` client, no service files, and no endpoint strings. The bridge pattern (`FinanceDataBridge`) provides shared data from tenant-admin's mock store when embedded.

### Implied Production Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/finance/trips` | GET | AR trips with POD status |
| `/api/finance/invoices` | GET/POST | Invoice CRUD |
| `/api/finance/invoices/:id/submit` | POST | Submit invoice |
| `/api/finance/invoices/:id/approve` | POST | Approve invoice |
| `/api/finance/invoices/:id/dispute` | POST | Dispute invoice |
| `/api/finance/vendor-bills` | GET | AP vendor bills |
| `/api/finance/vendor-bills/:id/approve` | POST | Approve bill |
| `/api/finance/vendor-bills/:id/dispute` | POST | Dispute bill |
| `/api/finance/payments` | GET/POST | Scheduled payments |
| `/api/finance/payments/batch` | POST | Batch process payments |
| `/api/finance/disputes` | GET | All disputes |
| `/api/finance/disputes/:id/escalate` | POST | Escalate dispute |
| `/api/finance/disputes/:id/resolve` | POST | Resolve dispute |
| `/api/finance/retention` | GET | Retention records |
| `/api/finance/retention/:vendor/release` | POST | Release retention |
| `/api/finance/retention/:vendor/forfeit` | POST | Forfeit retention |
| `/api/finance/ledger/ar` | GET | AR ledger entries |
| `/api/finance/ledger/ap` | GET | AP ledger entries |
| `/api/finance/audit-trail` | GET | Audit log |
| `/api/finance/month-close` | GET/POST | Month close status |
| `/api/finance/compliance/tds` | GET | TDS records |
| `/api/finance/compliance/gst` | GET | GST records |

---

## 16. State Management (4 Stores)

### Store 1: receivablesStore

**State:**
```typescript
{
  trips: ARTrip[]          // POD-pending trips
  invoices: ARInvoice[]    // Invoice records with stage tracking
  series: SeriesRow[]      // Invoice number series
  arLedger: LedgerEntry[]  // AR double-entry ledger
}
```

**Key Actions:** `uploadPod`, `validatePod`, `generateDraftInvoice`, `generateConsolidatedInvoice`, `addAccessorial`, `removeAccessorial`, `submitInvoice`, `clientDecision`, `allocate`, `addSeries`, `updateSeries`, `resetFinancialYear`

### Store 2: payablesStore

**State:**
```typescript
{
  bills: VendorBill[]
  subvendorRows: SubvendorRow[]
  retention: RetentionRow[]
  payments: Payment[]
  apLedger: LedgerEntry[]
  tolerancePct: number       // AP_TOLERANCE_PCT = 2
  dnNext: number             // Debit note sequence
  paySeq: number             // Payment sequence
  batchSeq: number           // Batch sequence
}
```

**Key Actions:** `setTolerance`, `approveBill`, `autoApproveMatched`, `disputeBill`, `processBatch`, `recordSubvendorPayment`, `releaseRetention`, `forfeitRetention`

### Store 3: disputesStore

**State:** `Dispute[]`

**Key Actions:** `addDispute`, `resolveDispute`, `escalateDispute`, `replyToDispute`

**Seeding:** Aggregator/Fleet → DISPUTES (customer + subvendor); Enterprise → ENTERPRISE_DISPUTES

### Store 4: auditStore

**State:** `AuditEntry[]` (immutable append-only)

**Key Actions:** `logAudit(mode, entry)` — auto-stamps ts, prepends to list

### Store 5: monthCloseStore

**State:** `{ locked: boolean, closedAt: string | null, overrides: number }`

**Key Actions:** `closeMonth()`, `reopen()`

### Store Characteristics
- All stores are **FinanceMode-aware singletons**
- Survive re-mounts within same mode
- No persistence to localStorage (fresh on page reload)
- All financial actions call `logAudit()` from their action closures

---

## 17. RBAC & Permissions

### Permission Interface
```typescript
interface FinancePermissions {
  canRaiseDispute: boolean   // Disputes page, Collections raise dispute
  canApproveNote: boolean    // Notes page approve button
  canCloseMonth: boolean     // Month-End Close lock button
}
```

**Default in standalone mode:** All `true`

**Embedded mode:** Host injects via `FinanceEmbeddedModeProvider`

### No Role Matrix
No role-based RBAC system exists within finance-web. All permissions default to `true`. Gating is binary (permission boolean) rather than role-based.

---

## 18. Business Rules Catalog

| # | Rule | Implementation |
|---|---|---|
| BR-01 | AR tolerance: ±2% | `AR_TOLERANCE_PCT = 2` — VariancePill flagged if exceeded |
| BR-02 | AP tolerance: ±2% (adjustable) | `AP_TOLERANCE_PCT = 2` — `setTolerance()` allows override |
| BR-03 | Invoice generation requires validated POD | `trip.podStage === 'validated'` check |
| BR-04 | Consolidated invoice: all trips must be same client | Validation before `generateConsolidatedInvoice()` |
| BR-05 | Due date = today + termsDays(terms) | Computed on `clientDecision('approve')` |
| BR-06 | Collection status: overdue if daysUntil < 0 | Computed and stored on approve |
| BR-07 | Collection status: due-soon if daysUntil ≤ 7 | Computed and stored on approve |
| BR-08 | AP auto-approve: `autoEligible = within tolerance AND pod = true` | `computeMatch()` |
| BR-09 | AP approve requires pod = true | `approveBill()` guards on `bill.pod === true` |
| BR-10 | Dispute SLA = 48 hours | `slaHrs: 48` on `addDispute()` |
| BR-11 | Dispute SLA breach → Escalate button enabled | Computed from `(now - raisedAt) > slaHrs` |
| BR-12 | Retention release condition: OTD ≥ 95% | Condition text stored; not auto-enforced |
| BR-13 | Retention forfeit → debit note auto-generated | `forfeitRetention()` → `DN-2026-{dnNext}` |
| BR-14 | Month close requires all checklist items done | `allDone = checklist.every(c => c.checked)` |
| BR-15 | Month close AUTO item 0: PODs reconciled | `trips.filter(podStage ≠ 'invoiced').length === 0` |
| BR-16 | Month close AUTO item 1: invoices matched | `bills.filter(stage === 'pending').length === 0` |
| BR-17 | Audit trail is immutable (append-only) | No update/delete operations on auditStore |
| BR-18 | Invoice series: FY reset → year incremented, next=1 | `resetFinancialYear()` |
| BR-19 | Vehicle maintenance warn threshold: ₹50,000 | Fleet P&L card highlights if maint > ₹50K |
| BR-20 | Fuel anomaly: kmpl deviates > 15% from avg30 | Daily fuel log flag |
| BR-21 | Credit blocked: > 100% utilization | Dashboard shows blocked status |
| BR-22 | Credit warning: 80–100% utilization | Dashboard shows warning |
| BR-23 | Dispute no duplicates | `addDispute()` checks existing IDs |
| BR-24 | Sub-vendor informal (vehicle mode): no invoice required | `mode='vehicle'` path handles no-invoice case |
| BR-25 | Payment batch ID format | `"BATCH-{batchSeq}"` |

---

## 19. Dependency Matrix

| Feature | Component/Page | Store | Permission | Mode | Upstream Data |
|---|---|---|---|---|---|
| POD upload/validate | PendingPOD | receivablesStore | — | Agg, Fleet | Trips from bridge or mock |
| Invoice generation | Invoicing | receivablesStore | — | Agg, Fleet | Contract rates, POD status |
| Accessorials | Invoicing | receivablesStore | — | Agg, Fleet | ACCESSORIAL_LIBRARY |
| Collections/Debtors | Collections | receivablesStore, disputesStore | canRaiseDispute | Agg, Fleet | AR invoices |
| Invoice series | invoice-series | receivablesStore | — | Agg, Fleet | Series rows |
| Credit/debit notes | notes | (mock only) | canApproveNote | All | — |
| 3-way match | VendorMatch | payablesStore | — | All | Contract rates, POD, billed |
| Auto-approve | VendorMatch | payablesStore | — | All | payablesStore.bills |
| Sub-vendor payment | SubVendor | payablesStore | — | Agg, Fleet | subvendorRows |
| Scheduled payments | ScheduledPayments | payablesStore | — | All | payments |
| Retention | Retention | payablesStore | — | Agg, Fleet | retention |
| Disputes | Disputes | disputesStore, payablesStore | canRaiseDispute | All | invoices, bills |
| Month close | MonthClose | monthCloseStore, receivablesStore, payablesStore | canCloseMonth | All | trips, bills |
| Audit trail | AuditTrail | auditStore | — | All | All financial actions |
| Profitability | Profitability | (mock data) | — | All | PROFIT_* constants |
| Cash flow | CashFlow | (mock data) | — | Agg, Fleet | — |
| Vehicle P&L | Fleet | (mock data) | — | Fleet only | VEHICLES constant |
| Credit limits | CreditLimits | (mock data) | — | Agg, Enterprise | CLIENTS constant |
| Enterprise reports | EnterpriseReports | (mock data) | — | Enterprise | ENTERPRISE_REPORTS |
| PDF export | Any page | (html2canvas/jsPDF) | — | All | DOM element ref |
| CSV export | AuditTrail, APReport | (csv.ts) | — | All | Store data |

---

## 20. Edge Cases

| Scenario | Handling |
|---|---|
| Consolidated invoice: trips from different clients | Validation blocks — all trips must be same client |
| POD not validated → generate invoice | `generateDraftInvoice()` returns null; no invoice created |
| AR tolerance = 0% | All non-exact matches flagged; no auto-approve |
| AP tolerance = 0% | Only exact matches auto-eligible |
| Approve bill with no POD | `approveBill()` blocked — `bill.pod === true` required |
| Dispute same invoice twice | `addDispute()` checks by ID — duplicate silently skipped |
| Dispute resolution = resubmit | Stage = 'resolved' but resolution text says "Vendor to resubmit" |
| Month close with pending PODs | AUTO item 0 = false → close button disabled |
| Month close with pending bills | AUTO item 1 = false → close button disabled |
| Reopen closed month | `overrides++` — tracked for governance |
| Retention OTD < 95% | Release button still shown — no auto-enforcement of condition |
| Forfeit retention: debit note already exists | No dedup check — multiple DN could be issued |
| Fuel anomaly > 15% deviation | Flag shown; no automatic action or alert |
| Vehicle maintenance > ₹50K | Visual warning card only — no block |
| Credit > 100% | Dashboard shows "blocked" — no functional booking block found |
| Invoice series next number exhausted | No overflow check found |
| PDF export fails (html2canvas) | Dynamic import — no error boundary observed |
| Dispute chat reply when closed | Input disabled — UI-level only |
| Vendor response auto-inject | Mock only — 3 rotating canned responses |

---

## 21. Hidden Features & Technical Debt

### Stub / Non-Functional Features

| Feature | Location | Status |
|---|---|---|
| Real HTTP API | Entire module | **MISSING** — zero API calls, all mock data |
| Credit block enforcement | Dashboard, CreditLimits | Visual only — no booking block in finance module |
| Retention OTD enforcement | Retention | Condition text stored, not auto-checked |
| Invoice factoring (execution) | WorkingCapital | Display only — no factoring action |
| Early payment discount (execution) | WorkingCapital | Display only — no payment action |
| E-way bill generation | Compliance | Status shown — no generation action |
| GSTR-2A reconciliation | Compliance | Status field — no reconciliation logic |
| Vendor followup replies | Disputes | Auto-injected mock — not real vendor API |
| Series next number overflow | invoice-series | No max/overflow guard |
| Mode switcher (standalone) | Layout | UI only — no persistence of selected mode |

### Technical Debt

| Item | Severity | Detail |
|---|---|---|
| **Zero real API calls** | Critical | Entire module on in-memory Zustand mock stores |
| **No store persistence** | High | All data resets on page reload (no localStorage) |
| **Credit block not enforced** | High | "blocked" status shown but no booking gate |
| **Duplicate dispute on forfeit** | Medium | `forfeitRetention()` doesn't check if DN already issued |
| **Vendor response is fake** | Medium | Auto-injected canned replies — no real vendor communication |
| **Retention condition not auto-enforced** | Medium | OTD ≥ 95% is text — no computed check |
| **Mode not persisted** | Medium | Switching modes resets store state |
| **No pagination on most tables** | Medium | All rows rendered without limit |
| **html2canvas dynamic import** | Low | PDF export slow on first use; no error handling |
| **disputesStore no dedup on forfeit** | Low | Multiple debit notes possible for same vendor |
| **Reconciliation rows are static** | Low | No matching algorithm — hardcoded mock rows |

---

## 22. Missing Features Report

| # | Feature | Priority | Detail |
|---|---|---|---|
| MF-01 | Real backend API integration | Critical | Zero HTTP calls — all mock data |
| MF-02 | Store persistence (localStorage/session) | High | Data resets on reload |
| MF-03 | Credit limit block enforcement | High | "Blocked" visual only — no booking gate |
| MF-04 | Invoice factoring execution | High | Display only — no factoring action |
| MF-05 | Early payment discount execution | High | Display only — no payment trigger |
| MF-06 | Real vendor dispute communication | High | Mock canned responses only |
| MF-07 | E-way bill generation | Medium | Status tracked; no generation |
| MF-08 | GSTR-2A reconciliation | Medium | Field exists; no reconciliation logic |
| MF-09 | Retention OTD auto-enforcement | Medium | Condition is display text only |
| MF-10 | Pagination on all tables | Medium | All rows render without limit |
| MF-11 | Mode persistence | Medium | Mode resets on reload |
| MF-12 | TDS payment execution | Medium | TDS records shown; no payment flow |
| MF-13 | Bank reconciliation automation | Medium | Manual toggle only; no bank feed |
| MF-14 | Invoice PDF real download | Low | Works via html2canvas; slow on first load |
| MF-15 | Series overflow guard | Low | No max-number check on invoice series |
| MF-16 | Duplicate debit note prevention | Low | forfeitRetention() can create duplicates |
| MF-17 | Working capital credit line draw | Low | Credit line balance shown; no draw action |
| MF-18 | Cash flow real projection | Low | Simulated with sine/cosine — no real forecast |
| MF-19 | Multi-currency support | Low | All INR hardcoded |
| MF-20 | Notification/alert system | Low | No notification wiring |

---

## 23. Complete Type & Constant Reference

### Finance Mode Values
`aggregator` | `fleet` | `enterprise`

### POD Stage Values
`pending` | `uploaded` | `validated` | `rejected` | `invoiced`

### Invoice Stage Values (AR)
`draft` | `submitted` | `approved` | `disputed` | `correction`

### Bill Stage Values (AP)
`pending` | `scheduled` | `paid` | `disputed`

### Match Status Values
`matched` | `variance` | `no-pod`

### Collection Status Values
`overdue` | `due-soon` | `current`

### Dispute Stage Values
`raised` | `vendor-response` | `escalated` | `resolved`

### Driver Advance Status Values
`return-due` | `shortfall` | `settled` | `pending-submission`

### Note Stage Values
`issued` | `pending-approval`

### Retention Fields
`earned` | `retained` | `released` | `forfeited` | `condition` | `otd`

### ARTrip Interface (Key Fields)
`id` | `bookingId?` | `client` | `lane` | `truck` | `delivered` | `daysPending` | `revenue` | `expense?` | `vendor` | `driver?` | `vehicle?` | `podStage` | `podRejectReason?`

### ARInvoice Interface (Key Fields)
`id` | `tripId?` | `client` | `lane` | `date?` | `due?` | `terms` | `base` | `accessorials[]` | `contracted` | `invoiced` | `amount` | `variancePct` | `flagged` | `stage` | `status?` | `daysOverdue?` | `daysUntil?` | `drops?` | `bookingIds?`

### VendorBill Interface (Key Fields)
`id` | `vendor` | `trip` | `lane` | `contractRate` | `billed` | `pod` | `terms` | `due` | `variance?` | `stage`

### Accessorial Library
| Code | Label | Rate |
|---|---|---|
| DET | Detention | ₹7,000 |
| LUL | Loading/Unloading | ₹2,400 |
| WKND | Weekend Surcharge | ₹3,500 |
| MULTI | Multi-pickup/drop | ₹6,000 |

### Default Invoice Series
| Series | Next | FY |
|---|---|---|
| INV-2026- | 172 | 2026-27 |
| CN-2026- | 15 | 2026-27 |
| DN-2026- | 10 | 2026-27 |

### Tolerance Constants
```typescript
AR_TOLERANCE_PCT = 2   // ±2% invoice variance tolerance
AP_TOLERANCE_PCT = 2   // ±2% bill matching tolerance (adjustable)
```

### Color Constants (format.ts)
```typescript
C = {
  green:  '#10b981'
  amber:  '#f59e0b'
  red:    '#ef4444'
  blue:   '#0ea5e9'
  violet: '#8b5cf6'
  slate:  '#64748b'
  ink:    '#0f172a'
  paper:  '#f8fafc'
}
```

### Format Utilities
```typescript
fmtINR(n): "₹1,23,45,678" | "-₹X" | "—" (null)
fmtL(n):   "₹5.10L" (lakh format)
pct(num, den): (num / den) * 100
```

### PDF Export
```typescript
downloadElementAsPdf(el, filename):
  - html2canvas at 2x scale
  - Paginated vertically to A4
  - Triggers browser download
```

### CSV Export
```typescript
exportCsv(filename, columns, rows):
  - Escapes quotes/commas/newlines
  - Triggers browser download
```

### Primitive Components (primitives.tsx)
`Money` | `Pill` | `Card` | `SectionTitle` | `Row` | `Toast` | `StatCard` | `Modal` | `ModalHeader` | `Stepper` | `Btn` | `Table` | `THead` | `TR` | `TD` | `EmptyRow`

---

*End of Finance-Web Module Deep Code Review — Reverse-engineered from full source scan of `/modules/finance-web/`*
