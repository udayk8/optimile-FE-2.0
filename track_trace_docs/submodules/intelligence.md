# Intelligence Sub-Module

Section label: `Intelligence`

Pages in this sub-module: **4**

## Included Pages

1. Analytics (`TrackingAnalyticsPage.tsx`)
2. Route Performance (`RoutePerformancePage.tsx`)
3. Driver Behavior (`DriverBehaviorPage.tsx`)

## Purpose

The Intelligence section provides analysis and performance insights: delay trends, route efficiency, and driver behavior scoring.

---

## Code-Level Observations

These are derived from reviewing `TrackingAnalyticsPage.tsx`, `RoutePerformancePage.tsx`, `DriverBehaviorPage.tsx`, and the shared `ChartPlaceholderCard.tsx` and `MetricGrid.tsx` components.

### Shared pattern across all four pages

All four pages follow the same structural template:
```
PageHero → (optional V2 framing section) → MetricGrid → ChartPlaceholderCard(s) or DataTable → (optional additional cards)
```

This creates visual consistency but also produces a "same page, different data" effect when users navigate between sub-pages. The pages are indistinguishable in structure.

### Analytics (`TrackingAnalyticsPage.tsx`)

- **V2 framing adds context.** A section above the KPI grid explains the analytics purpose in V2 mode — this is positive but adds ~120px before operational content.
- **`ChartPlaceholderCard` is used for all chart types.** Trend lines, bar distributions, and severity comparisons all use the same placeholder bar visual. There is no chart-type differentiation — a delay trend and an alert severity breakdown look structurally identical.
- **Exception analytics is a table below the chart cards.** This is the most operationally actionable section on the page but is positioned after several chart cards, making it below-the-fold on most screens.
- **Predicted risk cards are rendered at the bottom** — often the most forward-looking insight is the last thing seen.
- **No date range control.** All analytics show data for a static/default period. There is no control to change the time window.
- **No export or download CTA.**
- **Feature access gating is explicit** via `FeatureAccessNotice` — positively handled.

### Route Performance (`RoutePerformancePage.tsx`)

- **KPI strip followed by a wide DataTable.**
- **Lane performance table** shows route corridor metrics: distance, planned vs actual travel time, delay frequency, on-time rate.
- **No sort-by-worst-performance affordance** visible at the page level. The table likely renders in fixed order.
- **No lane comparison or filter by region/corridor.**
- **No drill-down to affected trips from a bad lane.**

### Driver Behavior (`DriverBehaviorPage.tsx`)

- **Same template.** KPI strip → driver scorecard DataTable.
- **Scorecard columns** include: driver name, trips, on-time rate, overspeed incidents, idle time, GPS compliance.
- **No risk grouping.** All drivers appear in the same table regardless of score. High-risk drivers are not surfaced first.
- **No filter by fleet, region, or route segment.**
- **No individual driver drill-down** to their trip history or alert history.

### Shared component: `MetricGrid`

- Renders KPI cards in a responsive grid. Used consistently across all pages.
- No tonal differentiation between "good", "at-risk", and "critical" metric cards in the shared component. All KPI cards have the same visual weight.
- No threshold logic or conditional coloring is applied at the `MetricGrid` level — it would need to be passed per-metric from the page.

### Shared component: `ChartPlaceholderCard`

- Uses a simple bar chart visual. Every instance looks identical.
- No chart type variation (no line charts for trends, no pie/donut for distributions, no scatter for correlation).
- Labels and data are rendered in a uniform format regardless of the analytical intent of the chart.

---

## Scroll Review

### Vertical Scroll

#### Analytics

- Sections: hero → V2 framing (optional, ~120px) → MetricGrid (KPI cards) → 3–4 ChartPlaceholderCards → exception analytics table → predicted-risk card stack.
- The exception analytics table and predicted-risk cards are the most operationally useful sections but are positioned last.
- Scroll depth to reach exception table is approximately 1400–1800px on a standard 1080p display.

#### Route Performance / Driver Behavior

- Similar to SLA. Short page height until the table begins. Table is the primary content.
- No table-level navigation.

### Horizontal Scroll

- All four pages rely on `DataTable` with 6–8+ columns.
- On 1280px viewport with the sidebar open, each column gets approximately 120–160px.
- On tablet (768–1024px) with sidebar open, table compression becomes uncomfortable.
- No sticky-column behavior or responsive card alternative is apparent.
- This is the largest horizontal risk in the entire Track and Trace module.

---

## Detailed Gap Analysis

### Overall Layout Structure

- All four pages use the same structural template. This creates learnability but sacrifices differentiation.
- `Analytics` should have an exploratory, synthesis-driven layout.
- `Route Performance` should have a corridor-comparison, ranked-by-delay layout.
- `Driver Behavior` should have a risk-grouped, coaching-prioritized layout.
- Currently the remaining intelligence pages still feel structurally similar despite different goals.

### User Flow and Usability

- The sub-module has no meaningful user flow beyond "arrive → read → leave."
- Users cannot act on insights. There are no CTAs leading to affected trips, alert queues, or driver details.
- The section is passive-observation rather than active-investigation.

### Design Consistency with Existing Design System

- Metric grids, tables, and cards all use consistent design system components.
- The issue is not design inconsistency but structural monotony.
- The pages look like valid product screens but do not differentiate by analytical purpose.

### Spacing, Alignment, Typography, and Visual Hierarchy

- KPI cards have consistent spacing and typography.
- No visual hierarchy difference between urgent metrics (SLA breaches, high-overspeed drivers) and informational metrics (total trips, average distance).
- Charts are all the same weight — a delay trend line should feel different from a completion rate donut.

### Form Usability and Interaction Patterns

- No forms. Minimal interaction.
- The absence of date range, segment filter, and view-switch controls means the pages are static.
- No saved-analysis view, no export, no comparison mode.

### Table/List Readability and Action Accessibility

- Desktop readability is acceptable for small-to-medium datasets.
- Tables have no in-table search, sort affordance, or filter chip row.
- Wide tables compress aggressively on tablet and mobile without responsive alternatives.
- Row actions (if any) are not clearly accessible on narrower screens.

### Sidebar, Filters, Search, Pagination, and Sticky Actions

- The global sidebar is adequate.
- Within the sub-module, no analysis-level controls exist: no date range, no segment filter, no saved view, no export, no table-level search.
- No sticky table toolbar.
- No pagination on any table.

### Mobile Responsiveness and Tablet Adaptability

- KPI grids stack cleanly — not a risk.
- Data tables with 6–8 columns on tablet/mobile are a significant UX problem.
- Without responsive card fallbacks, tables on narrow screens likely cause horizontal scroll or extreme column compression.

### Empty States, Loading States, Validation States, and Error Handling

- Loading and error states are present and consistent.
- Feature-gating is handled via `FeatureAccessNotice` — explicit and clear.
- Partial-state handling is absent — if one chart data source fails, the whole section goes into error state.
- No empty-state handling for "no data in selected period" (when date range filters are added).

### CTA Visibility and Workflow Clarity

- No operational CTAs on any page.
- Observing "4 SLA breaches this week" provides no path to viewing those trips or raising alerts.
- The intelligence section ends each analysis at the page boundary.

---

## Improvement Register

### 1. All four intelligence pages use the same structural template without differentiation

- Current issue:
  Every page follows: hero → MetricGrid → charts/table. The same template applied to analytics, route performance, and driver behavior makes them feel like one report with different data plugged in.
- Impact on user experience:
  Users cannot perceive the analytical purpose of each page from its structure. The section feels generic rather than purposeful.
- Recommended improvement:
  Give each page a layout that matches its analytical job-to-be-done.
- Priority level:
  `High`
- Suggested implementation approach:
  - `Analytics`: exploratory layout with a prominent exception analytics section above charts. Move exception table above chart cards. Add predicted-risk section at the same level as KPIs.
  - `Route Performance`: ranked lane layout — sort table by delay descending by default. Add a "Worst performing corridors" summary strip above the table.
  - `Driver Behavior`: scorecard with risk grouping — separate "Needs attention" drivers (bottom quartile) from "Performing well" drivers above the full table.

### 2. No date range or segmentation controls on any intelligence page

- Current issue:
  All analytics data is shown for a default/static period. There are no controls to change the time window, segment by customer/region/fleet, or apply any filter.
- Impact on user experience:
  Users can only see what the system pre-computes. They cannot investigate specific periods, routes, or customer segments. The analytics are not analytical.
- Recommended improvement:
  Add a shared intelligence toolbar with at minimum a date range picker.
- Priority level:
  `High`
- Suggested implementation approach:
  Create a `IntelligenceToolbar` component with: date range (from/to), optional region filter, optional customer filter, optional fleet/vehicle-type filter. Place it above the MetricGrid on every intelligence page. Connect it to the data-fetching layer so filter changes trigger data refreshes.

### 3. DataTable has no responsive alternative on tablet or mobile

- Current issue:
  All four pages use `DataTable` with 6–8 columns. No card/list fallback exists for smaller viewports.
- Impact on user experience:
  On tablet widths (768–1024px), the table becomes cramped and difficult to read comparatively. On mobile, horizontal overflow likely occurs.
- Recommended improvement:
  Add responsive card rendering for all intelligence tables.
- Priority level:
  `High`
- Suggested implementation approach:
  For each `DataTable` in the intelligence pages, add a `mobileCardRender` prop using the same responsive-table pattern already used elsewhere in the module. The mobile card should show the 3–4 most important columns (name/ID, key metric, status indicator, and one action if applicable). The full table continues to render on md+ breakpoints.

### 4. Exception analytics table is positioned after chart cards in Analytics

- Current issue:
  On `TrackingAnalyticsPage`, the exception analytics table — the most operationally actionable section — is positioned after 3–4 chart placeholder cards, placing it below the fold.
- Impact on user experience:
  The most useful content requires the most scrolling to reach.
- Recommended improvement:
  Move the exception analytics table above the chart cards, or separate the page into tabs (Exceptions / Trends / Risk).
- Priority level:
  `High`
- Suggested implementation approach:
  Reorder the Analytics page JSX so the exception analytics section appears directly after the MetricGrid KPI strip. Place charts in a collapsible "Trend detail" section below. Or add a tab bar: `Overview | Exceptions | Trends | Risk` with tab-specific content panels.

### 5. ChartPlaceholderCard uses identical bar visual for all analytical intents

- Current issue:
  Every chart — delay trends, alert severity, trip status distribution, route efficiency — renders using the same simple bar chart placeholder from `ChartPlaceholderCard`.
- Impact on user experience:
  Users cannot visually distinguish a trend over time from a categorical distribution. All charts carry the same visual weight and shape, creating monotonous scan patterns.
- Recommended improvement:
  Differentiate chart types by analytical intent.
- Priority level:
  `Medium`
- Suggested implementation approach:
  Define chart type variants in `ChartPlaceholderCard`: `type="trend"` (line chart), `type="distribution"` (bar chart), `type="composition"` (donut/pie), `type="heatmap"`. Render visually distinct placeholders for each. When real chart data is connected, replace placeholder bars with real chart library components.

- Priority level:
  `High`
- Suggested implementation approach:
  Add `getRowClassName` to the SLA table that applies `bg-danger/5` to breached rows. Add a "View trip" link column that navigates to `scopedPath('/trips/{tripId}')`. Add a summary strip at top: "4 breaches · 6 at risk" with direct filter buttons.

### 7. Driver Behavior has no risk-grouping or priority sorting

- Current issue:
  All drivers appear in the same flat table regardless of risk score.
- Impact on user experience:
  Fleet managers must manually sort or scan to identify high-risk drivers. The page does not guide attention.
- Recommended improvement:
  Group drivers by risk tier above the full table.
- Priority level:
  `Medium`
- Suggested implementation approach:
  Add a "Needs attention" section above the full driver table that shows only drivers with on-time rate below a threshold OR overspeed incidents above a threshold. Render each as a compact summary card with their key risk signal. Below this, show the full table for all drivers.

### 8. Route Performance table is not sorted by performance by default

- Current issue:
  The route performance table renders in its default data order, not ranked by delay or worst performance.
- Impact on user experience:
  A fleet manager must manually scroll and scan to find problematic lanes.
- Recommended improvement:
  Default sort by average delay descending.
- Priority level:
  `Medium`
- Suggested implementation approach:
  Add a `defaultSort` to the DataTable on the Route Performance page: sort by `avgDelayMinutes` descending. Add a "Worst first" chip above the table as a visual indicator of the sort state.

### 9. Intelligence pages have no next-step CTAs connecting to operational workflows

- Current issue:
  Every page presents information with no navigation CTA connecting insights to actions. "4 breaches" on SLA leads nowhere.
- Impact on user experience:
  Analytics become observational dead ends. The intelligence layer does not drive operational response.
- Recommended improvement:
  Add contextual action CTAs to each page.
- Priority level:
  `High`
- Suggested implementation approach:
  - Analytics: "Open active exceptions" button linking to Alerts page with critical/high filter pre-applied.
  - SLA: "View affected trips" per breach row.
  - Route Performance: "Open lane trips" link per corridor row.
  - Driver Behavior: "Review trip history" link per driver row linking to Active Trips filtered by that driver.

### 10. MetricGrid KPI cards have no threshold-based tonal differentiation

- Current issue:
  All KPI cards in `MetricGrid` render with the same visual style regardless of whether the metric value is within or outside acceptable thresholds.
- Impact on user experience:
  A user cannot tell at a glance whether the current SLA breach rate of 12% is good, borderline, or critical.
- Recommended improvement:
  Apply tonal coloring to KPI cards based on configurable thresholds.
- Priority level:
  `Medium`
- Suggested implementation approach:
  Extend `MetricGrid` items to accept an optional `thresholds: { warn: number, critical: number }` and `higherIsBetter: boolean`. Compute the tone dynamically and apply `bg-danger/10 text-danger` (or warning/success) to the icon background and value label when thresholds are breached.

### 11. Feature-gated states lack actionable next steps

- Current issue:
  `FeatureAccessNotice` explains what is gated but provides no next-step CTA.
- Impact on user experience:
  Users understand they are locked out but do not know what to do next.
- Recommended improvement:
  Add upgrade path or admin contact CTA.
- Priority level:
  `Low`
- Suggested implementation approach:
  Add a secondary button to `FeatureAccessNotice`: "Request access" (mailto link or help page) or "Contact workspace admin." This is a one-component change affecting all gated pages.

### 12. No export capability for any intelligence data

- Current issue:
  Analytics, SLA, route performance, and driver behavior tables have no export (CSV/Excel) option.
- Impact on user experience:
  Enterprise governance users cannot export intelligence data for external reporting, meetings, or compliance documentation.
- Recommended improvement:
  Add a download/export CTA to each intelligence page.
- Priority level:
  `Medium`
- Suggested implementation approach:
  Add an "Export CSV" button to the shared `IntelligenceToolbar` (from improvement #2). When clicked, serialize the current filtered table rows to CSV and trigger a browser download. This requires no backend — client-side CSV generation from the in-memory data is sufficient.

---

## Recommended Priority Actions

1. Differentiate each page layout by analytical job-to-be-done (Analytics, SLA, Route, Driver).
2. Add a shared intelligence toolbar with date range and segment filters.
3. Add responsive card mode to all DataTable instances in the sub-module.
4. Move exception analytics table above charts in Analytics.
5. Add operational CTAs (view trip, open alerts) from intelligence insights.

---

## Final Verdict

The Intelligence sub-module is visually coherent and correctly positioned within the product, but it functions as a passive reporting layer rather than an active analysis workspace. The most impactful improvements are: layout differentiation by analytical purpose, a shared analysis toolbar with date range controls, breach-first ordering on SLA and Driver Behavior, and operational CTAs that connect insights to trips and alert queues. The responsive table gap is a cross-cutting problem that affects every page and must be addressed to support tablet-first field use.
