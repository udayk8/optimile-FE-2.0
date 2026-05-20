# UI Reference

Source of truth: the existing Fleet Module only.

This document records the Fleet Module's current UI patterns so other modules can align visually without changing their business flow, routing, auth, permissions, APIs, or data flow.

Primary source files reviewed:

- `frontend-main/modules/fleet-web/src/styles/global.css`
- `frontend-main/tailwind.config.ts`
- `frontend-main/modules/fleet-web/src/components/Layout.tsx`
- `frontend-main/modules/fleet-web/src/components/PageHeader.tsx`
- `frontend-main/modules/fleet-web/src/components/Button.tsx`
- `frontend-main/modules/fleet-web/src/components/DataTable.tsx`
- `frontend-main/modules/fleet-web/src/components/FilterBar.tsx`
- `frontend-main/modules/fleet-web/src/components/StatusBadge.tsx`
- `frontend-main/modules/fleet-web/src/components/DetailTabs.tsx`
- `frontend-main/modules/fleet-web/src/components/EmptyState.tsx`
- `frontend-main/modules/fleet-web/src/components/LoadingState.tsx`
- `frontend-main/modules/fleet-web/src/components/ErrorState.tsx`
- `frontend-main/modules/fleet-web/src/components/ConfirmModal.tsx`
- `frontend-main/modules/fleet-web/src/components/GlobalSearch.tsx`
- `frontend-main/modules/fleet-web/src/app/navigation.ts`
- Representative Fleet pages under `frontend-main/modules/fleet-web/src/modules/fleet/**`

## 1. Design System

### Colors

Exact Fleet CSS variables from `frontend-main/modules/fleet-web/src/styles/global.css`:

| Token | Value |
| --- | --- |
| `--primary` | `207 59% 30%` |
| `--primary-foreground` | `0 0% 100%` |
| `--secondary` | `207 59% 45%` |
| `--secondary-foreground` | `0 0% 100%` |
| `--success` | `160 84% 39%` |
| `--success-foreground` | `0 0% 100%` |
| `--warning` | `38 92% 50%` |
| `--warning-foreground` | `0 0% 100%` |
| `--danger` | `0 84% 60%` |
| `--background` | `210 20% 98%` |
| `--text` | `221 39% 11%` |
| `--accent` | `23 100% 50%` |
| `--accent-foreground` | `0 0% 100%` |

Tailwind semantic mapping in `frontend-main/tailwind.config.ts`:

| Utility | Maps to |
| --- | --- |
| `bg-primary`, `text-primary` | `hsl(var(--primary))` |
| `bg-secondary`, `text-secondary` | `hsl(var(--secondary))` |
| `bg-success`, `text-success` | `hsl(var(--success))` |
| `bg-warning`, `text-warning` | `hsl(var(--warning))` |
| `bg-danger`, `text-danger` | `hsl(var(--danger))` |
| `bg-background` | `hsl(var(--background))` |
| `text-text` | `hsl(var(--text))` |
| `bg-accent`, `text-accent` | `hsl(var(--accent))` |

### Backgrounds

| Pattern | Fleet implementation |
| --- | --- |
| App background | `bg-background` |
| Main content surfaces | `bg-white` |
| Secondary surfaces | `bg-gray-50` |
| Active nav / selected emphasis | `bg-primary/10`, `bg-primary/5` |
| Warning emphasis | `bg-warning/10`, `bg-warning/5` |
| Error emphasis | `bg-danger/10`, `bg-danger/5` |
| Overlay backdrop | `bg-black/50` |

### Borders

| Pattern | Fleet implementation |
| --- | --- |
| Standard border | `border border-gray-200` |
| Input border | `border-gray-300` |
| Dashed empty state | `border-dashed border-gray-300` |
| Semantic warning/error borders | `border-warning/20`, `border-warning/30`, `border-danger/20`, `border-danger/30` |
| Active sidebar accent | `border-l-4 border-l-primary` |

### Surfaces

| Pattern | Fleet implementation |
| --- | --- |
| Primary card shell | `rounded-xl border border-gray-200 bg-white shadow-sm` |
| Secondary panel | `rounded-xl border border-gray-200 bg-gray-50` |
| KPI / dashboard cards | `rounded-xl border border-gray-200 bg-white p-5 shadow-sm` |
| Table shell | `overflow-hidden rounded-xl border border-gray-200` |
| Modal shell | `rounded-xl bg-white shadow-2xl` |

### Text colors

| Usage | Fleet implementation |
| --- | --- |
| Primary text | `text-text` |
| Secondary body text | `text-gray-600` or `text-gray-700` |
| Tertiary/meta text | `text-gray-500` |
| Accent eyebrow text | `text-accent` |
| Positive text | `text-success` |
| Warning text | `text-warning` |
| Error text | `text-danger` |

### Hover states

| Pattern | Fleet implementation |
| --- | --- |
| Primary button | `hover:bg-secondary` |
| Secondary / outline button | `hover:bg-gray-50` |
| Ghost button | `hover:bg-gray-100` |
| Table row | `hover:bg-gray-50` |
| Sidebar nav item | `hover:border-l-gray-300 hover:bg-gray-100 hover:text-primary` |
| Clickable cards | `hover:border-primary`, `hover:border-secondary`, `hover:shadow-md` |

### Active states

| Pattern | Fleet implementation |
| --- | --- |
| Active sidebar item | `border-l-primary bg-primary/10 text-primary shadow-sm` |
| Active detail tab | `bg-primary text-white` |
| Active grid/table toggle | `bg-white text-primary shadow-sm` |
| Focusable inputs | `focus:border-primary focus:ring-4 focus:ring-primary/20` |

### Disabled states

| Pattern | Fleet implementation |
| --- | --- |
| Buttons | `disabled:cursor-not-allowed disabled:opacity-60` |
| Inputs | `disabled:cursor-not-allowed disabled:opacity-50` or `disabled:opacity-60` |
| Pagination buttons | `disabled:opacity-50` |

### Semantic colors

| Semantic meaning | Fleet implementation |
| --- | --- |
| Success | `bg-success`, `text-success`, `bg-success/10`, `ring-success/20` |
| Warning | `bg-warning`, `text-warning`, `bg-warning/10`, `ring-warning/20` |
| Error | `bg-danger`, `text-danger`, `bg-danger/10`, `ring-danger/20` |
| Info | Uses primary tone: `bg-primary/10`, `text-primary`, `ring-primary/20` |

## 2. Typography

Font stack from `tailwind.config.ts`: `Inter`, `system-ui`, `sans-serif`.

### Typography patterns

| Element | Fleet implementation |
| --- | --- |
| Page titles | `text-2xl font-extrabold text-text`; dashboard hero can go to `text-3xl lg:text-4xl font-extrabold` |
| Section titles | `text-lg font-bold text-text` |
| Card titles | `text-base font-bold text-text` or `text-lg font-bold text-text` |
| Labels in shared fields | `text-xs font-semibold uppercase tracking-wide text-gray-500` |
| Labels in older Fleet local forms | `text-sm font-semibold text-gray-700` |
| Body text | `text-sm text-gray-600` or `text-sm text-gray-700` |
| Helper text | `text-xs text-gray-600` or `text-xs text-gray-500` |
| Empty state title | `text-base font-bold text-text` |
| Empty state description | `text-sm text-gray-500` |
| Table headers | `text-xs font-bold uppercase tracking-wide text-gray-500` |
| Meta / eyebrow text | `text-sm font-bold uppercase tracking-wide text-accent` or `text-secondary` |

### Font size and weight patterns

| Pattern | Fleet usage |
| --- | --- |
| `text-xs` | labels, badges, metadata, helper text |
| `text-sm` | body copy, inputs, table cells, buttons |
| `text-base` | card titles, empty-state titles |
| `text-lg` | section headings |
| `text-xl` | some list/card section headings |
| `text-2xl` | standard page title |
| `text-3xl` to `text-4xl` | dashboard hero only |
| `font-semibold` | form labels, body emphasis |
| `font-bold` | section titles, buttons, row titles, badges |
| `font-extrabold` | page titles, sidebar logo title, KPI values |

## 3. Layout System

### Page shell structure

- Root shell uses `min-h-screen bg-background text-text`.
- Desktop shell is fixed sidebar plus padded main content.
- Main content wrapper uses `transition-all duration-300`.
- Main content area uses `px-4 py-6 sm:px-6 lg:px-8`.

### Sidebar + content layout

| Pattern | Fleet implementation |
| --- | --- |
| Expanded sidebar width | `lg:w-80` |
| Collapsed sidebar width | `lg:w-20` |
| Main offset expanded | `lg:pl-80` |
| Main offset collapsed | `lg:pl-20` |
| Sidebar shell | `fixed inset-y-0 left-0 hidden ... lg:flex lg:flex-col` |

### Header / topbar layout

- Header is sticky: `sticky top-0 z-30`.
- Header shell uses `border-b border-gray-200 bg-white/95 backdrop-blur`.
- Inner header uses `flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8`.

### Grid usage

Common Fleet grid patterns seen in current pages:

| Usage | Pattern |
| --- | --- |
| KPI grid | `grid gap-4 md:grid-cols-2 xl:grid-cols-4` |
| Two-panel operational layout | `grid gap-6 xl:grid-cols-2` |
| Detail split layout | `grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]` |
| Dashboard split layout | `grid gap-6 2xl:grid-cols-[minmax(0,1fr)_420px]` |
| Cards in lists | `grid gap-4 md:grid-cols-2 2xl:grid-cols-3` |
| Info grids | `grid gap-4 sm:grid-cols-2 xl:grid-cols-4` |

### Card spacing

| Pattern | Fleet implementation |
| --- | --- |
| Card body padding | `p-5` |
| Larger hero/header card | `p-6` or `lg:p-7` |
| Internal group spacing | `space-y-3`, `space-y-4`, `space-y-6` |

### Section spacing

- Standard page stack uses `space-y-6`.
- Most sections use `mb-4` or `mb-5` between heading and content.
- Form section separators use `mt-6 border-t border-gray-200 pt-5`.

### Responsive behavior

- Sidebar hidden below `lg`; mobile uses a dropdown-style nav block inside header.
- Header search becomes icon-only trigger on mobile and full input on `md+`.
- Most filters stack vertically on mobile and switch to row layout from `sm`.
- Cards and tables remain single column on small screens and expand with `md`, `xl`, and `2xl`.

## 4. Sidebar

Source: `frontend-main/modules/fleet-web/src/app/navigation.ts` and `src/components/Layout.tsx`.

### Navigation grouping

Current Fleet sidebar groups:

| Section | Items |
| --- | --- |
| Overview | Dashboard |
| Operations | My Tasks, Dispatch |
| Fleet | Vehicles, Drivers |
| Maintenance | Maintenance, Inventory |
| Compliance & Risk | Compliance, Alerts |

### Active state

- Active item uses `border-l-primary bg-primary/10 text-primary shadow-sm`.
- Active icon uses `text-primary`.
- Work Queue special tone when not active uses `border-l-warning bg-warning/5 text-text`.

### Collapsed behavior

- Sidebar can collapse from `lg:w-80` to `lg:w-20`.
- Section labels disappear in collapsed mode.
- Item buttons become centered icon buttons with `justify-center px-2`.
- Work Queue keeps a small red dot badge in collapsed mode: `absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-danger ring-2 ring-white`.

### Icons

- Sidebar icons use Lucide React.
- Standard item icon size: `h-5 w-5`.
- Section collapse chevron size: `h-4 w-4`.

### Badges / counts

- Only Work Queue currently shows count badges in sidebar.
- Badge tone:
  - Critical tasks present: `bg-danger text-white`
  - Otherwise: `bg-warning/15 text-warning ring-1 ring-warning/20`

### Role / module visibility pattern

- Present in Fleet.
- Sidebar items are filtered through `canAccessPage(item.id)` from Fleet auth.
- Sections with zero visible items are hidden completely.

## 5. Topbar / Header

Source: `frontend-main/modules/fleet-web/src/components/Layout.tsx`.

### Search placement

- Global search sits in the right-side action cluster of the topbar.
- On desktop it appears before notifications.
- On mobile it becomes a search icon trigger.

### Notification icon

- Present as a bell icon button with a red dot indicator.
- Button classes: `rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50`.
- Unread dot: `absolute right-2 top-2 h-2 w-2 rounded-full bg-danger`.

### User / profile area

- User name and role/subtitle are shown at the right on `sm+`.
- Name: `text-sm font-semibold text-text`
- Secondary line: `text-xs text-gray-500`

### Primary actions

- Header-level primary actions are search, bell, and logout.
- Logout button is icon-only with border and hover treatment consistent with Fleet shell buttons.

### Breadcrumb / page context

- Topbar itself does not include breadcrumbs.
- Detail pages use a separate breadcrumb component above the page header.

## 6. Buttons

Sources: `frontend-main/modules/fleet-web/src/components/Button.tsx` and `frontend-main/packages/shared-ui/src/button.tsx`.

### Button variants

| Variant | Fleet implementation |
| --- | --- |
| Primary button | `bg-primary text-white hover:bg-secondary border-primary` |
| Secondary button | `bg-white text-primary hover:bg-gray-50 border-gray-300` |
| Ghost button | `bg-transparent text-gray-700 hover:bg-gray-100 border-transparent` |
| Icon button | Same base button with icon slot; common sizes `h-10` or explicit square like `h-9 w-9 px-0` |
| Danger / destructive button | `bg-danger text-white hover:bg-danger/90 border-danger` |
| Accent action button | `bg-accent text-white hover:bg-[#E65800] border-accent` |

### Disabled / loading states

- Disabled buttons use `disabled:cursor-not-allowed disabled:opacity-60`.
- Loading state is text-based in buttons such as `Saving...`, `Deleting...`, `Resolving...`.
- Fleet does not define a separate spinner-inside-button standard beyond optional icon animation on refresh.

### Button sizing and placement rules

- Standard button height: `h-10`.
- Small action buttons in tables use `h-9 px-3`.
- Buttons appear in right-aligned action groups with `flex justify-end gap-2` or header action rows with `flex flex-wrap gap-2`.
- Primary destructive or save actions are placed last in footer groups.

## 7. Forms and Inputs

Fleet uses both shared primitives and repeated local field markup.

### Text input

Common Fleet input pattern:

`h-10 w-full rounded-lg border bg-white px-3 text-sm outline-none ring-primary/20 focus:border-primary focus:ring-4`

Border changes:

- Normal: `border-gray-300`
- Error: `border-danger`

### Select / dropdown

Common Fleet select pattern:

`h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none ring-primary/20 focus:border-primary focus:ring-4`

### Search input

Common Fleet search input pattern:

- Left icon positioned absolute at `left-3`.
- Input uses `pl-9`.
- Width patterns: `w-full`, `sm:w-72`, or desktop global search width `w-[min(38vw,440px)]`.

### Checkbox / radio

- Not defined in Fleet Module.

### Labels

Two existing label patterns are present:

| Pattern | Current usage |
| --- | --- |
| Shared uppercase micro-label | `text-xs font-semibold uppercase tracking-wide text-gray-500` |
| Local form label | `text-sm font-semibold text-gray-700` |

### Placeholder style

- Shared input uses `placeholder:text-gray-500`.
- Global search and local search inputs also use gray placeholder styling via inherited `text-sm` input styles.

### Error / helper text

| Usage | Fleet implementation |
| --- | --- |
| Field error | `text-xs font-semibold text-danger` or `text-xs text-danger` |
| Helper / description | `text-xs text-gray-600` or `text-xs text-gray-500` |
| Form submit error | `ErrorState` component |

### Validation states

- Invalid field border becomes `border-danger`.
- Error copy is shown directly below the field.
- No alternate validation icon pattern is defined in Fleet.

## 8. Search

### Global search behavior

Source: `frontend-main/modules/fleet-web/src/components/GlobalSearch.tsx`.

- Desktop search is in the topbar.
- Keyboard shortcut is implemented: `Cmd/Ctrl + K`.
- `Escape` closes search.
- Clicking outside closes search.
- Empty query shows a default capped result set (`results.slice(0, 10)` before grouping).

### Search result layout

- Floating result panel uses `rounded-xl border border-gray-200 bg-white p-3 shadow-2xl`.
- Results are grouped by:
  - Vehicles
  - Drivers
  - Work Orders
  - Parts
  - Tasks
- Group label style: `text-[11px] font-extrabold uppercase tracking-wider text-gray-500`.
- Each result row uses icon chip, bold label, small description, and group pill.

### Empty state

- Global search empty state:
  - Title: `No matching results found`
  - Helper: `Try vehicle number, driver name, work order, or part name.`

### Keyboard / click behavior

- Implemented in Fleet:
  - `Cmd/Ctrl + K` opens search
  - `Escape` closes
  - click outside closes
  - clicking a result navigates and clears query

## 9. Notifications

### Toasts

- Not defined in Fleet Module.

### Alerts

- Inline alert/error cards are defined.
- Standard error card uses `rounded-xl border border-danger/20 bg-danger/10 p-5`.
- Warning banner example on dashboard uses `rounded-xl border border-warning/30 bg-warning/10 px-4 py-3`.
- Success banner example exists in exception detail page with `border-success/30 bg-success/10`.

### Banners

- Defined as inline contextual banners inside pages, not as global system banners.

### Notification panel / dropdown

- Not defined in Fleet Module.
- Only bell icon with unread dot is present.

### Success / error / warning / info rules

| State | Fleet pattern |
| --- | --- |
| Success | `bg-success/10 text-success border-success/30` |
| Error | `bg-danger/10 text-danger border-danger/20` |
| Warning | `bg-warning/10 text-warning border-warning/20` or `/30` |
| Info | Uses primary tone; no separate info-specific banner component is defined |

## 10. Tables and Data Display

Sources: `frontend-main/modules/fleet-web/src/components/DataTable.tsx` and Fleet list pages.

### Table layout

- Wrapper: `overflow-hidden rounded-xl border border-gray-200`
- Header row background: `bg-gray-50`
- Body background: `bg-white`
- Dividers: `divide-y divide-gray-200`

### Header style

- `px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500`
- Sortable headers use a button with hover state `hover:text-primary`.
- Sort indicator text is plain text: `SORT`, `ASC`, `DESC`.

### Row style

- Cell style: `px-4 py-4 text-sm text-gray-700`
- Clickable rows: `cursor-pointer hover:bg-gray-50`
- Primary row labels are usually `font-bold text-text`.

### Empty state

- Table component falls back to Fleet `EmptyState`.
- Default title: `Nothing to show`.

### Sorting / filtering / pagination

- Sorting: defined in Fleet `DataTable` when `sortable` and `sortValue` are provided.
- Filtering: implemented per page, typically above the table via `FilterBar`.
- Pagination: defined with `pageSize`; footer uses `Page X of Y` with Previous / Next buttons.

### Row actions

- Right-aligned action buttons are common.
- Typical example: `Button className="h-9 px-3" variant="secondary">Open</Button>`.

### Status badges

- Tables consistently use `StatusBadge` for status/severity columns.

## 11. Cards and Dashboard Components

### KPI cards

Defined patterns:

- Shared `KpiCard`: `rounded-xl border border-gray-200 bg-white p-5 shadow-sm`
- Large numeric value: `text-3xl font-extrabold leading-none text-text`
- Label: `text-xs font-bold uppercase tracking-wide text-gray-500`

### Summary cards

- Common section card shell: `rounded-xl border border-gray-200 bg-white p-5 shadow-sm`
- Secondary summary panel: `rounded-xl border border-gray-200 bg-gray-50 p-4`

### Detail cards

- Detail pages use white bordered cards with `p-5 shadow-sm`.
- Related records often use softer clickable blocks such as `rounded-xl border border-gray-200 bg-gray-50 p-4`.

### Chart / container cards

- Dashboard trend and metrics containers use standard white card shells.
- No reusable chart-specific shared card primitive is defined beyond the same card pattern.

### Card header / action / footer pattern

- Heading block usually appears first with small eyebrow or section label and bold title.
- Actions align right in a `flex` row with `gap-2`.
- Footer is not standardized across Fleet cards.

## 12. Collapse / Expand Components

### Sidebar collapse

- Defined.
- Trigger is an icon button in the sidebar header.
- Width transitions use `transition-all duration-300`.

### Accordion / collapsible sections

- Sidebar sections can collapse individually when `section.collapsible` is true.
- Chevron rotates with `transition` and `-rotate-90` when collapsed.

### Animation / transition pattern

- Common reveal pattern: `animate-in fade-in duration-300`
- Sidebar width and layout changes: `transition-all duration-300`

### Icon behavior

- ChevronDown is used for section collapse.
- In collapsed sidebar mode, section label is replaced by a divider line.

## 13. Modals and Drawers

### Modal layout

Source: `ConfirmModal` and shared `Dialog`.

- Current Fleet local confirmation modal uses centered card over `bg-black/50`.
- Modal width: `w-full max-w-md`
- Body shell: `rounded-xl bg-white p-5 shadow-2xl animate-in fade-in duration-300`

### Header / body / footer structure

- Header: icon + title + description + close button
- Optional custom content block
- Footer: right-aligned action row `mt-6 flex justify-end gap-2`

### Confirmation modal pattern

- Standard buttons: Cancel then Confirm
- Warning icon chip: `rounded-xl bg-warning/10 p-2 text-warning`
- Used for delete and resolve flows

### Close / cancel / save behavior

- Close button is top-right icon button.
- Cancel uses secondary / outline-style button.
- Confirm action uses primary or context action text such as `Delete`, `Resolve`.

### Drawer pattern

- Defined in `VehicleDetailDrawer`.
- Right-side drawer uses `ml-auto ... max-w-xl flex-col bg-white shadow-2xl`.
- Header has border bottom and ghost close button.
- Body scrolls independently with `flex-1 overflow-y-auto`.

## 14. Icons

### Icon sizing

| Usage | Typical size |
| --- | --- |
| Sidebar icons | `h-5 w-5` |
| Inline action icons | `h-4 w-4` |
| Topbar icons | `h-5 w-5` |
| Search leading icons | `h-4 w-4` |
| Section accent icons | `h-5 w-5` or `h-6 w-6` |

### Icon placement

- Buttons: icon before label via `gap-2`
- Search: icon inside input on left
- Cards: icon often in a tinted rounded square/chip
- Sidebar: icon before label and description

### Icon color rules

- Default neutral icons: `text-gray-400`, `text-gray-500`, `text-gray-600`
- Active or emphasized icons: `text-primary`
- Warning and danger icons use `text-warning` and `text-danger`

### Sidebar icons

- Lucide icons only in current Fleet shell.

### Action icons

- Common action icons: `Plus`, `Download`, `Edit`, `Trash2`, `RefreshCw`, `ClipboardCheck`, `Bell`, `LogOut`, `Search`.

## 15. Empty, Loading, and Error States

### Empty page / card / table states

- Standard empty state card:
  - `rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center`
  - icon chip `bg-gray-100 text-gray-500`
  - title `text-base font-bold text-text`
  - description `text-sm text-gray-500`

### Loading indicators

- Standard loading state uses a centered card with spinner and label.
- Spinner icon: `Loader2` with `animate-spin text-primary`.

### Skeletons / spinners

- Spinner defined.
- Skeleton pattern is not defined in Fleet Module.

### Error display pattern

- Standard error state uses red-tinted bordered card with alert icon.
- Warning-style data fallback messages are rendered as `ErrorState` with alternate titles or inline warning banners.

## 16. Implementation Rules for Other Modules

Other modules should use this Fleet reference in the following way:

- Keep the existing module business flow unchanged.
- Do not rewrite or simplify module logic.
- Do not change routing structure or route meaning.
- Do not change auth or permission behavior.
- Do not change API calls, payloads, or data flow.
- Replace only styling, layout, and reusable UI components where alignment is needed.
- Reuse shared UI primitives where they already exist, especially button, card, input, badge, table, dialog, field, and page-hero patterns.
- When shared primitives are not used yet in a module, match Fleet visual output exactly before introducing any new visual behavior.
- If a pattern is not defined in Fleet Module, do not invent one under the name of Fleet alignment.
- Align only visual language, spacing, states, and interaction consistency with Fleet.

## 17. Developer Checklist

- [ ] Colors match Fleet tokens and semantic tones.
- [ ] Page backgrounds, surfaces, and borders match Fleet shells.
- [ ] Typography follows Fleet title, label, and body-text patterns.
- [ ] Buttons match Fleet variants, sizes, and disabled behavior.
- [ ] Sidebar grouping, active state, and collapse behavior match Fleet where applicable.
- [ ] Topbar search, action placement, and profile area match Fleet where applicable.
- [ ] Tables, cards, forms, badges, and empty/loading/error states follow Fleet patterns.
- [ ] Search UI follows Fleet input, result grouping, and empty-state patterns where applicable.
- [ ] Modals or drawers match Fleet patterns only if those patterns already exist in Fleet.
- [ ] No business logic was changed.
- [ ] No routing was broken or rewritten.
- [ ] No auth or permission behavior was changed.
- [ ] No API calls or data flow were changed.
- [ ] Responsive layout was verified against Fleet-style breakpoints and stacking behavior.

## Component and Class Examples

Use these existing Fleet patterns first:

| Need | Existing Fleet pattern |
| --- | --- |
| Page header | `PageHeader` in `frontend-main/modules/fleet-web/src/components/PageHeader.tsx` |
| Button | `Button` in `frontend-main/modules/fleet-web/src/components/Button.tsx` |
| Table | `DataTable` in `frontend-main/modules/fleet-web/src/components/DataTable.tsx` |
| Filter row | `FilterBar` in `frontend-main/modules/fleet-web/src/components/FilterBar.tsx` |
| Status badge | `StatusBadge` in `frontend-main/modules/fleet-web/src/components/StatusBadge.tsx` |
| Detail tabs | `DetailTabs` in `frontend-main/modules/fleet-web/src/components/DetailTabs.tsx` |
| Key/value detail layout | `InfoGrid` and `InfoItem` |
| Empty state | `EmptyState` |
| Loading state | `LoadingState` |
| Error state | `ErrorState` |
| Confirmation modal | `ConfirmModal` |
| Global search | `GlobalSearch` |

Common exact class snippets from current Fleet code:

```tsx
rounded-xl border border-gray-200 bg-white shadow-sm
```

```tsx
h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none ring-primary/20 focus:border-primary focus:ring-4
```

```tsx
px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500
```

```tsx
rounded-full px-3 py-1 text-xs font-bold ring-1
```

```tsx
space-y-6
```

Patterns explicitly not defined in Fleet Module:

- Toast system
- Notification dropdown / panel
- Checkbox pattern
- Radio pattern
- Skeleton loader pattern
- Breadcrumbs inside topbar
- Shared standalone info-banner component separate from page-level inline banners
