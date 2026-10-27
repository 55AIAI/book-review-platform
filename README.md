# Book Review Platform

A small full-stack application for a private book library and personal reviews.
Users register, search Open Library, save books, and create, edit or delete reviews.

Node.js 22/24, Express 5, MongoDB/Mongoose and a framework-free browser UI.

## Run with Docker

1. Copy `.env.example` to `.env`.
2. Generate a secret and put the output in `JWT_SECRET`:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
docker compose up --build
```

Open **http://localhost:5000**, register an account, and sign in.
Compose starts a dedicated MongoDB service. Its data is retained in a named volume;
the database port is not published. `docker compose down` stops the application.

## Run locally

Start your own local MongoDB server, then:

```bash
git clone https://github.com/55AIAI/book-review-platform.git
cd book-review-platform
npm ci
# PowerShell: Copy-Item .env.example .env
# Bash: cp .env.example .env
# Set MONGO_URI and a newly generated JWT_SECRET in .env.
npm start
```

The server connects to MongoDB before accepting HTTP traffic. Configuration and
connection failures stop startup. `GET /healthz` reports database readiness.

Environment variables:

| Variable | Meaning |
|---|---|
| MONGO_URI | Required MongoDB connection string |
| JWT_SECRET | Required, at least 32 bytes; generate a unique random value |
| PORT | HTTP port, default 5000 |
| CLIENT_ORIGIN | Optional single frontend origin for CORS; no trailing slash |

The bundled frontend uses the same origin as the API and needs no CORS setting.
Never commit a real .env file, database export, password or token.

## Behavior and access

- Every book belongs to the user who saved it. Another user receives 404 for reads,
  edits and deletion by ID.
- Reviews can reference only a book in the current user's library. Read and edit
  queries are scoped to the current user; reference fields cannot be reassigned.
- Deleting a book cleans up associated reviews. A post-create ownership check
  compensates for an ordinary concurrent delete.
- Request schemas reject unknown fields, Mongo update operators, invalid IDs,
  out-of-range/fractional ratings and oversized text.
- Email addresses are normalized to lowercase. Password hashes are excluded from
  user queries and responses; login verifies an explicitly selected hash.
- Registration requires 8–72 characters and at most 72 UTF-8 bytes. Existing shorter
  passwords can still be used to sign in.
- Authentication endpoints allow 20 attempts per IP per 15 minutes in a bounded,
  process-local counter and return 429 with Retry-After when exceeded.
- JWT verification accepts HS256 only. API responses use no-store caching.
- Book titles, usernames and review text render through textContent and DOM nodes.
  No fetched/user content is inserted into HTML or inline event handlers.
- Search has a timeout and reports upstream failure as 502, rather than pretending
  an outage is an empty result. Live Open Library access requires internet access.
- Review editing is available in the browser, with the existing text/rating loaded
  into the form. Failed requests show a message and submit buttons recover.

## API

Private routes require `Authorization: Bearer <token>`.

| Method | Endpoint | Purpose |
|---|---|---|
| POST | /api/auth/register | Create an account |
| POST | /api/auth/login | Return a JWT and public user fields |
| GET / PUT | /api/users/profile | Read/update the current profile |
| GET | /api/books/search?q=title | Search Open Library, 1–200 characters |
| POST / GET | /api/books | Save/list current user's books |
| GET / PUT / DELETE | /api/books/:id | Read/update/delete an owned book |
| POST / GET | /api/reviews | Create/list current user's reviews |
| GET | /api/reviews/book/:bookId | Current user's reviews for an owned book |
| GET / PUT / DELETE | /api/reviews/:id | Read/update/delete an owned review |
| GET | /healthz | Database readiness, 200 or 503 |

Book body:

```json
{
  "externalId": "/works/OL_SYNTHETIC",
  "title": "Synthetic Book",
  "authors": ["Fictional Author"],
  "publishedDate": "2025",
  "thumbnail": null
}
```

`title` is required. Additional supported fields are `description` and an HTTPS
`thumbnail`. Updates use the same allowlist. `createdBy` cannot be supplied.

Create-review body: `{"book":"<24-character MongoDB ID>","rating":5,"text":"My review"}`.
Review updates accept only rating and text. Validation failures are 400, invalid
authentication is 401, unavailable/foreign records are 404, duplicate records are
409, authentication throttling is 429, and upstream search failures are 502.

## Tests

```bash
npm test
# With an isolated local MongoDB server:
# PowerShell: $env:TEST_MONGO_URI='mongodb://127.0.0.1:27017'
# Bash: export TEST_MONGO_URI=mongodb://127.0.0.1:27017
npm run test:integration
```

The 17 unit tests need no database or network. The 12 integration tests exercise the
HTTP application against MongoDB. Test scripts generate a unique database name,
require a loopback MongoDB host, and remove only their own temporary database.
They do not load your .env file.

CI runs both suites on Node 22 and 24. A separate Chromium job tests registration,
login, literal rendering of HTML-like text, search fixtures, save, review creation
and editing, cascade deletion and logout at desktop/mobile sizes. Its screenshots
and checks are saved as the `browser-evidence` workflow artifact.

Browser-test setup, if desired locally:

```bash
python -m pip install playwright==1.55.0
python -m playwright install chromium
python tests/browser_smoke.py
```

Open Library is mocked in automated tests; provider uptime and live search relevance
are not claimed. Docker CI checks the image build and Compose configuration.

## Operational limits

This is a portfolio application. Book/review cleanup uses separate MongoDB
operations, not a multi-document transaction; a process/database failure during
deletion can still need orphan cleanup. The compensating check covers the tested
concurrent create/delete flow, not crash atomicity.

Tokens are stored in browser localStorage, expire after seven days and have no
refresh/revocation workflow. Authentication throttling is per process and resets
on restart; multiple app instances need shared limiting. TLS and trusted-proxy
configuration belong to deployment setup.

Before using an existing database, resolve case-variant email duplicates and
normalize old email records. No migration or cleanup of existing user data is
performed automatically.
