# Crack Off-Campus Backend API

This document describes the HTTP API exposed by the Crack Off-Campus backend. All routes are mounted at the server root (e.g. `https://api.crackoffcampus.com/`), unless otherwise noted.

## Conventions

- **Auth**
  - Most protected routes expect a JWT in the `Authorization` header:
    - `Authorization: Bearer <token>`
  - Tokens are verified using `JWT_SECRET` and decoded into `req.user` with at least:
    - `sub` (user id), `email`, `name`, optional `role` (`admin` or `user`).
- **Roles**
  - `auth` – requires a valid JWT.
  - `requireAdmin` – `req.user.role === 'admin'`.
  - `requireUser` – `req.user.role === 'user'` (or role missing but treated as normal user in some flows).
  - `requireAdminOrSelf('param')` – allows admins, or the same user as `req.params[param]`.
- **Content types**
  - JSON: `Content-Type: application/json`.
  - File upload: `multipart/form-data` (see upload routes).
- **Errors**
  - 400 – bad request / missing fields.
  - 401 – missing/invalid JWT.
  - 403 – insufficient role.
  - 404 – not found.
  - 500 – internal server error.

Below each section groups routes by feature module.

---

## Auth & Admin (authRoutes)

### POST /signup

- **Description**: Registers a new user account.
- **Auth**: None.
- **Request body (JSON)**: typical fields like `email`, `password`, `name` (see controller for exact shape).
- **Responses**:
  - 201 with created user and/or auth token.
  - 400/409 on validation or duplicate errors.

### POST /login

- **Description**: Authenticates a user and returns a JWT.
- **Auth**: None.
- **Request body (JSON)**: `{ email, password }`.
- **Responses**:
  - 200 with `{ token, user }`.
  - 401 on invalid credentials.

### POST /cms-auth

- **Description**: CMS/admin login, returns admin-scoped credentials.
- **Auth**: None.
- **Request body**: CMS admin credentials (email/password or similar).

### POST /cms-auth/add-admin

- **Description**: Create a new CMS admin.
- **Auth**: Likely requires existing admin (see controller); should be called from a secured CMS.
- **Request body**: admin details (email, name, password, etc.).

### DELETE /cms-auth/admin-delete/:emailid

- **Description**: Delete a CMS admin by email id.
- **Auth**: Admin.
- **Params**:
  - `emailid` – email of the admin to delete.

### POST /cms-auth/reset-password

- **Description**: Reset a CMS admin password via CMS.
- **Auth**: Admin (CMS side).

### GET /cms-auth/alladmin

- **Description**: List all CMS admins.
- **Auth**: Admin.

### GET /token/verify and POST /token/verify

- **Description**: Validates a JWT.
- **Auth**: None (token is passed explicitly).
- **Request**:
  - Token can be:
    - `Authorization: Bearer <token>` header, or
    - `?token=<token>` query, or
    - `{ "token": "..." }` body.
- **Responses**:
  - 200 with decoded token payload.
  - 401 on invalid/expired token.

### Password reset helpers

#### POST /forgot-password

- **Description**: Start user password reset flow (send OTP/email).
- **Auth**: None.

#### POST /refresh-otp

- **Description**: Request a new OTP for an ongoing password-reset.
- **Auth**: None.

#### POST /verify-otp

- **Description**: Verify OTP provided by the user.
- **Auth**: None.

#### POST /reset-password

- **Description**: Final step – reset password with valid OTP/token.
- **Auth**: None.

---

## Users (userRoutes)

### GET /allUsers

- **Description**: List all users in the system.
- **Auth**: `auth`, `requireAdmin`.
- **Responses**: 200 with array of users.

### GET /user/:userid

- **Description**: Fetch a single user by id.
- **Auth**: `auth`.
- **Params**:
  - `userid` – user identifier.
- **Responses**: 200 with user object; 404 if not found.

### DELETE /user/:userid/delete

- **Description**: Delete a user account.
- **Auth**: `auth`, `requireAdminOrSelf('userid')`.
- **Rules**:
  - Admin may delete any user.
  - Normal user may delete only their own account.

---

## User Details (userDetailsRoutes)

### GET /getuserdetails

- **Description**: Fetch profile/details for the current user, or all users for admin.
- **Auth**: `auth`.
- **Behavior**:
  - Admin: may pass `?userId=` to fetch specific user, or fetch all.
  - Normal user: always gets own details, ignoring `userId`.

### PUT /:userid/edit

- **Description**: Update details for a user.
- **Auth**: `auth`.
- **Params**:
  - `userid` – target user id; controller enforces whether caller can edit.
- **Body**: profile fields (name, links, etc.).

---

## Jobs (jobsRoutes)

### POST /job

- **Description**: Create a new job post.
- **Auth**: `auth`, `requireAdmin`.
- **Body**: job fields (title, company, description, location, etc.).

### GET /jobs/public

- **Description**: Public list of jobs visible to users.
- **Auth**: None.

### GET /admin/job

- **Description**: Admin list of all jobs.
- **Auth**: `auth`, `requireAdmin`.

### GET /job/:jobid

- **Description**: Get a single job by id.
- **Auth**: `auth`.

### PUT /job/:jobid/edit

- **Description**: Update a job.
- **Auth**: `auth`, `requireAdmin`.

### DELETE /job/:jobid/delete

- **Description**: Delete a job.
- **Auth**: `auth`, `requireAdmin`.

---

## Services (servicesRoutes)

### POST /service

- **Description**: Create a new service.
- **Auth**: `auth`, `requireAdmin`.

### GET /services/public

- **Description**: Public list of services.
- **Auth**: None.

### GET /admin/service

- **Description**: Admin list of all services.
- **Auth**: `auth`, `requireAdmin`.

### GET /service/:serviceid

- **Description**: Get a single service.
- **Auth**: `auth`.

### PUT /service/:serviceid/edit

- **Description**: Update service.
- **Auth**: `auth`, `requireAdmin`.

### DELETE /service/:serviceid/delete

- **Description**: Delete service.
- **Auth**: `auth`, `requireAdmin`.

### GET /service/:serviceid/mostpopular

- **Description**: Get the "most popular" flag for a service.
- **Auth**: `auth`, `requireAdmin`.

### PUT /service/:serviceid/mostpopular

- **Description**: Update the "most popular" flag.
- **Auth**: `auth`, `requireAdmin`.

---

## Resources (resourcesRoutes)

### POST /resource

- **Description**: Create a premium/downloadable resource.
- **Auth**: `auth`, `requireAdmin`.

### GET /resources/public

- **Description**: Public list of resources (with pricing/metadata, not full content).
- **Auth**: None.

### GET /admin/resource

- **Description**: Admin list of all resources.
- **Auth**: `auth`, `requireAdmin`.

### GET /resource/:resourceid

- **Description**: Get details of a single resource.
- **Auth**: `auth`.

### GET /resource/:resourceid/access

- **Description**: Check whether the current user has access to a given resource.
- **Auth**: `auth`, `requireUser`.

### PUT /resource/:resourceid/edit

- **Description**: Update resource metadata.
- **Auth**: `auth`, `requireAdmin`.

### DELETE /resource/:resourceid/delete

- **Description**: Delete a resource.
- **Auth**: `auth`, `requireAdmin`.

### POST /resource/verify

- **Description**: Verify a Razorpay payment for a resource and grant access.
- **Auth**: `auth`, `requireUser`.
- **Body**: Razorpay payment payload (order id, payment id, signature, etc.).

---

## Testimonials (testimonialsRoutes)

> Note: route names intentionally keep original spelling.

### POST /testemonial

- **Description**: Create a testimonial / video story.
- **Auth**: `auth`, `requireAdmin`.

### GET /gettestemonnial

- **Description**: Public list of testimonials.
- **Auth**: None.

### DELETE /testemonial/:videostoryid

- **Description**: Delete testimonial.
- **Auth**: `auth`, `requireAdmin`.

### PUT /edittestemonial/:videostoryid

- **Description**: Update testimonial.
- **Auth**: `auth`, `requireAdmin`.

---

## Questions (questionsRoutes)

### POST /question

- **Description**: Create a question.
- **Auth**: `auth`.

### GET /questions

- **Description**: List all questions.
- **Auth**: `auth`.

### GET /question/:questionid

- **Description**: Get a single question.
- **Auth**: `auth`.

### PUT /question/:questionid/edit

- **Description**: Update question.
- **Auth**: `auth`.

### DELETE /question/:questionid/delete

- **Description**: Delete question.
- **Auth**: `auth`.

---

## Email (emailRoutes)

All email routes are admin-only and backed by `utils/emailService`.

### GET /email/test

- **Description**: Test email configuration.
- **Auth**: `auth`, `requireAdmin`.

### POST /email/send

- **Description**: Send a custom email.
- **Auth**: `auth`, `requireAdmin`.
- **Body**:
  - `to` (string), `subject` (string), `text` or `html` (at least one).

### POST /email/welcome

- **Description**: Send a templated welcome email.
- **Auth**: `auth`, `requireAdmin`.
- **Body**: `{ userEmail, userName }`.

### POST /email/password-reset

- **Description**: Send a password-reset email to user.
- **Auth**: `auth`, `requireAdmin`.
- **Body**: `{ userEmail, resetToken }`.

### POST /email/notification

- **Description**: Send a generic notification email.
- **Auth**: `auth`, `requireAdmin`.
- **Body**: `{ userEmail, title, message }`.

### POST /email/bulk

- **Description**: Send a custom email to multiple recipients.
- **Auth**: `auth`, `requireAdmin`.
- **Body**:
  - `recipients`: array of email strings
  - `subject`: string
  - `text` or `html`.

---

## Uploads & Banners (uploadRoutes, imageGalleryRoutes, bannerRoutes, adBannerRoutes)

### File uploads (uploadRoutes)

#### POST /upload

- **Description**: Upload one or more files to an R2 folder.
- **Auth**: `auth` (user or admin).
- **Content-Type**: `multipart/form-data`.
- **Form fields**:
  - `folderName` – target folder (string).
  - `files` – one or more files.

#### DELETE /upload/:key

- **Description**: Delete an uploaded object by key.
- **Auth**: `auth`, `requireAdmin`.
- **Params**:
  - `key` – R2 object key.

#### POST /topbanner/upload

- **Description**: Upload top banner images.
- **Auth**: `auth`.
- **Body**: `multipart/form-data` with `files`.

#### GET /get/topbanner

- **Description**: Publicly list top banners.
- **Auth**: None.

#### DELETE /topbanner/:key

- **Description**: Delete a top banner by key.
- **Auth**: `auth`.

### Public image gallery (imageGalleryRoutes)

#### GET /image-gallery

- **Description**: List all images under `imageGallery/` in R2.
- **Auth**: None.
- **Response**: `{ items: [{ key, url, size, lastModified }, ...] }`.

#### DELETE /image-gallery/:key

- **Description**: Delete a gallery image.
- **Auth**: None (currently public; protect at CDN or wrap if needed).

### Banner images (bannerRoutes)

#### POST /banner

- **Description**: Create banner record.
- **Auth**: `auth`, `requireAdmin`.

#### GET /banner/public

- **Description**: Public banner list.
- **Auth**: None.

#### DELETE /banner/:bannerid

- **Description**: Delete banner.
- **Auth**: `auth`, `requireAdmin`.

### Ad banner config (adBannerRoutes)

#### POST /appadbanner

- **Description**: Create/replace single-row application ad banner configuration.
- **Auth**: `auth`, `requireAdmin`.

#### GET /adbanner

- **Description**: Public ad banner status/config.
- **Auth**: None.

#### PUT /appupdate

- **Description**: Partially update ad banner config.
- **Auth**: `auth`, `requireAdmin`.

#### DELETE /appadbanner

- **Description**: Reset ad banner config to defaults.
- **Auth**: `auth`, `requireAdmin`.

---

## Courses & Success Stories (coursesRoutes, successStoriesRoutes)

### Courses

#### POST /courses

- **Description**: Create course.
- **Auth**: `auth`, `requireAdmin`.

#### GET /getcourses

- **Description**: Public list of courses.
- **Auth**: None.

#### DELETE /course/:courseid

- **Description**: Delete course.
- **Auth**: `auth`, `requireAdmin`.

#### PUT /course/:courseid

- **Description**: Edit course.
- **Auth**: `auth`, `requireAdmin`.

### Success stories

#### POST /successstories

- **Description**: Create success story.
- **Auth**: `auth`, `requireAdmin`.

#### GET /getsuccessstories

- **Description**: Public success stories list.
- **Auth**: None.

#### DELETE /successstories/:reviewid

- **Description**: Delete success story.
- **Auth**: `auth`, `requireAdmin`.

#### PUT /successstoriesedit/:reviewid

- **Description**: Edit success story.
- **Auth**: `auth`, `requireAdmin`.

---

## Payments & Subscriptions (paymentRoutes)

### POST /payment/verify

- **Description**: Verify a Razorpay payment and update the user plan.
- **Auth**: `auth`.
- **Body**: Razorpay payment fields.

### GET /payment/subscriptions/:userId

- **Description**: Get subscription/payment history for a user.
- **Auth**: `auth`.

### GET /razorpay/config

- **Description**: Return Razorpay public configuration (e.g., key id).
- **Auth**: `auth`.

### POST /razorpay/order

- **Description**: Create a Razorpay order.
- **Auth**: `auth`.

---

## Service Verification & Slots (serviceVerifyRoutes, serviceSlotRoutes)

### POST /service/verify

- **Description**: Verify that a user has purchased a service.
- **Auth**: `auth`.

### GET /serviceverifcation

- **Description**: Admin view of all service verifications.
- **Auth**: `auth`, `requireAdmin`.

### POST /serviceverifier

- **Description**: Public endpoint to verify a service slot (by code, etc.).
- **Auth**: None.

---

## Saved Jobs (savedJobsRoutes)

### POST /savedjobs

- **Description**: Save a job for a user.
- **Auth**: `auth`.
- **Body**: `{ userId, jobId }`.

### GET /getsavedjobs/:userid

- **Description**: Get saved jobs for a user.
- **Auth**: `auth`.

### DELETE /savedjobs

- **Description**: Remove a saved job for a user.
- **Auth**: `auth`.
- **Body**: `{ userId, jobId }`.

---

## Interview Kits (interviewKitRoutes)

### POST /interviewkit

- **Description**: Create an interview kit.
- **Auth**: `auth`, `requireAdmin`.

### GET /getinterviewkit

- **Description**: List all kits (admin).
- **Auth**: `auth`, `requireAdmin`.

### GET /getinterviewkit/public

- **Description**: Public list of published kits.
- **Auth**: None.

### GET /interviewkit/:kitid

- **Description**: Get a single kit (details).
- **Auth**: `auth`.

### GET /interviewkit/:kitid/access

- **Description**: Check access for current user.
- **Auth**: `auth`, `requireUser`.

### POST /interviewkit/verify

- **Description**: Verify Razorpay purchase of a kit and grant access.
- **Auth**: `auth`, `requireUser`.

### PUT /interviewkit/:kitid

- **Description**: Edit kit.
- **Auth**: `auth`, `requireAdmin`.

### DELETE /interviewkit/:kitid

- **Description**: Delete kit.
- **Auth**: `auth`, `requireAdmin`.

---

## Project Ideas (projectIdeasRoutes)

### POST /projectideas

- **Description**: Create a project idea.
- **Auth**: `auth`, `requireAdmin`.

### GET /projectideas

- **Description**: Admin list of project ideas.
- **Auth**: `auth`, `requireAdmin`.

### GET /projectideas/public

- **Description**: Public list of published project ideas.
- **Auth**: None.

### PUT /editproject/:projectid

- **Description**: Edit project idea.
- **Auth**: `auth`, `requireAdmin`.

### DELETE /projectideas/:projectid

- **Description**: Delete project idea.
- **Auth**: `auth`, `requireAdmin`.

---

## Learning Resources, Blogs, Events, Hackathons (learningResourcesRoutes, blogsRoutes, eventsRoutes, hackathonsRoutes)

### Learning resources

- **POST /learningresources** – create (admin only).
- **GET /learningresources** – admin list (auth + admin).
- **GET /learningresources/public** – public list.
- **PUT /editlearning/:resourceid** – edit (auth + admin).
- **DELETE /learningresources/:resourceid** – delete (auth + admin).

### Blogs

- **POST /blogs** – create (auth + admin).
- **GET /blogs** – admin list.
- **GET /blogs/public** – public list.
- **PUT /blog/:blogid** – edit (auth + admin).
- **DELETE /blog/:blogid** – delete (auth + admin).

### Events

- **POST /events** – create (auth + admin).
- **GET /getevents** – admin list (auth + admin).
- **GET /events/public** – public list.
- **PUT /events/:eventid** – edit (auth + admin).
- **DELETE /events/:eventid** – delete (auth + admin).

### Hackathons

- **POST /hackathon** – create (auth + admin).
- **GET /gethackathon** – admin list (auth + admin).
- **GET /hackathon/public** – public list.
- **PUT /hackathon/:hackathonid** – edit (auth + admin).
- **DELETE /hackathon/:hackathonid** – delete (auth + admin).

---

## Sponsorship Marquee (sponsorshipMarqueeRoutes)

- **POST /sponsorshipMarquee** – create entry (auth + admin).
- **GET /getSponsorshipMarquee** – public list.
- **DELETE /sponsorshipMarquee/:id** – delete (auth + admin).

---

## User Feedback (userFeedbackRoutes)

- **POST /submitfeedback** – public feedback submission.
- **GET /getallfeedback** – admin list (auth + admin).
- **DELETE /feedback/:feedbackid** – delete a feedback (auth + admin).

---

## Premium PDFs (premiumPdfRoutes)

- **GET /getpremiumpdf** – public list of premium PDFs from R2.
- **DELETE /premiumpdf** – admin bulk delete of all objects under `premiumpdf/` (auth + admin).

---

## Cron-style Endpoints (cronRoutes)

These are intended to be triggered by a scheduler or admin panel.

- **POST /alertuser** – send alerts to users (auth + admin).
- **POST /endUser** – apply end-of-plan or similar logic (auth + admin).

---

## Notifications (notificationRoutes)

All routes are mounted under `/notifications`.

- **POST /notifications/init** – initialize notification tables (auth + admin).
- **GET /notifications/user/:userId** – list notifications for a user (auth).
- **GET /notifications/user/:userId/unread-count** – get unread count (auth).
- **PATCH /notifications/:notificationId/read** – mark notification as read (auth).
- **PATCH /notifications/user/:userId/read-all** – mark all as read for a user (auth).
- **POST /notifications/** – create a notification (auth + admin).
- **POST /notifications/global** – create a notification for all users (auth + admin).

---

## Health & Default

### GET /health

- **Description**: Health check for the server.
- **Auth**: None.
- **Response**: `{ status: 'ok', time: <ISO string> }`.

### 404 handler

- Any undefined route returns:
  - 404 `{ error: 'Not found' }`.
