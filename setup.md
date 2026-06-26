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
| `CORS_ORIGIN`        | Comma-separated browser origins (admin, website, localhost) |
| `FRONTEND_URL`       | Admin portal URL (invite links, notifications)              |
| `CORS_ALLOW_COMPLETEHOME` | `true` = also allow `https://*.completehome.co.in`   |
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
| CORS errors                               | Set `CORS_ORIGIN` (see Production deployment below). Restart API after `.env` changes. |
| `Cannot reach API` / no CORS header       | API down, nginx misconfigured, or CORS middleware not running — check `GET /api/v1/health` |
| 401 on enquiries                          | Log in via `POST /auth/login` and ensure `Authorization: Bearer <token>`                                     |
| Login fails / network                     | Backend `PORT` must match frontend `VITE_API_URL` (default **4003**). Run `npm run seed` then `npm run dev`. |
| `siteManagementController is not defined` | Ensure `project.routes.js` imports `../siteManagement/siteManagement.controller.js`                          |
| `projectFinanceService is not defined`    | Ensure `project.controller.js` imports `./projectFinance.service.js`                                         |
| Admin login                               | `USR41472786` / `securepassword123` (see `SEED_ADMIN_*` in backend `.env`)                                   |
| Duplicate seed                            | Checklist seeds delete by `templateVersion` for their phase; safe for dev                                    |

## Production deployment (`api.completehome.co.in`)

### Backend `.env` (on server)

Comment Development block, uncomment Production:

```env
# Development — comment out
# CORS_ORIGIN=http://localhost:5173,http://localhost:5174
# FRONTEND_URL=http://localhost:5173

# Production — active
CORS_ORIGIN=https://admin.completehome.co.in,https://completehome.co.in,https://www.completehome.co.in
FRONTEND_URL=https://admin.completehome.co.in
NODE_ENV=production
CORS_ALLOW_COMPLETEHOME=true
```

Restart after every `.env` change: `pm2 restart complete-home-api` (or your process name).

### Verify API is reachable

```bash
curl -i https://api.completehome.co.in/api/v1/health
```

Expect `200` with JSON body. If this fails, fix nginx/SSL/PM2 before debugging CORS.

### Verify CORS preflight

```bash
curl -i -X OPTIONS "https://api.completehome.co.in/api/v1/auth/login" \
  -H "Origin: https://admin.completehome.co.in" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type, Authorization"
```

Expect headers including:

- `Access-Control-Allow-Origin: https://admin.completehome.co.in`
- `Access-Control-Allow-Credentials: true`

### Nginx (example)

Ensure OPTIONS and `/api/` proxy to Node:

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:4003;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Do **not** return a static 404 for OPTIONS before the request reaches Node.

### Admin frontend `.env` (build time)

```env
VITE_API_URL=https://api.completehome.co.in/api/v1
```

Rebuild and redeploy the admin app after changing `VITE_*` variables.
