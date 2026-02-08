const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
  rating: { type: Number, min: 1, max: 5 },
  text: String,
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  book: { type: mongoose.Schema.Types.ObjectId, ref: "Book" },
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Review", reviewSchema);
