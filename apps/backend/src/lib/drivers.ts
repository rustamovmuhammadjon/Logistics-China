import { Prisma, type Driver } from "@prisma/client";
import { prisma } from "./prisma.js";
import { badRequest, conflict, notFound, unauthorized } from "./errors.js";
import { optionalString, parseDateOfBirth, requiredDisplayPhone } from "./input.js";
import { signDriverToken, type DriverSession } from "./auth.js";
import { assertAssignmentUsable, driverTruckInclude, pairDriver } from "./assignments.js";

type TripAssignment = Prisma.DriverAssignmentGetPayload<{ include: typeof driverTruckInclude }>;

export type DriverTripStatus = "ACTIVE" | "COMPLETED" | "CANCELED" | "TRANSFERRED" | "ENDED";

// Letters (any script), spaces, hyphens, and the apostrophe variants Uzbek
// Latin uses (G'ulomov, Ro'ziyev) — the shared NAME_PATTERN would reject those.
const DRIVER_NAME_PATTERN = /^\p{L}[\p{L}\s'’ʻʼ`-]*$/u;

export function requiredName(value: unknown, label: string): string {
  const raw = optionalString(value);
  if (!raw) badRequest(`"${label}" is required`);
  const name = raw.replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 50 || !DRIVER_NAME_PATTERN.test(name)) badRequest(`Enter a valid ${label}`);
  return name;
}

export function parseDriverPhone(value: unknown) {
  const phone = requiredDisplayPhone(value, "phone");
  return { phone, phoneNormalized: phone.replace(/\D/g, "") };
}

export function optionalText(value: unknown, max: number, label: string): string | null {
  const text = optionalString(value);
  if (text && text.length > max) badRequest(`"${label}" is too long`);
  return text;
}

function optionalDriverPlate(value: unknown, label: string): string | null {
  const raw = optionalString(value);
  if (!raw) return null;
  const plate = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (plate.length < 3 || plate.length > 12) badRequest(`Enter a valid ${label}`);
  return plate;
}

const iso = (value: Date | null | undefined) => (value ? value.toISOString() : null);
const fullName = (driver: Pick<Driver, "firstName" | "lastName">) => `${driver.firstName} ${driver.lastName}`;

export function toDriverProfile(driver: Driver) {
  return {
    id: driver.id,
    firstName: driver.firstName,
    lastName: driver.lastName,
    phone: driver.phone,
    dateOfBirth: driver.dateOfBirth ? driver.dateOfBirth.toISOString().slice(0, 10) : null,
    licenseNumber: driver.licenseNumber,
    truckPlate: driver.truckPlate,
    truckModel: driver.truckModel,
    trailerPlate: driver.trailerPlate,
    trailerType: driver.trailerType,
    registeredVia: driver.registeredVia,
    createdAt: driver.createdAt.toISOString(),
  };
}

function tripStatus(assignment: TripAssignment): DriverTripStatus {
  const { truck } = assignment;
  if (truck.canceledAt || truck.subOrder.status === "CANCELED" || truck.subOrder.groupOrder.canceledAt) {
    return "CANCELED";
  }
  if (truck.subOrder.status === "CLOSED") return "COMPLETED";
  if (truck.transfersFrom.length > 0) return "TRANSFERRED";
  return assignment.status === "ACTIVE" ? "ACTIVE" : "ENDED";
}

// Only what a driver needs to do the job — the route, the cargo, the dates.
// Who the order belongs to, operators, GPS box numbers, comments, files,
// status notes and every other truck on the order are never sent.
export function toDriverTrip(assignment: TripAssignment) {
  const { truck } = assignment;
  const sub = truck.subOrder;
  const order = sub.groupOrder;
  return {
    id: assignment.id,
    status: tripStatus(assignment),
    pairedAt: (assignment.claimedAt ?? assignment.createdAt).toISOString(),
    lastPingAt: iso(assignment.lastPingAt),
    lastLocationText: assignment.lastLocationText,
    lastLat: assignment.lastLat,
    lastLng: assignment.lastLng,
    truck: {
      plateNumber: truck.plateNumber,
      trailerPlateNumber: truck.trailerPlateNumber,
      cargoWeight: truck.cargoWeight,
      cargoDescription: truck.cargoDescription,
    },
    order: {
      reference: order.name,
      subOrderName: sub.name,
      origin: order.origin,
      destination: order.destination,
      pol: order.pol,
      commodity: order.commodity,
      factoryLoadDate: iso(sub.factoryLoadDate),
      openedAt: iso(sub.openedAt ?? order.openedAt),
      arrivedAt: iso(sub.arrivedAt),
    },
  };
}

function isUsable(assignment: TripAssignment, tokenVersion: number | undefined) {
  try {
    assertAssignmentUsable(assignment, tokenVersion ?? -1);
    return true;
  } catch {
    return false;
  }
}

export type DriverContext = { driver: Driver | null; assignment: TripAssignment | null };

// A registered driver stays signed in when their trip ends (assignment comes
// back null); a pairing-only session has nothing else to fall back on, so a
// dead pairing still fails the request exactly as it did before accounts.
export async function loadDriverContext(session: DriverSession): Promise<DriverContext> {
  // Every driver request starts here, and the database is an ocean away from
  // the API — fetch both rows in one round trip instead of two.
  const [foundDriver, found] = await Promise.all([
    session.driverId ? prisma.driver.findUnique({ where: { id: session.driverId } }) : null,
    session.assignmentId
      ? prisma.driverAssignment.findUnique({ where: { id: session.assignmentId }, include: driverTruckInclude })
      : null,
  ]);

  let driver: Driver | null = null;
  if (session.driverId) {
    if (!foundDriver || foundDriver.tokenVersion !== session.driverTokenVersion) unauthorized("Sign in again with a new code");
    if (!foundDriver.active) unauthorized("This driver account is disabled");
    driver = foundDriver;
  }

  let assignment: TripAssignment | null = null;
  if (session.assignmentId) {
    if (found && isUsable(found, session.tokenVersion)) {
      assignment = found;
    } else if (!driver) {
      if (!found) unauthorized();
      assertAssignmentUsable(found, session.tokenVersion ?? -1);
    }
  }
  if (driver && assignment?.driverId && assignment.driverId !== driver.id) assignment = null;
  return { driver, assignment };
}

export function buildDriverMe(ctx: DriverContext) {
  return {
    registered: Boolean(ctx.driver),
    profile: ctx.driver ? toDriverProfile(ctx.driver) : null,
    currentTrip: ctx.assignment ? toDriverTrip(ctx.assignment) : null,
  };
}

function issueToken(driver: Driver | null, assignment: TripAssignment | null) {
  return signDriverToken({
    ...(driver ? { driverId: driver.id, driverTokenVersion: driver.tokenVersion } : {}),
    ...(assignment
      ? { assignmentId: assignment.id, truckId: assignment.truckId, tokenVersion: assignment.tokenVersion }
      : {}),
  });
}

// One driver drives one truck at a time: attaching a pairing ends any other
// pairing still active for them, so GPS only ever lands on the current truck.
async function linkAssignmentToDriver(assignment: TripAssignment, driver: Driver): Promise<TripAssignment> {
  await prisma.$transaction([
    prisma.driverAssignment.updateMany({
      where: { driverId: driver.id, status: "ACTIVE", id: { not: assignment.id } },
      data: { status: "REVOKED", pairingCodeHash: null, pairingExpiresAt: null, tokenVersion: { increment: 1 } },
    }),
    prisma.driverAssignment.update({ where: { id: assignment.id }, data: { driverId: driver.id } }),
  ]);

  // Saves the operator retyping it — but never overwrites what they entered.
  const truckData: Prisma.TruckUpdateInput = {};
  if (!assignment.truck.driverName) truckData.driverName = fullName(driver);
  if (!assignment.truck.driverPhone) truckData.driverPhone = driver.phone;
  if (Object.keys(truckData).length > 0) {
    await prisma.truck.update({ where: { id: assignment.truckId }, data: truckData });
  }
  return { ...assignment, driverId: driver.id };
}

async function findOrCreateDriver(data: Prisma.DriverCreateInput) {
  try {
    return await prisma.driver.create({ data });
  } catch (err) {
    // Two sign-ups with the same number at once — the other one won.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const winner = await prisma.driver.findUnique({ where: { phoneNormalized: data.phoneNormalized } });
      if (winner) return winner;
    }
    throw err;
  }
}

export async function pairWithCode(code: unknown, existing: DriverSession | null) {
  let driver: Driver | null = null;
  if (existing?.driverId) {
    const found = await prisma.driver.findUnique({ where: { id: existing.driverId } });
    if (found?.active && found.tokenVersion === existing.driverTokenVersion) driver = found;
  }

  let assignment: TripAssignment = await pairDriver(code);
  if (driver) assignment = await linkAssignmentToDriver(assignment, driver);
  return { token: await issueToken(driver, assignment), me: buildDriverMe({ driver, assignment }) };
}

export async function registerDriver(session: DriverSession, body: Record<string, unknown>) {
  if (session.driverId) badRequest("Already registered");
  const { assignment } = await loadDriverContext(session);
  if (!assignment) unauthorized("This pairing is no longer active");

  const firstName = requiredName(body.firstName, "first name");
  const lastName = requiredName(body.lastName, "last name");
  const { phone, phoneNormalized } = parseDriverPhone(body.phone);

  const known = await prisma.driver.findUnique({ where: { phoneNormalized } });
  if (known && !known.active) unauthorized("This driver account is disabled");

  // A returning (or admin-registered) driver keeps their saved name — they
  // can change it from their profile.
  const driver = known ?? (await findOrCreateDriver({ firstName, lastName, phone, phoneNormalized, registeredVia: "APP" }));
  const linked = await linkAssignmentToDriver(assignment, driver);
  return { token: await issueToken(driver, linked), me: buildDriverMe({ driver, assignment: linked }) };
}

export async function signOutDriver(session: DriverSession) {
  // Conditional on the version: if the operator already re-issued a code for
  // this truck, signing out an old phone must not cancel the new pairing.
  if (session.assignmentId && session.tokenVersion !== undefined) {
    await prisma.driverAssignment.updateMany({
      where: { id: session.assignmentId, status: "ACTIVE", tokenVersion: session.tokenVersion },
      data: { status: "REVOKED", pairingCodeHash: null, pairingExpiresAt: null, tokenVersion: { increment: 1 } },
    });
  }
  if (session.driverId) {
    await prisma.driver.updateMany({
      where: { id: session.driverId, tokenVersion: session.driverTokenVersion },
      data: { tokenVersion: { increment: 1 } },
    });
  }
}

export type DriverFields = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  phoneNormalized?: string;
  dateOfBirth?: Date | null;
  licenseNumber?: string | null;
  truckPlate?: string | null;
  truckModel?: string | null;
  trailerPlate?: string | null;
  trailerType?: string | null;
};

// Partial update: only the keys present in the body are touched, so the
// personal-info and vehicle forms can each save just their own fields.
export async function parseDriverFields(driverId: string | null, body: Record<string, unknown>): Promise<DriverFields> {
  const has = (key: string) => Object.prototype.hasOwnProperty.call(body, key);
  const fields: DriverFields = {};
  if (has("firstName")) fields.firstName = requiredName(body.firstName, "first name");
  if (has("lastName")) fields.lastName = requiredName(body.lastName, "last name");
  if (has("phone")) {
    const { phone, phoneNormalized } = parseDriverPhone(body.phone);
    const other = await prisma.driver.findUnique({ where: { phoneNormalized } });
    if (other && other.id !== driverId) conflict("Another driver already uses this phone number");
    fields.phone = phone;
    fields.phoneNormalized = phoneNormalized;
  }
  if (has("dateOfBirth")) fields.dateOfBirth = parseDateOfBirth(body.dateOfBirth);
  if (has("licenseNumber")) fields.licenseNumber = optionalText(body.licenseNumber, 30, "license number");
  if (has("truckPlate")) fields.truckPlate = optionalDriverPlate(body.truckPlate, "truck plate");
  if (has("truckModel")) fields.truckModel = optionalText(body.truckModel, 60, "truck model");
  if (has("trailerPlate")) fields.trailerPlate = optionalDriverPlate(body.trailerPlate, "trailer plate");
  if (has("trailerType")) fields.trailerType = optionalText(body.trailerType, 60, "trailer type");
  return fields;
}

// Keeps the operator's truck card in step when a driver's name or number is
// corrected — only where the card still shows the value we filled in.
async function syncActiveTruckDriverFields(before: Driver, after: Driver) {
  const nameChanged = fullName(before) !== fullName(after);
  const phoneChanged = before.phone !== after.phone;
  if (!nameChanged && !phoneChanged) return;
  const active = await prisma.driverAssignment.findMany({
    where: { driverId: after.id, status: "ACTIVE" },
    select: { truckId: true },
  });
  const truckIds = active.map((a) => a.truckId);
  if (truckIds.length === 0) return;
  if (nameChanged) {
    await prisma.truck.updateMany({
      where: { id: { in: truckIds }, driverName: fullName(before) },
      data: { driverName: fullName(after) },
    });
  }
  if (phoneChanged) {
    await prisma.truck.updateMany({
      where: { id: { in: truckIds }, driverPhone: before.phone },
      data: { driverPhone: after.phone },
    });
  }
}

export async function updateDriverProfile(driver: Driver, body: Record<string, unknown>) {
  const fields = await parseDriverFields(driver.id, body);
  const updated = await prisma.driver.update({ where: { id: driver.id }, data: fields });
  await syncActiveTruckDriverFields(driver, updated);
  return toDriverProfile(updated);
}

export async function listDriverTrips(driverId: string) {
  const assignments = await prisma.driverAssignment.findMany({
    where: { driverId },
    include: driverTruckInclude,
    orderBy: [{ claimedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
  });
  // A truck can be re-paired with a fresh code — that's still one trip.
  const seen = new Set<string>();
  return assignments.filter((a) => {
    if (seen.has(a.truckId)) return false;
    seen.add(a.truckId);
    return true;
  });
}

export async function getDriverTrip(driverId: string, tripId: string) {
  const assignment = await prisma.driverAssignment.findUnique({
    where: { id: tripId },
    include: driverTruckInclude,
  });
  if (!assignment || assignment.driverId !== driverId) notFound("Trip not found");
  // Every pairing this driver had on the same truck, so a re-issued code
  // doesn't split the route history in two.
  const pings = await prisma.locationPing.findMany({
    where: { assignment: { truckId: assignment.truckId, driverId } },
    orderBy: { recordedAt: "desc" },
    take: 100,
    select: { id: true, lat: true, lng: true, locationText: true, recordedAt: true },
  });
  return {
    trip: toDriverTrip(assignment),
    pings: pings.map((p) => ({ ...p, recordedAt: p.recordedAt.toISOString() })),
  };
}

// ---- Admin ----

const adminDriverInclude = {
  assignments: { include: driverTruckInclude, orderBy: { createdAt: "desc" as const } },
};

type AdminDriverRow = Prisma.DriverGetPayload<{ include: typeof adminDriverInclude }>;

function toAdminDriver(driver: AdminDriverRow) {
  const current = driver.assignments.find((a) => tripStatus(a) === "ACTIVE");
  const lastPing = driver.assignments.reduce<Date | null>(
    (latest, a) => (a.lastPingAt && (!latest || a.lastPingAt > latest) ? a.lastPingAt : latest),
    null
  );
  return {
    ...toDriverProfile(driver),
    active: driver.active,
    tripCount: new Set(driver.assignments.map((a) => a.truckId)).size,
    lastPingAt: iso(lastPing),
    activeTrip: current
      ? {
          plateNumber: current.truck.plateNumber,
          reference: current.truck.subOrder.groupOrder.name,
          subOrderName: current.truck.subOrder.name,
        }
      : null,
  };
}

async function loadAdminDriver(id: string) {
  const driver = await prisma.driver.findUnique({ where: { id }, include: adminDriverInclude });
  if (!driver) notFound("Driver not found");
  return driver;
}

export async function listDriversForAdmin() {
  const drivers = await prisma.driver.findMany({
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    include: adminDriverInclude,
  });
  return drivers.map((driver) => toAdminDriver(driver));
}

export async function getDriverForAdmin(id: string) {
  const driver = await loadAdminDriver(id);
  const trips = await listDriverTrips(id);
  return {
    driver: toAdminDriver(driver),
    trips: trips.map((a) => ({
      ...toDriverTrip(a),
      groupOrderId: a.truck.subOrder.groupOrderId,
      subOrderId: a.truck.subOrderId,
      truckId: a.truckId,
    })),
  };
}

export async function createDriverByAdmin(body: Record<string, unknown>) {
  const firstName = requiredName(body.firstName, "first name");
  const lastName = requiredName(body.lastName, "last name");
  const { phone, phoneNormalized } = parseDriverPhone(body.phone);
  if (await prisma.driver.findUnique({ where: { phoneNormalized } })) {
    conflict("A driver with this phone number is already registered");
  }
  const optional = { ...body };
  delete optional.firstName;
  delete optional.lastName;
  delete optional.phone;
  const extra = await parseDriverFields(null, optional);
  const driver = await prisma.driver.create({
    data: { ...extra, firstName, lastName, phone, phoneNormalized, registeredVia: "ADMIN" },
    include: adminDriverInclude,
  });
  return toAdminDriver(driver);
}

async function revokeDriverPairings(driverId: string) {
  await prisma.driverAssignment.updateMany({
    where: { driverId, status: "ACTIVE" },
    data: { status: "REVOKED", pairingCodeHash: null, pairingExpiresAt: null, tokenVersion: { increment: 1 } },
  });
}

export async function updateDriverByAdmin(id: string, body: Record<string, unknown>) {
  const before = await loadAdminDriver(id);
  const fields = await parseDriverFields(id, body);
  const disabling = body.active === false && before.active;
  const updated = await prisma.driver.update({
    where: { id },
    data: {
      ...fields,
      ...(typeof body.active === "boolean" ? { active: body.active } : {}),
      // Disabling signs the driver out everywhere and stops their GPS.
      ...(disabling ? { tokenVersion: { increment: 1 } } : {}),
    },
  });
  if (disabling) await revokeDriverPairings(id);
  await syncActiveTruckDriverFields(before, updated);
  return toAdminDriver(await loadAdminDriver(id));
}

export async function deleteDriverByAdmin(id: string) {
  await loadAdminDriver(id);
  await revokeDriverPairings(id);
  await prisma.driver.delete({ where: { id } });
}
