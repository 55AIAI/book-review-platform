const axios = require("axios");

exports.searchBooks = async (req, res) => {
  const q = req.query.q;
  if (typeof q !== "string" || !q.trim() || q.trim().length > 200) {
    return res.status(400).json({ message: "Search query must contain 1 to 200 characters" });
  }
  try {
    const response = await axios.get("https://openlibrary.org/search.json", {
      params: { q: q.trim(), limit: 12, fields: "key,title,author_name,first_publish_year,cover_i" },
      timeout: 5000, maxContentLength: 1024 * 1024,
      headers: { "User-Agent": "BookReviewPortfolio/1.0 (https://github.com/55AIAI/book-review-platform)" }
    });
    if (!Array.isArray(response.data?.docs)) throw new Error("Invalid upstream response");
    res.json(response.data.docs.slice(0, 12).map((doc) => ({
      externalId: String(doc.key || ""), title: String(doc.title || "Untitled"),
      authors: Array.isArray(doc.author_name) ? doc.author_name.map(String).slice(0, 30) : ["Unknown author"],
      publishedDate: doc.first_publish_year ? String(doc.first_publish_year) : "",
      thumbnail: Number.isSafeInteger(doc.cover_i) && doc.cover_i > 0
        ? "https://covers.openlibrary.org/b/id/" + doc.cover_i + "-M.jpg" : null
    })));
  } catch {
    res.status(502).json({ message: "Book search is temporarily unavailable. Please try again." });
  }
};
