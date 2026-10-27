module.exports = (err, req, res, next) => {
  if (res.headersSent) return next(err);
  if (err.type === "entity.parse.failed") return res.status(400).json({ message: "Invalid JSON body" });
  if (err.type === "entity.too.large") return res.status(413).json({ message: "Request body too large" });
  if (err.name === "ValidationError") return res.status(400).json({ message: "Validation error" });
  if (err.code === 11000) return res.status(409).json({ message: "Record already exists" });
  if (err.name === "CastError") return res.status(400).json({ message: "Invalid ID format" });
  console.error("Request failed:", err.name || "Error");
  res.status(500).json({ message: "Internal server error" });
};
