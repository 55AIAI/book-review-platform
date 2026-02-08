const mongoose = require("mongoose");

const bookSchema = new mongoose.Schema({
  externalId: String,
  title: String,
  authors: [String],
  description: String,
  publishedDate: String,
  thumbnail: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }
}, { timestamps: true });

module.exports = mongoose.model("Book", bookSchema);
