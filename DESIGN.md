# Optimile Design System

Extracted from the Fleet Management module. Apply this system across all portals: Admin, Vendor, Customer, Driver.

---

## 1. Design Principles

**Enterprise-grade, operationally dense, visually calm.**

The UI carries a lot of information — vehicles, orders, drivers, alerts — without feeling chaotic. It achieves this through consistent whitespace, a restrained color palette where color only signals state, and a clear type hierarchy that guides the eye.

- **Data-first.** Tables, KPI cards, and status badges are the primary content. Decoration is minimal.
- **Color = meaning.** Color is reserved for semantic states (success, warning, danger, primary). Never use color purely for aesthetics.
- **Density with breathing room.** Compact but not cramped. `py-3 px-4` on table rows. `p-5` on cards.
- **Hierarchy through weight, not size.** `font-extrabold` for headings, `font-bold` for labels and table headers, `font-semibold` for secondary text, regular for body.
- **Lucide icons exclusively.** Consistent stroke width, 4px size steps (`h-4 w-4`, `h-5 w-5`, `h-6 w-6`).
- **Rounded, not sharp.** `rounded-lg` (8px) for interactive elements, `rounded-xl` (12px) for cards and containers, `rounded-full` for badges and avatars.

---

## 2. Layout System

### Page structure

```
┌─────────────────────────────────────────────────────┐
│  SIDEBAR (fixed, 320px expanded / 80px collapsed)   │
│  ┌───────────────────────────────────────────────┐  │
│  │  HEADER (sticky, 64px, z-30)                  │  │
│  │  ─────────────────────────────────────────    │  │
│  │  MAIN CONTENT (px-4 py-6 sm:px-6 lg:px-8)    │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

- Sidebar is `fixed`, full height, `border-r border-gray-200 bg-white`
- Header is `sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-gray-200`
- Main content is offset by sidebar width via `lg:pl-80` (expanded) or `lg:pl-20` (collapsed)
- Main padding: `px-4 py-6 sm:px-6 lg:px-8`

### Grid system

Content sections use CSS Grid with responsive breakpoints:

| Use case | Class |
|---|---|
| KPI cards (4-up) | `grid gap-4 md:grid-cols-2 xl:grid-cols-4` |
| Two-column split | `grid gap-6 2xl:grid-cols-[minmax(0,1fr)_420px]` |
| Detail info grid | `grid gap-4 sm:grid-cols-2 xl:grid-cols-4` |
| Form layout | `grid gap-4 sm:grid-cols-2` |
| Action buttons | `flex flex-wrap gap-2` |
| Page sections | `space-y-6` |

### Spacing scale (Tailwind units)

| Token | Value | Usage |
|---|---|---|
| `gap-2` | 8px | Tight button groups, badge spacing |
| `gap-3` | 12px | Form field gaps, icon+label |
| `gap-4` | 16px | Card grid gaps, section padding |
| `gap-5` | 20px | Card internal padding |
| `gap-6` | 24px | Section-to-section gaps |
| `p-5` | 20px | Card body padding |
| `p-6` / `p-7` | 24–28px | Hero section padding |
| `px-4 py-3` | 16/12px | Table cells |
| `px-4 py-6` | Main content padding (mobile) |
| `px-6 lg:px-8` | Main content padding (desktop) |

---

## 3. Typography

### Font families

```css
font-sans: 'Inter', system-ui, sans-serif   /* all UI text */
font-mono: 'JetBrains Mono', monospace      /* IDs, codes, technical values */
```

### Type hierarchy

| Role | Classes | Usage |
|---|---|---|
| Hero heading | `text-3xl lg:text-4xl font-extrabold text-text` | Dashboard hero title only |
| Page title | `text-2xl font-extrabold text-text` | PageHeader h1, PageFrame h1 |
| App header title | `text-lg font-bold text-text` | Sticky header |
| Section heading | `text-lg font-extrabold text-text` | Modal titles, card group headers |
| Card title | `text-base font-bold text-text` | Inside cards |
| Eyebrow | `text-sm font-bold uppercase tracking-wide text-accent` | Above page titles |
| Section label | `text-[11px] font-extrabold uppercase tracking-wider text-gray-500` | Sidebar section labels |
| Table header | `text-xs font-bold uppercase tracking-wide text-gray-500` | `<th>` elements |
| Body / label | `text-sm text-gray-700` | Table cells, form content |
| Caption / meta | `text-xs text-gray-500` | Timestamps, secondary context |
| Field label | `text-xs font-semibold uppercase tracking-wide text-gray-500` | `<dt>` in InfoGrid |
| Field value | `text-sm font-bold text-text` | `<dd>` in InfoGrid |

### Rules

- Use `text-text` (CSS variable, near-black `221 39% 11%`) for primary content, never raw `text-gray-900`.
- Use `text-gray-600` for secondary body text, `text-gray-500` for tertiary/meta.
- Eyebrow text above headings always uses `text-accent` (orange) and `uppercase tracking-wide`.
- Never mix font sizes within a single heading hierarchy on the same page.
- Monospace font only for IDs, technical codes, and numeric sequences.

---

## 4. Color System

### CSS custom properties (defined in `global.css`)

```css
--primary:   207 59% 30%   /* #1E4D7B  — deep blue, main brand */
--secondary: 207 59% 45%   /* #2E74BB  — medium blue, hover state for primary */
--success:   160 84% 39%   /* #0FAF72  — green */
--warning:   38  92% 50%   /* #F59E0B  — amber */
--danger:    0   84% 60%   /* #EF4444  — red */
--accent:    23 100% 50%   /* #FF6600  — orange, eyebrow/highlight only */
--background: 210 20% 98%  /* #F7F9FB  — page canvas */
--text:       221 39% 11%  /* #0F172A  — near-black */
```

### Semantic color usage

| Color | Tailwind token | When to use |
|---|---|---|
| Primary | `bg-primary`, `text-primary` | Active nav, primary buttons, icons in context |
| Secondary | `bg-secondary`, `text-secondary` | Hover state of primary, secondary labels |
| Success | `bg-success`, `text-success` | Active status, passing checks, positive trends |
| Warning | `bg-warning`, `text-warning` | Expiring docs, blocked vehicles, flagged records |
| Danger | `bg-danger`, `text-danger` | Expired, rejected, critical alerts, delete actions |
| Accent (orange) | `text-accent`, `bg-accent` | Eyebrow text, primary CTA buttons only |
| Neutral | `text-gray-600`, `bg-gray-100` | Inactive status, disabled-adjacent context |

### Surface & background colors

| Surface | Class | Usage |
|---|---|---|
| Page canvas | `bg-background` | Root background (`#F7F9FB`) |
| Card / panel | `bg-white` | All cards, sidebar, header |
| Table header | `bg-gray-50` | `<thead>` rows, pagination bar |
| Hover row | `hover:bg-gray-50` | Table rows, sidebar items |
| Input | `bg-white border-gray-300` | Form inputs |
| Subtle tint | `bg-primary/10` | Icon backgrounds, active state tints |

### Semantic tints (for badges and banners)

```
success:  bg-success/10  text-success  ring-success/20
warning:  bg-warning/10  text-warning  ring-warning/20
danger:   bg-danger/10   text-danger   ring-danger/20
primary:  bg-primary/10  text-primary  ring-primary/20
neutral:  bg-gray-100    text-gray-600 ring-gray-200
```

### State colors

| State | Treatment |
|---|---|
| Hover (button) | Darken: `hover:bg-secondary` for primary, `hover:bg-gray-50` for outline |
| Hover (row/nav) | `hover:bg-gray-50 hover:text-primary` |
| Active (nav item) | `border-l-primary bg-primary/10 text-primary` |
| Disabled | `disabled:opacity-60 disabled:cursor-not-allowed` |
| Focus (input) | `focus:border-primary focus:ring-4 focus:ring-primary/20` |
| Loading | `opacity-60` + spinner icon `animate-spin text-primary` |

---

## 5. Components

### Button

**Purpose:** Trigger actions. The most common interactive element.

**Variants:**

| Variant | Classes | Usage |
|---|---|---|
| `primary` | `bg-primary text-white hover:bg-secondary border-primary` | Main page action (Create, Save, Submit) |
| `secondary` | `bg-white text-primary hover:bg-gray-50 border-gray-300` | Cancel, secondary action |
| `outline` | `bg-white text-primary hover:bg-gray-50 border-gray-300` | Refresh, Export, neutral actions |
| `ghost` | `bg-transparent text-gray-700 hover:bg-gray-100 border-transparent` | Icon-only, inline edit |
| `accent` | `bg-accent text-white hover:bg-[#E65800] border-accent` | High-urgency CTA (use sparingly) |
| `danger` | `bg-danger text-white hover:bg-danger/90 border-danger` | Delete, reject, irreversible actions |

**Base classes (all variants):**
```
h-10 inline-flex items-center justify-center gap-2
rounded-lg border px-4 text-sm font-semibold transition
disabled:cursor-not-allowed disabled:opacity-60
```

**States:**
- Default, hover, disabled
- Add `icon` prop to prepend a Lucide icon (`h-4 w-4`)
- Loading: swap icon to `<Loader2 className="h-4 w-4 animate-spin" />`

**Usage rules:**
- One `primary` button per page section. Multiple secondaries are fine.
- Never put two `primary` buttons side by side. Use `primary` + `secondary`.
- Danger buttons must always be in a confirm modal flow, never inline.
- Button groups: `flex gap-2`, always right-aligned in headers via `flex justify-end`.

---

### Input / Form

**Base input:**
```
h-10 w-full rounded-lg border border-gray-300 bg-white
px-3 text-sm outline-none ring-primary/20 transition
focus:border-primary focus:ring-4
```

**Search input (with icon):**
```
relative wrapper
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
  input: pl-9 (to clear icon)
```

**Form field structure:**
```tsx
<div>
  <label className="text-xs font-semibold uppercase tracking-wide text-gray-700 mb-1 block">
    Field Label
  </label>
  <input className="h-10 w-full rounded-lg border border-gray-300 ..." />
  {/* error */}
  <p className="mt-1 text-xs text-danger">Error message</p>
</div>
```

**Form grid layout:**
```
grid gap-4 sm:grid-cols-2
```

**States:**
- Default: `border-gray-300`
- Focus: `border-primary ring-4 ring-primary/20`
- Error: `border-danger ring-danger/20`
- Disabled: `opacity-60 cursor-not-allowed bg-gray-50`

**Textarea:** Same base classes, add `min-h-[80px] resize-y py-2`.

**Select:** Same base classes, add `appearance-none pr-8` + chevron icon absolutely positioned right.

**Usage rules:**
- Always pair inputs with `<label>`. Use `uppercase tracking-wide` style for labels.
- Error messages live below the input in `text-xs text-danger`.
- Never use placeholder text as a substitute for a label.
- Width: full-width (`w-full`) inside forms, `w-72` for standalone search bars.

---

### Table (DataTable)

**Wrapper:**
```
overflow-hidden rounded-xl border border-gray-200
```

**Header row:**
```
bg-gray-50
th: px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500
```

**Body row:**
```
divide-y divide-gray-200 bg-white
tr: hover:bg-gray-50 (add cursor-pointer if clickable)
td: px-4 py-4 text-sm text-gray-700
```

**Pagination bar:**
```
border-t border-gray-200 bg-gray-50 px-4 py-3
flex items-center justify-between text-sm
```

**Variants:**
- Default (no row click)
- Clickable rows (`cursor-pointer`, `onRowClick` handler)
- Sortable columns (sort button in `<th>`, shows ASC/DESC indicator)
- Paginated (set `pageSize`, shows pagination bar)

**States:**
- Empty: renders `<EmptyState>` component instead of `<table>`
- Loading: wrap in `<LoadingState>` before data arrives

**Usage rules:**
- Always provide `getRowKey` — never use array index as key.
- Right-align numeric columns (`align: 'right'`).
- Use `StatusBadge` in cells for status columns, never raw text with color classes.
- Limit columns to 6–8 on desktop. Use a detail page/drawer for additional fields.
- Table container should have `overflow-x-auto` for mobile.

---

### Card

**Base container:**
```
rounded-xl border border-gray-200 bg-white shadow-sm
```

**Variants:**

| Variant | When to use |
|---|---|
| Section card | `rounded-xl border border-gray-200 bg-white p-5 shadow-sm` — most common |
| Hero card | `rounded-xl border border-gray-200 bg-white p-6 lg:p-7 shadow-sm` — dashboard hero |
| KPI card | Section card + `cursor-pointer hover:shadow-card-hover transition` |
| Detail card | Section card with `DetailTabs` inside |
| Error card | `rounded-xl border border-danger/20 bg-danger/10 p-5` |

**KPI card structure:**
```tsx
<section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm cursor-pointer hover:shadow-card-hover transition">
  {/* icon tinted with semantic color */}
  <div className="rounded-lg bg-{tone}/10 p-2 w-fit text-{tone}">
    <Icon className="h-5 w-5" />
  </div>
  <p className="mt-3 text-sm font-semibold text-gray-500">Label</p>
  <p className="mt-1 text-2xl font-extrabold text-text">Value</p>
  <p className="mt-2 text-xs text-gray-500">Insight / trend line</p>
</section>
```

**Usage rules:**
- Cards never have colored top borders or left borders (reserved for sidebar nav items).
- `shadow-sm` is standard. Elevate to `shadow-elevated` only on hover or modals.
- Card padding is always `p-5`. Only hero sections use `p-6` or `p-7`.
- Avoid nesting cards inside cards.

---

### Modal / Confirm Dialog

**Backdrop:**
```
fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4
```

**Panel:**
```
w-full max-w-md rounded-xl bg-white p-5 shadow-2xl animate-in fade-in duration-300
```

**Header structure:**
```tsx
<div className="flex items-start justify-between gap-4">
  <div className="flex gap-3">
    {/* Semantic icon in tinted container */}
    <div className="rounded-xl bg-warning/10 p-2 text-warning">
      <AlertTriangle className="h-5 w-5" />
    </div>
    <div>
      <h2 className="text-lg font-bold text-text">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-gray-600">{description}</p>
    </div>
  </div>
  {/* Close button */}
  <button className="rounded-lg p-1 text-gray-500 hover:bg-gray-100">
    <X className="h-5 w-5" />
  </button>
</div>
```

**Footer:**
```
mt-6 flex justify-end gap-2
```
Always: `<Button variant="secondary">Cancel</Button>` + action button.

**Variants:**
- Confirm (warning icon, `max-w-md`)
- Form modal (no icon, `max-w-lg` or `max-w-xl`)
- Destructive confirm (danger icon, confirm button uses `variant="danger"`)

**States:**
- Controlled via `open: boolean` prop — return `null` when closed (no portal overhead).
- Entry animation: `animate-in fade-in duration-300` (translateY 4px → 0, opacity 0 → 1)

**Usage rules:**
- Always include a close `X` button in the top-right corner.
- Destructive actions require a confirm modal. Never trigger them directly on click.
- Modal title font: `text-lg font-bold`, never `text-xl` or larger.
- Footer actions are always right-aligned.
- Max two actions in footer: Cancel (secondary) + primary action.

---

### Status Badge

**Base:**
```
rounded-full px-3 py-1 text-xs font-bold ring-1
```

**Tones:**

| Tone | Classes |
|---|---|
| `success` | `bg-success/10 text-success ring-success/20` |
| `warning` | `bg-warning/10 text-warning ring-warning/20` |
| `danger` | `bg-danger/10 text-danger ring-danger/20` |
| `primary` | `bg-primary/10 text-primary ring-primary/20` |
| `neutral` | `bg-gray-100 text-gray-600 ring-gray-200` |

**Usage rules:**
- Use in table cells for status columns exclusively.
- Never use colored text without the tinted background + ring combination.
- Map domain statuses to tones in a `statusStyles.ts` file per module.

---

### Navigation — Sidebar

**Structure:**
- Fixed, full height, `w-80` expanded / `w-20` collapsed
- Logo/brand area: `h-10 w-10` icon, `border-b border-gray-200`
- Nav items grouped in `<section>` blocks with section labels
- Section labels: `text-[11px] font-extrabold uppercase tracking-wider text-gray-500`
- Collapsible sections via `ChevronDown` toggle

**Nav item (active):**
```
border-l-4 border-l-primary bg-primary/10 text-primary shadow-sm rounded-lg
```

**Nav item (default):**
```
border-l-4 border-l-transparent text-gray-600
hover:border-l-gray-300 hover:bg-gray-100 hover:text-primary rounded-lg
```

**Nav item (Work Queue / special):**
```
border-l-4 border-l-warning bg-warning/5 text-text
hover:bg-warning/10
```

**Collapsed state:**
- `w-20`, icon only, `title` attribute on button for tooltip
- Section divider replaces label
- Badge dot (`h-2.5 w-2.5 rounded-full bg-danger`) replaces count badge

**Sidebar badge (task count):**
```
inline-flex min-w-7 justify-center rounded-full px-2 py-0.5 text-xs font-extrabold
bg-danger text-white               (when critical tasks exist)
bg-warning/15 text-warning ring-1  (warning-level tasks only)
```

---

### Navigation — Header

**Height:** `h-16` (64px), sticky, `z-30`

**Left slot:** Module title + eyebrow text (`text-xs font-semibold uppercase tracking-wide text-secondary`)

**Right slot:** GlobalSearch + notification bell + user identity

**User identity:**
```
text-sm font-semibold text-text     ← name
text-xs text-gray-500               ← role · portal
```

---

### Navigation — Breadcrumbs

**Container:**
```
flex flex-wrap items-center gap-2 text-sm font-semibold text-gray-500
```

**Clickable segment:** `text-primary hover:text-secondary`

**Current (last) segment:** `text-text`

**Separator:** `<span className="text-gray-300">/</span>`

**Usage rules:**
- Show breadcrumbs on detail/edit pages, above the content area.
- Never show breadcrumbs on list pages.
- First item is always the module name. Last item is the current record.

---

### Navigation — Tabs (DetailTabs)

**Tab bar:**
```
flex gap-1 overflow-x-auto border-b border-gray-200 px-4 pt-4
```

**Active tab:**
```
rounded-t-lg px-4 py-3 text-sm font-bold bg-primary text-white
```

**Inactive tab:**
```
rounded-t-lg px-4 py-3 text-sm font-bold text-gray-600
hover:bg-gray-50 hover:text-primary
```

**Panel:** `p-5`

**Usage rules:**
- Tabs sit inside a `rounded-xl border border-gray-200 bg-white shadow-sm` card.
- Tab labels are title case, max 20 characters.
- Use tabs for detail pages with 3–7 content sections. Use a single scrollable page for 1–2 sections.

---

### Page Header (PageHeader / PageFrame)

**Standard PageHeader:**
```tsx
<section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
    <div>
      <p className="text-sm font-bold uppercase tracking-wide text-accent">{eyebrow}</p>
      <h1 className="mt-1 text-2xl font-extrabold text-text">{title}</h1>
      {subtitle && <p className="mt-2 max-w-4xl text-sm text-gray-600">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
  </div>
</section>
```

**PageFrame variant** (with module icon):
- Adds a `rounded-xl bg-primary/10 p-3 text-primary` icon container to the left of the title block.

**Usage rules:**
- Every list page gets a `PageHeader` as its first element.
- Eyebrow text is always the portal + module name (e.g., "Optimile Fleet").
- Subtitle is optional — include only if the page purpose is non-obvious.
- Action buttons in header: primary action right-most, secondary to its left.

---

### Info Grid (InfoGrid / InfoItem)

**Grid wrapper:**
```
grid gap-4 sm:grid-cols-2 xl:grid-cols-4
```

**Item:**
```tsx
<div>
  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Label</dt>
  <dd className="mt-1 text-sm font-bold text-text">Value</dd>
</div>
```

**Usage:** Detail pages. Display record field values. Use inside a card with `p-5`.

---

### MeterBar

**Usage:** Progress / utilization visualization inline with KPI cards.

```tsx
<div className="h-2 overflow-hidden rounded-full bg-gray-100">
  <div
    className="h-full rounded-full bg-{tone}"
    style={{ transform: `translateX(-${100 - value}%)` }}
  />
</div>
```

Tones: `bg-success` | `bg-warning` | `bg-danger` | `bg-primary`

---

### FilterBar

```tsx
<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
  {/* Search input with icon */}
  <div className="relative">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
    <input className="h-10 w-72 rounded-lg border border-gray-300 pl-9 ..." />
  </div>
  {/* Actions: filter dropdowns, create button */}
  <div className="flex flex-wrap gap-2">{actions}</div>
</div>
```

Always place FilterBar between PageHeader and DataTable, separated by `space-y-6` on the page container.

---

## 6. Interaction Patterns

### Loading state

```tsx
<div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
  <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
  <p className="mt-3 text-sm font-semibold text-gray-600">Loading data</p>
</div>
```

- Use `animate-spin` from Tailwind on the `Loader2` lucide icon.
- Show this component in place of the DataTable while data loads.
- On buttons: replace icon with `<Loader2 className="h-4 w-4 animate-spin" />` and add `disabled`.

---

### Empty state

```tsx
<div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-500">
    <Inbox className="h-6 w-6" />
  </div>
  <h3 className="mt-4 text-base font-bold text-text">Nothing to show</h3>
  <p className="mt-2 text-sm text-gray-500">{description}</p>
  {action && <div className="mt-4 flex justify-center">{action}</div>}
</div>
```

- Dashed border signals "this space is intentionally empty".
- Always include a title. Include description when the reason is non-obvious.
- Optional `action` slot: use a `Button variant="primary"` for the create action.

---

### Error state

```tsx
<div className="rounded-xl border border-danger/20 bg-danger/10 p-5">
  <div className="flex gap-3">
    <AlertTriangle className="h-5 w-5 shrink-0 text-danger" />
    <div>
      <p className="font-bold text-danger">Something went wrong</p>
      <p className="mt-1 text-sm text-danger">{message}</p>
    </div>
  </div>
</div>
```

- Inline error (inside a card area): use this pattern.
- Inline warning banner (non-critical, e.g., stale data): replace danger tokens with warning tokens.
- Full-page error: center this component with a "Try again" button below.

---

### Warning banner (stale data / soft error)

```tsx
<div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm font-semibold text-warning">
  {message}
</div>
```

Use inside section cards when data is showing from cache / fallback.

---

### Toast / feedback notifications

Use **Sonner** (`<Toaster />`) — already configured in admin and vendor apps.

| Action | Toast type |
|---|---|
| Create success | `toast.success('Vehicle created')` |
| Update success | `toast.success('Changes saved')` |
| Delete success | `toast.success('Record deleted')` |
| API error | `toast.error('Failed to save. Try again.')` |
| Validation error | Inline field error, not a toast |

Toasts appear bottom-right. Never use toasts for validation messages — keep those inline next to the field.

---

### Animations

Two animation primitives are defined:

**fade-in (page/card entrance):**
```css
from: { opacity: 0; transform: translateY(6px) }
to:   { opacity: 1; transform: translateY(0) }
duration: 300ms, ease-out
```

Apply with `className="animate-in fade-in duration-300"` on modals and mounting panels.

**pulse-dot (live indicator):**
```css
0%, 100%: { opacity: 1 }
50%:       { opacity: 0.3 }
duration: 1.5s, ease-in-out, infinite
```

Apply with `className="animate-pulse-dot"` on live/online status dots.

---

## 7. Do's and Don'ts

### Do

- **Do** use `space-y-6` as the top-level page section container.
- **Do** use `StatusBadge` with a semantic `tone` for every status column in tables.
- **Do** put a `PageHeader` as the first child of every list page.
- **Do** use `rounded-xl` for all card containers. Use `rounded-lg` for interactive elements (buttons, inputs).
- **Do** use `text-text` (CSS variable) for primary content text, not `text-gray-900`.
- **Do** gate destructive actions behind a `ConfirmModal`.
- **Do** show `LoadingState` while async data loads, and `EmptyState` when a collection is empty.
- **Do** keep sidebar nav badge logic consistent: danger badge for critical, warning badge for normal tasks.
- **Do** use `font-extrabold` for all h1 headings and `font-bold` for h2/section headings.
- **Do** use `text-xs font-semibold uppercase tracking-wide text-gray-500` for all field labels and table headers.

### Don't

- **Don't** use inline color styles. Map everything to CSS variable tokens.
- **Don't** create new color combinations outside the defined palette. No custom hex values in component files.
- **Don't** use `shadow-lg` or `shadow-xl` on standard cards — `shadow-sm` only. Reserve `shadow-2xl` for modals.
- **Don't** mix `rounded-xl` and `rounded-2xl` in the same view. `rounded-xl` is the card standard.
- **Don't** use the `accent` (orange) color for anything other than eyebrow text and urgent CTAs.
- **Don't** show more than one `primary` button in a header actions area.
- **Don't** put navigation logic inside data components. Pass `onNavigate` callbacks down.
- **Don't** use bare `gray-900` or `gray-800` for text — use `text-text` (the CSS variable).
- **Don't** animate layout shifts. Use `transition` only on `background`, `color`, `border-color`, `box-shadow`, and `opacity`.
- **Don't** skip `aria-label` on icon-only buttons. Every `<button>` without visible text needs one.
- **Don't** use `grid-cols-3` for KPI cards — always 2-up on tablet, 4-up on desktop.
- **Don't** use toasts for validation errors — those are inline, below the field.
- **Don't** hardcode content strings in components. Pass `title`, `description`, `eyebrow` as props.

---

## Design System Adoption Status

| Module | Status | Notes |
|---|---|---|
| fleet-web | Reference implementation | Source design system for layout, density, semantic tokens, navigation, page headers, table/card rhythm, and operational states. |
| auction-web | Applied | Applied Fleet tokens to Auction shell, sidebar, header, dashboard cards, auction list, contract list/detail, detail tabs, status badges, empty/error states, create-page forms, and award modal flows. Uses shared-ui `Button`, `Card`, `Badge`, `DataTable`, `FilterBar`, `InfoGrid`, `DetailTabs`, `Field`, `Select`, `PageHero`, and `KpiCard`. Local `HeroCard` and `KPICard` were removed after moving their patterns into shared-ui. TODO: keep `StatusBadge` and `SLACountdown` local until another module confirms the same domain mappings/timer behavior. |
| vendor-web | Applied | Applied Fleet tokens to Vendor shell, sidebar, header, dashboard KPI cards, sourcing, trips, fleet, contracts, invoices, expenses, profile, loading/empty/error states, filters, tabs, and modal form controls. Uses shared-ui `Button`, `Card`, `Badge`, `Input`, `Textarea`, `Dialog`, `PageHero`, `KpiCard`, and `DataTable`. Local `HeroCard` and `KPICard` were removed. Contracts, invoice list, and ledger now use shared `DataTable`; vendor `StatusBadge`, `SLACountdown`, and domain modals stay local until another portal confirms reusable mappings. |
| customer-web | Applied | Scaffold-only portal aligned to Fleet tokens and shared primitives. Updated protected customer shell with `PageHero` and `Card`, removed hardcoded hex colors, added portal token definitions, added shared-ui alias/dependencies, and added standalone build coverage. No list/detail/form pages exist yet; apply `FilterBar`, `DataTable`, `InfoGrid`, and form primitives when real customer modules are introduced. |
| driver-web | Pending | Scaffold-only portal; not updated in this pass. |

### Reusable Patterns Discovered

- `DataTable` belongs in shared-ui with `columns`, `rows`, `getRowKey`, optional `onRowClick`, and an `emptyState` slot. Auction list and contract registry now use this instead of local row-card lists.
- `FilterBar` belongs in shared-ui as a simple search/actions layout primitive. It keeps filter controls consistent without owning business-specific filter state.
- `InfoGrid` / `InfoItem` belongs in shared-ui for detail-page field summaries.
- `DetailTabs` belongs in shared-ui for detail pages with multiple operational panels.
- `PageHero` and `KpiCard` are now the shared header/metric pattern for auction-web and vendor-web. Module dashboards should reuse them before introducing local hero/card variants.
- Portal-specific `StatusBadge` mappings should stay local until statuses are normalized across portals; the shared `Badge` only owns the visual variants.
- `Field` and `Select` belong in shared-ui so form labels, helper text, validation text, focus rings, and select sizing stay consistent across portal forms.
- `PageHero` and `KpiCard` belong in shared-ui as Fleet-style page and dashboard primitives. Auction now consumes these directly instead of keeping local copies.
- Portal-level CSS must define the Fleet token set (`--primary`, `--secondary`, `--success`, `--warning`, `--danger`, `--accent`, `--background`, `--text`) before adopting `text-text`, semantic badges, and shared design primitives.
