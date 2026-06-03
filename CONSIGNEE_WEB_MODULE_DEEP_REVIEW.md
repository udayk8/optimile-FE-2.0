# Consignee-Web Module — Complete Deep Code Review
**Module:** `/modules/consignee-web/`
**Scan Date:** 2026-06-03
**Stack:** React + TypeScript + Google Maps API + Lucide React
**Files:** 3 files (~2,000+ lines)
**Purpose:** Consignee-facing delivery tracking experience — live shipment visibility, POD upload, e-signature, delivery confirmation, driver rating, and remarks management

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Module Structure](#2-module-structure)
3. [Screen Inventory](#3-screen-inventory)
4. [Feature Inventory](#4-feature-inventory)
5. [POD Upload Workflow](#5-pod-upload-workflow)
6. [Delivery Experience Workflow (4-Step Stepper)](#6-delivery-experience-workflow-4-step-stepper)
7. [Add Remarks Workflow](#7-add-remarks-workflow)
8. [Form Analysis](#8-form-analysis)
9. [Google Maps Integration](#9-google-maps-integration)
10. [Component Reference](#10-component-reference)
11. [State Management](#11-state-management)
12. [Business Rules Catalog](#12-business-rules-catalog)
13. [Animation & UX Reference](#13-animation--ux-reference)
14. [Responsive Design Breakpoints](#14-responsive-design-breakpoints)
15. [Color Palette Reference](#15-color-palette-reference)
16. [Edge Cases](#16-edge-cases)
17. [Hidden Features & Technical Debt](#17-hidden-features--technical-debt)
18. [Missing Features Report](#18-missing-features-report)
19. [Complete Type & Constant Reference](#19-complete-type--constant-reference)

---

## 1. Architecture Overview

### Problem Domain
A standalone public-facing tracking page for consignees (delivery recipients) — no login required. Provides real-time shipment visibility, driver & vehicle details, live map tracking, POD (Proof of Delivery) upload with OTP verification, e-signature capture, delivery status confirmation, driver rating, and issue/remarks management.

### Key Characteristics
- **No authentication required** — publicly accessible via booking link
- **No API calls** — entire module is driven by hardcoded `mockData` object
- **Self-contained** — 3 files, no Redux/Zustand/Context/store
- **Google Maps powered** — with fallback SVG when API key missing or auth fails
- **Mobile-first responsive** — full mobile experience with adapted layouts

### Entry Point
`ConsigneeTrackingLayout.tsx` — single exported component rendering the full tracking experience.

### External Dependencies
- `@react-google-maps/api` — Google Maps, DirectionsRenderer, MarkerF, PolylineF
- `lucide-react` — 20+ icons
- `VITE_GOOGLE_MAPS_API_KEY` — environment variable for maps

### Hardcoded Mock Data (all UI driven from this)
```typescript
mockData = {
  lrNumber: "ER-DA/102847",
  vehicleNumber: "TN66AP9920",
  driverName: "Rajuuu",
  driverPhone: "+91 8870556900",
  customer: "Devi",
  origin: "Mettupalayam",
  originFull: "8W3Q+488, Mettupalayam, Tamil Nadu 641301",
  destination: "Chitrambalam Layout, Coimbatore",
  destinationFull: "2X9P+M6F, 173 New Street, Chitrambalam Layout",
  currentLocation: "Near Mettupalayam",
  status: "In Transit",
  eta: "27 May 2026 · 06:15 PM",
  arrivingIn: "1h 42m",
  lastUpdated: "2 mins ago",
  progress: 76,              // percentage
  speed: "42 km/h",
  distance: "37.2 km"
}
```

### Hardcoded Map Positions
```typescript
originPosition:      { lat: 11.0259, lng: 76.9788 }  // Mettupalayam
currentPosition:     { lat: 11.0204, lng: 77.0125 }  // In transit
destinationPosition: { lat: 11.0359, lng: 77.0411 }  // Coimbatore
```

---

## 2. Module Structure

```
consignee-web/
├── DriverVehicleModal.tsx      — Driver & vehicle detail modal (tabbed)
├── PodUpload.tsx               — POD upload + OTP + e-signature + driver rating modal
└── ConsigneeTrackingLayout.tsx — Main tracking page layout (root export)
```

### No Routes Defined
This module exports a single component (`ConsigneeTrackingLayout`) — routing is handled by the parent shell that embeds it. No React Router, no route hierarchy.

---

## 3. Screen Inventory

### Main Tracking Page — `ConsigneeTrackingLayout`

**Purpose:** Full consignee delivery tracking experience on a single page.

#### Page Sections (top to bottom)

**1. Header**
| Element | Detail |
|---|---|
| Booking reference | `#5520 · Consignee Link · Verified` |
| Live badge | Green pulsing dot + "LIVE" |
| LR number | `LR: ER-DA/102847` (hidden on mobile) |
| Security badge | ShieldCheck icon + "Secure logistics tracking enabled" |
| Call Driver button | `tel:` link with driver phone |
| Upload POD button | Opens `PodUploadModal` |
| View Invoice button | Opens `InvoicePreviewModal` |
| Add Remarks button | Opens `AddRemarksModal` |

**2. POD Success Banner** (conditional — shows 2.6s after POD upload)
- "POD Updated" + uploaded filename
- Green success styling
- z-index: 3500 (fixed, top-right)

**3. Stats Row (4 cards)**
| Card | Icon | Data |
|---|---|---|
| ETA | Clock | `mockData.eta` |
| Arriving In | Navigation | `mockData.arrivingIn` |
| Progress | PackageCheck | `76% Complete` (accent/dark style + progress bar) |
| Distance | Ruler | `mockData.distance` |

**4. Main 3-Column Grid**

| Column | Width | Contents |
|---|---|---|
| Left (280px) | Fixed | Driver & Vehicle hero card, Route card, Customer info card |
| Center (1.6fr) | Flexible | Google Maps (desktop only, hidden on mobile ≤600px) |
| Right (320px) | Fixed | Shipment activity timeline panel |

**Left Column Details:**

*Driver & Vehicle Hero Card:*
- Dark indigo-to-blue gradient background
- Truck icon button (clickable → opens DriverVehicleModal, vehicle tab)
- Driver name (clickable → opens DriverVehicleModal, driver tab)
- Vehicle number badge
- Phone number with Call link
- "View Details" button → opens DriverVehicleModal

*Route Card:*
- Origin: location pin + full address
- Current location: truck icon + distance remaining
- Destination: location pin + full address
- Status badge: "In Transit" or "completed"
- POD status (if `podCompleted = true`)

*Customer Info Card:*
- Avatar circle with initials
- "Consignee" label
- Customer name
- "Verified" badge

**Center Column (Map):**
- Google Maps with custom markers + polyline
- Map/Satellite toggle (top-left)
- Fullscreen toggle (top-right)
- Bottom status bar: shipment status, vehicle number, speed, last updated
- Arrival timer: "Arrives in {arrivingIn}"
- Falls back to SVG route visualization on API failure

**Right Column (Timeline):**
- Title: "Shipment Activity"
- Progress text: "X of Y steps completed"
- Status badge: "Completed" or "In Transit"
- Progress bar: green-to-indigo gradient
- Timeline entries (6 steps) with staggered animations

#### Default Timeline (6 steps)
| Step | Time | State |
|---|---|---|
| Booking Created | 26 May · 10:20 AM | done ✅ |
| Vehicle Assigned | 26 May · 11:45 AM | done ✅ |
| Picked Up | 27 May · 09:15 AM | done ✅ |
| In Transit | 27 May · 03:55 PM | active 🔵 |
| Out for Delivery | — | pending ⚪ |
| Completed | — | pending ⚪ |

**When `podCompleted = true`:** All 6 steps marked done, "Completed" shows "Just now"

---

### Modal Screens

#### Modal 1: DriverVehicleModal

**Trigger:** "View Details" button on hero card, driver name click, vehicle icon click
**Purpose:** Show full driver and vehicle profile in a tabbed modal.

**Tabs:**
| Tab | Icon | Content |
|---|---|---|
| Driver | User icon | Photo/avatar, name, status badge, vendor, phone |
| Vehicle | Truck icon | Registration, make, model, type, fuel, ownership, vendor |

**Modal Dimensions:** min(760px, 100%) width × min(680px, 88vh) height
**z-index:** 2500

**Driver Detail Items:**
- Phone
- Vendor (shows "Own Fleet" if null)

**Vehicle Detail Items:**
- Registration number
- Manufacturer (make)
- Model + Year
- Vehicle Type
- Fuel Type
- Ownership
- Vendor (shows "Own Fleet" if `ownershipType = OWN`)

---

#### Modal 2: PodUploadModal

**Trigger:** "Upload POD" header button
**Purpose:** Full POD capture flow — file upload or e-signature with OTP verification and driver rating.
**z-index:** 3000

**See full flow in [Section 5](#5-pod-upload-workflow)**

---

#### Modal 3: InvoicePreviewModal

**Trigger:** "View Invoice" header button
**Purpose:** Static preview of booking invoice.
**z-index:** 3200
**Dimensions:** min(900px, 96vw) × max 92vh

**Content:** Static SVG preview showing:
- Booking #5520, LR ER-DA/102847
- Purple header, booking info, consignee section, amount display
- Note: "Static preview — until backend invoice data is connected"

---

#### Modal 4: AddRemarksModal

**Trigger:** "Add Remarks" header button
**Purpose:** Log shipment issues or delivery remarks.
**z-index:** 3000

**See full flow in [Section 7](#7-add-remarks-workflow)**

---

#### Inline Flow: DeliveryExperience (4-step stepper)

**Trigger:** Not shown in UI yet — embedded in layout (unclear trigger point)
**Purpose:** Consignee confirms delivery condition, status, POD, and driver rating.

**See full flow in [Section 6](#6-delivery-experience-workflow-4-step-stepper)**

---

## 4. Feature Inventory

| # | Feature | Status | Location |
|---|---|---|---|
| F-01 | Live shipment tracking page | Live (mock data) | ConsigneeTrackingLayout |
| F-02 | Real-time ETA display | Live (mock) | Stats row |
| F-03 | Progress indicator (%) | Live (mock) | Stats row |
| F-04 | Google Maps live vehicle position | Live (with API key) | MapView |
| F-05 | Map/Satellite toggle | Live | MapView |
| F-06 | Map fullscreen mode | Live | MapView |
| F-07 | SVG fallback map (no API key) | Live | MapView |
| F-08 | Google Distance Matrix ETA update | Live (with API key) | useEffect |
| F-09 | Google Directions route rendering | Live (with API key) | useEffect |
| F-10 | Driver detail modal (tabbed) | Live (mock) | DriverVehicleModal |
| F-11 | Vehicle detail modal (tabbed) | Live (mock) | DriverVehicleModal |
| F-12 | Call driver (tel: link) | Live | Header + hero card |
| F-13 | Activity timeline with step states | Live (mock) | Right column |
| F-14 | POD file upload (PDF/image/doc) | Live UI (no backend) | PodUploadModal |
| F-15 | POD camera capture | Live UI (no backend) | PodUploadModal |
| F-16 | OTP request + verification | Live UI (mock) | PodUploadModal |
| F-17 | E-signature (draw mode) | Live UI (no backend) | PodUploadModal |
| F-18 | E-signature (type mode) | Live UI (no backend) | PodUploadModal |
| F-19 | E-signature (upload mode) | Live UI (no backend) | PodUploadModal |
| F-20 | Driver rating (1–5 stars) | Live UI (no backend) | PodUploadModal |
| F-21 | POD success banner (2.6s) | Live | ConsigneeTrackingLayout |
| F-22 | Timeline auto-complete on POD | Live | activityTimeline computed |
| F-23 | Delivery experience 4-step form | Live UI (no backend) | DeliveryExperience |
| F-24 | Arrival readiness selection (4 options) | Live UI | DeliveryExperience Step 1 |
| F-25 | Goods condition concerns (6 multi-select) | Live UI | DeliveryExperience Step 2 |
| F-26 | Quantity verification (received/damaged) | Live UI | DeliveryExperience Step 2 |
| F-27 | Delivery status confirmation (4 options) | Live UI | DeliveryExperience Step 3 |
| F-28 | Remarks textarea | Live UI | DeliveryExperience Step 3 |
| F-29 | Driver aspect feedback (6 options) | Live UI | DeliveryExperience Step 4 |
| F-30 | Skip driver rating | Live UI | DeliveryExperience Step 4 |
| F-31 | Add remarks modal (7 remark types) | Live UI (no backend) | AddRemarksModal |
| F-32 | Conditional remarks fields by type | Live UI | AddRemarksModal |
| F-33 | Invoice preview modal | Live UI (static SVG) | InvoicePreviewModal |
| F-34 | Mobile-responsive layout | Live | All components |
| F-35 | Body scroll lock on modal open | Live | useEffect in PodUpload |
| F-36 | Escape key to close AddRemarksModal | Live | useEffect in AddRemarksModal |
| F-37 | Real-time OTP | **MOCK** | PodUploadModal |
| F-38 | Actual file upload to server | **MISSING** | No API calls |
| F-39 | Real booking data | **MISSING** | All data hardcoded |
| F-40 | Invoice data from backend | **MISSING** | Static SVG only |

---

## 5. POD Upload Workflow

### Step Flow (PodStep type)

```
"choice"
  ├── [Upload file / Take photo] → set podFileName → "reviewSuccess" (skips OTP)
  └── [E-signature] → "requestOtp"
                            └── [Get OTP] → "verifyOtp"
                                                └── [Verify OTP] → "otpSuccess"
                                                                        └── [Continue] → "esign"
                                                                                              └── [Submit signature] → "reviewSuccess"
                                                                                                                            └── [Submit review] → onComplete(label) → modal closes
```

### Step 1: Choice Screen (`"choice"`)

| Element | Detail |
|---|---|
| Upload file button | Opens `podInputRef` (PDF/PNG/JPG/JPEG/WEBP/DOC/DOCX) |
| Take photo button | Opens `cameraInputRef` (image/*, capture: environment) |
| E-signature button | Goes to `"requestOtp"` |
| Consent checkbox | Required: "I confirm this POD is accurate..." |
| Submit button | Disabled if `!podFileName \|\| !consent` |

**File Types Accepted:**
`.pdf, .png, .jpg, .jpeg, .webp, .doc, .docx`

### Step 2: OTP Request (`"requestOtp"`)

| Element | Detail |
|---|---|
| Stepper | Step 1 of 2 |
| Message | "You'll receive a one-time password..." |
| Display | Mobile number + Email (fallback: "raju@gmail.com") |
| GET OTP button | Advances to `"verifyOtp"` |
| CLOSE button | Closes modal |

### Step 3: OTP Verification (`"verifyOtp"`)

| Element | Detail |
|---|---|
| Stepper | Step 2 of 2 |
| OTP input | Numeric, max 6 digits |
| RESEND OTP | Re-triggers OTP (mock) |
| VERIFY button | Disabled if `otp.length !== 6` → advances to `"otpSuccess"` |

### Step 4: OTP Success (`"otpSuccess"`)

- Success icon (green check)
- "OTP Verified" message
- CONTINUE button → advances to `"esign"`

### Step 5: E-Signature (`"esign"`)

**3 signature modes (tabs):**

| Mode | Element | Validation |
|---|---|---|
| **Draw** | Canvas (device pixel ratio scaled), lineWidth: 3, strokeStyle: #111827 | `hasDrawn = true` |
| **Type** | Text input + large preview (consigneeName pre-filled) | `typedSignature.trim().length > 0` |
| **Upload** | File input (JPG/JPEG/PNG, max 20MB) | `signatureFileName.length > 0` |

Canvas drawing functions:
- `startDraw(event)` — initializes path, captures pointer
- `moveDraw(event)` — draws on canvas, sets `hasDrawn = true`
- `endDraw(event)` — releases pointer capture
- `clearDraw()` — clears canvas, resets `hasDrawn`

Consent checkbox + Submit button (disabled based on mode validation)

### Step 6: Review & Rating (`"reviewSuccess"`)

| Element | Detail |
|---|---|
| Success icon | CheckCircle2 (green) |
| Title | "E-signature uploaded" or "POD uploaded" (based on `completionMethod`) |
| File label | Uploaded filename |
| Driver rating | Star rating 1–5 |
| Rating labels | Poor / Fair / Good / Very good / Excellent |
| Submit button | Disabled if `!driverRating` |

**Rating Colors:**
| Stars | Label | Color |
|---|---|---|
| 1 | Poor | #ef4444 |
| 2 | Fair | #f97316 |
| 3 | Good | #ca8a04 |
| 4 | Very good | #16a34a |
| 5 | Excellent | #7c3aed |

### State Reset
On `isOpen` change → all state variables reset to initial values, `typedSignature` reset to `consigneeName`.

---

## 6. Delivery Experience Workflow (4-Step Stepper)

### Step Names
`["Arrival readiness", "Goods condition", "Confirm delivery", "Driver rating"]`

### Step 1: Arrival Readiness

**4 radio options:**

| Value | Label | Note | Color |
|---|---|---|---|
| `ready` | Ready to receive | Dock is clear, team is present | #16a34a (green) |
| `30min` | Need 30 mins | Clearing dock space | #d97706 (amber) |
| `closed` | Warehouse closed | Need to reschedule | #dc2626 (red) |
| `call` | Call before arrival | Driver should call 15 mins ahead | #0284c7 (blue) |

**Validation:** `readiness` must be set to advance.

### Step 2: Goods Condition

**Concern multi-select (6 options):**

| Value | Label | Sub-label | Color |
|---|---|---|---|
| `pkg` | Packaging damaged | Outer box/wrap | #d97706 |
| `wrong` | Wrong material | SKU mismatch | #dc2626 |
| `qty` | Quantity mismatch | Count differs | #7c3aed |
| `seal` | Seal broken | Tamper evident | #d97706 |
| `partial` | Partial delivery | Some items missing | #0284c7 |
| `delay` | Vehicle delay | Arrived very late | #64748b |

**Quantity Verification:**
- Received Qty: number input with `+` / `−` buttons
- Damaged Qty: number input with `+` / `−` buttons

**Validation:** No hard requirements on this step.

### Step 3: Confirm Delivery

**Delivery status (4 options):**

| Value | Label | Description | Icon Color |
|---|---|---|---|
| `accepted` | Accepted | All goods received in good condition | #16a34a |
| `remarks` | With remarks | Accepted but noting an issue | #d97706 |
| `partial` | Partial accept | Some items accepted, some rejected | #0284c7 |
| `rejected` | Rejected | Cannot accept this shipment | #dc2626 |

**Additional fields:**
- POD file upload (PDF/PNG/JPG/JPEG/WEBP)
- Remarks textarea

**Validation:** `status` must be set to advance.

### Step 4: Driver Rating

| Element | Detail |
|---|---|
| Driver info card | Shows driver name and vehicle number |
| Star rating | 1–5 stars |
| "What stood out?" | 6 aspect chips (multi-select) |
| Skip button | Bypasses rating |
| Submit button | Disabled if `!driverRating` |

**Driver Aspects (6):**
`"On-time arrival"` | `"Careful handling"` | `"Good communication"` | `"Professional"` | `"Helped unload"` | `"Documents ready"`

### Success Screen
- Shows submitted data as tags (readiness, status, rating, concerns)
- "Start over" button resets form

---

## 7. Add Remarks Workflow

### Remark Types (7)

| Value | Label | Hint |
|---|---|---|
| `shipment_intact` | Shipment Intact | No issues found at delivery |
| `shipment_damaged` | Shipment Damaged | Damage seen or reported |
| `partial_delivery` | Partially Delivered | Only part of the shipment was received |
| `reject_material` | Reject Material | Consignee rejected some items |
| `extra_material_received` | Extra Material Received | More items received than expected |
| `destination_changed` | Destination changed | Delivery location needs updating |
| `consignee_destination_changed` | Consignee & destination changed | Both consignee and location changed |

### Conditional Fields by Remark Type

| Remark Type | needsImage | needsQuantity | needsLocation |
|---|---|---|---|
| `shipment_damaged` | ✅ | ❌ | ❌ |
| `reject_material` | ✅ | ✅ | ❌ |
| `partial_delivery` | ❌ | ✅ | ❌ |
| `extra_material_received` | ❌ | ✅ | ❌ |
| `destination_changed` | ❌ | ❌ | ✅ |
| `consignee_destination_changed` | ❌ | ❌ | ✅ |
| `shipment_intact` | ❌ | ❌ | ❌ |

### Quantity Field Labels by Type
| Type | Field Label |
|---|---|
| `partial_delivery` | "Undelivered quantity" |
| `reject_material` | "Rejected quantity" |
| `extra_material_received` | "Extra quantity received" |

### Modal Behavior
- Escape key → closes modal
- Mobile (≤600px): full screen (100vw × 100dvh)
- Desktop: centered overlay

---

## 8. Form Analysis

### Form 1: POD Upload — Choice Screen
| Field | Type | Required | Accepted |
|---|---|---|---|
| POD file | file input | Conditional | `.pdf,.png,.jpg,.jpeg,.webp,.doc,.docx` |
| Camera capture | file input | Conditional | `image/*`, `capture: environment` |
| Consent | checkbox | Yes | — |

### Form 2: POD Upload — OTP Verification
| Field | Type | Required | Validation |
|---|---|---|---|
| OTP | text input | Yes | numeric, exactly 6 digits |

### Form 3: POD Upload — E-Signature
| Mode | Field | Validation |
|---|---|---|
| Draw | Canvas | `hasDrawn = true` |
| Type | Text input | `typedSignature.trim().length > 0` |
| Upload | File input | `.jpg,.jpeg,.png` | `signatureFileName.length > 0` |
| All modes | Consent checkbox | Required |

### Form 4: POD Upload — Driver Rating
| Field | Type | Required |
|---|---|---|
| Driver rating | Star (1–5) | Yes — blocks submit |

### Form 5: Delivery Experience
| Step | Field | Type | Required |
|---|---|---|---|
| 1 | Readiness | Radio (1 of 4) | Yes |
| 2 | Concerns | Multi-select (0–6) | No |
| 2 | Received quantity | Number (+/−) | No |
| 2 | Damaged quantity | Number (+/−) | No |
| 3 | Delivery status | Card (1 of 4) | Yes |
| 3 | POD file | File upload | No |
| 3 | Remarks | Textarea | No |
| 4 | Driver rating | Star (1–5) | Yes (or skip) |
| 4 | Driver aspects | Multi-select (0–6) | No |

### Form 6: Add Remarks Modal
| Field | Type | Required | Condition |
|---|---|---|---|
| Remark type | Select (1 of 7) | Yes | Always |
| Original quantity | Number (read-only) | — | `needsQuantity` |
| Qty (undelivered/rejected/extra) | Number | Conditional | `needsQuantity` |
| Location | Textarea | Conditional | `needsLocation` |
| Image upload | File (PNG/JPG/JPEG/WEBP/PDF) | Conditional | `needsImage` |
| Comments/Description | Textarea | Yes (for non-intact) | Always |
| Additional comments | Textarea | No | Conditional |

---

## 9. Google Maps Integration

### Configuration
```typescript
googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY

mapOptions: {
  clickableIcons: true,
  fullscreenControl: true,
  gestureHandling: "greedy",
  mapTypeControl: false,
  streetViewControl: true,
  zoomControl: true
}
```

### Markers
| Marker | Position | Label |
|---|---|---|
| Origin | `{ lat: 11.0259, lng: 76.9788 }` | O |
| Current | `{ lat: 11.0204, lng: 77.0125 }` | S |
| Destination | `{ lat: 11.0359, lng: 77.0411 }` | D |

### Polyline
- Color: `#4f46e5` (indigo)
- Stroke weight: 5
- Path: `[originPosition, currentPosition, destinationPosition]`

### Google Distance Matrix
- Origin: `currentPosition`
- Destination: `destinationPosition`
- Travel mode: `DRIVING`
- Unit system: `METRIC`
- On success: updates `travelMetrics.eta`, `arrivingIn`
- On error: falls back to static mock values

### Google Directions Service
- Origin: `originPosition`
- Destination: `destinationPosition`
- Waypoint: `currentPosition` (stopover: true)
- On success: updates `directions` state → rendered by `DirectionsRenderer`

### Auth Failure Handling
- `window.gm_authFailure` callback → sets `mapAuthFailed = true`
- Updates `travelMetrics.source` to indicate static estimate
- Triggers SVG fallback map render

### SVG Fallback Map
- Gradient background
- Route visualization with pulse animation
- Shows vehicle number, speed, last updated
- "Powered by Optimile" text

### Fullscreen Mode
- `isMapFullscreen = true` → z-index 5000
- `document.body.style.overflow = "hidden"` (restored on exit)

---

## 10. Component Reference

### `DriverVehicleModal`
| Prop | Type | Required |
|---|---|---|
| `isOpen` | boolean | Yes |
| `onClose` | () => void | Yes |
| `driver` | DriverDetail | Yes |
| `vehicle` | VehicleDetail | Yes |
| `initialTab` | `"driver" \| "vehicle"` | No |

**State:** `selectedTab: DetailTab` — resets on `isOpen` change

**Memoized items:** `driverItems` and `vehicleItems` via `useMemo`

---

### `PodUploadModal`
| Prop | Type | Required |
|---|---|---|
| `isOpen` | boolean | Yes |
| `onClose` | () => void | Yes |
| `consigneeName` | string | Yes |
| `contactPhone` | string | Yes |
| `contactEmail` | string | No |
| `onComplete` | (label: string) => void | Yes |

---

### `MapView`
| Prop | Type |
|---|---|
| `arrivingIn` | string |
| `directions` | google.maps.DirectionsResult \| null |
| `isMapLoaded` | boolean |
| `loadError` | Error \| undefined |
| `mapAuthFailed` | boolean |
| `mapMode` | `"roadmap" \| "satellite"` |
| `progress` | number |
| `isFullscreen` | boolean |
| `onMapModeChange` | (mode) => void |
| `onToggleFullscreen` | () => void |

---

### `StatCard`
| Prop | Type |
|---|---|
| `icon` | LucideIcon |
| `label` | string |
| `value` | string |
| `accent` | boolean (optional) — dark gradient style |
| `progress` | number (optional) — renders progress bar |

---

### `Dot` (Timeline step indicator)
| State | Icon | Color |
|---|---|---|
| `done` | CheckCircle2 | #059669 (green) |
| `active` | Radio | #4f46e5 (indigo) |
| `pending` | Circle | #f1f5f9 (gray) |

---

### `DeliveryExperience`
4-step embedded form component with navigation (Back/Continue) and success screen.

---

### Sub-components in PodUpload

| Component | Purpose |
|---|---|
| `DrawSignature` | Canvas with Clear button + pointer handlers |
| `TypeSignature` | Text input + large name preview |
| `UploadSignature` | File upload with button |
| `Stepper` | 2-step indicator (step 1 or 2 of 2) |
| `StepDot` | Circular dot: active/done/pending |
| `ModalHeader` | Title + close (X) button |
| `Divider` | Horizontal divider with "or" |
| `Consent` | Checkbox + legal text |
| `PrimaryButton` | Full-width primary CTA |
| `PrimarySmallButton` | Small primary CTA |
| `SecondaryButton` | Secondary outline button |

---

## 11. State Management

### Architecture
**No global state.** Each component manages its own local state via `useState`. No Redux, Zustand, Context, or store.

### ConsigneeTrackingLayout State
```typescript
selectedPodName: string           // Uploaded POD filename
podCompleted: boolean             // POD upload completed flag
showPodSuccess: boolean           // Success banner visible (auto-hides 2.6s)
directions: DirectionsResult | null
mapAuthFailed: boolean
mapMode: "roadmap" | "satellite"
isMapFullscreen: boolean
showInvoiceModal: boolean
showDeliveryModal: boolean
showPodModal: boolean
showDriverVehicleModal: boolean
driverVehicleTab: "driver" | "vehicle"
travelMetrics: {
  eta: string
  arrivingIn: string
  distance: string
  source: string
}
progress: number  // 76 (hardcoded)
```

### PodUploadModal State
```typescript
step: PodStep
podFileName: string
consent: boolean
otp: string
signatureMode: SignatureMode
typedSignature: string  // initialized to consigneeName
signatureFileName: string
hasDrawn: boolean
driverRating: number
driverRatingPreview: number
completionLabel: string
completionMethod: CompletionMethod
isMobile: boolean  // window.innerWidth <= 600
```

### DeliveryFormState
```typescript
readiness: ReadinessOption
concerns: ConcernKey[]
receivedQty: number
damagedQty: number
status: DeliveryStatus
podFileName: string
remarks: string
driverRating: number
driverAspects: string[]
```

---

## 12. Business Rules Catalog

| # | Rule | Detail |
|---|---|---|
| BR-01 | POD file required before submit | `!podFileName \|\| !consent` → Submit disabled |
| BR-02 | Consent required for POD | Consent checkbox must be checked |
| BR-03 | OTP must be 6 digits | `otp.length !== 6` → VERIFY disabled |
| BR-04 | E-signature draw: must have drawn | `hasDrawn = true` required |
| BR-05 | E-signature type: must have text | `typedSignature.trim().length > 0` |
| BR-06 | E-signature upload: file required | `signatureFileName.length > 0` |
| BR-07 | Driver rating required for POD submit | `!driverRating` → Submit disabled |
| BR-08 | Delivery step 1: readiness required | `readiness` must be set |
| BR-09 | Delivery step 3: status required | `status` must be set |
| BR-10 | Delivery step 4: rating required or skip | `driverRating > 0` or skip button |
| BR-11 | POD success banner auto-hides | `setTimeout 2600ms` → `showPodSuccess = false` |
| BR-12 | Timeline auto-completes on POD | All steps marked done when `podCompleted = true` |
| BR-13 | Vendor shown as "Own Fleet" if null | `driver.vendorName ?? "Own Fleet"` |
| BR-14 | Vehicle vendor: "Own Fleet" if OWN type | `ownershipType === "OWN"` check |
| BR-15 | Canvas scaled for device pixel ratio | `window.devicePixelRatio` applied |
| BR-16 | Signature mode resets on modal close | `step` reset via `useEffect` on `isOpen` |
| BR-17 | Modal does not close on backdrop click | No backdrop click handler on DriverVehicleModal |
| BR-18 | Body scroll locked when modal open | `overflow: hidden` on body |
| BR-19 | Map fullscreen locks body scroll | `overflow: hidden` on fullscreen |
| BR-20 | Google Distance Matrix updates ETA | Real API call (if key available) |
| BR-21 | Driver call uses cleaned phone number | `driverPhone.replace(/[^+\d]/g, "")` |
| BR-22 | Signature file: max 20MB | Documented in UI hint (not enforced in code) |
| BR-23 | Remarks: needsQuantity types | partial_delivery, reject_material, extra_material_received |
| BR-24 | Remarks: needsImage types | shipment_damaged, reject_material |
| BR-25 | Remarks: needsLocation types | destination_changed, consignee_destination_changed |

---

## 13. Animation & UX Reference

### CSS Keyframe Animations

| Animation | Effect | Duration |
|---|---|---|
| `deSlideIn` | opacity 0→1, translateX 14px→0 | 0.3s ease |
| `riseIn` | opacity 0→1, translateY 16px→0, scale 0.985→1 | 0.6–0.78s |
| `slideFade` | opacity 0→1, translateX 12px→0 | 0.55s |
| `driftOrb` | translate3d drift + scale 1→1.04 | loop |
| `heroBreath` | box-shadow pulse | 7s ease-in-out |
| `softGlow` | box-shadow glow + translateY | 2.8s |
| `bannerDrop` | opacity 0→1, translateY -10px→0 | 0.42s |
| `pulse` | opacity 1→0.4→1 | loop |

### Element Animation Classes

| Class | Animation | Delay |
|---|---|---|
| `.tracking-panel` | riseIn 0.65s | — |
| `.stat-card` | riseIn 0.6s | 0.05s, 0.12s, 0.19s, 0.26s, 0.33s (staggered) |
| `.hero-card` | riseIn 0.72s + heroBreath 7s | — |
| `.floating-map` | riseIn 0.78s | — |
| `.timeline-entry` | slideFade 0.55s | 0.12s + (index × 0.08s) staggered |
| `.status-pill` | softGlow 2.8s | — |
| `.pod-banner` | bannerDrop 0.42s | — |

### Track Grid Staggered Delays
- Left column: 0.18s
- Center column: 0.26s
- Right column: 0.34s

---

## 14. Responsive Design Breakpoints

### max-width: 900px
- Track grid: single column
- Timeline body: flex column

### max-width: 600px (Mobile)
| Element | Mobile Behavior |
|---|---|
| Header | flex-direction: column |
| Header actions | 2-column grid |
| Google Map | `display: none` |
| Track grid | 1 column, route card above driver card |
| Remarks modal | Full screen (100vw × 100dvh) |
| Invoice modal | Full screen |
| View button | inline-flex (static position) |
| Route "open in map" button | visible |
| "Powered by Optimile" | mobile version shown |
| Font sizes | 12px labels, 13px buttons |
| Button heights | min 44px |
| Padding | reduced to 14–18px |
| Remarks fields grid | 2-col → 1-col |

---

## 15. Color Palette Reference

| Color | Hex | Usage |
|---|---|---|
| Primary (Indigo-600) | `#4f46e5` | Buttons, active states, polyline, tabs |
| Primary Dark | `#312e81` | Gradient endpoint |
| Success Green | `#16a34a`, `#059669` | Done states, accepted status |
| Progress Green | `#10b981`, `#34d399` | Progress bar gradient |
| Warning Amber | `#d97706`, `#f97316` | With remarks, fair rating |
| Error Red | `#dc2626`, `#ef4444` | Rejected status, poor rating |
| Info Blue | `#0284c7` | Partial accept, call option |
| Purple | `#7c3aed` | Excellent rating, quantity concern |
| Neutral Dark | `#0f172a` | Text primary |
| Neutral Gray | `#64748b` | Secondary text |
| Border | `#e2e8f0` | Input borders, dividers |
| Background | `#f8fafc` | Page background |
| Indigo Light | `#eef2ff` | Soft backgrounds |

---

## 16. Edge Cases

| Scenario | Current Handling |
|---|---|
| No Google Maps API key | SVG fallback map rendered |
| Google Maps auth failure | `window.gm_authFailure` → SVG fallback, travelMetrics.source updated |
| Distance Matrix API error | Falls back to static `mockData` values |
| Directions API error | `directions = null` → PolylineF renders from `routePath` |
| OTP wrong (6 digits but wrong) | No validation — any 6 digits pass |
| File size > 20MB (signature) | UI hint only — no actual file size check in code |
| Canvas on non-touch device | Pointer events used (compatible with both mouse and touch) |
| Device pixel ratio scaling | Applied via `window.devicePixelRatio` on canvas |
| `consigneeName` empty | `typedSignature` initialized to empty string |
| `contactEmail` not provided | Fallback: "raju@gmail.com" (hardcoded) |
| Vendor is null on driver | Shown as "Own Fleet" |
| Vehicle ownership = OWN | Vendor shown as "Own Fleet" |
| POD success banner | Auto-hides after 2600ms via `setTimeout` |
| Modal tab switch on close | `selectedTab` resets via `useEffect` on `isOpen` |
| Skip driver rating | Allowed via "Skip" button — `onComplete` still called |
| Map fullscreen body scroll | Locked; restored on exit via cleanup function |
| Escape key | Only handled in `AddRemarksModal` |

---

## 17. Hidden Features & Technical Debt

### Stub / Non-functional Features

| Feature | Status | Detail |
|---|---|---|
| OTP verification | Mock only | Any 6-digit input passes — no real OTP send/verify |
| File upload | UI only | Files selected but not sent anywhere |
| E-signature submission | UI only | Signature captured but not transmitted |
| Driver rating submission | UI only | Rating selected but not stored |
| Delivery form submission | UI only | Form completes but no API call |
| Remarks submission | UI only | Form submits visually but no API call |
| Invoice data | Static SVG | Hardcoded SVG — "Until backend invoice data is connected" |
| All shipment data | Hardcoded | `mockData` object — no API integration |
| ETA polling | One-time | Distance Matrix called once on mount, not re-polled |

### Technical Debt

| Item | Severity | Detail |
|---|---|---|
| **All data hardcoded in mockData** | Critical | No API calls anywhere in the module |
| **Hardcoded OTP passthrough** | High | Any 6 digits pass verification — security risk |
| **No file size enforcement** | High | 20MB limit mentioned in UI but not validated |
| **Hardcoded email fallback** | Medium | "raju@gmail.com" hardcoded as email fallback |
| **Hardcoded map coordinates** | Medium | Tamil Nadu coordinates hardcoded — not dynamic |
| **No polling for live updates** | Medium | Distance Matrix only called once on mount |
| **No error boundary** | Medium | No error boundary on Google Maps failures |
| **Static invoice SVG** | Medium | Not connected to real booking data |
| **Single-file 2000+ line component** | Medium | `ConsigneeTrackingLayout` is very large — needs decomposition |
| **No loading states** | Low | No skeleton loaders for async operations |
| **Phone number regex brittle** | Low | `replace(/[^+\d]/g, "")` may fail on some formats |

---

## 18. Missing Features Report

| # | Feature | Priority | Detail |
|---|---|---|---|
| MF-01 | Real booking data API | Critical | All data hardcoded — no HTTP integration |
| MF-02 | Real OTP generation & verification | Critical | Mock passthrough — security gap |
| MF-03 | File upload to server (POD/signature) | Critical | Files selected but never sent |
| MF-04 | Driver rating submission | High | Rating captured but not persisted |
| MF-05 | Delivery form submission | High | 4-step form has no backend submission |
| MF-06 | Remarks submission | High | Add Remarks modal has no API call |
| MF-07 | Real invoice data | High | Static SVG — not connected to booking |
| MF-08 | Live location polling | High | Single Distance Matrix call — no re-poll |
| MF-09 | Authentication / link validation | Medium | No check if booking link is valid/expired |
| MF-10 | Link expiry handling | Medium | Public URL — no expiry enforcement |
| MF-11 | Multiple deliveries support | Medium | UI shows single delivery — no multi-drop |
| MF-12 | Partial delivery quantity tracking | Medium | UI captures qty but no backend |
| MF-13 | Consignee notification (SMS/email) | Medium | No notification trigger on POD |
| MF-14 | Map auto-refresh (vehicle position) | Medium | Static position — no real-time updates |
| MF-15 | E-way bill display | Low | Not found in UI |
| MF-16 | Multi-language support | Low | English only |
| MF-17 | Dark mode | Low | Not implemented |
| MF-18 | Accessibility (ARIA) | Low | No ARIA labels found |
| MF-19 | File size validation (client-side) | Low | 20MB hint but no enforcement |
| MF-20 | Error states for API failures | Low | No error UI for network failures |

---

## 19. Complete Type & Constant Reference

### Types

| Type | Values |
|---|---|
| `PodStep` | `"choice"` \| `"requestOtp"` \| `"verifyOtp"` \| `"otpSuccess"` \| `"esign"` \| `"reviewSuccess"` |
| `SignatureMode` | `"draw"` \| `"type"` \| `"upload"` |
| `CompletionMethod` | `"pod"` \| `"esign"` |
| `DetailTab` | `"driver"` \| `"vehicle"` |
| `ReadinessOption` | `"ready"` \| `"30min"` \| `"closed"` \| `"call"` \| `""` |
| `DeliveryStatus` | `"accepted"` \| `"remarks"` \| `"partial"` \| `"rejected"` \| `""` |
| `ConcernKey` | `"pkg"` \| `"wrong"` \| `"qty"` \| `"seal"` \| `"partial"` \| `"delay"` |
| `RemarkKind` | 7 values (shipment_intact, shipment_damaged, partial_delivery, reject_material, extra_material_received, destination_changed, consignee_destination_changed) |
| `MapMode` | `"roadmap"` \| `"satellite"` |

### Key Constants

| Constant | Value |
|---|---|
| `ACCENT_COLOR` | `"#4f46e5"` |
| `primary` | `"#4f46e5"` |
| `primaryDark` | `"#312e81"` |
| `softBorder` | `"#e2e8f0"` |
| `emptyValue` | `"-"` |
| `STEP_NAMES` | `["Arrival readiness", "Goods condition", "Confirm delivery", "Driver rating"]` |
| `RATING_WORDS` | `["", "Poor", "Fair", "Good", "Great", "Excellent"]` |
| `DRIVER_ASPECTS` | 6 strings |
| `REMARK_TYPES` | 7 objects |
| `READINESS_OPTIONS` | 4 objects |
| `CONCERNS` | 6 objects |
| `STATUSES` | 4 objects |

### Modal z-index Stack

| Modal | z-index |
|---|---|
| DriverVehicleModal | 2500 |
| PodUploadModal | 3000 |
| AddRemarksModal | 3000 |
| InvoicePreviewModal | 3200 |
| POD success toast | 3500 |
| Fullscreen map | 5000 |

### File Input Accept Strings

| Input | Accept |
|---|---|
| POD file | `.pdf,.png,.jpg,.jpeg,.webp,.doc,.docx` |
| Camera capture | `image/*` (capture: environment) |
| Signature upload | `.jpg,.jpeg,.png` |
| Remarks image | `.png,.jpg,.jpeg,.webp,.pdf` |

### Interface Definitions (Key Fields)

**DriverDetail:**
`name` | `phone` | `rating?` | `experience?` | `license?` | `status` | `dob?` | `photoUrl?` | `address?` | `bloodGroup?` | `licenseType?` | `licenseExpiry?` | `medicalExpiry?` | `drugTestStatus?` | `endorsements?` | `assignedVehicle?` | `vendorName?` | `isActive?`

**VehicleDetail:**
`number` | `model` | `capacity?` | `lastService?` | `insurance?` | `status` | `speedCurrent?` | `fuelLevel?` | `make?` | `year?` | `vehicleType?` | `fuelType?` | `ownershipType?` | `vendorName?` | `chassisNo?` | `insuranceNumber?` | `insuranceExpiry?` | `fitnessNumber?` | `fitnessExpiry?` | `pucNumber?` | `pucExpiry?` | `permitType?` | `permitExpiry?` | `odometer?` | `isActive?`

**TravelMetrics:**
`eta: string` | `arrivingIn: string` | `distance: string` | `source: string`

---

*End of Consignee-Web Module Deep Code Review — Reverse-engineered from full source scan of `/modules/consignee-web/` (3 files)*
