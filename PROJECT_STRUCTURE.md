# PROJECT_STRUCTURE

Last generated: `2026-05-06T21:07:31.336Z`

## Purpose

This file documents the current filesystem structure of the `optimile FE 2.0` workspace.
Regenerate it after any file, folder, or major code-area change by running:

```bash
node scripts/generate-project-structure.mjs
```

## Workspace Overview

- Workspace root: `optimile FE 2.0`
- Main application workspace: `frontend-main/`
- Frontend modules detected: 9
- Shared packages detected: 4

## Root Structure

```text
- .claude/
  - settings.json
  - settings.local.json
- frontend-main/
  - .env.local
  - .gitignore
  - DESIGN.md
  - index.html
  - modules/
    - auction-web/
    - customer-web/
    - fleet-web/
    - platform-admin-web/
    - tenant-admin-web/
    - tms-booking-web/
    - tms-driver-app-web/
    - track-trace-web/
    - vendor-web/
  - package-lock.json
  - package.json
  - packages/
    - shared-api/
    - shared-auth/
    - shared-ui/
    - shared-utils/
  - postcss.config.cjs
  - README.md
  - src/
    - main.tsx
    - styles.css
    - tracking/
  - tailwind.config.ts
  - tsconfig.json
  - UI-reference.md
  - vite.config.ts
- PROJECT_STRUCTURE.md
- scripts/
  - generate-project-structure.mjs
- track_trace_phase_1_implementation.md
- track_trace_phase_2_implementation.md
- UI-reference.md
```

## frontend-main Structure

```text
- .env.local
- .gitignore
- DESIGN.md
- index.html
- modules/
  - auction-web/
    - .gitignore
    - docs/
      - design-system.md
      - implementation-plan.md
    - index.html
    - package.json
    - postcss.config.js
    - src/
      - app/
      - auth/
      - components/
      - features/
      - hooks/
      - lib/
      - main.tsx
      - modules/
      - services/
      - stores/
      - styles/
      - types/
      - utils/
      - vite-env.d.ts
    - tailwind.config.ts
    - tsconfig.json
    - vite.config.ts
  - customer-web/
    - index.html
    - package.json
    - src/
      - app/
      - index.ts
      - main.tsx
      - styles/
    - tsconfig.json
    - vite.config.ts
  - fleet-web/
    - index.html
    - package.json
    - src/
      - app/
      - components/
      - hooks/
      - main.tsx
      - modules/
      - routing/
      - services/
      - stores/
      - styles/
      - types/
      - utils/
      - vite-env.d.ts
    - tsconfig.json
    - vite.config.ts
  - platform-admin-web/
    - index.html
    - package.json
    - src/
      - app/
      - components/
      - constants/
      - hooks/
      - layouts/
      - lib/
      - main.tsx
      - mocks/
      - modules/
      - shared/
      - store/
      - types/
    - tsconfig.json
    - vite.config.ts
  - tenant-admin-web/
    - index.html
    - package.json
    - src/
      - app/
      - components/
      - constants/
      - hooks/
      - layouts/
      - lib/
      - main.tsx
      - mocks/
      - modules/
      - shared/
      - store/
      - types/
    - tsconfig.json
    - vite.config.ts
  - tms-booking-web/
    - index.html
    - package.json
    - src/
      - app/
      - components/
      - constants/
      - hooks/
      - layouts/
      - lib/
      - main.tsx
      - mocks/
      - modules/
      - store/
      - types/
    - tsconfig.json
    - vite.config.ts
  - tms-driver-app-web/
    - index.html
    - package.json
    - src/
      - app/
      - components/
      - constants/
      - hooks/
      - layouts/
      - lib/
      - main.tsx
      - mocks/
      - modules/
      - store/
      - types/
    - tsconfig.json
    - vite.config.ts
  - track-trace-web/
    - .env.local
    - index.html
    - package.json
    - postcss.config.js
    - src/
      - app/
      - components/
      - constants/
      - hooks/
      - layouts/
      - main.tsx
      - modules/
      - pages/
      - routes/
      - services/
      - store/
      - styles/
      - types/
      - vite-env.d.ts
    - tailwind.config.ts
    - tsconfig.json
    - vite.config.ts
  - vendor-web/
    - .codex
    - .gitignore
    - docs/
      - design-system.md
      - implementation-plan.md
    - index.html
    - package.json
    - postcss.config.js
    - src/
      - app/
      - auth/
      - components/
      - features/
      - hooks/
      - lib/
      - main.tsx
      - modules/
      - services/
      - stores/
      - styles/
      - types/
      - utils/
      - vite-env.d.ts
    - tailwind.config.ts
    - tsconfig.json
    - vite.config.ts
- package-lock.json
- package.json
- packages/
  - shared-api/
    - package.json
    - src/
      - index.ts
    - tsconfig.json
  - shared-auth/
    - package.json
    - src/
      - components/
      - context/
      - guards/
      - hooks/
      - index.ts
      - modulePermissions.ts
      - moduleRoutes.ts
      - permissions.ts
      - roles.ts
      - services/
      - types/
      - utils/
    - tsconfig.json
  - shared-ui/
    - package.json
    - src/
      - badge.tsx
      - button.tsx
      - card.tsx
      - data-table.tsx
      - detail-tabs.tsx
      - dialog.tsx
      - filter-bar.tsx
      - form-field.tsx
      - index.ts
      - info-grid.tsx
      - input.tsx
      - kpi-card.tsx
      - page-hero.tsx
      - textarea.tsx
      - utils/
    - tsconfig.json
  - shared-utils/
    - package.json
    - src/
      - index.ts
    - tsconfig.json
- postcss.config.cjs
- README.md
- src/
  - main.tsx
  - styles.css
  - tracking/
    - TrackingApp.tsx
- tailwind.config.ts
- tsconfig.json
- UI-reference.md
- vite.config.ts
```

## Workspace Modules

### `modules/auction-web`
Package: `@optimile/auction-portal-web` | Version: 1.0.0
Source areas: `app`, `auth`, `components`, `features`, `hooks`, `lib`, `modules`, `services`, `stores`, `styles`, `types`, `utils`

### `modules/customer-web`
Package: `@optimile/customer-web` | Version: 1.0.0
Source areas: `app`, `styles`

### `modules/fleet-web`
Package: `@optimile/fleet-web` | Version: 1.0.0
Source areas: `app`, `components`, `hooks`, `modules`, `routing`, `services`, `stores`, `styles`, `types`, `utils`

### `modules/platform-admin-web`
Package: `@optimile/platform-admin-web` | Version: 1.0.0
Source areas: `app`, `components`, `constants`, `hooks`, `layouts`, `lib`, `mocks`, `modules`, `shared`, `store`, `types`

### `modules/tenant-admin-web`
Package: `@optimile/tenant-admin-web` | Version: 1.0.0
Source areas: `app`, `components`, `constants`, `hooks`, `layouts`, `lib`, `mocks`, `modules`, `shared`, `store`, `types`

### `modules/tms-booking-web`
Package: `@optimile/tms-booking-web` | Version: 1.0.0
Source areas: `app`, `components`, `constants`, `hooks`, `layouts`, `lib`, `mocks`, `modules`, `store`, `types`

### `modules/tms-driver-app-web`
Package: `@optimile/tms-driver-app-web` | Version: 1.0.0
Source areas: `app`, `components`, `constants`, `hooks`, `layouts`, `lib`, `mocks`, `modules`, `store`, `types`

### `modules/track-trace-web`
Package: `@optimile/track-trace-web` | Version: 1.0.0
Source areas: `app`, `components`, `constants`, `hooks`, `layouts`, `modules`, `pages`, `routes`, `services`, `store`, `styles`, `types`

### `modules/vendor-web`
Package: `@optimile/vendor-portal-web` | Version: 1.0.0
Source areas: `app`, `auth`, `components`, `features`, `hooks`, `lib`, `modules`, `services`, `stores`, `styles`, `types`, `utils`

## Shared Packages

### `packages/shared-api`
Package: `@optimile/shared-api` | Version: 1.0.0
Primary contents: `index.ts`

### `packages/shared-auth`
Package: `@optimile/shared-auth` | Version: 1.0.0
Primary contents: `components/`, `context/`, `guards/`, `hooks/`, `index.ts`, `modulePermissions.ts`, `moduleRoutes.ts`, `permissions.ts`, `roles.ts`, `services/`, `types/`, `utils/`

### `packages/shared-ui`
Package: `@optimile/shared-ui` | Version: 1.0.0
Primary contents: `badge.tsx`, `button.tsx`, `card.tsx`, `data-table.tsx`, `detail-tabs.tsx`, `dialog.tsx`, `filter-bar.tsx`, `form-field.tsx`, `index.ts`, `info-grid.tsx`, `input.tsx`, `kpi-card.tsx`, `page-hero.tsx`, `textarea.tsx`, `utils/`

### `packages/shared-utils`
Package: `@optimile/shared-utils` | Version: 1.0.0
Primary contents: `index.ts`

## Notes

- Generated structure excludes heavy or derived directories such as `.git/`, `node_modules/`, `dist/`, `build/`, `coverage/`, and `target/`.
- The outer workspace folder is not the Git repository root; the nested Git repository currently lives inside `frontend-main/`.
- `frontend-main/package.json` references local workspaces that are not present on disk right now:
- `@optimile/admin-web` -> `modules/admin-web` (missing)
- `@optimile/console-web` -> `modules/console-web` (missing)
