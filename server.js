require("dotenv").config({ quiet: true });
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const { validateEnvironment } = require("./config/environment");

async function start() {
  const { port } = validateEnvironment(process.env);
  await connectDB();
  const server = require("./app").listen(port, () => {
    console.log("Book Review Platform listening on port", port);
  });
  const shutdown = () => server.close(async () => {
    await mongoose.disconnect();
    process.exit(0);
  });
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
  return server;
}

if (require.main === module) {
  start().catch(() => {
    console.error("Startup failed. Check MONGO_URI, JWT_SECRET and database availability.");
    process.exitCode = 1;
  });
}
module.exports = { start };
