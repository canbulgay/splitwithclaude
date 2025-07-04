import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import prisma from "./lib/db";
import { performanceMonitor } from "./lib/performance";
import { setupSwagger } from "./lib/swagger";
import { setupDevTools } from "./lib/dev-tools";
import authRoutes from "./routes/auth";
import groupRoutes from "./routes/groups";
import expenseRoutes from "./routes/expenses";
import balanceRoutes from "./routes/balances";
import settlementRoutes from "./routes/settlements";

// Load environment variables
dotenv.config();

const app: express.Application = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});
app.use("/api", limiter);

// Logging
app.use(morgan("combined"));

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Performance monitoring middleware
app.use(performanceMonitor.expressMiddleware());

// Setup API documentation (Swagger)
setupSwagger(app as any);

// Setup development tools (development only)
setupDevTools(app as any);

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
      database: "connected",
    });
  } catch (error) {
    res.status(503).json({
      status: "error",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
      database: "disconnected",
      error:
        process.env.NODE_ENV === "development"
          ? error
          : "Database connection failed",
    });
  }
});

// Performance metrics endpoint (development only)
if (process.env.NODE_ENV !== "production") {
  app.get("/metrics", (req, res) => {
    res.json(performanceMonitor.getStats());
  });
}

// Authentication routes
app.use("/api/v1/auth", authRoutes);

// Group routes
app.use("/api/v1/groups", groupRoutes);

// Expense routes
app.use("/api/v1/expenses", expenseRoutes);

// Balance routes
app.use("/api/v1/balances", balanceRoutes);

// Settlement routes
app.use("/api/v1/settlements", settlementRoutes);

// API routes will be added here
app.use("/api/v1", (req, res) => {
  res.status(200).json({
    message: "Split With Claude API v1",
    version: "1.0.0",
    endpoints: {
      health: "/health",
      auth: "/api/v1/auth",
      api: "/api/v1",
    },
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Not Found",
    message: `Route ${req.originalUrl} not found`,
  });
});

// Global error handler
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error(err.stack);

    res.status(err.status || 500).json({
      error:
        process.env.NODE_ENV === "production"
          ? "Internal Server Error"
          : err.message,
      ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
    });
  }
);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

export default app;
