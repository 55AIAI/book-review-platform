const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { randomBytes, randomUUID } = require("node:crypto");
const mongoose = require("mongoose");
process.env.JWT_SECRET = randomBytes(32).toString("hex");
const app = require("../app");
const User = require("../models/User");
const Book = require("../models/Book");
const Review = require("../models/Review");

const dbName = "book_review_test_" + randomUUID().replaceAll("-", "");
let server, base, alice, bob;
async function request(path, method = "GET", body, token) {
  const headers = { ...(body === undefined ? {} : { "Content-Type": "application/json" }),
                    ...(token ? { Authorization: "Bearer " + token } : {}) };
  const response = await fetch(base + path, { method, headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  return { status: response.status, body: await response.json() };
}
async function account(username, email) {
  assert.equal((await request("/api/auth/register", "POST", { username, email,
    password: "synthetic-password" })).status, 201);
  const result = await request("/api/auth/login", "POST", { email, password: "synthetic-password" });
  assert.equal(result.status, 200);
  return result.body;
}
async function book(owner = alice) {
  const result = await request("/api/books", "POST", { externalId: "/works/SYNTHETIC",
    title: "Synthetic Book", authors: ["Fictional Author"], publishedDate: "2025", thumbnail: null }, owner.token);
  assert.equal(result.status, 201);
  return result.body;
}
async function review(saved, owner = alice) {
  const result = await request("/api/reviews", "POST", { book: saved._id, rating: 4,
    text: "Synthetic review" }, owner.token);
  assert.equal(result.status, 201);
  return result.body;
}

before(async () => {
  const uri = process.env.TEST_MONGO_URI;
  if (!uri || !["127.0.0.1", "localhost"].includes(new URL(uri).hostname)) {
    throw new Error("Set TEST_MONGO_URI to a local temporary MongoDB server");
  }
  await mongoose.connect(uri, { dbName, serverSelectionTimeoutMS: 5000 });
  await Promise.all([User.init(), Book.init(), Review.init()]);
  await new Promise((resolve, reject) => {
    server = app.listen(0, "127.0.0.1", resolve).on("error", reject);
  });
  base = "http://127.0.0.1:" + server.address().port;
  alice = await account("SyntheticAlice", "alice@example.test");
  bob = await account("SyntheticBob", "bob@example.test");
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  if (mongoose.connection.readyState === 1) {
    assert.equal(mongoose.connection.name, dbName);
    assert.ok(dbName.startsWith("book_review_test_"));
    await mongoose.connection.dropDatabase();
  }
  await mongoose.disconnect();
});

test("registration is normalized, unique and never returns a password", async () => {
  const payload = { username: "SyntheticCarol", email: "CAROL@example.test", password: "synthetic-password" };
  const created = await request("/api/auth/register", "POST", payload);
  assert.equal(created.status, 201);
  assert.equal(created.body.email, "carol@example.test");
  assert.equal("password" in created.body, false);
  assert.equal((await request("/api/auth/register", "POST", { ...payload, email: "carol@example.test" })).status, 409);
});

test("invalid login identities and passwords have the same response", async () => {
  const first = await request("/api/auth/login", "POST", { email: "missing@example.test", password: "wrong" });
  const second = await request("/api/auth/login", "POST", { email: "alice@example.test", password: "wrong" });
  assert.equal(first.status, 401);
  assert.deepEqual(first, second);
});

test("private routes require a valid token and database readiness is reported", async () => {
  assert.equal((await request("/api/books")).status, 401);
  assert.equal((await request("/healthz")).status, 200);
  assert.equal((await request("/api/unknown")).status, 404);
});

test("another user cannot read, edit or delete a private book", async () => {
  const saved = await book();
  for (const [method, body] of [["GET", undefined], ["PUT", { title: "Stolen" }], ["DELETE", undefined]]) {
    assert.equal((await request("/api/books/" + saved._id, method, body, bob.token)).status, 404);
  }
  const owned = await request("/api/books/" + saved._id, "GET", undefined, alice.token);
  assert.equal(owned.body.title, "Synthetic Book");
});

test("books validate changes and reject forged owners", async () => {
  assert.equal((await request("/api/books", "POST", {
    title: "Forbidden", createdBy: bob.user.id }, alice.token)).status, 400);
  const saved = await book();
  const changed = await request("/api/books/" + saved._id, "PUT", { title: "Updated Book" }, alice.token);
  assert.equal(changed.body.title, "Updated Book");
  assert.equal((await request("/api/books/" + saved._id, "PUT",
    { createdBy: bob.user.id }, alice.token)).status, 400);
});

test("review creation is limited to the user's own saved books", async () => {
  const saved = await book();
  for (const id of [saved._id, new mongoose.Types.ObjectId().toString()]) {
    assert.equal((await request("/api/reviews", "POST",
      { book: id, rating: 4, text: "Forbidden" }, bob.token)).status, 404);
  }
});

test("reviews support private read and edit flows", async () => {
  const saved = await book();
  const created = await review(saved);
  assert.equal(created.book.title, "Synthetic Book");
  assert.equal((await request("/api/reviews/" + created._id, "GET", undefined, bob.token)).status, 404);
  assert.equal((await request("/api/reviews/book/" + saved._id, "GET", undefined, bob.token)).status, 404);
  assert.equal((await request("/api/reviews/" + created._id, "PUT", { text: "Forbidden" }, bob.token)).status, 404);
  assert.equal((await request("/api/reviews/" + created._id, "DELETE", undefined, bob.token)).status, 404);
  const updated = await request("/api/reviews/" + created._id, "PUT",
    { rating: 5, text: "Edited review" }, alice.token);
  assert.equal(updated.status, 200);
  assert.equal(updated.body.text, "Edited review");
  const listed = await request("/api/reviews/book/" + saved._id, "GET", undefined, alice.token);
  assert.equal(listed.body[0].rating, 5);
  assert.equal((await request("/api/reviews/" + created._id, "DELETE", undefined, alice.token)).status, 200);
  assert.equal((await request("/api/reviews/" + created._id, "GET", undefined, alice.token)).status, 404);
});

test("legacy cross-user review references cannot expose another user's book", async () => {
  const saved = await book(bob);
  const legacy = await Review.create({ book: saved._id, user: alice.user.id, text: "Legacy fixture", rating: 3 });
  assert.equal((await request("/api/reviews/" + legacy._id, "GET", undefined, alice.token)).status, 404);
  const listed = await request("/api/reviews", "GET", undefined, alice.token);
  assert.equal(listed.body.some((item) => item._id === legacy._id.toString()), false);
});

test("deleting a book removes its associated reviews", async () => {
  const saved = await book();
  await review(saved);
  assert.equal((await request("/api/books/" + saved._id, "DELETE", undefined, alice.token)).status, 200);
  assert.equal(await Review.countDocuments({ book: saved._id }), 0);
  assert.equal(await Book.countDocuments({ _id: saved._id }), 0);
});

test("concurrent create-review and delete-book does not leave orphan reviews", async () => {
  for (let i = 0; i < 3; i++) {
    const saved = await book();
    const results = await Promise.all([
      request("/api/reviews", "POST", { book: saved._id, rating: 4, text: "Race fixture" }, alice.token),
      request("/api/books/" + saved._id, "DELETE", undefined, alice.token)
    ]);
    assert.ok([201, 404].includes(results[0].status));
    assert.equal(results[1].status, 200);
    assert.equal(await Review.countDocuments({ book: saved._id }), 0);
  }
});

test("profile changes are validated and password hashes stay hidden", async () => {
  const changed = await request("/api/users/profile", "PUT", { username: "UpdatedAlice" }, alice.token);
  assert.equal(changed.status, 200);
  assert.equal(changed.body.username, "UpdatedAlice");
  assert.equal("password" in changed.body, false);
  assert.equal((await request("/api/users/profile", "PUT", { password: "forbidden" }, alice.token)).status, 400);
});

test("invalid IDs, fractional ratings and malformed JSON are rejected", async () => {
  assert.equal((await request("/api/books/not-an-id", "GET", undefined, alice.token)).status, 400);
  assert.equal((await request("/api/reviews", "POST",
    { book: "bad", rating: 2.5, text: "Invalid" }, alice.token)).status, 400);
  const bad = await fetch(base + "/api/auth/login", { method: "POST",
    headers: { "Content-Type": "application/json" }, body: "{invalid" });
  assert.equal(bad.status, 400);
  const tooLarge = await fetch(base + "/api/auth/login", { method: "POST",
    headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: "x".repeat(70000) }) });
  assert.equal(tooLarge.status, 413);
});
