const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const validate = require("../middleware/validation");
const { validId } = validate;
const ctrl = require("../controllers/bookController");

router.use(auth);
router.get("/search", require("../controllers/openLibraryController").searchBooks);
router.post("/", validate("createBook"), ctrl.createBook);
router.get("/", ctrl.getBooks);
router.get("/:id", validId("id"), ctrl.getBookById);
router.put("/:id", validId("id"), validate("updateBook"), ctrl.updateBook);
router.delete("/:id", validId("id"), ctrl.deleteBook);
module.exports = router;
