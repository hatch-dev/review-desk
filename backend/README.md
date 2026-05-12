# PromoDash Server

Express + Prisma + PostgreSQL backend for the PromoDash promotion approval platform.

## Setup

```bash
npm install
cp .env.example .env
# Edit .env with your DATABASE_URL and JWT_SECRET

npx prisma generate
npx prisma migrate deploy   # or: npx prisma db push (for dev)
node prisma/seed.js         # seeds default data
npm run dev
```

## Default Login Credentials (after seed)

| Role        | Email                          | Password       |
|-------------|-------------------------------|----------------|
| Super Admin | superadmin@promodash.local    | superadmin123  |
| Admin       | admin@promodash.local         | password       |
| Client      | client@cognesense.com         | password       |

## Role Hierarchy

- **super_admin** — Full access + can create/manage admins and clients
- **admin** — Full access to all features (projects, promotions, clients, types)
- **client** — Read-only access to assigned projects/promotions, can approve/reject

## API Routes

### Auth
- `POST /api/auth/login` — Login (all roles)
- `GET  /api/auth/me` — Get current session

### Super Admin
- `GET /api/super-admin/admins` — List admins
- `POST /api/super-admin/admins` — Create admin

### Projects
- `GET/POST /api/projects`
- `GET/PUT/DELETE /api/projects/:id`

### Promotions
- `GET/POST /api/promotions`
- `GET/PUT/DELETE /api/promotions/:id`
- `PATCH /api/promotions/:id/status`
- `PATCH /api/promotions/:id/version`

### Versions
- `GET /api/versions?promotionId=:id`
- `POST /api/versions/upload` (file upload)
- `POST /api/versions/upload/html`
- `PUT /api/versions/:id` (edit HTML)
- `DELETE /api/versions/:id`

### Comments
- `GET /api/comments?promotionId=:id`
- `POST /api/comments` — Create comment (all authenticated)
- `PUT /api/comments/:id` — Edit own comment
- `DELETE /api/comments/:id` — Delete own or any (admin)

### Admin
- `GET/POST/PUT/DELETE /api/admin/clients`
- `GET/POST/PUT/DELETE /api/admin/types`

### Client
- `GET /api/client/profile`
