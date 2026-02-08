const Book = require("../models/Book");

// Create book
exports.createBook = async (req, res, next) => {
  try {
    const book = await Book.create({
      ...req.body,
      createdBy: req.user.id
    });
    res.status(201).json(book);
  } catch (error) {
    next(error);
  }
};

// Get all user books
exports.getBooks = async (req, res, next) => {
  try {
    const books = await Book.find({ createdBy: req.user.id })
      .sort({ createdAt: -1 });
    res.json(books);
  } catch (error) {
    next(error);
  }
};

// Get book by ID
exports.getBookById = async (req, res, next) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }
    res.json(book);
  } catch (error) {
    next(error);
  }
};

// Update book
exports.updateBook = async (req, res, next) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: "Book not found" });

    if (book.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const updated = await Book.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

// Delete book
exports.deleteBook = async (req, res, next) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: "Book not found" });

    if (book.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await Book.findByIdAndDelete(req.params.id);
    res.json({ message: "Book deleted" });
  } catch (error) {
    next(error);
  }
};
