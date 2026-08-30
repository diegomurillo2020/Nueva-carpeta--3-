import "express-async-errors";
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { errorHandler } from "./shared/middleware/errorHandler";

const app = express();
const PORT = process.env.PORT ?? 4000;

// ---------------------------------------------------------------------------
// Global Middleware
// ---------------------------------------------------------------------------
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL ?? "http://localhost:3000", credentials: true }));
app.use(morgan("dev"));
app.use(express.json());

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "convo-assemble-backend", ts: new Date().toISOString() });
});

// ---------------------------------------------------------------------------
// API Routes
// ---------------------------------------------------------------------------
import organizationRouter from "./infrastructure/http/controllers/organizationController";
import meetingRouter      from "./infrastructure/http/controllers/meetingController";
import motionRouter       from "./infrastructure/http/controllers/motionController";
import voteRouter         from "./infrastructure/http/controllers/voteController";
import memberRouter       from "./infrastructure/http/controllers/memberController";
import webhookRouter      from "./infrastructure/http/controllers/webhookController";
import superadminRouter   from "./infrastructure/http/controllers/superadminController";

app.use("/api/v1/organizations", organizationRouter);
app.use("/api/v1/meetings",      meetingRouter);
app.use("/api/v1/motions",       motionRouter);
app.use("/api/v1/votes",         voteRouter);
app.use("/api/v1/members",       memberRouter);
app.use("/api/v1/webhooks",      webhookRouter);
app.use("/api/v1/superadmin",    superadminRouter);

// ---------------------------------------------------------------------------
// Error handler (must be last)
// ---------------------------------------------------------------------------
app.use(errorHandler);

let server: any;
if (process.env.NODE_ENV !== "test" && !process.env.JEST_WORKER_ID) {
  server = app.listen(PORT, () => {
    console.log(`[ConvoAssemble] Backend running on http://localhost:${PORT}`);
  });
}

export { app, server };
export default app;
