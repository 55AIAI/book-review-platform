# Book Review Platform

## Project Overview

Book Review Platform is a full-stack web application that allows users to search for books using the Open Library API, save books to their personal library, and write reviews.
The project demonstrates backend API design, authentication, database relationships, and external API integration.

Key goals of the project:
- Practice RESTful API development
- Implement secure authentication
- Work with MongoDB and Mongoose
- Integrate a real external books API
- Build a simple frontend without frameworks

---

## Features

- User registration and authentication using JWT
- Secure password hashing with bcrypt
- Search books using Open Library API
- Save and delete books from personal library
- Add, edit, and delete reviews
- User profile viewing and updating
- Protected routes with authentication middleware
- Frontend built with HTML, CSS, and Vanilla JavaScript

---

## Technologies Used

### Backend
- Node.js
- Express.js
- MongoDB
- Mongoose
- JSON Web Tokens (JWT)
- bcrypt
- Axios
- Joi

### Frontend
- HTML5
- CSS3
- Vanilla JavaScript

---

## Setup and Installation

### Clone the repository
```bash
git clone <repository-url>
cd book-review-platform
```

### Install dependencies
```bash
npm install
```

### Environment variables

Create a `.env` file in the root directory:
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
```

### Start the server

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

Application runs at:
```
http://localhost:5000
```

---

## API Documentation

### Authentication Routes

| Method | Endpoint | Access |
|------|--------|-------|
| POST | /api/auth/register | Public |
| POST | /api/auth/login | Public |

Register request body:
```json
{
  "username": "Alice",
  "email": "alice@example.com",
  "password": "123456"
}
```

Login request body:
```json
{
  "email": "alice@example.com",
  "password": "123456"
}
```

---

### User Routes

| Method | Endpoint | Access |
|------|--------|-------|
| GET | /api/users/profile | Private |
| PUT | /api/users/profile | Private |

Authorization header:
```
Authorization: Bearer <token>
```

---

### Book Routes

| Method | Endpoint | Access |
|------|--------|-------|
| GET | /api/books/search?q= | Private |
| POST | /api/books | Private |
| GET | /api/books | Private |
| GET | /api/books/:id | Private |
| PUT | /api/books/:id | Private |
| DELETE | /api/books/:id | Private |

Search example:
```
/api/books/search?q=harry+potter
```

---

### Review Routes

| Method | Endpoint | Access |
|------|--------|-------|
| POST | /api/reviews | Private |
| GET | /api/reviews | Private |
| PUT | /api/reviews/:id | Private |
| DELETE | /api/reviews/:id | Private |

Review request body:
```json
{
  "rating": 5,
  "text": "Great book!",
  "book": "bookId"
}
```

---

## Project Structure

```
book-review-platform/
├── config/
├── controllers/
├── middleware/
├── models/
├── routes/
├── public/
│   ├── index.html
│   ├── style.css
│   └── script.js
├── app.js
├── server.js
├── .env
├── package.json
└── README.md
```

---

## Deployment

The backend can be deployed to platforms such as Render, Railway, or Replit.
All sensitive data must be stored using environment variables.
After deployment, verify that all API endpoints are accessible and working correctly.

---

## Author

Educational full-stack project demonstrating REST APIs, authentication, database design, and external API integration.
