# Auth API Contract

This document is the frontend-facing auth API contract.

Last updated: 2026-04-19

## Endpoint Status

| Endpoint | Method | Status |
| --- | --- | --- |
| /api/auth/register-patient and /api/auth/register-patient/ | POST | Implemented |
| /api/auth/register-doctor and /api/auth/register-doctor/ | POST | Implemented |
| /api/auth/login | POST | Planned (not implemented yet) |
| /api/auth/refresh-token | POST | Planned (not implemented yet) |
| /api/auth/logout | POST | Planned (not implemented yet) |

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

## Planned Endpoints (Not Implemented Yet)

These endpoints stay in the contract so frontend work can continue, but they are currently not available on backend.

## 3) Login (Planned)

- Method: POST
- URL: /api/auth/login
- Status: Planned

Planned request body:

```json
{
  "email": "doctor@example.com",
  "password": "StrongPass123"
}
```

Planned success response:

```json
{
  "status": "success",
  "message": "Login successful.",
  "data": {
    "userId": "uuid",
    "email": "doctor@example.com",
    "fullName": "Dr John Doe"
  }
}
```

## 4) Refresh Token (Planned)

- Method: POST
- URL: /api/auth/refresh-token
- Status: Planned

Planned request body:

```json
{
  "refresh_token": "<token>"
}
```

Planned success response:

```json
{
  "status": "success",
  "message": "Access token refreshed successfully.",
  "data": {
    "access_token_expires_in": 3600
  }
}
```

## 5) Logout (Planned)

- Method: POST
- URL: /api/auth/logout
- Status: Planned

Planned success response:

```json
{
  "status": "success",
  "message": "Logged out successfully.",
  "data": {
    "logged_out": true
  }
}
```

## Changelog

- v0.2 (2026-04-19): Updated register endpoints to match current backend implementation and marked login/refresh/logout as planned.
- v0.1 (2026-04-19): Initial draft.