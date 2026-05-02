# Fleet UI Reference

This note is based on the actual `fleet-web` implementation, not just the high-level `DESIGN.md`.

Use this as the working reference when making other modules visually consistent with Fleet.

## 1. Core Feel

Fleet feels:

- operational, not decorative
- dense, but calm
- white-surface on soft gray canvas
- semantic-color driven
- typography-led instead of illustration-led
- strong on structure, restrained on effects

The main visual formula is:

- page canvas: `bg-background`
- almost every content surface: `rounded-xl border border-gray-200 bg-white shadow-sm`
- secondary inset surface: `rounded-xl bg-gray-50` or `border border-gray-200 bg-gray-50`
- primary emphasis: deep blue
- accent/orange: mostly for eyebrow labels and select CTAs
- state colors: success, warning, danger only when meaning is attached

This is why Fleet feels consistent: it repeats the same container, spacing, label, and status patterns everywhere.

## 2. Source Files To Treat As Canon

These are the strongest reference files:

- [DESIGN.md](/Users/udayyaduwanshi/optimile%20FE%202.0%20/frontend-main/DESIGN.md)
- [modules/fleet-web/src/styles/global.css](/Users/udayyaduwanshi/optimile%20FE%202.0%20/frontend-main/modules/fleet-web/src/styles/global.css)
- [modules/fleet-web/src/components/Layout.tsx](/Users/udayyaduwanshi/optimile%20FE%202.0%20/frontend-main/modules/fleet-web/src/components/Layout.tsx)
- [modules/fleet-web/src/components/PageHeader.tsx](/Users/udayyaduwanshi/optimile%20FE%202.0%20/frontend-main/modules/fleet-web/src/components/PageHeader.tsx)
- [modules/fleet-web/src/components/Button.tsx](/Users/udayyaduwanshi/optimile%20FE%202.0%20/frontend-main/modules/fleet-web/src/components/Button.tsx)
- [modules/fleet-web/src/components/FilterBar.tsx](/Users/udayyaduwanshi/optimile%20FE%202.0%20/frontend-main/modules/fleet-web/src/components/FilterBar.tsx)
- [modules/fleet-web/src/components/DataTable.tsx](/Users/udayyaduwanshi/optimile%20FE%202.0%20/frontend-main/modules/fleet-web/src/components/DataTable.tsx)
- [modules/fleet-web/src/components/StatusBadge.tsx](/Users/udayyaduwanshi/optimile%20FE%202.0%20/frontend-main/modules/fleet-web/src/components/StatusBadge.tsx)
- [modules/fleet-web/src/modules/fleet/FleetDashboardPage.tsx](/Users/udayyaduwanshi/optimile%20FE%202.0%20/frontend-main/modules/fleet-web/src/modules/fleet/FleetDashboardPage.tsx)
- [modules/fleet-web/src/modules/fleet/vehicles/VehicleManagementPage.tsx](/Users/udayyaduwanshi/optimile%20FE%202.0%20/frontend-main/modules/fleet-web/src/modules/fleet/vehicles/VehicleManagementPage.tsx)
- [modules/fleet-web/src/modules/fleet/vehicles/VehicleDetailPage.tsx](/Users/udayyaduwanshi/optimile%20FE%202.0%20/frontend-main/modules/fleet-web/src/modules/fleet/vehicles/VehicleDetailPage.tsx)
- [modules/fleet-web/src/modules/fleet/vehicles/VehicleFormPage.tsx](/Users/udayyaduwanshi/optimile%20FE%202.0%20/frontend-main/modules/fleet-web/src/modules/fleet/vehicles/VehicleFormPage.tsx)
- [modules/fleet-web/src/modules/fleet/alerts/ExceptionQueuePage.tsx](/Users/udayyaduwanshi/optimile%20FE%202.0%20/frontend-main/modules/fleet-web/src/modules/fleet/alerts/ExceptionQueuePage.tsx)
- [modules/fleet-web/src/modules/fleet/dispatch/DispatchConsolePage.tsx](/Users/udayyaduwanshi/optimile%20FE%202.0%20/frontend-main/modules/fleet-web/src/modules/fleet/dispatch/DispatchConsolePage.tsx)

## 3. Token Layer

Fleet’s real token base is defined in `global.css`.

Primary values:

- `--primary`: deep brand blue
- `--secondary`: hover/alternate blue
- `--success`: green
- `--warning`: amber
- `--danger`: red
- `--accent`: orange
- `--background`: soft gray canvas
- `--text`: near-black

Actual application pattern:

- `primary` is the core interaction color
- `accent` is used sparingly, mostly eyebrow text and some CTA emphasis
- `gray-50`, `gray-100`, `gray-200`, `gray-500`, `gray-600` do a lot of the work

Important practical rule:

- Fleet is not “colorful”
- most of the UI is white, gray, and text
- semantic colors appear in small, purposeful amounts

## 4. Layout Pattern

### App shell

Fleet shell uses:

- fixed white sidebar
- sticky white translucent header
- soft gray page background
- generous but consistent page padding

Key classes:

- sidebar: `border-r border-gray-200 bg-white`
- header: `sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur`
- root: `min-h-screen bg-background text-text`
- main content: `px-4 py-6 sm:px-6 lg:px-8`

### Page rhythm

Fleet pages almost always use:

- root wrapper: `space-y-6`
- card grids: `grid gap-4 ...`
- two-panel layouts: `grid gap-6 ...`
- action groups: `flex flex-wrap gap-2`

The rhythm is steady. Very little random spacing appears.

## 5. Surface System

### Primary content card

Most surfaces use:

```tsx
rounded-xl border border-gray-200 bg-white shadow-sm
```

Examples:

- `PageHeader`
- `DataTable` wrapper
- forms
- dashboard hero
- detail tab container
- list panels

### Secondary / inset surface

Used inside white cards for grouped detail blocks:

```tsx
rounded-xl border border-gray-200 bg-gray-50
```

or

```tsx
rounded-lg bg-gray-50
```

Examples:

- current driver panels
- dispatch assignment summaries
- last sync summary
- read-only blocks inside detail pages

### Special state surfaces

Use tinted semantic surfaces only when the content is stateful:

- error: `border-danger/20 bg-danger/10 text-danger`
- warning: `border-warning/30 bg-warning/10 text-warning`
- primary/info: `border-primary/20 bg-primary/10 text-primary`
- success: `bg-success/10 text-success`

These are not decorative banners. They always indicate status, risk, or guidance.

## 6. Typography

### Real hierarchy

Fleet typography is very consistent in weight:

- page hero title: `text-3xl lg:text-4xl font-extrabold text-text`
- standard page title: `text-2xl font-extrabold text-text`
- card section title: `text-lg font-bold text-text`
- card title / primary row label: `text-base font-bold text-text`
- secondary body: `text-sm text-gray-600`
- meta/caption: `text-xs text-gray-500`
- data label: `text-xs font-semibold uppercase tracking-wide text-gray-500`
- data value: `text-sm font-bold text-text`

### Eyebrow format

Very characteristic Fleet pattern:

```tsx
text-sm font-bold uppercase tracking-wide text-accent
```

Used above:

- page header titles
- dashboard hero titles
- module framing headers

### Text behavior

Fleet prefers:

- weight changes over font-size changes
- bold, compact labels
- near-black for primary text
- gray-500/600 for support text
- mono only for IDs, codes, invoice numbers, VINs, account-like fields

## 7. Button System

Fleet buttons are simple and flat compared to trendier UI systems.

Base:

```tsx
inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60
```

Variants:

- `primary`: `bg-primary text-white hover:bg-secondary border-primary`
- `secondary`: `bg-white text-primary hover:bg-gray-50 border-gray-300`
- `outline`: same visual family as `secondary`
- `ghost`: `bg-transparent text-gray-700 hover:bg-gray-100 border-transparent`
- `accent`: orange CTA, used sparingly
- `danger`: red destructive button

Behavior rules visible in Fleet:

- header actions are usually `accent` + `outline`
- detail pages often use `outline` + `primary` + `danger`
- icon size is usually `h-4 w-4`
- there is rarely more than one “loud” button in the same cluster

Avoid:

- gradients
- glow
- large shadows
- glassmorphism
- oversized rounded pills for standard buttons

## 8. Search, Filters, And Controls

### Search bar

Canonical Fleet search uses `FilterBar`.

Pattern:

- search icon absolutely placed
- `h-10`
- `rounded-lg`
- `border-gray-300`
- white fill
- `focus:border-primary focus:ring-4 focus:ring-primary/20`
- width `sm:w-72`

### Filter groups

There are two common filter patterns in Fleet:

1. Search + native selects in a `FilterBar` actions area
2. Segmented tab-like filters using soft gray background and white active state

For native select filters, Fleet typically uses:

```tsx
h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none ring-primary/20 focus:border-primary focus:ring-4
```

Label style:

```tsx
text-xs font-bold uppercase tracking-wide text-gray-500
```

### Selection / picker cards

Used in Dispatch Console:

- white cards inside white sections
- selected state: `border-primary bg-primary/5`
- default state: `border-gray-200 bg-white hover:bg-gray-50`
- warnings and blockers appear as semantic inline panels below the main row

## 9. Tables

Fleet tables are one of the clearest consistency anchors.

Wrapper:

```tsx
overflow-hidden rounded-xl border border-gray-200
```

Table structure:

- header row: `bg-gray-50`
- header cell: `px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500`
- body row: `bg-white`
- row hover: `hover:bg-gray-50`
- body cell: `px-4 py-4 text-sm text-gray-700`

Sort controls:

- text-only
- small `SORT / ASC / DESC` labels
- no heavy icons or chip styling

Pagination:

- footer bar on gray-50
- small outline-style previous/next buttons

Content style inside cells:

- primary line: `font-bold text-text`
- secondary line: `text-xs text-gray-500`
- statuses always go through `StatusBadge`

## 10. Status Badge System

Fleet badges are compact, rounded, and semantic.

Base:

```tsx
rounded-full px-3 py-1 text-xs font-bold ring-1
```

Tones:

- success: `bg-success/10 text-success ring-success/20`
- warning: `bg-warning/10 text-warning ring-warning/20`
- danger: `bg-danger/10 text-danger ring-danger/20`
- primary: `bg-primary/10 text-primary ring-primary/20`
- neutral: `bg-gray-100 text-gray-600 ring-gray-200`

Rules:

- no arbitrary badge colors
- no oversized pills
- no unrelated purple/info tones unless mapped back to primary or a semantic state

## 11. Dashboard Language

Fleet dashboard is not a marketing dashboard. It behaves like a control tower.

### Hero section

Pattern:

- large white hero card
- eyebrow with icon
- strong title
- one-paragraph command-view description
- utility block on the right like “Last sync”
- quiet refresh action

### KPI cards

Real Fleet KPI behavior:

- cards are actionable, not just decorative
- value is the anchor
- tone appears through icon treatment and semantic hinting
- each KPI includes:
  - label
  - main value
  - trend or state
  - insight line
  - micro-action

### Dashboard composition order

Fleet dashboard reads like:

1. top hero / command context
2. critical action strip
3. KPI grid
4. risk or queue sections
5. quick actions
6. trend or secondary intelligence blocks

This order is important. It creates a “what needs attention first” feeling.

## 12. List Page Pattern

Standard list pages like Vehicles and Exception Center follow this formula:

1. `PageHeader`
2. optional error banner
3. one main white container
4. filter/search area at top of that container
5. table or list below

Typical structure:

```tsx
<div className="space-y-6">
  <PageHeader ... />
  {error && <ErrorState ... />}
  <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
    <div className="mb-4">
      <FilterBar ... />
    </div>
    <DataTable ... />
  </section>
</div>
```

This pattern should be reused almost exactly in other modules.

## 13. Detail Page Pattern

Fleet detail pages have a clear pattern:

1. breadcrumbs
2. `PageHeader` with action cluster
3. tabbed or sectioned white container
4. overview content made of `InfoGrid`, status badges, and inset gray panels

Important characteristics:

- detail pages still use the same top-level `space-y-6`
- the overview is data-first, not illustration-first
- related records are presented as bordered selectable rows
- empty sections use the same `EmptyState`

## 14. Form Pattern

Fleet forms are straightforward and intentionally plain.

### Form shell

```tsx
rounded-xl border border-gray-200 bg-white p-5 shadow-sm
```

### Field grid

```tsx
grid gap-4 md:grid-cols-2 xl:grid-cols-3
```

### Input

```tsx
h-10 w-full rounded-lg border bg-white px-3 text-sm outline-none ring-primary/20 focus:border-primary focus:ring-4
```

### Error handling

- error border becomes `border-danger`
- message uses `text-xs font-semibold text-danger`

### Important real-world note

`DESIGN.md` recommends uppercase micro-labels for fields, but some older Fleet forms still use:

```tsx
text-sm font-semibold text-gray-700
```

So if you want to match the current Fleet code exactly:

- newer summary/detail labels: uppercase micro-label style
- some direct form labels: medium-weight sentence-case

Recommendation for new work:

- prefer the stricter `DESIGN.md` uppercase field label style
- but do not introduce an entirely different label treatment inside the same module

## 15. Empty, Error, Loading, And Modal States

### Empty

Fleet empty states are:

- white
- dashed border
- centered
- icon inside small gray square

Pattern:

```tsx
rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center
```

### Loading

Pattern:

- white card
- centered spinner
- primary spinner color
- small gray label

### Error

Pattern:

- no large modal feel
- just a tinted inline danger panel

### Confirm modal

Fleet modals are restrained:

- overlay: `bg-black/50`
- card: white, `rounded-xl`, `p-5`, `shadow-2xl`
- warning icon tile on left
- buttons right aligned

Important:

- modal is the only place where the visual weight is allowed to increase more sharply

## 16. Navigation, Tabs, And Breadcrumbs

### Breadcrumbs

Style:

- `text-sm font-semibold text-gray-500`
- clickable ancestors in primary blue
- current item in `text-text`
- slash separators in `text-gray-300`

### Detail tabs

Fleet detail tabs use:

- white card wrapper
- border bottom
- active tab filled with primary blue and white text
- inactive tab: gray text with subtle hover

### Sidebar and top nav behavior

Navigation never uses loud gradients or large active glows.

Active behavior is usually:

- `bg-primary/10`
- `text-primary`
- `border-l-primary`

## 17. What Makes Fleet Feel Like Fleet

These are the strongest visual signatures:

- white cards everywhere
- soft gray app canvas
- deep blue as the primary brand anchor
- orange eyebrow text
- restrained shadows
- bold headings
- small uppercase gray labels
- semantic badges instead of decorative chips
- search and filters always in a predictable place
- dashboard as command center, not a promotional homepage

If another module copies only colors but not these structural patterns, it will still not feel like Fleet.

## 18. What To Avoid In Other Modules

Do not introduce these if you want Fleet-level consistency:

- dark gradient auth pages
- glassmorphism
- random hex colors
- purple accent badges unless truly mapped to semantic meaning
- giant rounded pills for everything
- extra-large shadows on normal cards
- mixed typography systems in one screen
- decorative hero sections with no operational value
- cards with inconsistent padding from one page to another
- multiple button styles on the same screen that do not come from the same button system

## 19. Implementation Checklist For Other Modules

Use this checklist when converting another module screen:

- root uses `bg-background text-text`
- page content uses `space-y-6`
- every major surface uses `rounded-xl border border-gray-200 bg-white shadow-sm`
- page header uses orange eyebrow + extra-bold title + gray subtitle
- actions use Fleet button variants only
- filters use Fleet `FilterBar` pattern or Fleet segmented-tab pattern
- tables use Fleet `DataTable` structure and header styling
- empty, error, and loading states use Fleet patterns
- badges use only semantic Fleet badge tones
- metadata lines use `text-xs text-gray-500`
- primary labels use `font-bold text-text`
- state color appears only for meaning, never decoration

## 20. Recommended Reuse Strategy

For the fastest consistency across the rest of the product:

1. Reuse Fleet primitives first.
2. If another module has its own primitives, make them visually identical to Fleet’s versions.
3. Convert page shells before micro-components.
4. Convert tables, filters, and headers before decorative details.
5. Keep one reference screenshot or live Fleet page open while implementing.

## 21. Practical Conclusion

If you want the rest of the modules to feel like Fleet, copy this order of priority:

1. layout shell
2. card surface system
3. page header pattern
4. button system
5. filter/search layout
6. table style
7. status badges
8. dashboard information hierarchy

That combination is the real Fleet look and feel.
