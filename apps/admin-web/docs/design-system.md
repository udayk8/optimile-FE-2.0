# Auction Web App — Design System Guidelines

> This portal should follow the same enterprise grammar as the vendor portal, but tuned for auction operations: timers, lane matrices, ranking reviews, and award decisions should be the primary visual language.

---

## 1. Design Direction

Use a clean logistics control-tower style.

The UI should feel:

- Operational
- Calm
- Data-first
- Urgent only when needed
- Easy to scan during live events
- Consistent with Optimile internal modules

Avoid:

- Dark themes
- Heavy gradients
- Loud color everywhere
- Consumer-style card overload
- Fancy auction visuals that reduce readability

---

## 2. Portal Character

This is not a vendor-facing bidding room. It is an internal command-and-control portal for Ops and Procurement.

That means:

- Dense information is acceptable where operationally useful
- Timers and exceptions should stand out
- Inputs should be structured and conservative
- Every critical action must feel auditable

---

## 3. Layout Rules

All screens should use:

- Fixed left sidebar
- Sticky topbar
- Light gray app background
- White cards for content
- Generous spacing for summary sections
- Stronger grouping on live-monitor pages

### App shell

```text
AppShell
  Sidebar
  MainArea
    Topbar
    PageHeader
    ContentGrid
```

### Spacing

- Page padding: 24px desktop, 16px tablet, 12px mobile
- Card gap: 16px to 24px
- Section gap: 24px

---

## 4. Navigation Pattern

### Sidebar

- Width: 268px
- White background
- Light border-right
- Each item uses:
  - icon
  - main label
  - optional short subtitle

### Topbar

- Current module label
- Page title context
- Notification icon
- User block with role

### Mobile

- Use collapsible drawer, not full persistent sidebar
- Keep primary destinations limited to:
  - Dashboard
  - Auctions
  - Contracts
  - Exceptions
  - More

---

## 5. Color System

Use a restrained enterprise palette.

### Core colors

- Primary: blue
- Neutral text: slate / navy
- Background: off-white / cool gray
- Card: white
- Border: light gray

### Semantic mapping

- Green: awarded, active, healthy, synced
- Blue: live, in-progress, informational
- Amber: pending, scheduled, warning, overdue soon
- Red: cancelled, failed, blocked, exception, placement failure
- Gray: draft, inactive, archived, no-bids neutral surfaces

### Auction-specific usage

- Live timer cards: blue by default, amber near end, red only when urgent
- L1 indicator: neutral base with subtle green accent
- No-bid lanes: muted gray with warning outline
- Override-required actions: amber accent, never red unless destructive

---

## 6. Typography

- Font family: Inter for UI text
- Monospace: JetBrains Mono for IDs, rates, lane IDs, timestamps, bid values where comparison matters

### Type scale

- Page title: 28px bold
- Section title: 20px semibold
- Card title: 15px semibold
- KPI metric: 32px to 40px bold
- Body: 14px
- Helper text: 12px
- Table header: 11px uppercase semibold

---

## 7. Core Card Types

Limit page composition to a small set of reusable card types.

### Hero card

- Used on dashboard and major detail pages
- Contains:
  - eyebrow label
  - title
  - subtitle
  - key action

### KPI card

- Numeric metric
- Small trend or warning copy
- Optional icon block

### Workflow card

- Used for create-flow steps and award action summaries

### Detail card

- Used for booking snapshot, auction settings, contract summary

### Registry card

- Used for master-data tables

### Alert card

- Used for launch blockers, award SLA risk, placement failure notices

### Live lane card

- Dedicated component for Bulk/Lot lane monitoring
- Shows:
  - lane name
  - vehicle type
  - current state
  - timer
  - L1 amount
  - bid count
  - extension count

---

## 8. Auction-Specific Component Rules

### Timer cards

- Must be large and legible
- Use monospace numbers
- Animate only on extension or threshold change
- Do not use continuous flashy animation

### Bid leaderboard table

- Rows ordered by rank
- Rank badge fixed on left
- Winning row subtly highlighted
- Show bid amount, vendor name, timestamp, bid status

### Lane matrix

- Use card grid on tablet/mobile
- Use compact matrix or table on desktop
- One lane should be easy to inspect without opening a modal

### Split allocation editor

- Use segmented numeric inputs for L1/L2/L3
- Show live total
- Display hard error if total != 100

### Vendor eligibility list

- Use checklist rows with lane tags
- Show disabled state for non-removable restrictions
- Coverage warning must appear above the list

---

## 9. Form Design Rules

### General

- Use 2-column forms on desktop
- Collapse to 1 column on tablet/mobile
- Group fields into cards
- Use sticky footer for create flows

### Spot create form

- Keep short and decisive
- Booking snapshot read-only
- Configuration fields grouped separately from invite list

### Bulk/Lot wizard

- Lane rows should be editable inline
- Summary panel should remain visible
- Launch CTA only on final step

### Destructive or irreversible actions

- Launch auction
- Cancel auction
- Confirm award
- L1 override

Each must use confirmation dialog with concise consequence text.

---

## 10. Table Rules

All data-heavy screens should use standardized tables.

### Required capabilities

- Search
- Filter chips
- Sort
- Pagination
- Empty state
- Loading skeleton
- Error state

### Priority tables

- Auctions list
- Contracts list
- Base prices
- Empanelment
- Exceptions queues

### Row design

- Row height: 64px to 72px
- Primary value first
- Status chip visible without hover
- Row click should open detail view

---

## 11. Status and Chips

Every major record must render through a central status mapping.

### Auction statuses

- `DRAFT`
- `LIVE`
- `COMPLETED`
- `AWARDED`
- `NO_BIDS`
- `CANCELLED`

### Contract statuses

- `DRAFT`
- `ACTIVE`
- `EXPIRED`
- `TERMINATED`

### Exception statuses

- `AWAITING_APPROVAL`
- `FAILED_PLACEMENT`
- `DEBIT_NOTE_TRIGGERED`
- `UNAWARDED`

Use soft-tinted pills, not saturated blocks.

---

## 12. Live Monitoring UX

This is the most important unique screen family in the app.

### Principles

- Time first
- Lane second
- Actions third
- Audit always accessible

### Screen structure

- Left: live lane grid / bid ladder
- Right: event feed + settings summary + action panel

### Visual hierarchy

- Timers largest
- Auction status prominent
- Bid values monospace
- Alerts inline near affected lane

---

## 13. Award UX

Award screens should feel careful, not rushed.

### Layout

- Left: ranking and lane decisions
- Right: summary, base-price comparison, contract output preview

### L1 override

- Must visually separate from normal confirm action
- Require modal with mandatory reason textarea
- Show immutable-warning text

### Reject all

- Use danger style
- Require confirmation

---

## 14. Contracts UX

Contracts are read-heavy and should feel stable.

### Detail page sections

- Summary
- Commercials
- Allocation
- Source auction
- SLA context
- Audit

### Comparison cues

- Show contracted rate versus base price
- Show rank and allocation percentage
- Show sibling contracts for same lane when split allocations exist

---

## 15. Dashboard UX

Dashboard should be simple and operational.

### Recommended top row

- Live auctions
- Pending awards
- Contracts expiring
- Exceptions needing action

### Recommended second row

- Auction trend chart
- Unawarded lanes
- Placement failures
- Notification feed

Keep charts minimal and interpretation-focused.

---

## 16. Empty, Error, and Blocked States

### Empty state tone

- Clear
- Neutral
- Action-oriented

Examples:

- No live auctions
- No contracts matching this filter
- No base price missing in selected region

### Blocked state use cases

- Fewer than 2 empanelled vendors
- Duplicate live lane auction conflict
- Missing ceiling value
- Missing override reason

Blocked states should explain the exact lane or record causing the issue.

---

## 17. Audit and Notification Presentation

### Audit timeline

Use chronological timeline with:

- actor
- action
- timestamp
- old/new values when relevant
- reason text for override or cancellation

### Notification center

Support:

- unread/read state
- type icon
- timestamp
- deep link to source record

Prioritize:

- auction live
- timer extension
- completed
- award due
- award complete
- cancellation
- placement failure
- contract expiry warning

---

## 18. Responsive Behavior

### Desktop

- Full sidebar
- Multi-column dashboard
- Side-by-side live monitor and award layouts

### Tablet

- Collapsible sidebar
- 2-column cards
- Lane matrix becomes stacked cards if needed

### Mobile

- Only critical operational views should remain fully usable
- Create flows should still work, but live-monitor density can simplify
- Tables should switch to card lists when necessary

---

## 19. Tailwind and Component Rules

- Define shared tokens in one place
- Avoid ad-hoc inline color classes
- Build reusable utilities:
  - `page-shell`
  - `module-card`
  - `hero-card`
  - `kpi-card`
  - `status-chip`
  - `auction-timer-card`
  - `lane-grid`

Use Lucide React consistently for icons.

---

## 20. Non-Negotiable UX Constraints from BRD

- Vendors must never see internal ceiling rates in any mirrored or shared screen
- All live auction config becomes read-only after launch
- Lane-level timer extensions for Bulk/Lot must be visually independent
- L1 override must require reason capture in UI
- Spot award flow must not imply automated fallback to L2/L3
- No-bid and cancelled states must remain visible as terminal records
- Auditability must be visible on every critical record

