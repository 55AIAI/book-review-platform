const Book = require("../models/Book");
const Review = require("../models/Review");

exports.createBook = async (req, res) => {
  const book = await Book.create({ ...req.body, createdBy: req.user.id });
  res.status(201).json(book);
};

exports.getBooks = async (req, res) => {
  res.json(await Book.find({ createdBy: req.user.id }).sort({ createdAt: -1 }));
};

exports.getBookById = async (req, res) => {
  const book = await Book.findOne({ _id: req.params.id, createdBy: req.user.id });
  if (!book) return res.status(404).json({ message: "Book not found" });
  res.json(book);
};

exports.updateBook = async (req, res) => {
  const book = await Book.findOneAndUpdate(
    { _id: req.params.id, createdBy: req.user.id }, { $set: req.body },
    { new: true, runValidators: true }
  );
  if (!book) return res.status(404).json({ message: "Book not found" });
  res.json(book);
};

exports.deleteBook = async (req, res) => {
  const book = await Book.findOneAndDelete({ _id: req.params.id, createdBy: req.user.id });
  if (!book) return res.status(404).json({ message: "Book not found" });
  await Review.deleteMany({ book: book._id });
  res.json({ message: "Book and related reviews deleted" });
};
