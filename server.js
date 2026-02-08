require("dotenv").config();
const app = require("./app");
const connectDB = require("./config/db");

connectDB();

const PORT = process.env.PORT || 5000;
const HOST = "http://localhost";

app.listen(PORT, () => {
  console.log(" Server running at:");
  console.log(` ${HOST}:${PORT}`);
});
