import type { Prisma, TruckListing, User } from "@prisma/client";
import { prisma } from "./prisma.js";
import { badRequest, conflict, notFound, unauthorized } from "./errors.js";
import { optionalString } from "./input.js";
import { orderVisibilityWhere } from "./orders.js";
import { optionalText, parseDriverFields, parseDriverPhone, requiredName } from "./drivers.js";

// ---- Listing fields ----

function optionalMeasure(value: unknown, label: string, max: number): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value).replace(",", "."));
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > max) badRequest(`Enter a valid ${label}`);
  return Math.round(parsed * 100) / 100;
}

function optionalAxles(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 2 || parsed > 10) badRequest("Enter a valid number of axles");
  return parsed;
}

type ListingFields = Omit<Prisma.TruckListingUncheckedCreateInput, "id" | "driverId" | "createdAt" | "updatedAt">;

// Partial, like driver profile updates: only keys present are written.
function parseListingFields(body: Record<string, unknown>): ListingFields {
  const has = (key: string) => Object.prototype.hasOwnProperty.call(body, key);
  const fields: ListingFields = {};
  if (has("published")) fields.published = body.published === true;
  if (has("bodyType")) fields.bodyType = optionalText(body.bodyType, 40, "body type");
  if (has("lengthM")) fields.lengthM = optionalMeasure(body.lengthM, "length", 30);
  if (has("widthM")) fields.widthM = optionalMeasure(body.widthM, "width", 5);
  if (has("heightM")) fields.heightM = optionalMeasure(body.heightM, "height", 6);
  if (has("capacityTons")) fields.capacityTons = optionalMeasure(body.capacityTons, "capacity", 60);
  if (has("volumeM3")) fields.volumeM3 = optionalMeasure(body.volumeM3, "volume", 200);
  if (has("axles")) fields.axles = optionalAxles(body.axles);
  if (has("baseCity")) fields.baseCity = optionalText(body.baseCity, 80, "base city");
  if (has("note")) fields.note = optionalText(body.note, 500, "note");
  return fields;
}

export function toListing(listing: TruckListing) {
  return {
    published: listing.published,
    bodyType: listing.bodyType,
    lengthM: listing.lengthM,
    widthM: listing.widthM,
    heightM: listing.heightM,
    capacityTons: listing.capacityTons,
    volumeM3: listing.volumeM3,
    axles: listing.axles,
    baseCity: listing.baseCity,
    note: listing.note,
    updatedAt: listing.updatedAt.toISOString(),
  };
}

async function writeListing(driverId: string, fields: ListingFields) {
  const saved = await prisma.truckListing.upsert({
    where: { driverId },
    create: { driverId, ...fields },
    update: fields,
  });
  // A published ad has to say at least what the truck is and what it carries.
  if (saved.published && (!saved.bodyType || !saved.capacityTons)) {
    await prisma.truckListing.update({ where: { driverId }, data: { published: false } });
    badRequest("Add the body type and capacity before publishing");
  }
  return saved;
}

export async function getDriverListing(driverId: string) {
  const listing = await prisma.truckListing.findUnique({ where: { driverId } });
  return listing ? toListing(listing) : null;
}

export async function saveDriverListing(driverId: string, body: Record<string, unknown>) {
  return toListing(await writeListing(driverId, parseListingFields(body)));
}

// ---- Tracking-company fleet ----

// The fleet belongs to the tracking company; its operators work on it too.
export function fleetCompanyId(user: User | null): string {
  if (user?.role === "OPERATOR_COMPANY") return user.id;
  if (user?.role === "OPERATOR" && user.companyId) return user.companyId;
  unauthorized();
}

const fleetDriverInclude = {
  listing: true,
  _count: { select: { assignments: true } },
  assignments: { where: { status: "ACTIVE" as const }, select: { id: true }, take: 1 },
};

type FleetDriverRow = Prisma.DriverGetPayload<{ include: typeof fleetDriverInclude }>;

// "Guest" = has never signed in to the app. Every pairing a driver is linked
// to went through the app, so any linked pairing proves they have it.
function hasApp(driver: FleetDriverRow) {
  return driver.registeredVia === "APP" || driver._count.assignments > 0;
}

function toFleetDriver(driver: FleetDriverRow) {
  return {
    id: driver.id,
    firstName: driver.firstName,
    lastName: driver.lastName,
    phone: driver.phone,
    hasApp: hasApp(driver),
    truckPlate: driver.truckPlate,
    truckModel: driver.truckModel,
    trailerPlate: driver.trailerPlate,
    trailerType: driver.trailerType,
    listing: driver.listing ? toListing(driver.listing) : null,
    onTrip: driver.assignments.length > 0,
  };
}

export async function listGlobalDrivers(companyId: string) {
  const drivers = await prisma.driver.findMany({
    where: { active: true, listing: { published: true } },
    include: { ...fleetDriverInclude, companies: { where: { companyId }, select: { id: true } } },
    orderBy: { listing: { updatedAt: "desc" } },
  });
  return drivers.map((driver) => ({ ...toFleetDriver(driver), inMyDrivers: driver.companies.length > 0 }));
}

// Drivers already typed onto trucks of this company's orders who aren't in
// "My drivers" yet — read straight off the trucks, nothing is changed there.
async function guestsFromTrucks(companyId: string, rosterPhones: Set<string>) {
  const operators = await prisma.user.findMany({ where: { companyId, role: "OPERATOR" }, select: { id: true } });
  if (operators.length === 0) return [];
  const visibilities = await Promise.all(
    operators.map((op) => orderVisibilityWhere({ isAdmin: false, user: { id: op.id, role: "OPERATOR" } }))
  );
  const trucks = await prisma.truck.findMany({
    where: { driverPhone: { not: null }, subOrder: { groupOrder: { OR: visibilities } } },
    select: {
      plateNumber: true,
      trailerPlateNumber: true,
      driverName: true,
      driverPhone: true,
      updatedAt: true,
      subOrder: { select: { name: true, groupOrder: { select: { name: true } } } },
    },
    orderBy: { updatedAt: "desc" },
    take: 500,
  });

  const seen = new Map<string, (typeof trucks)[number]>();
  for (const truck of trucks) {
    const digits = truck.driverPhone!.replace(/\D/g, "");
    if (digits.length < 9 || rosterPhones.has(digits) || seen.has(digits)) continue;
    seen.set(digits, truck);
  }
  if (seen.size === 0) return [];

  const known = await prisma.driver.findMany({
    where: { phoneNormalized: { in: [...seen.keys()] } },
    include: fleetDriverInclude,
  });
  const knownByPhone = new Map(known.map((d) => [d.phoneNormalized, d]));

  return [...seen.entries()].map(([digits, truck]) => {
    const driver = knownByPhone.get(digits);
    return {
      phone: truck.driverPhone!,
      name: truck.driverName,
      plateNumber: truck.plateNumber,
      trailerPlateNumber: truck.trailerPlateNumber,
      lastOrder: [truck.subOrder.groupOrder.name, truck.subOrder.name].filter(Boolean).join(" · "),
      lastSeenAt: truck.updatedAt.toISOString(),
      driverId: driver?.id ?? null,
      hasApp: driver ? hasApp(driver) : false,
    };
  });
}

export async function listMyDrivers(companyId: string) {
  const roster = await prisma.companyDriver.findMany({
    where: { companyId },
    include: { driver: { include: fleetDriverInclude } },
    orderBy: { createdAt: "desc" },
  });
  const rosterPhones = new Set(roster.map((row) => row.driver.phoneNormalized));
  return {
    drivers: roster.map((row) => ({
      ...toFleetDriver(row.driver),
      addedAt: row.createdAt.toISOString(),
      addedByLabel: row.addedByLabel,
    })),
    suggestions: await guestsFromTrucks(companyId, rosterPhones),
  };
}

async function link(companyId: string, driverId: string, label: string) {
  await prisma.companyDriver.upsert({
    where: { companyId_driverId: { companyId, driverId } },
    create: { companyId, driverId, addedByLabel: label },
    update: {},
  });
}

// From "Global drivers": only drivers who published an ad can be picked.
export async function addGlobalDriver(companyId: string, driverId: unknown, label: string) {
  const id = optionalString(driverId);
  const driver = id
    ? await prisma.driver.findFirst({ where: { id, active: true, listing: { published: true } } })
    : null;
  if (!driver) notFound("Driver not found");
  await link(companyId, driver.id, label);
}

// Entered by hand (or picked from a truck). A phone number that already
// belongs to a driver links that driver instead of creating a duplicate —
// and never overwrites what they or another company saved.
export async function createFleetDriver(companyId: string, body: Record<string, unknown>, label: string) {
  const firstName = requiredName(body.firstName, "first name");
  const lastName = requiredName(body.lastName, "last name");
  const { phone, phoneNormalized } = parseDriverPhone(body.phone);

  const existing = await prisma.driver.findUnique({ where: { phoneNormalized } });
  if (existing) {
    await link(companyId, existing.id, label);
    return { driverId: existing.id, existed: true };
  }

  const optional = { ...body };
  delete optional.firstName;
  delete optional.lastName;
  delete optional.phone;
  const fields = await parseDriverFields(null, optional);
  const listing = parseListingFields({ ...optional, published: false });
  const driver = await prisma.driver.create({
    data: { ...fields, firstName, lastName, phone, phoneNormalized, registeredVia: "COMPANY" },
  });
  if (Object.keys(listing).length > 1) await writeListing(driver.id, listing);
  await link(companyId, driver.id, label);
  return { driverId: driver.id, existed: false };
}

async function loadRosterDriver(companyId: string, driverId: string) {
  const row = await prisma.companyDriver.findUnique({
    where: { companyId_driverId: { companyId, driverId } },
    include: { driver: { include: fleetDriverInclude } },
  });
  if (!row) notFound("Driver not found");
  return row.driver;
}

// A driver who uses the app keeps their profile and ad themselves; a
// company only maintains drivers who don't (guests).
export async function updateFleetDriver(companyId: string, driverId: string, body: Record<string, unknown>) {
  const driver = await loadRosterDriver(companyId, driverId);
  if (hasApp(driver)) conflict("This driver keeps their own profile up to date in the app");
  const fields = await parseDriverFields(driver.id, body);
  if (Object.keys(fields).length > 0) await prisma.driver.update({ where: { id: driver.id }, data: fields });
  const listing = parseListingFields({ ...body, published: false });
  delete listing.published;
  if (Object.keys(listing).length > 0) await writeListing(driver.id, listing);
}

export async function removeFleetDriver(companyId: string, driverId: string) {
  await loadRosterDriver(companyId, driverId);
  await prisma.companyDriver.delete({ where: { companyId_driverId: { companyId, driverId } } });
}
