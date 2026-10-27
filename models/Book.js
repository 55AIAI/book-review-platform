const mongoose = require("mongoose");
const bookSchema = new mongoose.Schema({
  externalId: { type: String, maxlength: 200 },
  title: { type: String, required: true, trim: true, maxlength: 500 },
  authors: [{ type: String, maxlength: 200 }],
  description: { type: String, maxlength: 10000 },
  publishedDate: { type: String, maxlength: 50 },
  thumbnail: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true }
}, { timestamps: true });
module.exports = mongoose.model("Book", bookSchema);
