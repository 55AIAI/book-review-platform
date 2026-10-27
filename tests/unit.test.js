const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const validate = require("../middleware/validation");
const auth = require("../middleware/authMiddleware");
const errorHandler = require("../middleware/errorHandler");
const { validateEnvironment } = require("../config/environment");
const search = require("../controllers/openLibraryController").searchBooks;

process.env.JWT_SECRET = randomBytes(32).toString("hex");

function response() {
  return { statusCode: 200, headersSent: false,
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; } };
}
function validated(name, body) {
  const req = { body }; const res = response(); let passed = false;
  validate(name)(req, res, () => { passed = true; });
  return { req, res, passed };
}

test("registration normalizes email and username", () => {
  const result = validated("register", { username: " Alice ", email: "ALICE@example.test",
                                        password: "synthetic-password" });
  assert.equal(result.passed, true);
  assert.equal(result.req.body.email, "alice@example.test");
  assert.equal(result.req.body.username, "Alice");
});

test("bcrypt byte limit is enforced for Unicode passwords", () => {
  const result = validated("register", { username: "Alice", email: "alice@example.test", password: "界".repeat(30) });
  assert.equal(result.res.statusCode, 400);
});

test("missing, operator and unexpected fields are rejected", () => {
  for (const body of [undefined, null, [], { email: { $ne: null }, password: "password" },
                      { email: "alice@example.test", password: "password", admin: true }]) {
    assert.equal(validated("login", body).res.statusCode, 400);
  }
});

test("Open Library book fields including null cover pass validation", () => {
  const result = validated("createBook", { externalId: "/works/OL1W", title: 'Book "A"',
    authors: ["Synthetic Author"], publishedDate: "2025", thumbnail: null });
  assert.equal(result.passed, true);
});

test("book ownership and Mongo update operators cannot be written", () => {
  for (const body of [{ title: "Book", createdBy: "a".repeat(24) }, { $set: { title: "Book" } }]) {
    assert.equal(validated("createBook", body).res.statusCode, 400);
    assert.equal(validated("updateBook", body).res.statusCode, 400);
  }
});

test("review scores must be integer values from one to five", () => {
  for (const rating of [0, 6, 2.5]) {
    assert.equal(validated("createReview", { book: "a".repeat(24), text: "Review", rating }).res.statusCode, 400);
  }
  assert.equal(validated("createReview", { book: "a".repeat(24), text: " Review ", rating: "4" }).req.body.rating, 4);
});

test("review edits cannot change user or book references", () => {
  for (const field of ["user", "book"]) {
    assert.equal(validated("updateReview", { text: "Changed", [field]: "a".repeat(24) }).res.statusCode, 400);
  }
});

test("ID middleware rejects malformed identifiers", () => {
  const res = response();
  validate.validId("id")({ params: { id: "invalid" } }, res, () => assert.fail("Invalid ID passed"));
  assert.equal(res.statusCode, 400);
});

test("authentication accepts only a signed HS256 token and valid ID", () => {
  const id = "a".repeat(24);
  const good = jwt.sign({ id }, process.env.JWT_SECRET, { algorithm: "HS256" });
  let passed = false;
  const req = { headers: { authorization: "Bearer " + good } };
  auth(req, response(), () => { passed = true; });
  assert.equal(passed, true);
  assert.deepEqual(req.user, { id });
  for (const token of [jwt.sign({ id }, process.env.JWT_SECRET, { algorithm: "HS384" }),
                       jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: -1 }),
                       jwt.sign({ id: [id] }, process.env.JWT_SECRET),
                       jwt.sign({ id: "invalid" }, process.env.JWT_SECRET)]) {
    const res = response();
    auth({ headers: { authorization: "Bearer " + token } }, res, () => assert.fail("Invalid token passed"));
    assert.equal(res.statusCode, 401);
  }
});

test("missing and malformed Bearer headers fail", () => {
  for (const authorization of [undefined, "Basic anything", "Bearer", "Bearer one two"]) {
    const res = response();
    auth({ headers: { authorization } }, res, () => assert.fail("Header passed"));
    assert.equal(res.statusCode, 401);
  }
});

test("environment validation rejects missing secrets, invalid ports and origin paths", () => {
  for (const env of [{}, { MONGO_URI: "mongodb://localhost/test", JWT_SECRET: "short" },
    { MONGO_URI: "mongodb://localhost/test", JWT_SECRET: "x".repeat(32), PORT: "bad" },
    { MONGO_URI: "mongodb://localhost/test", JWT_SECRET: "x".repeat(32), CLIENT_ORIGIN: "https://example.test/path" }]) {
    assert.throws(() => validateEnvironment(env));
  }
  assert.equal(validateEnvironment({ MONGO_URI: "mongodb://localhost/test", JWT_SECRET: "x".repeat(32) }).port, 5000);
});

test("error responses do not disclose internal or database details", (t) => {
  t.mock.method(console, "error", () => {});
  const res = response();
  errorHandler(new Error("private database connection string"), {}, res, () => {});
  assert.deepEqual(res.body, { message: "Internal server error" });
  assert.equal(res.statusCode, 500);
});

test("JSON parsing, duplicate keys and body limits use meaningful status codes", () => {
  for (const [error, code] of [[{ type: "entity.parse.failed" }, 400],
    [{ type: "entity.too.large" }, 413], [{ code: 11000 }, 409], [{ name: "CastError" }, 400]]) {
    const res = response(); errorHandler(error, {}, res, () => {});
    assert.equal(res.statusCode, code);
  }
});

test("search rejects array, absent and oversized queries before network calls", async (t) => {
  t.mock.method(axios, "get", () => assert.fail("Network should not be called"));
  for (const q of [undefined, [], " ", "x".repeat(201)]) {
    const res = response(); await search({ query: { q } }, res);
    assert.equal(res.statusCode, 400);
  }
});

test("search maps Open Library results into a saveable book", async (t) => {
  t.mock.method(axios, "get", async (url, options) => {
    assert.equal(url, "https://openlibrary.org/search.json");
    assert.equal(options.timeout, 5000);
    return { data: { docs: [{ key: "/works/OL1W", title: "Synthetic Book", author_name: ["Author"],
                              first_publish_year: 2025, cover_i: 123 }] } };
  });
  const res = response(); await search({ query: { q: "book" } }, res);
  assert.equal(res.body[0].publishedDate, "2025");
  assert.equal(validated("createBook", res.body[0]).passed, true);
});

test("upstream search failure returns 502 rather than a misleading empty success", async (t) => {
  t.mock.method(axios, "get", async () => { throw new Error("Timeout"); });
  const res = response(); await search({ query: { q: "book" } }, res);
  assert.equal(res.statusCode, 502);
});

test("authentication limiter expires buckets and returns Retry-After", (t) => {
  let now = 1000;
  t.mock.method(Date, "now", () => now);
  const limiter = require("../middleware/authLimiter")(2, 1000);
  let passed = 0;
  const req = { ip: "synthetic-test-ip" };
  limiter(req, response(), () => passed++);
  limiter(req, response(), () => passed++);
  const blocked = response();
  blocked.set = (name, value) => { blocked.header = [name, value]; };
  limiter(req, blocked, () => passed++);
  assert.equal(passed, 2);
  assert.equal(blocked.statusCode, 429);
  assert.equal(blocked.header[0], "Retry-After");
  now = 2001;
  limiter(req, response(), () => passed++);
  assert.equal(passed, 3);
});
