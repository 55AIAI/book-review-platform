const { randomBytes, randomUUID } = require("node:crypto");
const mongoose = require("mongoose");
process.env.JWT_SECRET = randomBytes(32).toString("hex");
const uri = process.env.TEST_MONGO_URI;
const dbName = "book_review_test_ui_" + randomUUID().replaceAll("-", "");
let server;
async function close() {
  if (server) await new Promise((resolve) => server.close(resolve));
  if (mongoose.connection.readyState === 1 && mongoose.connection.name === dbName) {
    await mongoose.connection.dropDatabase();
  }
  await mongoose.disconnect();
  process.exit(0);
}
async function start() {
  if (!uri || !["127.0.0.1", "localhost"].includes(new URL(uri).hostname)) {
    throw new Error("UI tests require a local temporary MongoDB server");
  }
  await mongoose.connect(uri, { dbName, serverSelectionTimeoutMS: 5000 });
  const app = require("../app");
  await Promise.all([require("../models/User").init(), require("../models/Book").init(),
                     require("../models/Review").init()]);
  server = app.listen(0, "127.0.0.1", () => {
    console.log(JSON.stringify({ url: "http://127.0.0.1:" + server.address().port }));
  });
  process.once("SIGTERM", close);
  process.once("SIGINT", close);
}
start().catch(() => { console.error("UI test server failed to start"); process.exit(1); });
