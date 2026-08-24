# Task Management API — Implementation Plan

## Goal
Backend-only REST API for user task management. Focus: clean database design,
correct auth/ownership handling, derived task status, and aggregated dashboard
data. Keep everything simple and explainable.

## Stack
- Node.js + Express
- MySQL + mysql2
- JWT (auth) + bcrypt (password hashing)
- Postman for manual testing

## Phase 1 — Project setup
- [x] Init repo, package.json, .env (DB creds, JWT secret)
- [x] Folder structure: config / controllers / services / routes / middleware / utils
- [x] Connect to MySQL, confirm connection on server start

## Phase 2 — Database ✅
Create migration for two tables:

```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  priority ENUM('low','medium','high') DEFAULT 'medium',
  due_date DATETIME,
  completed_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_user_due (user_id, due_date)
);
```

Notes:
- No `status` column. Status is derived from `completed_at` and `due_date`, not stored.
- Indexes support the two things every query filters/sorts by: the owning user, and due date.

## Phase 3 — Auth ✅
- [x] `POST /api/auth/register` — hash password with bcrypt, insert user
- [x] `POST /api/auth/login` — verify password, issue JWT
- [x] `GET /api/auth/me` — return current user from token
- [x] `authMiddleware` — verifies JWT, attaches `req.userId`. Every protected
      route reads the user from this, never from the request body.

## Phase 4 — Tasks CRUD ✅
- [x] `POST /api/tasks` — create task for `req.userId`
- [x] `GET /api/tasks` — list current user's tasks, support `?status=` and `?due=`
      (`?due=` accepts `today`, `week`, or an exact `YYYY-MM-DD`)
- [x] `GET /api/tasks/:id` — single task, query always includes `AND user_id = ?`
- [x] `PATCH /api/tasks/:id` — update, same ownership check
- [x] `PATCH /api/tasks/:id/complete` — sets `completed_at = NOW()`
- [x] `DELETE /api/tasks/:id` — same ownership check

A task owned by someone else returns 404 (not 403), so the API never reveals
that another user's task exists.

Ownership rule (applies to every task query):
```sql
SELECT * FROM tasks WHERE id = ? AND user_id = ?
```

## Phase 5 — Status logic (derived, not stored) ✅
Implemented as `STATUS_SQL` in `src/services/taskService.js` (needed by the
Phase 4 `?status=` filter). Computed in the query, not looped over in JS:
```sql
CASE
  WHEN completed_at IS NOT NULL THEN 'COMPLETED'
  WHEN due_date < NOW() THEN 'OVERDUE'
  ELSE 'PENDING'
END AS status
```
Used both for `GET /api/tasks?status=overdue` filtering and for the dashboard.

## Phase 6 — Dashboard
- [ ] `GET /api/dashboard` — one aggregate query, no per-task JS math:
```sql
SELECT
  COUNT(*) AS totalTasks,
  SUM(completed_at IS NOT NULL) AS completedTasks,
  SUM(completed_at IS NULL AND due_date >= NOW()) AS pendingTasks,
  SUM(completed_at IS NULL AND due_date < NOW()) AS overdueTasks,
  SUM(completed_at IS NULL AND DATE(due_date) = CURDATE()) AS dueToday
FROM tasks
WHERE user_id = ?
```

## Phase 7 — Validation & error handling
- [ ] Basic input checks: `title` required, `due_date` valid, `priority` in allowed set
- [ ] `errorMiddleware` — consistent JSON error shape, correct status codes
      (400 validation, 401 unauthenticated, 403/404 not-owned, 500 server)

## Phase 8 — Manual testing (Postman)
- [ ] Register / login flow
- [ ] Create, list, filter, complete, delete tasks
- [ ] Confirm a second user cannot read/update/delete the first user's task
- [ ] Confirm dashboard numbers match manually counted tasks

## Explicit simplifications (state these if asked)
- Single JWT access token, no refresh token flow
- Due-date comparisons assume UTC, no per-user timezone handling. Enforced in
  `src/config/db.js`: mysql2 uses `timezone: 'Z'` and each connection runs
  `SET time_zone = '+00:00'` so `NOW()`/`CURDATE()` are UTC too.
- No pagination on task list (fine at this scale, would add `LIMIT/OFFSET` later)
