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
  trucks: ExportTruck[];
  comments?: { text: string }[];
};

type ExportOrder = {
  name: string;
  origin: string | null;
  destination: string | null;
  openedAt: Date | null;
  subOrders: ExportSubOrder[];
  owner?: { email: string } | null;
  operators?: { email: string }[];
};

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

  for (const order of orders) {
    const stats = truckStats(order.subOrders.flatMap((s) => s.trucks));
    ordersSheet.addRow({
      name: order.name,
      direction: formatDirection(order.origin, order.destination) || "",
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
  }

  const subSheet = workbook.addWorksheet("Sub-orders");
  subSheet.columns = [
    { header: "Order", key: "order", width: 20 },
    { header: "Sub-order", key: "subOrder", width: 16 },
    { header: "Status", key: "status", width: 12 },
    { header: "Truck #", key: "truck", width: 14 },
    { header: "Trailer #", key: "trailer", width: 14 },
    { header: "Driver #", key: "driver", width: 16 },
    { header: "Gross weight (kg)", key: "weight", width: 16 },
    { header: "Current location", key: "location", width: 26 },
    { header: "Last update", key: "updated", width: 18 },
    { header: "Comment", key: "comment", width: 32 },
  ];
  subSheet.getRow(1).font = { bold: true };

  for (const order of orders) {
    for (const sub of order.subOrders) {
      // Same rule as the on-screen table: a cancelled sub-order shows no
      // truck, an open/closed one shows only the truck currently holding
      // the cargo (the end of any transfer chain).
      const current = sub.status === "CANCELED" ? null : currentTruckOf(sub.trucks);
      const comment = sub.comments?.[0]?.text ?? "";
      subSheet.addRow({
        order: order.name,
        subOrder: sub.name || "Sub-order",
        status: subOrderStatusLabel(sub.status),
        truck: current?.plateNumber || "",
        trailer: current?.trailerPlateNumber || "",
        driver: current?.driverPhone || "",
        weight: current?.cargoWeight ?? "",
        location: current?.currentLocation || "",
        updated: current?.locationUpdatedAt ? formatDateTime(current.locationUpdatedAt) : "",
        comment,
      });
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
