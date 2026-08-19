# China–Iran Logistics Tracker

A personal logistics tracking app for China–Iran freight orders.

- **Admin panel** (`/admin`, single username/password): full CRUD for group
  orders, sub-orders, trucks, cargo transfers, payment status, comments, and
  photo/video uploads. Only the admin account can create, edit, or delete
  anything.
- **Monitoring pages** (`/` and `/track/[id]`): read-only overview of every
  order. Login required — either the admin account, or a registered viewer
  account (see below). No longer publicly accessible.

## Data model

- **Group order** — a shipment order (e.g. `SADAR26075`, `Buxoro`). Has a
  name, origin/destination (direction), opened date, arrival date, place of
  loading, commodity, volume, factory load date, and a free-text current
  status/location.
- **Sub-order** — a batch inside a group order. Has an opened date and an
  arrival date. Setting the arrival date **automatically closes** the
  sub-order (status flips to Closed); clearing it re-opens it.
- **Truck** — belongs to a sub-order. Plate number, trailer plate number,
  driver name/phone, dimensions (L×W×H), cargo weight/description, current
  location (with a last-updated timestamp), driver payment status, customer
  payment status, photos/videos, comments.
- **Cargo transfer** — records cargo moving from one truck to another
  (перекид) within a sub-order, with a transfer date.
- **Comments** — can be added at the group order, sub-order, or truck level.

Only the group order name is required anywhere in the app — every other
field is optional and can be filled in later.

### Truck/trailer exclusivity

A truck or trailer plate number can only be active in **one open sub-order
at a time**. If you try to add a plate to a new sub-order while it's still
attached to a truck in a different sub-order that hasn't arrived yet (still
`OPEN`), the app blocks it with an explanation of where it's currently in
use. Close the original sub-order (give it an arrival date) to free the
plate up for reuse.

## Who can see what

There are two, completely separate login systems:

- **Admin** — one account, credentials from environment variables
  (`ADMIN_USERNAME` / `ADMIN_PASSWORD`). Full access: `/admin/*` plus the
  monitoring pages. This is the only account that can create, edit, or
  delete orders/sub-orders/trucks/comments/media.
- **Viewer** — regular accounts stored in the database, created by anyone
  who knows the invite code (`REGISTRATION_CODE`) at `/register`. Read-only:
  can see `/` and `/track/[id]`, nothing else. Cannot reach `/admin` at all.

Registration is invite-gated on purpose: without `REGISTRATION_CODE`, no one
can create a viewer account, so the monitoring data (driver phone numbers,
payment status, cargo details) stays visible only to people you've actually
shared the code with. Share the code (not the password) with your boss or
colleagues who just need to check status.

## Tech stack

- Next.js 15 (App Router, TypeScript, Server Actions)
- PostgreSQL via Prisma
- Vercel Blob for photo/video storage (uploads go straight from the browser,
  so large videos don't hit any server body-size limit)
- Admin: single username/password from environment variables, no database
  row. Viewers: real accounts in the `User` table, password hashed with
  bcrypt. Both use a signed, httpOnly session cookie (separate cookies, same
  signing secret).

## 1. Local setup

```bash
npm install
```

Copy `.env.example` to `.env.local` and fill in the values (see sections
below for where to get each one):

```bash
cp .env.example .env.local
```

```
DATABASE_URL=...           # PostgreSQL connection string
BLOB_READ_WRITE_TOKEN=...  # Vercel Blob token
ADMIN_USERNAME=admin
ADMIN_PASSWORD=choose-a-real-password
REGISTRATION_CODE=...      # invite code required to self-register a viewer account
SESSION_SECRET=...         # random string, see below
```

Generate a `SESSION_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Push the schema to your database (creates all tables):

```bash
npm run db:push
```

Run the app:

```bash
npm run dev
```

- Monitoring page (login required): http://localhost:3000
- Register a viewer account: http://localhost:3000/register
- Admin panel: http://localhost:3000/admin

## 2. Database — Neon (free)

1. Create a free account at https://neon.tech and a new project.
2. Copy the connection string it gives you (starts with `postgresql://...`,
   includes `?sslmode=require`).
3. Paste it as `DATABASE_URL` in `.env.local` (for local dev) and later as an
   environment variable in Vercel (for production).

Any other PostgreSQL host (Supabase, Railway, your own server) works the
same way — Prisma only needs a standard `DATABASE_URL`.

## 3. File storage — Vercel Blob

1. In your Vercel dashboard, open the project → **Storage** → **Create** →
   **Blob**.
2. Once created, copy the `BLOB_READ_WRITE_TOKEN` it gives you.
3. Add it as an environment variable (locally in `.env.local`, and in Vercel
   project settings for production).

Uploads (photos/videos) go directly from the visitor's browser to Blob
storage, so there's no practical size limit imposed by the server.

## 4. Deploy to Vercel

1. Push this project to a GitHub repository.
2. In Vercel, **Add New Project** → import the repository.
3. In the project's **Environment Variables** settings, add:
   - `DATABASE_URL`
   - `BLOB_READ_WRITE_TOKEN`
   - `ADMIN_USERNAME`
   - `ADMIN_PASSWORD`
   - `REGISTRATION_CODE`
   - `SESSION_SECRET`
4. Deploy. Vercel runs `prisma generate && next build` automatically (see
   `package.json`).
5. After the first deploy, run `npm run db:push` once locally (pointed at
   the production `DATABASE_URL`) to create the tables in the production
   database — or run it any time the schema changes.

Once deployed, share `REGISTRATION_CODE` with anyone who should be able to
create a read-only monitoring account, and keep `ADMIN_PASSWORD` to
yourself.

## Deployment shape — one Vercel project is enough

This is a single Next.js app: the same codebase serves the pages (frontend)
*and* the data layer (Server Actions + API route act as the backend, talking
to Postgres directly). There's no separate server to stand up and no
separate client build to deploy — one Vercel project, one repo, one deploy
covers everything.

## Security

- **Database access** goes exclusively through Prisma's parameterized query
  builder — no raw SQL/`$queryRaw` anywhere in the codebase, so there's no
  SQL-injection surface to begin with.
- **Every mutating Server Action re-checks the admin session for itself**
  (`requireAdmin()` in `lib/auth.ts`), not just the page middleware. This
  matters because Next.js Server Actions are independently callable
  endpoints, addressable by an id that's reproducible from the source — and
  since this repo is public, relying on the URL-based middleware alone
  (which only guards `/admin/*`) wouldn't be enough to stop a direct,
  unauthenticated POST crafted against a public route. This was verified live
  against a real deploy: a forged request without a session cookie was
  rejected and created nothing.
- Standard hardening headers (`X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy`) are set in `next.config.ts`.
- Photo/video uploads are restricted to image/video MIME types, capped at
  300MB, and require an authenticated session to obtain an upload token;
  media rows can only be created with a URL that actually points at your
  Vercel Blob store.
- The admin login is a single username/password pair from environment
  variables — appropriate for a single personal admin account. There's no
  brute-force lockout; keep `ADMIN_PASSWORD` strong.
- **Viewer registration is invite-gated** (`REGISTRATION_CODE`) so the
  monitoring data isn't exposed to anyone who finds the URL — verified live:
  a registration attempt with the wrong code is rejected and creates no
  account.
- **Viewer passwords are hashed with bcrypt** before being stored — never
  saved in plain text. Login always runs the same bcrypt check whether or
  not the email exists (comparing against a dummy hash for unknown emails),
  so response timing can't be used to enumerate which emails are registered.
- `/` and `/track/*` require a session (admin or viewer) via middleware;
  `/admin/*` requires the admin session specifically. Verified live: an
  unauthenticated request to either is redirected to the appropriate login
  page and reads no data.

## Notes

- Everything in the admin panel is editable and deletable at any time —
  there are no locked/required fields except the group order name.
- Payment is tracked as two independent flags per truck: whether the driver
  /carrier has been paid, and whether the customer has paid — so you can see
  "how many trucks are paid" from either side.
- A cargo transfer (перекид) links two existing truck records; create both
  trucks first, then record the transfer from the sub-order page.
