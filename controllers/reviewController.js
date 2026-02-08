const Review = require("../models/Review");

// Add a new review
exports.addReview = async (req, res, next) => {
  try {
    const review = await Review.create({
      ...req.body,
      user: req.user.id
    });

    const populatedReview = await Review.findById(review._id)
      .populate("user", "username")
      .populate("book", "title authors");

    res.status(201).json(populatedReview);
  } catch (error) {
    next(error);
  }
};

// Get all reviews for logged-in user
exports.getAllReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({ user: req.user.id })
      .populate("book", "title authors")
      .sort({ date: -1 });

    res.json(reviews);
  } catch (error) {
    next(error);
  }
};

// Get reviews for a specific book
exports.getReviewsByBook = async (req, res, next) => {
  try {
    const reviews = await Review.find({ book: req.params.bookId })
      .populate("user", "username")
      .sort({ date: -1 });

    res.json(reviews);
  } catch (error) {
    next(error);
  }
};

// Get a specific review by ID
exports.getReviewById = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id)
      .populate("user", "username")
      .populate("book", "title authors");

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    res.json(review);
  } catch (error) {
    next(error);
  }
};

// Update a review
exports.updateReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    // Check ownership
    if (review.user.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to update this review" });
    }

    const updatedReview = await Review.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate("user", "username").populate("book", "title authors");

    res.json(updatedReview);
  } catch (error) {
    next(error);
  }
};

// Delete a review
exports.deleteReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    // Check ownership
    if (review.user.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to delete this review" });
    }

    await Review.findByIdAndDelete(req.params.id);

    res.json({ message: "Review deleted successfully" });
  } catch (error) {
    next(error);
  }
};

