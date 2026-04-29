# Optimile 2.0 — UI/UX Design System

> This document defines the enterprise-grade UI/UX constitution for all Optimile modules.
> All frontend code must follow these rules strictly to ensure consistency across the ERP.

---

## 1. CORE DESIGN DIRECTION
Use a clean enterprise logistics dashboard style.
The UI must feel: Light, Spacious, Operational, Premium but simple, Fast to scan, Data-first, Calm, not colorful everywhere, Consistent across modules.

**Inspiration:**
- White and off-white background
- Left sidebar navigation
- Top header
- Rounded white cards
- Light gray borders
- Soft shadows
- Blue as the primary action color
- Orange only for intelligence/highlight labels
- Green for healthy/success
- Amber for warning
- Red for exceptions/critical issues
- Muted gray for secondary text

**Avoid:** Dark dashboard cards, Heavy gradients, Random colors, Overly decorative UI, Inconsistent spacing, Too many font sizes, Different card styles across modules.

---

## 2. GLOBAL LAYOUT RULE
All web pages must follow this structure:
- Fixed left sidebar
- Sticky top header
- Main content area with light gray background
- Page header section
- Card-based content sections

**Layout structure:**
```text
AppShell
  Sidebar
  MainArea
    Topbar
    PageContent
      PageHeader
      KPI / Action Cards
      Main Module Cards
      Tables / Charts / Workflows
```
**Main content background:** Use #F8FAFC (or similar light gray). Cards white. Borders #E5E7EB. Text dark navy/gray, not pure black.
**Max content width:** Full width, inner padding 24px-32px desktop, Card spacing 16px-24px.

---

## 3. SIDEBAR RULE
Sidebar must remain consistent across all modules.
- **Width:** 260px to 280px
- **Background:** White
- **Border-right:** Light gray
- **Items:** Icon, Main label, Short subtitle stacked vertically. Active item with light blue/gray bg, dark blue text. Icons on left.
- **Rules:** Keep labels short, subtitles useful. Max 2 nesting levels. Hide restricted modules via RBAC.
- **Visual:** Border radius 10-14px, Padding 12-14px, Gap 6-8px, Icon 18-20px.

---

## 4. TOPBAR RULE
Topbar should be clean and minimal.
- **Includes:** Small module/product label, Current page name, Notification icon, User name, User role/subtitle.
- **Style:** Height 64-72px, White bg, border-bottom light gray. Right-aligned user block. Notification icon as small rounded square button. Do not overload.

---

## 5. PAGE HEADER / HERO CARD RULE
Most module pages should start with a hero card.
- **Style:** White bg, Rounded 16-20px, Light border, Soft/no shadow, Padding 24px. Left icon block, Small orange eyebrow label, Main title, Short subtitle, Optional action button on right.
- **Eyebrow:** Uppercase, Orange, Small font, Bold.

---

## 6. TYPOGRAPHY RULE
Use a modern sans-serif font.
- Page title: 24-32px, bold
- Section title: 18-22px, bold
- Card title: 14-16px, semibold
- KPI number: 28-44px, bold
- Body text: 14-15px
- Helper/subtitle text: 12-13px
- Table header: 11-12px uppercase semibold
- **Colors:** Primary text #0F172A, Secondary #475569, Muted #94A3B8, Link/Accent #2563EB. (No pure black).

---

## 7. COLOR SYSTEM RULE
Use a controlled color palette centrally defined.
- **Primary:** Blue (actions, links, active states)
- **Accent:** Orange (intelligence, warnings, special labels)
- **Semantic:** Green (success/healthy), Amber (warning/pending), Red (critical/failed), Gray (draft/inactive).
- **Background:** App bg light gray, Card bg white, Soft alert bg light tint of semantic.

---

## 8. CARD DESIGN RULE
Cards are the main UI building block.
- **Style:** White bg, 1px solid light gray border, Border radius 16px, Padding 20-24px, Soft shadow optional.
- **Types:** KPI, Workflow, Table, Detail, Alert, Chart, Registry. Do not invent new types unless needed.

---

## 9. KPI CARD RULE
KPI cards should be easy to scan.
- **Structure:** Title, Big metric, Unit/supporting label, Mini insight/warning, Optional colored icon block.
- **Rules:** Number must be bold/large. Semantic colors for risk. Short descriptions.

---

## 10. TABLE RULE
Clean enterprise style tables.
- **Style:** White card container, Light gray header bg, Uppercase column labels, Row height 64-76px, Status chips, Row actions on right.
- **Required:** Loading skeleton, Empty state, Error state, Pagination, Filter/search.
- **Rules:** Important value first, Mask PII, Kebab menu for >3 actions.

---

## 11. LIST / QUEUE CARD RULE
For operational queues, use large horizontal cards instead of dense tables.
- **Includes:** Entity title, Location/context, Key metrics in columns, Status chip on right, Alert strip if critical, Action button if needed.

---

## 12. STATUS CHIP RULE
Use chips everywhere for state.
- **Style:** Rounded pill, Small font, Light tinted background, Semantic text color, Padding 4px 8px.
- **Colors:** Green (Active, Delivered, Paid), Amber (Pending, Delayed), Red (Exception, Disputed), Blue (Dispatched, In Transit), Gray (Draft, Cancelled). Define centrally.

---

## 13. BUTTON RULE
Consistent buttons.
- **Primary:** Solid blue/orange (major creation/action).
- **Secondary:** White bg, Border, Blue/dark text (Refresh, Export, Filter).
- **Danger:** Red (Delete, Cancel).
- **Sizing:** Height 36-44px, Border radius 8-12px.
- **Rules:** One primary per section, confirm destructive actions.

---

## 14. FILTER / SEARCH RULE
Aligned above data area.
- **Filter bar:** Search input, Filter button, View toggle, Primary action button on far right.
- **Search input:** Rounded, light border, icon, placeholder.
- **Advanced:** Open in drawer, show active filter count.

---

## 15. ICON RULE
One icon library only (Lucide React).
- **Style:** Stroke icons, Size 16-22px, Muted gray default.
- **Blocks:** Rounded square, light tinted bg, icon in semantic/primary color.

---

## 16. CHART / VISUALIZATION RULE
Charts must be simple and operational.
- **Use:** Bar, Line, Progress, Donut, Horizontal distribution.
- **Rules:** No complex styling, direct labels, keep clean, always show short interpretation under chart.

---

## 17. ALERT / WARNING RULE
Calm but visible.
- **Style:** Light tinted bg, Border in semantic color, Icon, Short message, Optional action. Avoid scary red blocks unless critical.

---

## 18. FORM RULE
Clean and sectioned.
- **Layout:** Card container, section headings, 2-column desktop / 1-column mobile, Required indicator, helper text, inline validation.
- **Long forms:** Stepper, progressive disclosure, sticky footer with Save/Cancel.
- **Fields:** Rounded input, light border, clear focus, helpful placeholder.

---

## 19. DETAIL PAGE RULE
Consistent layout.
- **Structure:** Header (title, status, actions), Summary KPI cards, Main details card, Tabs (Overview, Timeline, Documents, Remarks, Audit Log, Related Records).

---

## 20. TIMELINE RULE
For lifecycle-heavy flows.
- **Item:** Status/action, Actor, Timestamp, Remark, Optional doc/link.

---

## 21. REMARKS RULE
Consistent remarks panel.
- **Item:** Type, Created by, Role, Timestamp, Text, Related status.
- **Rules:** Immutable, chronological, simple composer.

---

## 22. AUDIT LOG RULE
Available for critical actions.
- **Record:** Actor, Action, Timestamp, Old value, New value, Module, IP/device.
- **Show in:** Drawer for preview, Tab for full details.

---

## 23. WORKFLOW / NEXT BEST ACTION RULE
"Next Best Actions" card on the right where workflow guidance is useful.
- **Style:** White card, numbered rows, small status icon, short text. Max 4-6 actions.

---

## 24. RBAC RULE
Every UI action must respect permission.
- **Guards:** canView, canCreate, canEdit, canDelete, canApprove.
- **Rules:** Hide inaccessible modules/actions, do not hardcode role checks in components.

---

## 25. RESPONSIVE RULE
Desktop first, tablet-friendly.
- **Desktop:** Sidebar fixed, multi-column.
- **Tablet:** Sidebar collapsible, 2 or 1 column.
- **Mobile:** Sidebar drawer, stacked cards.

---

## 26. SPACING RULE
Consistent 4px scale.
- **Scale:** 4, 8, 12, 16, 20, 24, 32px.
- **Page padding:** 24-32px, Card gap: 16-24px, Section gap: 24px. No random margins.

---

## 27. BORDER / RADIUS / SHADOW RULE
- **Border:** Light gray (#E5E7EB) on cards, inputs, tables.
- **Radius:** Controls 8-10px, Cards 14-18px, Hero cards 18-20px, Pills full radius.
- **Shadow:** Very subtle shadow only.

---

## 28. CSS / TAILWIND RULE
Use shared tokens and classes.
- Define theme colors, use reusable classes, avoid random inline styles.
- Create utility classes (card, page-shell, kpi-card, etc.).

---

## 29. COMPONENT ARCHITECTURE RULE
Create reusable components before building pages.
- (AppShell, Sidebar, Topbar, HeroCard, KPICard, DataTable, FilterBar, StatusChip, etc.)
- Pages must compose these, not build custom UI.

---

## 30. FOLDER STRUCTURE RULE
Standardized structure:
`src/` -> `app/`, `components/` (layout, cards, tables, etc.), `features/` (modules), `config/`, `hooks/`, `services/`, `store/`, `utils/`, `types/`. Shared UI stays outside module folders.

---

## 31. BUTTON FLOW / USER ACTION FLOW RULE
Clear action priority.
- Hierarchy: Primary > Secondary > Row > Destructive.
- Create/Edit flow: Modal/drawer for simple, full page for complex.
- Validation -> Save -> Toast -> Refresh.

---

## 32. EMPTY / LOADING / ERROR STATE RULE
Every data component needs:
- **Loading:** Skeleton.
- **Empty:** Friendly message, reason, action.
- **Error:** Clear message, retry button, no raw errors.
- **Permission Denied:** Simple explanation.

---

## 33. DATA PRIVACY RULE
Mask sensitive data by default (Aadhaar, Bank, Phone). Show full only with permission/audit.

---

## 34. MODULE CONSISTENCY RULE
All modules must look like the exact same product. Admin, Fleet, TMS, Finance, Vendor etc. must share layout, cards, tables, statuses, buttons.

---

## 35. FINAL EXECUTION RULE
Check shared components first, reuse tokens, apply RBAC, add states (empty/error), maintain Fleet Module inspiration, avoid random colors, keep UI clean/spacious, make it production-grade. Mandatory for all work.
