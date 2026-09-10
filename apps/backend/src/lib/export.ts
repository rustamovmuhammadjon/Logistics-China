import ExcelJS from "exceljs";
import {
  currentTruckOf,
  formatDate,
  formatDateTime,
  formatDirection,
  subOrderStatusLabel,
  truckStats,
  type SubOrderStatus,
} from "@logistics/shared";

type ExportTruck = {
  plateNumber: string | null;
  trailerPlateNumber: string | null;
  driverPhone: string | null;
  cargoWeight: number | null;
  currentLocation: string | null;
  locationUpdatedAt: Date | null;
  canceledAt?: Date | null;
  transfersFrom?: unknown[] | null;
  createdAt: Date;
};

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
  });

  const subSheet = workbook.addWorksheet("Sub-orders");
  subSheet.columns = [
    { header: "Order", key: "order", width: 20 },
    { header: "Sub-order", key: "subOrder", width: 16 },
    { header: "Status", key: "status", width: 12 },
    { header: "FLD", key: "fld", width: 14 },
    { header: "Truck #", key: "truck", width: 14 },
    { header: "Trailer #", key: "trailer", width: 14 },
    { header: "Driver #", key: "driver", width: 16 },
    { header: "Gross weight (tons)", key: "weight", width: 16 },
    { header: "Current location", key: "location", width: 26 },
    { header: "Last update", key: "updated", width: 18 },
    { header: "Comment", key: "comment", width: 32 },
  ];
  subSheet.getRow(1).font = { bold: true };

  orders.forEach((order, orderIndex) => {
    for (const sub of order.subOrders) {
      // Same rule as the on-screen table: a cancelled sub-order shows no
      // truck, an open/closed one shows only the truck currently holding
      // the cargo (the end of any transfer chain).
      const current = sub.status === "CANCELED" ? null : currentTruckOf(sub.trucks);
      const comment = sub.comments?.[0]?.text ?? "";
      const row = subSheet.addRow({
        order: order.name,
        subOrder: sub.name || "Sub-order",
        status: subOrderStatusLabel(sub.status),
        fld: formatDate(sub.factoryLoadDate),
        truck: current?.plateNumber || "",
        trailer: current?.trailerPlateNumber || "",
        driver: current?.driverPhone || "",
        weight: current?.cargoWeight ?? "",
        location: current?.currentLocation || "",
        updated: current?.locationUpdatedAt ? formatDateTime(current.locationUpdatedAt) : "",
        comment,
      });
      // Same order → same band color as this order's row in the Orders
      // sheet; the next order's sub-orders flip to the alternate color.
      row.fill = bandFill(orderIndex);
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
