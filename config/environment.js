exports.validateEnvironment = (env) => {
  if (!env.MONGO_URI) throw new Error("MONGO_URI is required");
  if (!env.JWT_SECRET || Buffer.byteLength(env.JWT_SECRET, "utf8") < 32) {
    throw new Error("JWT_SECRET must contain at least 32 bytes");
  }
  const port = Number(env.PORT || 5000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("PORT must be 1 to 65535");
  if (env.CLIENT_ORIGIN) {
    const origin = new URL(env.CLIENT_ORIGIN);
    if (!["http:", "https:"].includes(origin.protocol) || origin.origin !== env.CLIENT_ORIGIN) {
      throw new Error("CLIENT_ORIGIN must be a single HTTP(S) origin");
    }
  }
  return { port };
};
