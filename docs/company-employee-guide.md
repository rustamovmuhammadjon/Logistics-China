# China–Iran Logistics — Guide for Companies & Employees

This guide is for a **company that places orders** (the "Company — for orders" account type) and the **employees** who work under it. It walks through everything you can do in the app, in the order you'd normally do it.

If you're a tracking company or an operator instead, see `tracking-company-operator-guide.md`.

---

## 1. What this app is for

You use this app to:

- Create **orders** (a shipment) and break each one into **sub-orders** (one per truck load).
- **Link** with a tracking company's operator, who updates the truck, driver, and location details for you as cargo moves.
- **Monitor** everything — active shipments, completed ones, cancelled ones — from one screen, live.

You never touch trucks, drivers, or locations directly — that's the operator's job. Your side is about creating the order and keeping an eye on it.

## 2. Account types

| Account | Can do |
|---|---|
| **Company** | Registers itself, adds/manages employees, views everything, but **cannot** create or edit orders itself. |
| **Employee** | Created by the company. Creates and manages orders on the company's behalf. All orders stay owned by the company, even if the employee who created them is later deactivated. |

## 3. Getting started

### Registering the company

1. Go to the **Register** page.
2. Under **Account type**, choose **"Company — for orders (places and manages orders)"**.
3. Fill in:
   - **Invite code** — ask your admin for this.
   - **Company name**
   - **Email**
   - **Password** (at least 8 characters) and **Confirm password**
4. Click **Create account**.

### Adding employees

Only the **Company** account can do this.

1. Open **Employees** in the left menu.
2. Click **Add employee**.
3. Fill in:
   - **First name** / **Last name** — letters only, no numbers or symbols.
   - **Email**
   - **Phone**
   - **Date of birth**
   - **Password** (at least 8 characters) — this is the employee's own login password.
4. Click **Add employee**.

The employee can now log in with that email and password.

Each employee card also shows their order stats (**orders / completed / cancelled**) so you can see who's handling what.

**Editing or removing access:**
- Click **Edit** on an employee's card to change their name, email, phone, or date of birth. (Only the employee themselves can change their own password, from their **Profile** page.)
- Click **Deactivate** to block their login without deleting their history — their past orders stay with the company. **Reactivate** brings them back.

## 4. Linking with a tracking company / operator

This is an **Employee** task — the Company account itself never manages links; each employee links their own operators, for the orders that employee creates.

Before an operator can see truck locations, an employee needs to link them.

You have two ways to do this:

### Option A — Get the operator's ID directly

1. As an employee, go to **Orders** in the left menu. Near the top you'll see a **Linked accounts** card showing **"Your ID"** — an 8-digit code.
2. Ask the operator (or their tracking company) for **their** 8-digit ID.
3. Enter it in **"Link a operator by ID"** and click **Link**.

### Option B — Use Partner Company

If your company has already linked with a whole tracking company (see [Section 9](#9-partner-company-optional)), you can browse that tracking company's operators and copy the exact one's ID from there instead of asking them directly.

### Controlling what a linked operator can see

When you link an operator, by default they can see **all** of the orders you've created. If you want to limit them to specific orders only:

1. Check **"Only give access to specific orders (default: all orders)"**.
2. Tick the orders you want that operator to see.

You can change this later from the **Linked accounts** list — click **Manage access** on that operator's entry, switch between **"All orders"** and **"Only specific orders"**, and save.

Click **Unlink** to remove an operator's access entirely.

## 5. Creating an order

Only **Employees** can create orders (the Company account cannot).

1. Go to **Orders** → click **New order**.
2. Fill in:
   - **Name** (required)
   - **Opened date**
   - **Origin (from)** / **Destination (to)**
   - **POL (place of loading)**
   - **Commodity**
3. If you have **two or more** linked operators, you'll also see **"Visible to which operators?"** — a checklist. Operators with full ("All orders") access are shown as always-checked; operators limited to specific orders can be ticked on or off for this new order.
4. Click **Create order**.

You'll land on the order's detail page.

## 6. Working with sub-orders

Each order can contain multiple **sub-orders** — think of each sub-order as one truck's worth of cargo.

- Click a sub-order to expand it and see its details (they're collapsed by default to keep long orders easy to scroll).
- **Add a sub-order:** click **+ New sub-order** on the order page, optionally give it a name and opened date, then **Add sub-order**.
- **Rename** an open sub-order using the inline **Name** field + **Save**.
- **Complete** — marks the sub-order as delivered (sets today as the completion date).
- **Cancel sub-order** — cancels just that sub-order; the rest of the order is unaffected.
- Once a sub-order is **Completed** or **Cancelled**, it can no longer be edited.

Each sub-order's summary line shows: when it was opened, its **Factory Load Date (FLD)** if the operator has set one, when it was completed (if closed), and how many trucks are attached to it.

## 7. Watching truck & cargo movement

Inside a sub-order you'll see, read-only:

- **Current location** — with a colored freshness badge (green = recently updated, fading to amber/red the longer it's been since the last update).
- The **truck(s)** assigned to this sub-order — plate number, trailer, country, driver name/phone, gross weight.
- **Cargo transfer history**, if cargo was moved to a new truck along the way (e.g. at a border crossing) — shown as a simple "from → to" line per transfer.
- Comments the operator has left about progress.

You cannot edit any of this — only the linked operator updates it. (One thing you specifically won't see here is the truck's **GPS tracker number** — that's an internal operator/tracking-company detail, not shown to companies or employees.)

## 8. Monitoring

The **Monitoring** tab (top of the page) is your live overview of everything you can see, in one table:

- **Active** (default), **Completed**, **Cancelled** tabs.
- **Search** by order name, sub-order name, truck plate, trailer, or driver phone.
- **Sort** newest/oldest first.
- **Download Excel** — exports the current tab's list to a spreadsheet.

The page updates live — if an operator updates a truck's location, you'll see it without needing to refresh.

## 9. Partner Company (optional)

If you regularly work with the same tracking company, you can **partner** with them so you (or your employees) can browse their operator roster directly, instead of asking each operator for their ID one by one.

Only the **Company** account can manage partners (employees can view the list, not add/remove partners).

1. Go to **Partner Company** in the left menu.
2. Share **"Your ID"** with the tracking company, or enter **their** 8-digit ID under **"Link a company by ID"** and click **Link**.
3. Once linked, you'll see their name and, below it, a list of their **Operators** with each one's individual ID — copy any of those into the linking step in [Section 4](#4-linking-with-a-tracking-company--operator).

Click **Unlink** to remove a partner company.

## 10. Company dashboard (analytics)

The **Dashboard** tab (Company account only — employees are sent to Orders instead) shows:

- **Employees** / **Active employees**
- **Active orders** / **Completed orders** / **Cancelled orders**
- **Avg. days to complete**
- A **monthly activity** table (created / completed / cancelled per month)

## 11. Your profile

Open **Profile** (click your name/avatar, top right) to:

- **Change your photo** — anyone can do this, anytime (JPEG, PNG, or WebP).
- **Edit your info** — the **Company** account can edit its **company name**, **phone**, and **email**. An **Employee's** profile is managed by the company instead (name/phone/date of birth/email are read-only for the employee — ask the company to change them), but the employee's **photo and password are always self-service**.
- **Change password** — enter your current password and a new one (min. 8 characters). This works for everyone, regardless of the above.
- **Log out**.

## 12. FAQ / Troubleshooting

- **"I don't have an invite code."** — Ask your admin for one; it's required to register.
- **"I forgot my password."** — On the login page, click **"Forgot your password?"**. You'll need a **registration code** from your admin (different from the original invite code) to reset it.
- **"I can't create an order."** — Only Employee accounts can create orders; the Company account itself cannot. Add yourself/staff as an employee first.
- **"Why can't I see the truck's GPS number?"** — That's intentional. GPS tracker numbers are only visible to the operator who set them, their tracking company, and admin.
- **"I can't edit a sub-order anymore."** — Once a sub-order is completed or cancelled, it's locked. The same applies to a whole order once cancelled or fully completed.
