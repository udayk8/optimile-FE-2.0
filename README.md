# Optimile Frontend Monorepo

One Vite host serves route-based portals from a scalable monorepo. Each portal keeps its own app, modules, stores, styles, and types; shared code lives in packages.

## Prerequisites

- Node.js >= 18
- npm >= 9

## Getting Started

```bash
# 1. Install all dependencies (run once, or after pulling changes)
npm install

# 2. Start the dev server
npm run dev
```

The app will be available at **http://127.0.0.1:3000/**

> If port 3000 is in use, Vite will try 3001, 3002, etc. Check the terminal output for the actual URL.

## Demo Login

When the backend is unavailable, use any of the demo accounts below. Password for all: **`testing`**

| Role | Email | Lands at |
|------|-------|----------|
| CEO (All Access) | ceo@uday.ts.com | `/modules` |
| Fleet Manager | fleet@uday.ts.com | `/fleet` |
| Auction Head | auction@pranay.ts.com | `/auction/dashboard` |
| CBD | cbd@optimile.com | `/customer` |
| Vendor | vendor@pranay.ts.com | `/vendor` |
| Administration | platform-admin@optimile.com | `/platform-admin/dashboard` |
| Tenant Admin | tenant-admin@optimile.com | `/tenant-admin/...` |
| Track and Trace | tracking@optimile.com | `/tracking` |
| TMS | tms-booking@optimile.com | `/tms/booking/...` |

## Available Scripts

```bash
# Start all portals via the host (recommended)
npm run dev

# Build everything for production
npm run build

# Run a single portal in standalone mode (optional, for isolated debugging)
npm run dev:auction:standalone
npm run dev:vendor:standalone
npm run dev:fleet:standalone
npm run dev:customer:standalone
npm run dev:console:standalone
npm run dev:platform-admin:standalone
npm run dev:tenant-admin:standalone
npm run dev:tms-booking:standalone
npm run dev:tms-driver-app:standalone
```

## Routes

| Path | Module |
|------|--------|
| `/login` | Login shell |
| `/modules` | Post-login module selector (multi-module roles) |
| `/auction/*` | Auction Management System |
| `/fleet/*` | Fleet Management |
| `/vendor/*` | Vendor Portal |
| `/customer/*` | Customer Booking Dashboard (CBD) |
| `/tracking/*` | Track and Trace |
| `/platform-admin/*` | Platform Administration Console |
| `/tenant-admin/*` | Tenant Administration Console |
| `/tms/booking/*` | TMS Booking |
| `/driver-app/*` | Driver App |

## Monorepo Structure

```
frontend-main/
├── src/                    # Host entry (main.tsx, styles, tracking app)
├── packages/
│   ├── shared-auth/        # Auth state, login shell, route guards, RBAC
│   ├── shared-api/         # API client, services, endpoints
│   ├── shared-ui/          # Reusable UI primitives (Button, Card, Input…)
│   └── shared-utils/       # Pure formatting/date/string/validation helpers
└── modules/
    ├── auction-web/        # Auction Management System
    ├── fleet-web/          # Fleet Management
    ├── vendor-web/         # Vendor Portal
    ├── customer-web/       # Customer Booking Dashboard
    ├── console-web/        # Console (shared admin shell)
    ├── platform-admin/     # Platform Administration
    ├── tenant-admin/       # Tenant Administration
    ├── tms/                # TMS Booking
    └── tms-driver-app-web/ # Driver App
```

## Shared Packages

- **shared-auth** — auth state helpers, portal/role/permission constants, login shell, route guards, RBAC helpers.
- **shared-api** — API client, services, and endpoints.
- **shared-ui** — reusable Button, Input, Card, Dialog/Modal, Badge, and Textarea primitives.
- **shared-utils** — pure formatting/date/string/validation helpers only.

## Notes

- `src/styles.css` contains only host reset/base styles.
- Each module's CSS is imported inside its own app entry.
- App API clients live in `services/`; app-only helpers and mock data live in `utils/` or `mocks/`.
- `customer-web` is a scaffold-only placeholder and is not production-ready.
