import ExcelJS from "exceljs";
import {
  formatDate,
  formatDateTime,
  formatDirection,
  MAX_TRANSFERS_PER_SUB_ORDER,
  subOrderStatusLabel,
  truckStats,
  type SubOrderStatus,
} from "@logistics/shared";

// A sub-order can have at most one original truck plus this many transfers.
const MAX_VEHICLES_PER_SUB_ORDER = MAX_TRANSFERS_PER_SUB_ORDER + 1;

type ExportTruck = {
  plateNumber: string | null;
  trailerPlateNumber: string | null;
  country: string | null;
  driverPhone: string | null;
  cargoWeight: number | null;
  currentLocation: string | null;
  locationUpdatedAt: Date | null;
  canceledAt?: Date | null;
  transfersFrom?: unknown[] | null;
  createdAt: Date;
};

function vehicleLabel(truck: ExportTruck): string {
  return [truck.plateNumber, truck.trailerPlateNumber].filter(Boolean).join(" | ");
}

// The full history of vehicles that actually carried this sub-order's cargo,
// oldest first — a cancelled vehicle never counts as one of the sequence.
function vehicleChain(trucks: ExportTruck[]): ExportTruck[] {
  return [...trucks]
    .filter((t) => !t.canceledAt)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

type ExportSubOrder = {
  name: string | null;
  status: SubOrderStatus;
  factoryLoadDate: Date | null;
  trucks: ExportTruck[];
  comments?: { text: string }[];
};

type ExportOrder = {
  name: string;
  origin: string | null;
  destination: string | null;
  openedAt: Date | null;
  pol: string | null;
  commodity: string | null;
  subOrders: ExportSubOrder[];
  owner?: { email: string } | null;
  operators?: { email: string }[];
};

// Alternating white / light-gray banding so each order's rows (and its
// sub-orders' rows, on the other sheet) are visually grouped together.
const BAND_COLORS = ["FFFFFFFF", "FFF3F4F6"];

function bandFill(orderIndex: number): ExcelJS.Fill {
  return { type: "pattern", pattern: "solid", fgColor: { argb: BAND_COLORS[orderIndex % 2] } };
}

const ROW_BORDER: Partial<ExcelJS.Borders> = { bottom: { style: "thin" } };

export async function buildOrdersWorkbook(
  orders: ExportOrder[],
  opts: { includePeople: boolean }
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "China–Iran Logistics";
  workbook.created = new Date();

  const ordersSheet = workbook.addWorksheet("Orders");
  ordersSheet.columns = [
    { header: "Order", key: "name", width: 22 },
    { header: "Direction", key: "direction", width: 20 },
    { header: "POL", key: "pol", width: 18 },
    { header: "Commodity", key: "commodity", width: 20 },
    { header: "Opened", key: "opened", width: 14 },
    { header: "Sub-orders", key: "subOrders", width: 12 },
    { header: "Trucks", key: "trucks", width: 10 },
    ...(opts.includePeople
      ? [
          { header: "Consignee", key: "consignee", width: 28 },
          { header: "Operators", key: "operators", width: 28 },
        ]
      : []),
  ];
  ordersSheet.getRow(1).font = { bold: true };
  ordersSheet.getRow(1).border = ROW_BORDER;

  orders.forEach((order, orderIndex) => {
    const stats = truckStats(order.subOrders.flatMap((s) => s.trucks));
    const row = ordersSheet.addRow({
      name: order.name,
      direction: formatDirection(order.origin, order.destination) || "",
      pol: order.pol || "",
      commodity: order.commodity || "",
      opened: formatDate(order.openedAt),
      subOrders: order.subOrders.length,
      trucks: stats.total,
      ...(opts.includePeople
        ? {
            consignee: order.owner?.email ?? "Not assigned",
            operators:
              order.operators && order.operators.length > 0
                ? order.operators.map((p) => p.email).join(", ")
                : "None linked",
          }
        : {}),
    });
    row.fill = bandFill(orderIndex);
    row.border = ROW_BORDER;
  });

  // Only as many Vehicle/Country column pairs as this export actually needs
  // — e.g. a Vehicle 3 column only appears once some sub-order really has a
  // third vehicle, up to the transfer cap.
  const chainsByOrder = orders.map((order) => order.subOrders.map((sub) => vehicleChain(sub.trucks)));
  const longestChain = chainsByOrder.flat().reduce((max, chain) => Math.max(max, chain.length), 0);
  const vehicleColumnCount = Math.max(1, Math.min(MAX_VEHICLES_PER_SUB_ORDER, longestChain));
  const vehicleColumns = Array.from({ length: vehicleColumnCount }, (_, i) => i + 1).flatMap((n) => [
    { header: `Vehicle ${n}`, key: `vehicle${n}`, width: 20 },
    { header: `Country ${n}`, key: `country${n}`, width: 14 },
  ]);

  const subSheet = workbook.addWorksheet("Sub-orders");
  subSheet.columns = [
    { header: "Order", key: "order", width: 20 },
    { header: "Sub-order", key: "subOrder", width: 16 },
    { header: "Status", key: "status", width: 12 },
    { header: "FLD", key: "fld", width: 14 },
    ...vehicleColumns,
    { header: "Driver #", key: "driver", width: 16 },
    { header: "Gross weight (tons)", key: "weight", width: 16 },
    { header: "Current location", key: "location", width: 26 },
    { header: "Last update", key: "updated", width: 18 },
    { header: "Comment", key: "comment", width: 32 },
  ];
  subSheet.getRow(1).font = { bold: true };
  subSheet.getRow(1).border = ROW_BORDER;

  orders.forEach((order, orderIndex) => {
    order.subOrders.forEach((sub, subIndex) => {
      // Every vehicle that actually carried this sub-order's cargo, in
      // order — a cancelled vehicle is dropped entirely (it never counts
      // as one of the numbered slots); the last one is the current holder.
      const chain = chainsByOrder[orderIndex][subIndex];
      const last = chain.at(-1) ?? null;
      const comment = sub.comments?.[0]?.text ?? "";

      const vehicleData: Record<string, string> = {};
      chain.slice(0, vehicleColumnCount).forEach((truck, i) => {
        vehicleData[`vehicle${i + 1}`] = vehicleLabel(truck);
        vehicleData[`country${i + 1}`] = truck.country || "";
      });

      const row = subSheet.addRow({
        order: order.name,
        subOrder: sub.name || "Sub-order",
        status: subOrderStatusLabel(sub.status),
        fld: formatDate(sub.factoryLoadDate),
        ...vehicleData,
        driver: last?.driverPhone || "",
        weight: last?.cargoWeight ?? "",
        location: last?.currentLocation || "",
        updated: last?.locationUpdatedAt ? formatDateTime(last.locationUpdatedAt) : "",
        comment,
      });
      // Same order → same band color as this order's row in the Orders
      // sheet; the next order's sub-orders flip to the alternate color.
      row.fill = bandFill(orderIndex);
      row.border = ROW_BORDER;
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
