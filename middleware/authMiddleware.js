const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const match = /^Bearer ([^\s]+)$/i.exec(req.headers.authorization || "");
  if (!match) return res.status(401).json({ message: "Authentication required" });
  try {
    const decoded = jwt.verify(match[1], process.env.JWT_SECRET, { algorithms: ["HS256"] });
    if (!decoded || typeof decoded !== "object" || typeof decoded.id !== "string" || !/^[a-fA-F0-9]{24}$/.test(decoded.id || "")) {
      return res.status(401).json({ message: "Invalid token" });
    }
    req.user = { id: decoded.id };
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};
