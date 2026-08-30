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
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      const allowed = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        process.env.FRONTEND_URL,
      ].filter(Boolean);
      if (
        allowed.includes(origin) ||
        origin.startsWith("http://localhost:") ||
        origin.startsWith("http://127.0.0.1:")
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "apikey", "X-Client-Info"],
  })
);
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
import notificationRouter from "./infrastructure/http/controllers/notificationController";

app.use("/api/v1/organizations", organizationRouter);
app.use("/api/v1/meetings",      meetingRouter);
app.use("/api/v1/motions",       motionRouter);
app.use("/api/v1/votes",         voteRouter);
app.use("/api/v1/members",       memberRouter);
app.use("/api/v1/webhooks",      webhookRouter);
app.use("/api/v1/superadmin",    superadminRouter);
app.use("/api/v1/notifications", notificationRouter);

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
