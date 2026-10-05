# China–Iran Logistics — Guide for Tracking Companies & Operators

This guide is for a **tracking company** (the "Company — for tracking" account type) and the **operators** who work under it. It walks through everything you can do in the app, in the order you'd normally do it.

If you're a company that places orders (a client) or one of its employees instead, see `company-employee-guide.md`.

---

## 1. What this app is for

You use this app to:

- **Link** with a client (a company/employee, or an individual consignee) who has placed an order.
- Update the **truck, driver, location, and GPS tracker details** for each of that client's sub-orders as cargo moves.
- Record **cargo transfers** when a load switches trucks (e.g. at a border), and pair the **driver app** (via a code or QR) so it reports location automatically.

You never create the order itself — that's the client's job. Your side is about tracking and updating it once you're linked.

## 2. Account types

| Account | Can do |
|---|---|
| **Tracking company** | Registers itself, adds/manages operator accounts, can view all GPS numbers its operators have set, but **does not** track orders itself. |
| **Operator** | Created by the tracking company. Links directly with clients and does the actual day-to-day tracking — trucks, transfers, driver pairing. |

## 3. Getting started

### Registering the tracking company

1. Go to the **Register** page.
2. Under **Account type**, choose **"Company — for tracking (tracks trucks and updates locations)"**.
3. Fill in:
   - **Invite code** — ask your admin for this.
   - **Company name**
   - **Email**
   - **Password** (at least 8 characters) and **Confirm password**
4. Click **Create account**.

### Adding operators

Only the **Tracking company** account can do this.

1. Open **Operators** in the left menu.
2. Click **Add operator**.
3. Fill in:
   - **First name** / **Last name** — letters only, no numbers or symbols.
   - **Email**
   - **Phone**
   - **Date of birth**
   - **Password** (at least 8 characters) — this is the operator's own login password.
4. Click **Add operator**.

The operator can now log in with that email and password. Their card shows how many accounts they're currently linked to.

**Editing or removing access:**
- Click **Edit** to change an operator's name, email, phone, or date of birth. (Only the operator themselves can change their own password, from their **Profile** page.)
- Click **Deactivate** to block their login without losing their history — their links and past work stay intact. **Reactivate** brings them back.

## 4. Linking with a client

An operator can't see any orders until they link with the client who owns them.

### Option A — Get the client's ID directly

1. As an operator, go to **My dashboard**. Near the top you'll see a **Linked accounts** card showing **"Your ID"** — an 8-digit code. Share this with your client.
2. Ask the client (company, employee, or individual consignee) for **their** ID.
3. Enter it under **"Link a consignee by ID"** and click **Link**.

Once linked, you automatically see every order that client currently owns (or, if they've limited your access to specific orders, just those).

### Option B — Use Partner Company

If your tracking company has partnered with a client company (see [Section 12](#12-partner-company)), you can browse that company's employee roster and copy the exact employee's ID from there instead of asking them directly.

Click **Unlink** on any entry in your linked-accounts list to remove access.

## 5. Your dashboard

**My dashboard** is your home screen as an operator — it lists every order from every client currently linked to you, as clickable cards ("{order name} · {n} sub-order(s)"). Click one to open it.

## 6. Working an order

Inside an order you'll see all of its sub-orders, collapsed by default (click one to expand it — this keeps orders with many sub-orders easy to scroll).

At the top of the order you can edit:

- **POL (place of loading)**

Inside each sub-order:

- **Factory load date** — set or correct this anytime, even after the sub-order is completed or cancelled.
- **Comments** — leave a note for the client to see (e.g. a status update). Comments are locked once the sub-order is completed/cancelled.
- **Cancel sub-order** — cancels it; the rest of the order is unaffected.

## 7. Trucks & GPS numbers

Each sub-order needs at least one truck before you can do anything else with it.

### Adding the first truck

1. Expand the sub-order, click **+ Add truck**.
2. Fill in what you know: **Truck plate number**, **GPS number**, **Trailer plate number**, **Country**, **Driver name**, **Driver phone**, **Gross weight (tons)**, **Current location**.
3. Click **Add truck**.

### The GPS number, specifically

- It's a field on the **truck itself**, not the sub-order — every vehicle gets its own, and it's never copied from one truck to the next when cargo is transferred.
- **Only you (the operator), your tracking company, and admin can ever see it.** The client (company/employee/consignee) never sees this field, anywhere.
- Your tracking company can see a full read-only list of every GPS number you (and your co-operators) have set, on the **Operators** page under **GPS numbers**.

### Editing a truck

Click **Edit** on a truck's card to update any of its fields (including plate, trailer, driver, location, and GPS number), then **Save truck**. You can only edit the **current** truck of a sub-order — once a truck has been transferred out or cancelled, it becomes read-only history (shown as a compact one-line summary instead of a full card).

### Shipping documents

Each truck's card has a **Shipping documents** box. Only you (the operator) can upload to it; the client — the company, its employees, or the individual consignee — can see and download every document, and so can admin.

- **PDF or Word** files only (.pdf, .doc, .docx).
- **Max 15 MB per document**, and **up to 3 documents per truck**. To add a fourth, delete one first (the bin icon).
- Uploading and deleting work only on the truck's current, open sub-order; on completed/cancelled orders and transferred trucks the documents stay downloadable but can't be changed.

## 8. Cargo transfer

Use this when the cargo physically moves to a **different truck** (for example, crossing into a different country requires a different vehicle).

1. In the sub-order, click **Record cargo transfer** to open the form.
2. Fill in:
   - **From truck** — pick the truck the cargo is leaving.
   - **To truck plate** — the new truck's plate number.
   - **New GPS number** — the new truck's own GPS tracker ID, if you have it. (Not required to complete the transfer — you can add it later by editing the truck.)
   - **Current location** (required) and **New vehicle country** (required).
   - Check **"Trailer stays the same"** if only the tractor unit changed, or enter a new **To trailer plate**.
   - **New driver phone** / **New driver name** (optional).
   - **Transfer date**, **Comment** (optional).
3. Click **Record transfer**.

The old truck becomes read-only history; the new truck becomes the sub-order's current truck, ready for you to keep updating (including setting its own GPS number if you didn't at transfer time).

A sub-order allows a limited number of transfers (currently 3) — once the limit is reached, you'll see a notice instead of the form.

## 9. Pairing the driver's app

Instead of typing location updates manually, you can have the driver's phone send it automatically.

1. In the sub-order, under **Pair driver app**, fill in the **Truck plate**, choose how long the code should stay valid (**15 minutes, 30 minutes, 1 hour, or 3 hours**), then click **Create pairing**. No phone number is needed.
2. A **one-time 8-character code** appears — switch to **QR** if it's easier to let the driver scan it instead. Send/show it to the driver right away, since it's shown only once.
3. The driver enters the code in the driver app (or taps **Scan QR** and scans it). Once accepted, the pairing switches from **Waiting** to **Paired**, and their location starts updating automatically.
4. If the code expires or wasn't received, pick a duration and click **New code** to issue a fresh one.
5. Click **Revoke** to stop a driver's app from sending location (e.g. if the driver changed).

## 10. Cancelling

- **Cancel** a truck — keeps it in history but marks it inactive; you can then add a new truck or record a transfer.
- **Cancel sub-order** — cancels the whole sub-order; other sub-orders in the same order are unaffected.

Cancelled items are never deleted — they stay visible as history.

## 11. Monitoring

The **Monitoring** tab (top of the page) is your live overview of every order you're linked to, in one table:

- **Active** (default), **Completed**, **Cancelled** tabs.
- **Search** by order name, sub-order name, truck plate, trailer, or driver phone.
- **Sort** newest/oldest first.
- **Download Excel** — exports the current tab's list to a spreadsheet (this export includes GPS numbers, since you're an operator).

The page updates live as you or a driver's paired app updates a location.

## 12. Partner Company

If your tracking company regularly works with the same client company, you can **partner** with them so operators can browse that company's employee roster directly, instead of asking each employee for their ID one by one.

Only the **Tracking company** account can manage partners (operators-with-a-company can view the list, not add/remove partners).

1. Go to **Partner Company** in the left menu.
2. Share **"Your ID"** with the client company, or enter **their** 8-digit ID under **"Link a company by ID"** and click **Link**.
3. Once linked, you'll see their name and, below it, a list of their **Employees** with each one's individual ID — copy any of those into the linking step in [Section 4](#4-linking-with-a-client).

Click **Unlink** to remove a partner company.

## 13. Tracking company dashboard (analytics)

The **Dashboard** tab (Tracking company account only) shows:

- **Operators**
- **Active operators**
- **Linked accounts** (total, across all your operators)

## 14. Your profile

Open **Profile** (click your name/avatar, top right) to:

- **Change your photo** — anyone can do this, anytime (JPEG, PNG, or WebP).
- **Edit your info** — the **Tracking company** account can edit its **company name**, **phone**, and **email**. An **Operator's** profile is managed by the tracking company instead (name/phone/date of birth/email are read-only for the operator — ask the tracking company to change them), but the operator's **photo and password are always self-service**.
- **Change password** — enter your current password and a new one (min. 8 characters). This works for everyone, regardless of the above.
- **Log out**.

## 15. FAQ / Troubleshooting

- **"I don't have an invite code."** — Ask your admin for one; it's required to register.
- **"I forgot my password."** — On the login page, click **"Forgot your password?"**. You'll need a **registration code** from your admin (different from the original invite code) to reset it.
- **"I can't see any orders."** — You need to link with a client first (Section 4). If you were given "specific orders only" access, only those will appear.
- **"I set the wrong GPS number."** — Edit the truck again and correct it; the client never sees it either way.
- **"Can I set the new truck's GPS number during a transfer?"** — Yes, there's a field for it right in the transfer form, but it's optional — you can also add it afterward by editing the new truck.
- **"I can't edit a truck anymore."** — Once a truck has been transferred out or cancelled, it's locked as history. Only the sub-order's current truck can be edited.
