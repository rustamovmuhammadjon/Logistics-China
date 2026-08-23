# China–Iran Logistics Tracker

A China–Iran freight tracker split into a **pnpm Turborepo**:

- `apps/frontend` — Next.js 15 UI (lucide-react + iconsax)
- `apps/backend` — Express + Prisma + PostgreSQL
- `apps/driver` — Expo Android app (APK for drivers; iOS later)
- `packages/shared` — shared types and formatters

Uploads go to **Supabase Storage**. The Next.js app proxies `/api/*` to Express so cookies stay same-origin.

## File structure

```
apps/
  frontend/          Next.js  (pnpm --filter frontend dev  → :3000)
  backend/           Express  (pnpm --filter backend dev   → :4000)
  driver/            Expo APK (pnpm --filter driver start)
packages/
  shared/            TypeScript types + helpers
```

Same product rules as before: admin / consignee / operator, invite-gated registration, consignee–operator linking, plate exclusivity, location freshness colors, `arrivedAt` = completed.

## 1. Install

```bash
pnpm install
```

## 2. Environment files

Copy the examples, then fill in real values (see **Where to find each key** below).

```bash
copy apps\backend\.env.example apps\backend\.env
copy apps\frontend\.env.example apps\frontend\.env.local
```

On macOS/Linux: `cp` instead of `copy`.

Generate one `SESSION_SECRET` and paste it into **both** files:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Where to find each env key

### `apps/backend/.env`

| Variable | Where to get it |
|---|---|
| `DATABASE_URL` | [Neon](https://neon.tech) → New Project → connection string. Or Supabase **Project Settings → Database**. Starts with `postgresql://`. |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | You choose these. This is the only admin login (no DB row). |
| `REGISTRATION_CODE` | You choose this. Share it only with people who should register. |
| `SESSION_SECRET` | Generate locally with the `node -e` command above. Must match the frontend. |
| `FRONTEND_URL` | `http://localhost:3000` in development. |
| `PORT` | `4000` locally. |
| `SUPABASE_URL` | [Supabase dashboard](https://supabase.com/dashboard) → your project → **Project Settings → API → Project URL**. Looks like `https://xxxx.supabase.co`. |
| `SUPABASE_SERVICE_ROLE_KEY` | Same page → **Project Settings → API → `service_role`**. Backend only. Never put this in the frontend. |
| `SUPABASE_STORAGE_BUCKET` | Supabase → **Storage → New bucket**. Name it `logistics` and turn **Public** on. |

### `apps/frontend/.env.local`

| Variable | Where to get it |
|---|---|
| `BACKEND_URL` | `http://localhost:4000` locally. The Next.js rewrite sends `/api/*` here. |
| `SESSION_SECRET` | Same value as the backend `SESSION_SECRET`. |

You do **not** need a Supabase anon key on the frontend. The browser asks the backend for a signed upload URL, then uploads the file straight to Supabase.

## 3. Database

```bash
pnpm db:push
```

## 4. Run

Both apps at once:

```bash
pnpm dev
```

Or separately:

```bash
pnpm dev:frontend
pnpm dev:backend
```

- Monitoring: http://localhost:3000
- Completed: http://localhost:3000/completed
- Register: http://localhost:3000/register
- Dashboard: http://localhost:3000/dashboard
- Admin: http://localhost:3000/admin
- API health: http://localhost:4000/api/health

## Roles (unchanged)

- **Admin** — env login, full CRUD, trucks, payments, media
- **Consignee** — owns orders/sub-orders, no truck/location writes
- **Operator** — location + comments on linked consignees’ orders only
- **Driver app** — operator pairs a truck plate + phone; driver enters phone + 6-digit code; GPS pings every 3 hours

## Driver APK

See `apps/driver/README.md`. Short version:

1. Operator/admin opens a sub-order → **Pair driver app** → truck plate + phone → copy the 6-digit code.
2. Driver installs the APK, enters phone + code. The code is one-time; the token stays on the phone.
3. The app sends GPS every 3 hours (and when opened). The web truck card shows that location with a map link.

Cargo **перекид**: on the same sub-order, pick the current truck and the next truck plate. Check “trailer stays the same” to keep `1907TAG` while swapping `80Z476PA` → `85Y294PA`, or enter a new trailer plate for a full swap.

```bash
cd apps/driver
copy .env.example .env
# set EXPO_PUBLIC_API_URL to your Vercel URL (or http://LAN-IP:3000)
pnpm --filter driver start
npx eas-cli build -p android --profile preview
```
