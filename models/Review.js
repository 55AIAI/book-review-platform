const mongoose = require("mongoose");
const reviewSchema = new mongoose.Schema({
  rating: { type: Number, min: 1, max: 5, required: true, validate: Number.isInteger },
  text: { type: String, required: true, trim: true, maxlength: 5000 },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  book: { type: mongoose.Schema.Types.ObjectId, ref: "Book", required: true, index: true },
  date: { type: Date, default: Date.now }
});
module.exports = mongoose.model("Review", reviewSchema);
