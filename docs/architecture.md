# Request and ownership boundaries

The browser calls same-origin Express routes. Validation runs before mutation;
controllers supply ownership identifiers from the verified JWT, never the body.
MongoDB queries include both resource ID and owner ID for book/review access.

Registration hashes passwords with bcrypt. User password fields are select:false;
login explicitly requests a hash for comparison. Responses return public fields.

The browser constructs elements and assigns textContent for server-supplied values.
Closures attach Save/Edit/Delete handlers without interpolating book objects into
HTML attributes. Content Security Policy permits only same-origin scripts.

Search calls one fixed HTTPS Open Library endpoint with a timeout and response
size limit. Titles/authors are returned as data, then go through normal book
validation when saved. Outages produce an explicit 502 response.

Book deletion and review cleanup are separate writes. Review creation verifies
ownership before and after insertion to compensate when a delete races with it.
This is not equivalent to transactional crash recovery.

Tests use synthetic accounts and books. Integration/UI harnesses always override
the database name with a unique book_review_test_ prefix and accept loopback hosts
only. Their cleanup cannot select a database from the developer's .env file.

References:
- [Express 5 error handling](https://expressjs.com/en/5x/guide/error-handling/)
- [MongoDB consistency and transactions](https://www.mongodb.com/docs/manual/data-modeling/enforce-consistency/transactions/)
