const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const validate = require("../middleware/validation");
const bookCtrl = require("../controllers/bookController");
const openLibraryCtrl = require("../controllers/openLibraryController");

router.get("/search", auth, openLibraryCtrl.searchBooks);
router.post("/", auth, validate("createBook"), bookCtrl.createBook);
router.get("/", auth, bookCtrl.getBooks);
router.get("/:id", auth, bookCtrl.getBookById);
router.put("/:id", auth, validate("updateBook"), bookCtrl.updateBook);
router.delete("/:id", auth, bookCtrl.deleteBook);

module.exports = router;
