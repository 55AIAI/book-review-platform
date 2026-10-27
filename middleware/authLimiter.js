module.exports = (limit = 20, windowMs = 15 * 60 * 1000) => {
  const buckets = new Map();
  let cleanupAt = 0;
  return (req, res, next) => {
    const now = Date.now();
    if (now >= cleanupAt) {
      for (const [key, value] of buckets) if (value.reset <= now) buckets.delete(key);
      cleanupAt = now + 60000;
    }
    const key = req.ip || "unknown";
    let bucket = buckets.get(key);
    if (!bucket || bucket.reset <= now) {
      if (!bucket && buckets.size >= 10000) {
        return res.status(429).json({ message: "Too many authentication attempts" });
      }
      bucket = { count: 0, reset: now + windowMs };
      buckets.set(key, bucket);
    }
    bucket.count += 1;
    if (bucket.count > limit) {
      res.set("Retry-After", String(Math.max(1, Math.ceil((bucket.reset - now) / 1000))));
      return res.status(429).json({ message: "Too many authentication attempts" });
    }
    next();
  };
};
