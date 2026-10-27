let token = localStorage.getItem("token");
let currentUser = null;
let currentReviewBookId = null;
let currentReviewId = null;
let searching = false;

document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
  initializeApp();
});

function node(tag, text, className) {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
}

function action(label, handler, className) {
  const button = node("button", label, className);
  button.type = "button";
  button.addEventListener("click", async () => {
    button.disabled = true;
    try { await handler(); } catch (error) { showMessage("dashboard-message", error.message, "error"); }
    finally { button.disabled = false; }
  });
  return button;
}

async function api(path, { method = "GET", body } = {}, authenticated = true) {
  const requestToken = token;
  const headers = body === undefined ? {} : { "Content-Type": "application/json" };
  if (authenticated && requestToken) headers.Authorization = "Bearer " + requestToken;
  const response = await fetch(path, { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  if (authenticated && requestToken !== token) throw new Error("Session changed. Please retry.");
  const data = await response.json();
  if (authenticated && response.status === 401) logout();
  if (!response.ok) throw new Error(data.details || data.message || "Request failed");
  return data;
}

async function formTask(event, messageId, work) {
  event.preventDefault();
  const submit = event.currentTarget.querySelector('button[type="submit"]');
  if (submit.disabled) return;
  submit.disabled = true;
  try { await work(); } catch (error) { showMessage(messageId, error.message || "Network error", "error"); }
  finally { submit.disabled = false; }
}

function setupEventListeners() {
  document.getElementById("register-form").addEventListener("submit", handleRegister);
  document.getElementById("login-form").addEventListener("submit", handleLogin);
  document.getElementById("profile-form").addEventListener("submit", handleProfileUpdate);
  document.getElementById("search-form").addEventListener("submit", handleSearch);
  document.getElementById("review-form").addEventListener("submit", handleReviewSubmit);
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeReviewModal(); });
  const actions = { editProfile, cancelProfileEdit, loadMyBooks, loadMyReviews, closeReviewModal };
  document.querySelectorAll("[data-action]").forEach((element) => {
    element.addEventListener("click", () => {
      Promise.resolve(actions[element.dataset.action]()).catch((error) =>
        showMessage("dashboard-message", error.message, "error"));
    });
  });
}

async function initializeApp() {
  if (!token) return showAuth();
  try {
    currentUser = await api("/api/users/profile");
    displayProfile(currentUser);
    showDashboard();
  } catch (error) {
    showAuth();
    showMessage("login-message", error.message, "error");
  }
}

function handleRegister(event) {
  return formTask(event, "register-message", async () => {
    await api("/api/auth/register", { method: "POST", body: {
      username: document.getElementById("reg-username").value,
      email: document.getElementById("reg-email").value,
      password: document.getElementById("reg-password").value
    } }, false);
    document.getElementById("register-form").reset();
    showMessage("register-message", "Account created. Please sign in.", "success");
  });
}

function handleLogin(event) {
  return formTask(event, "login-message", async () => {
    const data = await api("/api/auth/login", { method: "POST", body: {
      email: document.getElementById("login-email").value,
      password: document.getElementById("login-password").value
    } }, false);
    token = data.token;
    localStorage.setItem("token", token);
    currentUser = data.user;
    displayProfile(currentUser);
    document.getElementById("login-form").reset();
    showDashboard();
  });
}

function logout() {
  token = null;
  currentUser = null;
  currentReviewId = null;
  currentReviewBookId = null;
  localStorage.removeItem("token");
  closeReviewModal();
  ["my-books", "my-reviews", "search-results", "profile-display", "user-info", "dashboard-message", "review-message"].forEach((id) =>
    document.getElementById(id).replaceChildren());
  document.getElementById("search-form").reset();
  cancelProfileEdit();
  showAuth();
}

function displayProfile(user) {
  const profile = document.getElementById("profile-display");
  const username = node("p");
  username.append(node("strong", "Username: "), node("span", user.username));
  const email = node("p");
  email.append(node("strong", "Email: "), node("span", user.email));
  profile.replaceChildren(username, email);
  document.getElementById("user-info").replaceChildren(
    node("span", "Welcome, " + user.username + "!"), action("Logout", logout));
}

function editProfile() {
  if (!currentUser) return;
  document.getElementById("profile-display").classList.add("hidden");
  document.getElementById("edit-profile-btn").classList.add("hidden");
  document.getElementById("profile-form").classList.remove("hidden");
  document.getElementById("profile-username").value = currentUser.username;
  document.getElementById("profile-email").value = currentUser.email;
}

function cancelProfileEdit() {
  document.getElementById("profile-display").classList.remove("hidden");
  document.getElementById("edit-profile-btn").classList.remove("hidden");
  document.getElementById("profile-form").classList.add("hidden");
}

function handleProfileUpdate(event) {
  return formTask(event, "dashboard-message", async () => {
    currentUser = await api("/api/users/profile", { method: "PUT", body: {
      username: document.getElementById("profile-username").value,
      email: document.getElementById("profile-email").value
    } });
    displayProfile(currentUser);
    cancelProfileEdit();
    showMessage("dashboard-message", "Profile updated.", "success");
  });
}

async function handleSearch(event) {
  event.preventDefault();
  if (searching) return;
  const query = document.getElementById("search-query").value.trim();
  if (!query) return;
  searching = true;
  const submit = event.currentTarget.querySelector('button[type="submit"]');
  submit.disabled = true;
  document.getElementById("search-results").replaceChildren(node("p", "Searching..."));
  try {
    displaySearchResults(await api("/api/books/search?q=" + encodeURIComponent(query)));
  } catch (error) {
    document.getElementById("search-results").replaceChildren(node("p", error.message));
  } finally {
    searching = false;
    submit.disabled = false;
  }
}

function displaySearchResults(books) {
  const results = document.getElementById("search-results");
  results.replaceChildren();
  if (!books.length) return results.append(node("p", "No books found."));
  for (const book of books) {
    const card = node("div", undefined, "book-card");
    try {
      const url = new URL(book.thumbnail);
      if (url.protocol === "https:") {
        const image = node("img");
        image.src = url.href;
        image.alt = book.title;
        image.loading = "lazy";
        card.append(image);
      }
    } catch { /* A book without a valid HTTPS cover still has a usable card. */ }
    card.append(node("h3", book.title), node("p", (book.authors || []).join(", ")));
    const actions = node("div", undefined, "actions");
    actions.append(action("Save", () => saveBook(book)));
    card.append(actions);
    results.append(card);
  }
}

async function saveBook(book) {
  await api("/api/books", { method: "POST", body: book });
  await loadMyBooks();
  showMessage("dashboard-message", "Book saved.", "success");
}

async function loadMyBooks() {
  displayMyBooks(await api("/api/books"));
}

function displayMyBooks(books) {
  const container = document.getElementById("my-books");
  container.replaceChildren();
  if (!books.length) return container.append(node("p", "No saved books."));
  for (const book of books) {
    const card = node("div", undefined, "book-card");
    const actions = node("div", undefined, "actions");
    actions.append(action("Review", () => openReviewModal(book._id)),
      action("Delete", () => deleteBook(book._id), "danger"));
    card.append(node("h3", book.title), node("p", (book.authors || []).join(", ")), actions);
    container.append(card);
  }
}

async function deleteBook(bookId) {
  if (!confirm("Delete this book and its reviews?")) return;
  await api("/api/books/" + encodeURIComponent(bookId), { method: "DELETE" });
  await Promise.all([loadMyBooks(), loadMyReviews()]);
}

async function loadMyReviews() {
  displayMyReviews(await api("/api/reviews"));
}

function displayMyReviews(reviews) {
  const container = document.getElementById("my-reviews");
  container.replaceChildren();
  if (!reviews.length) return container.append(node("p", "No reviews."));
  for (const review of reviews) {
    const card = node("div", undefined, "review-card");
    const rating = Math.max(0, Math.min(5, Number(review.rating) || 0));
    const actions = node("div", undefined, "actions");
    actions.append(action("Edit", () => openReviewModal(review.book._id, review)),
      action("Delete", () => deleteReview(review._id), "danger"));
    card.append(node("h3", review.book?.title || "Unavailable book"),
      node("p", "★".repeat(rating) + " (" + rating + "/5)"),
      node("p", review.text, "review-text"), actions);
    container.append(card);
  }
}

function openReviewModal(bookId, review = null) {
  currentReviewBookId = bookId;
  currentReviewId = review ? review._id : null;
  document.getElementById("review-form").reset();
  document.getElementById("review-message").textContent = "";
  document.getElementById("modal-title").textContent = review ? "Edit Review" : "Add Review";
  if (review) {
    document.getElementById("review-rating").value = review.rating;
    document.getElementById("review-text").value = review.text;
  }
  document.getElementById("review-modal").classList.remove("hidden");
  document.getElementById("review-rating").focus();
}

function closeReviewModal() {
  document.getElementById("review-modal").classList.add("hidden");
  document.getElementById("review-form").reset();
  currentReviewId = null;
  currentReviewBookId = null;
}

function handleReviewSubmit(event) {
  return formTask(event, "review-message", async () => {
    const body = { rating: Number(document.getElementById("review-rating").value),
                   text: document.getElementById("review-text").value };
    const editing = currentReviewId;
    if (!editing) body.book = currentReviewBookId;
    await api("/api/reviews" + (editing ? "/" + encodeURIComponent(editing) : ""), {
      method: editing ? "PUT" : "POST", body
    });
    closeReviewModal();
    await loadMyReviews();
    showMessage("dashboard-message", editing ? "Review updated." : "Review added.", "success");
  });
}

async function deleteReview(id) {
  if (!confirm("Delete review?")) return;
  await api("/api/reviews/" + encodeURIComponent(id), { method: "DELETE" });
  await loadMyReviews();
}

function showAuth() {
  document.getElementById("auth-section").classList.remove("hidden");
  document.getElementById("dashboard-section").classList.add("hidden");
}

function showDashboard() {
  document.getElementById("auth-section").classList.add("hidden");
  document.getElementById("dashboard-section").classList.remove("hidden");
  Promise.all([loadMyBooks(), loadMyReviews()]).catch((error) =>
    showMessage("dashboard-message", error.message, "error"));
}

function showMessage(id, message, type) {
  const element = document.getElementById(id);
  element.textContent = message;
  element.className = "form-message " + type;
  element.setAttribute("role", "status");
}
