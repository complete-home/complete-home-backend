# Backend setup

## Prerequisites

- **Node.js** 18+
- **MongoDB** 6+ running locally (or Atlas URI in `.env`)

## 1. Install and configure

```bash
npm install
cp .env.example .env
```

| Variable             | Purpose                                                     |
| -------------------- | ----------------------------------------------------------- |
| `PORT`               | API port (default **4003** in dev — match frontend)         |
| `MONGODB_URI`        | Mongo connection string                                     |
| `JWT_SECRET`         | Sign access tokens (use a long random string in production) |
| `JWT_ACCESS_EXPIRES` | Access token lifetime (default `25m`)                       |
| `CORS_ORIGIN`        | Frontend origin (default `http://localhost:5173`)           |
| `SEED_ADMIN_*`       | Credentials created by `npm run seed`                       |

## 2. Seed database

```bash
npm run seed
```

Creates admin user, enquiries, lookups, demo payables, and sample data.

### Residential five-phase checklist seeds

Run after `npm run seed` (or anytime in dev):

```bash
npm run seed:all-checklists
# or individually:
npm run seed:planning-checklists
npm run seed:material-brands
npm run seed:execution-checklists
npm run seed:site-management
npm run seed:uom
```

Checklist sheets use **readable ids** (e.g. `civil-works`, `concept-architecture`), not `C-1` / `C1`.

If you have existing projects initialized with old codes:

```bash
npm run migrate:sheet-codes
```

Then re-run `npm run seed:all-checklists` to refresh templates.

## 3. Run API

```bash
npm run dev    # watch mode
# or
npm start
```

## 4. Smoke test (five phases)

With MongoDB and API running:

```bash
npm run smoke:five-phases
```

Checks template counts and authenticated endpoints: agreement, planning, material, execution, site management, person-wise payees.

## 5. Connect frontend

In `complete-home-app/.env`:

```env
VITE_API_URL=http://localhost:4003/api/v1
VITE_API_USE_MOCK=false
VITE_AUTH_USE_MOCK=false
```

Restart Vite after changing `.env`.

## Project hub API (residential)

| Method     | Path                                | Purpose                                   |
| ---------- | ----------------------------------- | ----------------------------------------- |
| `GET`      | `/projects/:id/phases`              | Phase stepper + %                         |
| `GET`      | `/projects/:id/finance/summary`     | Client/vendor/consultancy rollup          |
| `GET`      | `/projects/:id/finance/payees`      | Person-wise payees (site mgmt + payables) |
| `GET`      | `/projects/:id/agreement`           | Agreement phase                           |
| `GET/POST` | `/projects/:id/checklists`          | Planning / execution / site_management    |
| `GET/POST` | `/projects/:id/material/selections` | Tile, paint, furniture, qty               |
| `GET/PUT`  | `/projects/:id/site-management`     | OT roster, contractors, vendors           |

Full E2E steps: `complete-home-app/flow-application.md`.

## Vendor payables (Phase I)

| Method | Path                           | Permission             |
| ------ | ------------------------------ | ---------------------- |
| `GET`  | `/api/v1/payables/summary`     | `common.payables.view` |
| `GET`  | `/api/v1/payables/obligations` | `common.payables.view` |

Link payables to projects via `projectId` on obligations; names should match contractor/vendor matrix for person-wise rollup.

## Troubleshooting

| Issue                                     | Fix                                                                                                          |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `ECONNREFUSED` MongoDB                    | Start `mongod` or fix `MONGODB_URI`                                                                          |
| CORS errors                               | Set `CORS_ORIGIN` to your Vite URL                                                                           |
| 401 on enquiries                          | Log in via `POST /auth/login` and ensure `Authorization: Bearer <token>`                                     |
| Login fails / network                     | Backend `PORT` must match frontend `VITE_API_URL` (default **4003**). Run `npm run seed` then `npm run dev`. |
| `siteManagementController is not defined` | Ensure `project.routes.js` imports `../siteManagement/siteManagement.controller.js`                          |
| `projectFinanceService is not defined`    | Ensure `project.controller.js` imports `./projectFinance.service.js`                                         |
| Admin login                               | `USR41472786` / `securepassword123` (see `SEED_ADMIN_*` in backend `.env`)                                   |
| Duplicate seed                            | Checklist seeds delete by `templateVersion` for their phase; safe for dev                                    |
