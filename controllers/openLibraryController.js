const axios = require("axios");

exports.searchBooks = async (req, res) => {
  try {
    const q = req.query.q?.trim();
    if (!q) return res.json([]);

    console.log(" Open Library search:", q);

    const response = await axios.get("https://openlibrary.org/search.json", {
      params: {
        q,
        limit: 12
      }
    });

    const books = (response.data.docs || []).map(doc => ({
      externalId: doc.key,
      title: doc.title || "No title",
      authors: doc.author_name || ["Unknown author"],
      publishedDate: doc.first_publish_year || "",
      thumbnail: doc.cover_i
        ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
        : null
    }));

    res.json(books);
  } catch (error) {
    console.error(" Open Library error:", error.message);
    res.json([]);
  }
};
