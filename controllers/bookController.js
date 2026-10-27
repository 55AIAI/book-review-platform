const Book = require("../models/Book");

// Only client-editable properties are forwarded to Mongoose.
// Ownership is assigned from the verified JWT, never from req.body.
const BOOK_FIELDS = ["externalId", "title", "authors", "description", "publishedDate", "thumbnail"];
const UPDATE_FIELDS = BOOK_FIELDS.filter((field) => field !== "externalId");

const pickFields = (body, fields) =>
  Object.fromEntries(fields.filter((field) => Object.hasOwn(body, field)).map((field) => [field, body[field]]));

exports.createBook = async (req, res, next) => {
  try {
    const book = await Book.create({
      ...pickFields(req.body, BOOK_FIELDS),
      createdBy: req.user.id
    });
    res.status(201).json(book);
  } catch (error) {
    next(error);
  }
};

exports.getBooks = async (req, res, next) => {
  try {
    const books = await Book.find({ createdBy: req.user.id }).sort({ createdAt: -1 });
    res.json(books);
  } catch (error) {
    next(error);
  }
};

exports.getBookById = async (req, res, next) => {
  try {
    const book = await Book.findOne({ _id: req.params.id, createdBy: req.user.id });
    if (!book) return res.status(404).json({ message: "Book not found" });
    res.json(book);
  } catch (error) {
    next(error);
  }
};

exports.updateBook = async (req, res, next) => {
  try {
    const book = await Book.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user.id },
      { $set: pickFields(req.body, UPDATE_FIELDS) },
      { new: true, runValidators: true }
    );
    if (!book) return res.status(404).json({ message: "Book not found" });
    res.json(book);
  } catch (error) {
    next(error);
  }
};

exports.deleteBook = async (req, res, next) => {
  try {
    const book = await Book.findOneAndDelete({ _id: req.params.id, createdBy: req.user.id });
    if (!book) return res.status(404).json({ message: "Book not found" });
    res.json({ message: "Book deleted" });
  } catch (error) {
    next(error);
  }
};
