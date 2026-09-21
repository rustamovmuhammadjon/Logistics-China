import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { authRouter } from "./routes/auth.js";
import { profileRouter } from "./routes/profile.js";
import { linksRouter } from "./routes/links.js";
import { uploadsRouter } from "./routes/uploads.js";
import { monitoringRouter } from "./routes/monitoring.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { consigneeRouter } from "./routes/consignee.js";
import { operatorRouter } from "./routes/operator.js";
import { companyRouter } from "./routes/company.js";
import { operatorCompanyRouter } from "./routes/operatorCompany.js";
import { adminRouter } from "./routes/admin.js";
import { driverRouter } from "./routes/driver.js";
import { attachSession } from "./middleware/auth.js";
import { asyncHandler, errorHandler } from "./middleware/errors.js";

const app = express();
const port = Number(process.env.PORT || 4000);
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || origin === frontendUrl) {
        callback(null, true);
        return;
      }
      callback(null, true);
    },
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: "2mb" }));
app.use(asyncHandler(attachSession));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "logistics-backend" });
});

app.use("/api/auth", authRouter);
app.use("/api/profile", profileRouter);
app.use("/api/links", linksRouter);
app.use("/api/uploads", uploadsRouter);
app.use("/api/monitoring", monitoringRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/consignee", consigneeRouter);
app.use("/api/operator", operatorRouter);
app.use("/api/company", companyRouter);
app.use("/api/operator-company", operatorCompanyRouter);
app.use("/api/admin", adminRouter);
app.use("/api/driver", driverRouter);

app.use(errorHandler);

process.on("unhandledRejection", (reason) => {
  console.error("unhandledRejection", reason);
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Backend listening on http://0.0.0.0:${port}`);
});
