# Auth API Contract (Draft)

This document defines the planned authentication API contract so frontend work can proceed before backend implementation is complete.

## Scope

- Register doctor account
- Register patient account
- Login
- Refresh token
- Logout

## Base Path

Use these routes under backend API namespace:

- `POST /api/auth/register-doctor`
- `POST /api/auth/register-patient`
- `POST /api/auth/login`
- `POST /api/auth/refresh-token`
- `POST /api/auth/logout`

## Auth Token Strategy

- `access_token`: JWT used for authenticated API access
- `refresh_token`: JWT used to issue new access tokens

Token lifetime targets:

- Access token: `1 hour`
- Refresh token: `30 days`

## Session/Cookie Behavior

Backend sets `access_token` and `refresh_token` cookies on successful register/login/refresh.

Recommended cookie setup:

- `HttpOnly: true`
- `Secure: true` in production
- `SameSite: Lax` (or `None` if your frontend/backend are cross-site)

Frontend requirement: send requests with credentials enabled.

## Common Response Envelope

All endpoints return JSON with this shape:

```json
{
  "status": "success | error",
  "message": "human readable summary",
  "userdata": {},
  "data": {},
  "errors": {}
}
```

Rules:

- `status` and `message` are always present.
- `userdata` is used for register/login success.
- `data` is used for refresh/logout success.
- `errors` is used for validation or auth failures.
- Omit unused fields or return them as `null` consistently.

Recommended error format:

```json
{
  "status": "error",
  "message": "Validation failed",
  "errors": {
    "email": ["A user with this email already exists."],
    "password": ["Password must be at least 8 characters."]
  }
}
```

## User Data Object

`userdata` example:

```json
{
  "id": 42,
  "name": "username_or_handle",
  "email": "user@example.com",
  "fullname": "Full Name",
  "phone": "+201234567890",
  "role": "doctor",
  "specialization": "cardiology",
  "loc": "Cairo",
  "created_at": "2026-04-19T10:15:30Z"
}
```

Notes:

- For patient users, `specialization` and `loc` are omitted or `null`.
- Include `role` so frontend can branch UI behavior.

## 1) Register Doctor

- Method: `POST`
- URL: `/api/auth/register-doctor`
- Auth required: `No`

Request body:

```json
{
  "name": "dr_john",
  "email": "doctor@example.com",
  "password": "StrongPassword123!",
  "fullname": "Dr John Doe",
  "phone": "+201234567890",
  "specialization": "cardiology",
  "loc": "Cairo"
}
```

Validation guidance:

- `name`: required, unique, 3-50 chars
- `email`: required, unique, valid email format
- `password`: required, min 8 chars (recommended stronger policy)
- `fullname`: required
- `phone`: required, normalized format
- `specialization`: required
- `loc`: required

Success response (`201 Created`):

```json
{
  "status": "success",
  "message": "Doctor registered successfully.",
  "userdata": {
    "id": 1,
    "name": "dr_john",
    "email": "doctor@example.com",
    "fullname": "Dr John Doe",
    "phone": "+201234567890",
    "role": "doctor",
    "specialization": "cardiology",
    "loc": "Cairo"
  }
}
```

Error responses:

- `400 Bad Request` validation error
- `409 Conflict` duplicate email/name (optional, can also be `400`)

## 2) Register Patient

- Method: `POST`
- URL: `/api/auth/register-patient`
- Auth required: `No`

Request body:

```json
{
  "name": "patient_ali",
  "email": "patient@example.com",
  "password": "StrongPassword123!",
  "fullname": "Ali Hassan",
  "phone": "+201112223334"
}
```

Validation guidance:

- `name`: required, unique
- `email`: required, unique, valid format
- `password`: required, min 8 chars
- `fullname`: required
- `phone`: required

Success response (`201 Created`):

```json
{
  "status": "success",
  "message": "Patient registered successfully.",
  "userdata": {
    "id": 2,
    "name": "patient_ali",
    "email": "patient@example.com",
    "fullname": "Ali Hassan",
    "phone": "+201112223334",
    "role": "patient"
  }
}
```

Error responses:

- `400 Bad Request` validation error
- `409 Conflict` duplicate email/name (optional, can also be `400`)

## 3) Login

- Method: `POST`
- URL: `/api/auth/login`
- Auth required: `No`

Request body:

```json
{
  "email": "doctor@example.com",
  "password": "StrongPassword123!"
}
```

Success response (`200 OK`):

```json
{
  "status": "success",
  "message": "Login successful.",
  "userdata": {
    "id": 1,
    "name": "dr_john",
    "email": "doctor@example.com",
    "fullname": "Dr John Doe",
    "phone": "+201234567890",
    "role": "doctor",
    "specialization": "cardiology",
    "loc": "Cairo"
  }
}
```

Error responses:

- `400 Bad Request` missing fields
- `401 Unauthorized` invalid credentials

## 4) Refresh Token

- Method: `POST`
- URL: `/api/auth/refresh-token`
- Auth required: `No`

Request body (required):

```json
{
  "refresh_token": "<token>"
}
```

Success response (`200 OK`):

```json
{
  "status": "success",
  "message": "Access token refreshed successfully.",
  "data": {
    "access_token_expires_in": 3600
  }
}
```

Error responses:

- `401 Unauthorized` missing/invalid/expired refresh token

## 5) Logout

- Method: `POST`
- URL: `/api/auth/logout`
- Auth required: `Optional` (should be idempotent)
- Request body: none

Behavior:

- Backend clears `access_token` and `refresh_token` cookies.

Success response (`200 OK`):

```json
{
  "status": "success",
  "message": "Logged out successfully.",
  "data": {
    "logged_out": true
  }
}
```

## HTTP Status Summary

- `200 OK`: login, refresh, logout success
- `201 Created`: registration success
- `400 Bad Request`: malformed payload, validation failure
- `401 Unauthorized`: bad login or invalid refresh token
- `409 Conflict`: duplicate resource (optional)
- `500 Internal Server Error`: unexpected backend error

## Frontend Integration Notes

- Always send auth requests with `credentials: include` (or Axios `withCredentials: true`).
- Frontend should not read JWTs directly if cookies are `HttpOnly`.
- Use backend `status` and `message` for user feedback.
- Render field-level validation from `errors` object when present.

## Suggested Rounding Decisions (Recommended)

These are optional but recommended to avoid ambiguity during implementation:

- Use one canonical response style where `status` is always string enum: `success` or `error`.
- Keep logout idempotent: return success even if user is already logged out.
- Rotate refresh token on every refresh request for better security.
- Include a `role` field in `userdata` for frontend route guards.
- Normalize phone format server-side (for example E.164).
- Rate-limit login and registration endpoints to reduce abuse.

## Changelog

- `v0.1` (2026-04-19): Initial draft based on planned auth architecture.