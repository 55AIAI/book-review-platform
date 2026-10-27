const mongoose = require("mongoose");

module.exports = async (uri = process.env.MONGO_URI) => {
  if (!uri) throw new Error("MONGO_URI is required");
  return mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
};
