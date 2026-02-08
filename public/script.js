const API_URL = '';

let token = localStorage.getItem('token');
let currentUser = null;
let currentReviewBookId = null;
let currentReviewId = null;

document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
  setupEventListeners();
});

function initializeApp() {
  if (token) {
    loadUserProfile();
    showDashboard();
  } else {
    showAuth();
  }
}

function setupEventListeners() {
  document.getElementById('register-form').addEventListener('submit', handleRegister);
  document.getElementById('login-form').addEventListener('submit', handleLogin);
  document.getElementById('profile-form').addEventListener('submit', handleProfileUpdate);
  document.getElementById('search-form').addEventListener('submit', handleSearch);
  document.getElementById('review-form').addEventListener('submit', handleReviewSubmit);
}

async function handleRegister(e) {
  e.preventDefault();

  const username = document.getElementById('reg-username').value;
  const email = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;

  try {
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });

    const data = await response.json();

    if (response.ok) {
      showMessage('register-message', 'Registration successful! Please login.', 'success');
      document.getElementById('register-form').reset();
    } else {
      showMessage('register-message', data.message || data.details || 'Registration failed', 'error');
    }
  } catch {
    showMessage('register-message', 'Network error. Please try again.', 'error');
  }
}

async function handleLogin(e) {
  e.preventDefault();

  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  try {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (response.ok) {
      token = data.token;
      localStorage.setItem('token', token);
      currentUser = data.user;
      showDashboard();
      loadUserProfile();
      showMessage('login-message', 'Login successful!', 'success');
      document.getElementById('login-form').reset();
    } else {
      showMessage('login-message', data.message || 'Login failed', 'error');
    }
  } catch {
    showMessage('login-message', 'Network error. Please try again.', 'error');
  }
}

function logout() {
  token = null;
  currentUser = null;
  localStorage.removeItem('token');
  showAuth();
}

async function loadUserProfile() {
  try {
    const response = await fetch(`${API_URL}/api/users/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.ok) {
      const user = await response.json();
      currentUser = user;
      displayProfile(user);
    } else if (response.status === 401) {
      logout();
    }
  } catch {}
}

function displayProfile(user) {
  document.getElementById('profile-display').innerHTML = `
    <p><strong>Username:</strong> ${user.username}</p>
    <p><strong>Email:</strong> ${user.email}</p>
  `;

  document.getElementById('user-info').innerHTML = `
    <span>Welcome, ${user.username}!</span>
    <button onclick="logout()">Logout</button>
  `;
}

function editProfile() {
  document.getElementById('profile-display').classList.add('hidden');
  document.getElementById('edit-profile-btn').classList.add('hidden');
  document.getElementById('profile-form').classList.remove('hidden');

  document.getElementById('profile-username').value = currentUser.username;
  document.getElementById('profile-email').value = currentUser.email;
}

function cancelProfileEdit() {
  document.getElementById('profile-display').classList.remove('hidden');
  document.getElementById('edit-profile-btn').classList.remove('hidden');
  document.getElementById('profile-form').classList.add('hidden');
}

async function handleProfileUpdate(e) {
  e.preventDefault();

  const username = document.getElementById('profile-username').value;
  const email = document.getElementById('profile-email').value;

  try {
    const response = await fetch(`${API_URL}/api/users/profile`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, email })
    });

    if (response.ok) {
      const user = await response.json();
      currentUser = user;
      displayProfile(user);
      cancelProfileEdit();
      alert('Profile updated successfully!');
    } else {
      const data = await response.json();
      alert(data.message || 'Update failed');
    }
  } catch {
    alert('Network error. Please try again.');
  }
}

let lastSearchQuery = '';
let lastSearchTime = 0;
let isSearching = false;

async function handleSearch(e) {
  e.preventDefault();

  const query = document.getElementById('search-query').value.trim();
  const resultsDiv = document.getElementById('search-results');

  if (!query || query === lastSearchQuery || isSearching) return;

  const now = Date.now();
  if (now - lastSearchTime < 1000) return;

  lastSearchQuery = query;
  lastSearchTime = now;
  isSearching = true;

  resultsDiv.innerHTML = '<div class="loading">Searching...</div>';

  try {
    const response = await fetch(`${API_URL}/api/books/search?q=${encodeURIComponent(query)}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.ok) {
      const books = await response.json();
      displaySearchResults(books);
    } else {
      resultsDiv.innerHTML = '<div class="empty-state"><p>Search failed.</p></div>';
      lastSearchQuery = '';
    }
  } catch {
    resultsDiv.innerHTML = '<div class="empty-state"><p>Network error.</p></div>';
    lastSearchQuery = '';
  } finally {
    isSearching = false;
  }
}

function displaySearchResults(books) {
  const resultsDiv = document.getElementById('search-results');

  if (!books.length) {
    resultsDiv.innerHTML = '<div class="empty-state"><p>No books found.</p></div>';
    return;
  }

  resultsDiv.innerHTML = books.map(book => `
    <div class="book-card">
      ${book.thumbnail ? `<img src="${book.thumbnail}" />` : ''}
      <h3>${book.title}</h3>
      <p>${book.authors.join(', ')}</p>
      <div class="actions">
        <button onclick='saveBook(${JSON.stringify(book)})'>Save</button>
      </div>
    </div>
  `).join('');
}

async function saveBook(book) {
  try {
    const response = await fetch(`${API_URL}/api/books`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(book)
    });

    if (response.ok) {
      loadMyBooks();
    }
  } catch {}
}

async function loadMyBooks() {
  const booksDiv = document.getElementById('my-books');
  booksDiv.innerHTML = '';

  try {
    const response = await fetch(`${API_URL}/api/books`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.ok) {
      const books = await response.json();
      displayMyBooks(books);
    }
  } catch {}
}

function displayMyBooks(books) {
  const booksDiv = document.getElementById('my-books');

  if (!books.length) {
    booksDiv.innerHTML = '<p>No saved books.</p>';
    return;
  }

  booksDiv.innerHTML = books.map(book => `
    <div class="book-card">
      <h3>${book.title}</h3>
      <p>${book.authors.join(', ')}</p>
      <div class="actions">
        <button onclick="openReviewModal('${book._id}')">Review</button>
        <button class="danger" onclick="deleteBook('${book._id}')">Delete</button>
      </div>
    </div>
  `).join('');
}

async function deleteBook(bookId) {
  if (!confirm('Delete book?')) return;

  try {
    const response = await fetch(`${API_URL}/api/books/${bookId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.ok) loadMyBooks();
  } catch {}
}

async function loadMyReviews() {
  const reviewsDiv = document.getElementById('my-reviews');
  reviewsDiv.innerHTML = '';

  try {
    const response = await fetch(`${API_URL}/api/reviews`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.ok) {
      const reviews = await response.json();
      displayMyReviews(reviews);
    }
  } catch {}
}

function displayMyReviews(reviews) {
  const reviewsDiv = document.getElementById('my-reviews');

  if (!reviews.length) {
    reviewsDiv.innerHTML = '<p>No reviews.</p>';
    return;
  }

  reviewsDiv.innerHTML = reviews.map(review => `
    <div class="review-card">
      <div>${'⭐'.repeat(review.rating)}</div>
      <div>${review.text}</div>
      <button onclick="deleteReview('${review._id}')">Delete</button>
    </div>
  `).join('');
}

function openReviewModal(bookId) {
  currentReviewBookId = bookId;
  currentReviewId = null;
  document.getElementById('review-book-id').value = bookId;
  document.getElementById('review-modal').classList.remove('hidden');
}

function closeReviewModal() {
  document.getElementById('review-modal').classList.add('hidden');
}

async function handleReviewSubmit(e) {
  e.preventDefault();

  const rating = parseInt(document.getElementById('review-rating').value);
  const text = document.getElementById('review-text').value;

  try {
    const response = await fetch(`${API_URL}/api/reviews`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ rating, text, book: currentReviewBookId })
    });

    if (response.ok) {
      closeReviewModal();
      loadMyReviews();
    }
  } catch {}
}

async function deleteReview(reviewId) {
  if (!confirm('Delete review?')) return;

  try {
    const response = await fetch(`${API_URL}/api/reviews/${reviewId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.ok) loadMyReviews();
  } catch {}
}

function showAuth() {
  document.getElementById('auth-section').classList.remove('hidden');
  document.getElementById('dashboard-section').classList.add('hidden');
}

function showDashboard() {
  document.getElementById('auth-section').classList.add('hidden');
  document.getElementById('dashboard-section').classList.remove('hidden');
  loadMyBooks();
  loadMyReviews();
}

function showMessage(id, message, type) {
  const el = document.getElementById(id);
  el.textContent = message;
  el.className = `form-message ${type}`;
  setTimeout(() => {
    el.textContent = '';
    el.className = 'form-message';
  }, 5000);
}
