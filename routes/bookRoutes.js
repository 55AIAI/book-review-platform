const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const bookCtrl = require("../controllers/bookController");
const openLibraryCtrl = require("../controllers/openLibraryController");

// 🔍 SEARCH (AUTH REQUIRED)
router.get("/search", auth, openLibraryCtrl.searchBooks);

// 📚 CRUD
router.post("/", auth, bookCtrl.createBook);
router.get("/", auth, bookCtrl.getBooks);
router.get("/:id", auth, bookCtrl.getBookById);
router.put("/:id", auth, bookCtrl.updateBook);
router.delete("/:id", auth, bookCtrl.deleteBook);

module.exports = router;
