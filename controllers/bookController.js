const Book = require("../models/Book");

// Only these fields may be supplied by a client. Ownership is server-controlled.
const editableFields = ["externalId", "title", "authors", "description", "publishedDate", "thumbnail"];
function bookFields(body = {}) {
  return Object.fromEntries(editableFields.filter((key) => Object.prototype.hasOwnProperty.call(body, key)).map((key) => [key, body[key]]));
}

exports.createBook = async (req, res, next) => {
  try {
    const book = await Book.create({ ...bookFields(req.body), createdBy: req.user.id });
    res.status(201).json(book);
  } catch (error) { next(error); }
};
exports.getBooks = async (req, res, next) => {
  try {
    const books = await Book.find({ createdBy: req.user.id }).sort({ createdAt: -1 });
    res.json(books);
  } catch (error) { next(error); }
};
exports.getBookById = async (req, res, next) => {
  try {
    const book = await Book.findOne({ _id: req.params.id, createdBy: req.user.id });
    if (!book) return res.status(404).json({ message: "Book not found" });
    res.json(book);
  } catch (error) { next(error); }
};
exports.updateBook = async (req, res, next) => {
  try {
    const book = await Book.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user.id },
      { $set: bookFields(req.body) },
      { new: true, runValidators: true }
    );
    if (!book) return res.status(404).json({ message: "Book not found" });
    res.json(book);
  } catch (error) { next(error); }
};
exports.deleteBook = async (req, res, next) => {
  try {
    const book = await Book.findOneAndDelete({ _id: req.params.id, createdBy: req.user.id });
    if (!book) return res.status(404).json({ message: "Book not found" });
    res.json({ message: "Book deleted" });
  } catch (error) { next(error); }
};
