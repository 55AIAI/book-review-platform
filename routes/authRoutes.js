const router = require("express").Router();
const validate = require("../middleware/validation");
const { register, login } = require("../controllers/authController");

router.post("/register", validate("register"), register);
router.post("/login", validate("login"), login);

module.exports = router;

