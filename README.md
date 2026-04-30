# Optimile Frontend Monorepo

One Vite host serves route-based portals from a scalable monorepo. Each portal keeps its own app, modules, stores, styles, and types; shared code lives in packages.

`customer-web` is a scaffold-only placeholder and is not production-ready.

## Commands

```bash
npm install
npm run dev
npm run dev:admin:standalone
npm run dev:vendor:standalone
npm run dev:fleet:standalone
npm run dev:customer:standalone
npm run build
```

`npm run dev` is the normal mode and runs the host frontend only. Standalone scripts are optional debug mode for a single portal.

## Routes

- `/login`
- `/admin/*`
- `/auction/*`
- `/vendor/*`
- `/fleet/*`
- `/customer/*`

`/admin/*` redirects to `/auction/dashboard`.

## Shared Packages

- `packages/shared-auth`: auth state helpers, portal/role/permission constants, login shell, route guards, RBAC helpers.
- `packages/shared-api`: API client/services/endpoints.
- `packages/shared-ui`: reusable Button, Input, Card, Dialog/Modal, Badge, and Textarea primitives.
- `packages/shared-utils`: pure formatting/date/string/validation helpers only.

## App Boundaries

- Root `src/styles.css` contains only host reset/base styles.
- Admin and vendor CSS is imported inside their app entries.
- App API clients live in `services/`; app-only helpers and mock data live in `utils/`.
