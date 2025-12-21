# Crack Off Campus Backend

This repository contains the backend server for **Crack Off Campus**, built as a monolithic Node.js/Express application backed by **PostgreSQL** and integrated with **Cloudflare R2 (S3-compatible)** object storage, **Razorpay** for payments (via custom controllers), and **Nodemailer** for transactional email.

The server exposes a JSON-based HTTP API consumed by the public app, CMS/admin panel, and automation scripts.

---

## Tech Stack

- **Runtime**: Node.js (CommonJS)
- **Web framework**: Express 4
- **Database**: PostgreSQL via `pg` connection pool
- **Auth**:
  - JWT-based authentication (`jsonwebtoken`)
  - Role-based authorization middleware (`admin` vs `user`)
- **Storage**:
  - Cloudflare R2 / S3-compatible using `@aws-sdk/client-s3`
  - Used for uploads, image gallery, premium PDFs, etc.
- **Email**: `nodemailer` with helper functions in `utils/emailService.js`
- **Payments**: Razorpay integration in `paymentController`
- **Other libraries**: `bcrypt` (password hashing), `cors`, `dotenv`, `express-rate-limit`, `multer`, `firebase-admin`, `google-auth-library`, `axios`.

---

## High-Level Architecture

The backend follows a typical **Express MVC-style** layout:

- **Entry point**: [app.js](app.js)

  - Configures CORS, body parsers, rate limiting, and error handling.
  - Initializes the PostgreSQL pool and runs a test query.
  - Ensures notification tables exist via `notificationModel.init()`.
  - Initializes Cloudflare R2 via `initR2()`.
  - Binds all feature route modules under `/` (or `/notifications`).

- **Routing layer**: [routes/](routes)

  - Each feature has its own `*Routes.js` file (e.g. `jobsRoutes.js`, `servicesRoutes.js`).
  - Routes use modular `express.Router` instances, mounted in `app.js`.
  - Per-route middleware enforces authentication and roles.

- **Controller layer**: [controllers/](controllers)

  - Controllers implement business logic for each feature area:
    - Authentication and CMS admin management (`authController`)
    - Jobs, services, resources, interview kits, project ideas, learning resources, blogs, events, hackathons
    - User accounts and user details
    - Payments and verification
    - File uploads and R2-backed resources (banners, premium PDFs, image gallery)
    - Notifications and cron-style operations
  - Many controllers use a shared `crudFactory` to implement common patterns.

- **Data access layer**: [models/](models)

  - Each domain object has a corresponding `*Model.js` (e.g. `jobsModel.js`, `servicesModel.js`).
  - Models encapsulate SQL queries and table-specific helpers using the shared PG pool from `utils/db.js`.
  - Examples:
    - `userModel` – users and authentication-related tables.
    - `servicesModel`, `jobsModel`, `resourcesModel` – catalog data.
    - `paymentsModel` – payment logs and subscription state.
    - `notificationModel` – notification tables and queries.

- **Middleware**: [middleware/](middleware)

  - `auth.js` – verifies JWT from `Authorization: Bearer <token>` header and populates `req.user`.
  - `roles.js` – role-based guards:
    - `requireAdmin` – only admins.
    - `requireUser` – only normal users.
    - `requireAdminOrSelf(paramKey)` – admin or same user as URL param.

- **Utilities**: [utils/](utils)

  - `db.js` – PostgreSQL pool initialization and `init()` helper.
  - `emailService.js` – Nodemailer configuration and high-level email helpers.
  - `r2.js` – R2/S3 client factory, bucket name resolution, and URL helpers.
  - `idGenerator.js` – simple id/slug generation helpers.

- **Scripts**: [scripts/](scripts)
  - One-off migration or maintenance scripts (e.g. `alter_userfeedback_add_profile_url.js`).

---

## Request Lifecycle

1. **Incoming HTTP request** hits Express in [app.js](app.js).
2. **CORS** is applied globally:
   - Currently configured as open (`Access-Control-Allow-Origin: *`) with standard methods and headers.
3. **Body parsing**:
   - `express.json` with 1 MB limit.
   - `express.urlencoded` for form data.
   - `express.text` for `text/*` payloads, with a post-processor that attempts to parse JSON when body is a string.
4. **Rate limiting**:
   - `express-rate-limit` caps non-localhost clients at 60 requests per minute.
   - Localhost (IP/host/origin) is exempted.
5. **Routing & middleware**:
   - Requests are dispatched to route modules under `/` or `/notifications`.
   - Protected endpoints run `auth` and role middleware before invoking controllers.
6. **Controllers**:
   - Controllers validate input, interact with models, and return JSON responses.
7. **Error handling**:
   - Unmatched routes return a 404 JSON error.
   - Unhandled errors fall through to a global 500 handler that logs the error and returns `{ error: 'Internal server error' }`.

---

## Feature Overview

High-level domains covered by this backend:

- **Authentication & CMS Admin**

  - User signup/login and password reset flows.
  - CMS-specific admin authentication and admin management.
  - Token verification endpoints for clients.

- **User Management**

  - Listing users (admin only), fetching user by id.
  - User details profile CRUD with `admin or self` semantics.
  - Account removal for self or by admin.

- **Jobs & Services**

  - Admin CRUD for jobs and services.
  - Public listing endpoints for users.
  - Additional flags such as `most popular` for services.

- **Premium Resources & Payments**

  - Resources and interview kits with access control based on successful Razorpay payments.
  - Payment verification, order creation, and subscription history.
  - Separate verification endpoints for services, resources, and kits.

- **Content Modules**

  - Courses, blogs, events, hackathons, project ideas, learning resources.
  - Each module has admin CRUD plus public listing endpoints.

- **Media & Banners**

  - File uploads via `multer` directly to R2.
  - Image gallery listing and deletion.
  - App-wide banner and top-banner configuration.
  - Premium PDFs listing and bulk deletion.

- **Feedback & Notifications**

  - Public feedback submission and admin review.
  - Per-user notifications with unread counts and mark-read operations.

- **Cron & Automation**
  - Admin-triggered cron-style endpoints for alerts and plan-end logic.

---

## Environment & Configuration

Core configuration is provided via environment variables (loaded with `dotenv`):

- `PORT` – HTTP port (default: 3000).
- `DATABASE_URL` / PG connection vars – PostgreSQL connection.
- `JWT_SECRET` – secret for signing/verifying JWTs.
- Email-related vars – host, user, password, etc. for Nodemailer.
- R2/S3-related vars – access key, secret, endpoint, bucket, public base URL.
- Razorpay keys – used by payment-related controllers.

Ensure these are set in a `.env` file or the hosting environment before starting the server.

---

## Running the Server

### Development

```bash
npm install
npm run dev
```

This starts the server with `nodemon` watching [app.js](app.js).

### Production

```bash
npm install --production
npm start
```

On startup the server will:

- Connect to PostgreSQL and log server time.
- Initialize notification tables if necessary.
- Initialize R2 client configuration.

---

## Testing & Service Checks

- `npm test` – placeholder (no formal test suite yet).
- `npm run test:service` – basic service-level checks via `test-service-simple.js`.
- `npm run test:service-full` / `npm run test:service-comprehensive` – more extensive API checks via `test-service-api.js`.

Refer to those scripts for how they hit the API and expected responses.

---

## API Reference

For a detailed, route-by-route description of every endpoint, including auth requirements, request payloads, and typical responses, see:

- [api.md](api.md)
