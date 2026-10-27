const Review = require("../models/Review");
const Book = require("../models/Book");

const populated = (query, userId) => query.populate("user", "username").populate({
  path: "book", select: "title authors", match: { createdBy: userId }
});

exports.addReview = async (req, res) => {
  const filter = { _id: req.body.book, createdBy: req.user.id };
  if (!(await Book.exists(filter))) return res.status(404).json({ message: "Book not found" });
  const review = await Review.create({ rating: req.body.rating, text: req.body.text,
                                       book: req.body.book, user: req.user.id });
  // Compensate if a concurrent delete removed the book after the first ownership check.
  if (!(await Book.exists(filter))) {
    await Review.deleteOne({ _id: review._id });
    return res.status(404).json({ message: "Book not found" });
  }
  const result = await populated(Review.findOne({ _id: review._id, user: req.user.id }), req.user.id);
  if (!result || !result.book) return res.status(404).json({ message: "Book not found" });
  res.status(201).json(result);
};

exports.getAllReviews = async (req, res) => {
  const reviews = await populated(Review.find({ user: req.user.id }).sort({ date: -1 }), req.user.id);
  res.json(reviews.filter((review) => review.book));
};

exports.getReviewsByBook = async (req, res) => {
  if (!(await Book.exists({ _id: req.params.bookId, createdBy: req.user.id }))) {
    return res.status(404).json({ message: "Book not found" });
  }
  res.json(await populated(Review.find({ book: req.params.bookId, user: req.user.id }).sort({ date: -1 }), req.user.id));
};

exports.getReviewById = async (req, res) => {
  const review = await populated(Review.findOne({ _id: req.params.id, user: req.user.id }), req.user.id);
  if (!review || !review.book) return res.status(404).json({ message: "Review not found" });
  res.json(review);
};

exports.updateReview = async (req, res) => {
  const review = await populated(Review.findOneAndUpdate(
    { _id: req.params.id, user: req.user.id }, { $set: req.body },
    { new: true, runValidators: true }
  ), req.user.id);
  if (!review) return res.status(404).json({ message: "Review not found" });
  res.json(review);
};

exports.deleteReview = async (req, res) => {
  const review = await Review.findOneAndDelete({ _id: req.params.id, user: req.user.id });
  if (!review) return res.status(404).json({ message: "Review not found" });
  res.json({ message: "Review deleted" });
};
