const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const validate = require("../middleware/validation");
const { validId } = validate;
const ctrl = require("../controllers/reviewController");

router.use(auth);
router.post("/", validate("createReview"), ctrl.addReview);
router.get("/", ctrl.getAllReviews);
router.get("/book/:bookId", validId("bookId"), ctrl.getReviewsByBook);
router.get("/:id", validId("id"), ctrl.getReviewById);
router.put("/:id", validId("id"), validate("updateReview"), ctrl.updateReview);
router.delete("/:id", validId("id"), ctrl.deleteReview);
module.exports = router;
