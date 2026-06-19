# Complete Home Backend

REST API for **Complete Home ERP** — MongoDB, Express, designation-level RBAC.

## Quick start

```bash
cd complete-home-backend
npm install
cp .env.example .env
# Edit MONGODB_URI and JWT_SECRET if needed
npm run seed
npm run dev
```

API base: `http://localhost:4000/api/v1`  
Health: `http://localhost:4000/api/v1/health`

## Default login (after seed)

| Field    | Value               |
| -------- | ------------------- |
| User ID  | `USR41472786`       |
| Password | `securepassword123` |

## Folder structure

```
src/
  config/                 # env, database
  core/
    errors/               # AppError, codes, asyncHandler
    http/                 # apiResponse envelope, messages
    middleware/           # auth, authorize, validate, errors
    permissions/          # tree, resolve from designation
  modules/
    user-management/      # auth, designations, users
    common/               # permissions tree, lookups
    residential/          # enquiries (+ follow-ups, appointments, payments)
  routes/                 # mounts /api/v1/*
  scripts/seed.js
  app.js, index.js
```

## API envelope

All JSON responses use:

```json
{ "success": true, "data": { ... } }
```

Errors:

```json
{
  "success": false,
  "error": { "code": "VALIDATION_ERROR", "message": "...", "fields": {} }
}
```

## RBAC (designation-level)

- Permissions are stored on **Designation** (`permissionIds[]` or `["*"]`).
- Users inherit from their designation; optional `permissionOverrides` on user.
- Admin UI: `GET /permissions/tree` → hierarchical checkboxes → `PUT /designations/:id/permissions`.

## Main routes

| Area         | Prefix                    |
| ------------ | ------------------------- |
| Auth         | `/auth/login`, `/auth/me` |
| Designations | `/designations`           |
| Permissions  | `/permissions/tree`       |
| Lookups      | `/lookups/:key`           |
| Enquiries    | `/enquiries`              |

See `setup.md` for frontend wiring and MongoDB notes.
