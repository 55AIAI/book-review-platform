const express = require("express");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");
const app = express();

app.disable("x-powered-by");
app.use((req, res, next) => {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "X-Frame-Options": "DENY",
    "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' https:; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'"
  });
  next();
});
if (process.env.CLIENT_ORIGIN) app.use(cors({ origin: process.env.CLIENT_ORIGIN }));
app.use("/api", (req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
app.use(express.json({ limit: "64kb" }));
app.get("/favicon.ico", (req, res) => res.status(204).end());
app.get("/healthz", (req, res) => {
  const ready = mongoose.connection.readyState === 1;
  res.status(ready ? 200 : 503).json({ status: ready ? "ok" : "not_ready" });
});
app.use("/api/auth", require("./middleware/authLimiter")());
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/books", require("./routes/bookRoutes"));
app.use("/api/reviews", require("./routes/reviewRoutes"));
app.use("/api", (req, res) => res.status(404).json({ message: "API route not found" }));
app.use(express.static(path.join(__dirname, "public")));
app.use(require("./middleware/errorHandler"));
module.exports = app;
