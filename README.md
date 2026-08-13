# AUT StudyConnect — Prototype (Login + Profile Management)

This is the first working slice of the StudyConnect prototype described in the project
proposal: **student login** (FR-01) and **profile management** (FR-02), including the
database, backend API, frontend pages, automated tests, and a Postman collection.


**Everything below actually runs and is actually tested** — 27 backend tests, 15
frontend tests, and a full browser walkthrough of login → dashboard → profile edit →
save → logout, all passing, plus a Postman collection you can run yourself.

### If your course needs the documented stack exactly

Once you can run `npm install` somewhere with real internet access (your own laptop,
or after your Claude org enables npm/registry access in **Admin settings → Capabilities**),
swapping pieces back in is a contained, one-file-at-a-time job — nothing here is
structured in a way that fights against it:

- **Express**: replace `backend/src/app.js` and `backend/src/http/*` with an Express
  app; the controllers in `backend/src/controllers/` already use `req.body` /
  `res.status().json()` and don't need to change.
- **bcrypt / jsonwebtoken**: swap the two files in `backend/src/utils/` for calls into
  the real packages; their function signatures (`hashPassword`, `verifyPassword`,
  `signToken`, `verifyToken`) were deliberately kept 1:1 with what those packages do.
- **better-sqlite3**: swap the one import line in `backend/src/db/index.js`; the
  query API is compatible.
- **React + Vite + Tailwind**: the HTML pages map directly to what would become
  components (`index.html`→Login, `register.html`→Register, `dashboard.html`→Dashboard,
  `profile.html`→Profile), and the CSS classes in `public/css/style.css` translate
  fairly directly to Tailwind utilities if you want to convert them.

## What's included

- **Database**: SQLite, one `students` table (`backend/src/db/schema.sql`), covering
  everything FR-01/FR-02 need. A seed script creates two sample accounts.
- **Backend API** (`backend/`): `POST /api/auth/register`, `POST /api/auth/login`,
  `GET /api/profile/me`, `PUT /api/profile/me`, mapped to acceptance criteria AC-01
  through AC-06 from the requirements doc.
- **Frontend** (`frontend/`): sign-in page, create-account page, a small dashboard, and
  a profile page — styled to match the dark-theme Figma wireframes in the proposal doc.
- **Tests**: `backend/src/tests/` (27 tests: password hashing, JWTs, validation, and
  full HTTP-level tests of every endpoint) and `frontend/tests/` (15 tests: form
  validation and the API client, with a mocked `fetch`).
- **Postman collection** (`postman/`): the same 6 endpoints/scenarios as an importable
  collection with automated assertions tagged to AC numbers.

## Running it

You need Node.js 22.5 or later (check with `node -v`) — everything else is already
included, there is nothing to `npm install`.

**1. Start the backend:**

```bash
cd backend
cp .env.example .env
npm run seed    # creates two sample accounts (see console output for the login)
npm start       # http://localhost:4000
```

**2. Start the frontend (in a second terminal):**

```bash
cd frontend
npm start       # http://localhost:5500
```

Open `http://localhost:5500` and sign in with the seeded account
(`ava.ngata@aut.ac.nz` / `Password123!`), or use "Create one" to register a new
account.

## Running the tests

```bash
cd backend && npm test     # 27 tests
cd frontend && npm test    # 15 tests
```

## Running the Postman collection

Import both files in `postman/` into Postman (`StudyConnect.postman_collection.json`
and `StudyConnect.postman_environment.json`), select the "StudyConnect Local"
environment, make sure the backend is running (`npm start` in `backend/`), then use
**Run collection** to execute all requests top-to-bottom. Each request has assertions
tagged to the relevant acceptance criteria (AC-01 through AC-06).

## Project layout

```
studyconnect/
├── backend/
│   ├── src/
│   │   ├── controllers/     # request handling for auth + profile
│   │   ├── db/               # schema.sql, connection, seed script
│   │   ├── http/              # tiny Express-alternative built on node:http
│   │   ├── middleware/        # requireAuth (JWT check)
│   │   ├── models/            # studentModel.js — all SQL lives here
│   │   ├── routes/            # route tables for auth + profile
│   │   ├── tests/             # 27 tests (node --test)
│   │   ├── utils/              # password hashing, JWT, validation, .env loader
│   │   ├── app.js
│   │   └── server.js
│   └── package.json
├── frontend/
│   ├── public/
│   │   ├── index.html          # Sign in
│   │   ├── register.html       # Create account
│   │   ├── dashboard.html      # Landing page after login
│   │   ├── profile.html        # View/edit profile
│   │   ├── css/style.css
│   │   └── js/                 # api.js, validate.js, ui.js, + one controller per page
│   ├── server/staticServer.js  # tiny static file server
│   ├── tests/                  # 15 tests (node --test)
│   └── package.json
└── postman/
    ├── StudyConnect.postman_collection.json
    └── StudyConnect.postman_environment.json
```


