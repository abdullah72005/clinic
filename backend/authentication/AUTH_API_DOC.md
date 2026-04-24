# Auth API Contract

This document is the frontend-facing auth API contract.

Last updated: 2026-04-24

## Endpoint Status

| Endpoint | Method | Status |
| --- | --- | --- |
| /api/auth/register-patient and /api/auth/register-patient/ | POST | Implemented |
| /api/auth/register-doctor and /api/auth/register-doctor/ | POST | Implemented |
| /api/auth/login and /api/auth/login/ | POST | Implemented |
| /api/auth/refresh-token and /api/auth/refresh-token/ | POST | Implemented |
| /api/auth/logout and /api/auth/logout/ | POST | Implemented |

## Common Response Envelope

Current implemented endpoints return this shape:

```json
{
  "status": "success | error",
  "message": "human readable summary",
  "data": {},
  "errors": {}
}
```

Notes:

- status and message are always present.
- data is returned on success.
- errors is returned on failures.

## Implemented Endpoints

## 1) Register Patient

- Method: POST
- URL (canonical): /api/auth/register-patient/
- Also accepted: /api/auth/register-patient
- Auth required: No

Request body:

```json
{
  "first_name": "Ali",
  "last_name": "Hassan",
  "email": "patient@example.com",
  "password": "StrongPass123",
  "phoneNo": "01012345678",
  "medical_notes": "Diabetic"
}
```

Required fields:

- first_name
- last_name
- email
- password

Optional fields:

- phoneNo
- medical_notes

Success response (201 Created):

```json
{
  "status": "success",
  "message": "Patient registered successfully",
  "data": {
    "userId": "uuid",
    "email": "patient@example.com",
    "fullName": "Ali Hassan",
    "createdAt": "2026-04-19T10:15:30.000000+00:00"
  }
}
```

Error responses:

- 400 Bad Request for serializer validation errors.
- 409 Conflict when email already exists.
- 500 Internal Server Error for unexpected failures.

Duplicate email response example:

```json
{
  "status": "error",
  "message": "Email already registered",
  "errors": {
    "email": ["auth.email.exists"]
  }
}
```

Validation error example:

```json
{
  "status": "error",
  "message": "Validation failed",
  "errors": {
    "password": [
      "auth.password.minLength",
      "auth.password.uppercase",
      "auth.password.number"
    ]
  }
}
```

## 2) Register Doctor

- Method: POST
- URL (canonical): /api/auth/register-doctor/
- Also accepted: /api/auth/register-doctor
- Auth required: No

Request body:

```json
{
  "first_name": "Mona",
  "last_name": "Khaled",
  "email": "doctor@example.com",
  "password": "StrongPass123",
  "specialization": "Cardiology",
  "location": "Cairo",
  "phoneNo": "01012345678",
  "bio": "Experienced doctor"
}
```

Required fields:

- first_name
- last_name
- email
- password
- specialization
- location

Optional fields:

- phoneNo
- bio

Success response (201 Created):

```json
{
  "status": "success",
  "message": "Doctor registered successfully",
  "data": {
    "userId": "uuid",
    "email": "doctor@example.com",
    "fullName": "Mona Khaled",
    "createdAt": "2026-04-19T10:15:30.000000+00:00",
    "specialization": "Cardiology",
    "bio": "Experienced doctor",
    "location": "Cairo"
  }
}
```

Error behavior matches Register Patient.

## Password Rules Used by Register Endpoints

- Minimum length: 8
- Maximum length: 128
- Must include uppercase letter
- Must include lowercase letter
- Must include number
- No spaces
- Django password validators also apply

## 3) Login

- Method: POST
- URL (canonical): /api/auth/login/
- Also accepted: /api/auth/login
- Auth required: No

Request body:

```json
{
  "email": "doctor@example.com",
  "password": "StrongPass123"
}
```

Success response (200 OK):

```json
{
  "status": "success",
  "message": "Login successful.",
  "data": {
    "userId": "uuid",
    "email": "doctor@example.com",
    "fullName": "Dr John Doe",
    "access_token": "<jwt_access_token>",
    "refresh_token": "<jwt_refresh_token>",
    "access_token_expires_in": 3600
  }
}
```

Error responses:

- 400 Bad Request for validation errors.
- 401 Unauthorized for invalid email/password.
- 500 Internal Server Error for unexpected failures.

## 4) Refresh Token

- Method: POST
- URL (canonical): /api/auth/refresh-token/
- Also accepted: /api/auth/refresh-token
- Auth required: No

Request body:

```json
{
  "refresh_token": "<token>"
}
```

Notes:

- refresh_token can be sent in body or via httpOnly cookie.
- On success, refresh token is rotated and a new refresh token is returned.
- If refresh_token is sent via cookie fallback, request must include X-Auth-CSRF header that matches auth_csrf cookie value.

Success response (200 OK):

```json
{
  "status": "success",
  "message": "Access token refreshed successfully.",
  "data": {
    "access_token": "<jwt_access_token>",
    "refresh_token": "<jwt_refresh_token>",
    "access_token_expires_in": 3600
  }
}
```

Error responses:

- 400 Bad Request if refresh token is missing.
- 401 Unauthorized if refresh token is invalid or expired.
- 500 Internal Server Error for unexpected failures.

## 5) Logout

- Method: POST
- URL (canonical): /api/auth/logout/
- Also accepted: /api/auth/logout
- Auth required: No

Request body:

```json
{
  "refresh_token": "<token>"
}
```

Notes:

- refresh_token can be sent in body or via httpOnly cookie.
- If refresh_token is sent via cookie fallback, request must include X-Auth-CSRF header that matches auth_csrf cookie value.

## Cookie Fallback Deployment Notes

To use cookie fallback from a cross-origin frontend (for example frontend and backend on different origins):

- Set DJANGO_CORS_ALLOW_CREDENTIALS=true.
- Configure AUTH_REFRESH_COOKIE_SAMESITE=None and AUTH_REFRESH_COOKIE_SECURE=true.
- Configure AUTH_CSRF_COOKIE_SAMESITE=None and AUTH_CSRF_COOKIE_SECURE=true.
- Send frontend requests with credentials included.

Success response (200 OK):

```json
{
  "status": "success",
  "message": "Logged out successfully.",
  "data": {
    "logged_out": true
  }
}
```

Error responses:

- 400 Bad Request if refresh token is missing.
- 401 Unauthorized if refresh token is invalid or expired.
- 500 Internal Server Error for unexpected failures.

## Changelog

- v0.4 (2026-04-24): Added CSRF protection for cookie-based refresh/logout and documented cross-origin cookie deployment requirements.
- v0.3 (2026-04-24): Implemented login, refresh-token, and logout endpoints with JWT rotation and logout revocation.
- v0.2 (2026-04-19): Updated register endpoints to match current backend implementation and marked login/refresh/logout as planned.
- v0.1 (2026-04-19): Initial draft.