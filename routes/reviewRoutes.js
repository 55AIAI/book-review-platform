const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const validate = require("../middleware/validation");
const ctrl = require("../controllers/reviewController");

// All routes require authentication
router.use(auth);

// Review CRUD operations
router.post("/", validate("createReview"), ctrl.addReview);
router.get("/", ctrl.getAllReviews);
router.get("/book/:bookId", ctrl.getReviewsByBook);
router.get("/:id", ctrl.getReviewById);
router.put("/:id", validate("updateReview"), ctrl.updateReview);
router.delete("/:id", ctrl.deleteReview);

module.exports = router;

