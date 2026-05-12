require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

const configuredOrigins = Array.from(new Set([
  "http://localhost:5173",
  "http://localhost:5174",
  ...(process.env.CLIENT_URLS || "").split(","),
  process.env.CLIENT_URL || "",
].map((origin) => origin.trim().replace(/\/$/, "")).filter(Boolean)));

app.use(cors({
  origin(origin, callback) {
    if (!origin || configuredOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

const UPLOAD_DIR = path.join(__dirname, "uploads");
app.use("/uploads", express.static(UPLOAD_DIR));

// ── Routes
app.use("/api/auth",       require("./routes/auth"));
app.use("/api/projects",   require("./routes/projects"));
app.use("/api/promotions", require("./routes/promotions"));
app.use("/api/versions",   require("./routes/versions"));
app.use("/api/super-admin", require("./routes/superAdmin"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/client", require("./routes/client"));

const commentsRouter = require("./routes/comments");
const { clientsRouter, typesRouter } = require("./routes/misc");
app.use("/api/comments", commentsRouter);
app.use("/api/clients",  clientsRouter);
app.use("/api/types",    typesRouter);

// ── Health check
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// ── 404
app.use((_req, res) => res.status(404).json({ error: "Route not found" }));

// ── Error handler
app.use((err, _req, res, _next) => {
  console.error(err.message);
  res.status(500).json({ error: err.message || "Internal server error" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Review Desk API → http://localhost:${PORT}`));
