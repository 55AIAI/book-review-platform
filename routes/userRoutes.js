const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const validate = require("../middleware/validation");
const { getProfile, updateProfile } = require("../controllers/userController");

// All user routes require authentication
router.use(auth);

// GET /api/users/profile - Get logged-in user profile
router.get("/profile", getProfile);

// PUT /api/users/profile - Update user profile
router.put("/profile", validate("updateProfile"), updateProfile);

module.exports = router;
