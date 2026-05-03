# Security Measures (Backend + Frontend)

This document summarizes the security mechanisms implemented in the system, with pointers to the implementation locations.

## 1) User Login System

### Password Security (Salting + Hashing)

- The system uses Django’s built-in password hashing (salted, one-way hash). Passwords are never stored as plain text.
- Hashing algorithm (Django default): `PBKDF2` using `HMAC-SHA256` (i.e., Django’s `PBKDF2PasswordHasher`). Each password hash includes a per-user random salt and a work factor (iterations) to slow down brute-force attacks.
- User accounts are created via `create_user(...)`, which calls Django’s `set_password(...)` under the hood.

Implementation pointers:
- User model: `User(AbstractUser)` in backend/authentication/models.py
- Registration uses `Patient.objects.create_user(...)` and `Doctor.objects.create_user(...)` in backend/authentication/services/authService.py
- Django password validators are enabled in backend/backend/settings.py (`AUTH_PASSWORD_VALIDATORS`)

### Password Policy / Strength Validation

On registration, passwords are validated by:

- Custom rules: min 8 / max 128, must include uppercase + lowercase + number, no whitespace.
- Django’s standard validators: similarity, minimum length, common-password, numeric-only.

Implementation pointers:
- Custom password validation: backend/authentication/serializers.py (`PasswordValidationMixin.validate_password`)
- Django validators configuration: backend/backend/settings.py (`AUTH_PASSWORD_VALIDATORS`)

## 2) Authentication Mechanism 

The API uses JWT-based authentication (via `djangorestframework-simplejwt`):

- Access token: short-lived token used for authenticated API calls.
- Refresh token: long-lived token used to obtain a new access token.
- Refresh rotation: a new refresh token is minted when refreshing.
- Blacklisting: old refresh tokens are blacklisted after rotation and on logout.

Implementation pointers:
- JWT configuration: backend/backend/settings.py (`REST_FRAMEWORK`, `SIMPLE_JWT`)
- Login / refresh / logout flows: backend/authentication/views.py and backend/authentication/services/authService.py
- Token blacklist app enabled: backend/backend/settings.py (`rest_framework_simplejwt.token_blacklist`)

### Refresh Token Storage (HttpOnly Cookie) + CSRF Protection

The system supports cookie-based refresh/logout flows:

- Refresh token is stored in an `HttpOnly` cookie under `/api/auth/`.
- A separate CSRF cookie (readable by the browser) is set alongside the refresh cookie.
- When the refresh token is taken from cookies, the client must also send a matching CSRF header (`X-Auth-CSRF` by default).
- CSRF comparison is done using constant-time comparison (`secrets.compare_digest`) to reduce timing attacks.

Implementation pointers:
- Cookie + CSRF handling: backend/authentication/views.py (`_set_refresh_cookie`, `_set_csrf_cookie`, `_validate_cookie_csrf`)
- CORS header allow-list includes `x-auth-csrf`: backend/backend/settings.py (`CORS_ALLOW_HEADERS`)

### Frontend Token Handling

- The frontend stores the access token in `localStorage` and sends it in the `Authorization: Bearer <token>` header for non-auth API calls.
- The frontend enables `withCredentials: true`, so the browser will include cookies when calling the API (needed for cookie-based refresh/logout flows).
- The backend provides a refresh endpoint (`/api/auth/refresh-token/`), but the current frontend code does not automatically call it when access tokens expire.

Implementation pointers:
- Axios client + bearer injection: frontend/src/services/api.js
- Login stores token and user: frontend/src/services/auth.service.js

## 3) Authorization System (RBAC) 

The system uses Role-Based Access Control using Django Groups:

- Roles:
  - `Patient`
  - `Doctor`
  - `MasterUser` (admin role)
- Admin users are defined as either:
  - Django `is_superuser`, or
  - A user in the `MasterUser` group.

How RBAC is enforced:

- Group assignment on registration:
  - Patients are added to the `Patient` group.
  - Doctors are added to the `Doctor` group.
- Protected endpoints use DRF’s `IsAuthenticated` / `IsAuthenticatedOrReadOnly`.
- Fine-grained access checks are performed in view logic (e.g., only doctors can complete appointments, only patients can book, admin can view all).

Implementation pointers:
- Group assignment: backend/authentication/services/authService.py (adds users to `Doctor` / `Patient` groups)
- Admin/role helpers + permissions classes: backend/clinic_management/permissions.py
- Endpoint enforcement: backend/clinic_management/views.py (repeated checks using `is_admin_user(...)`, `get_doctor_for_user(...)`, `get_patient_for_user(...)`)

## 4) User Permissions Management 

User and role management is supported through:

- Django Admin (`/admin/`) for privileged administrators.
- Admin-only API endpoints (require authenticated admin):
  - Manage users (list/view/delete, partial update like `is_active`)
  - Manage doctors (list/view/delete, partial update)
  - Manage appointments and reviews (admin listing + delete, admin edits)

Implementation pointers:
- Admin route enabled: backend/backend/urls.py (`path("admin/", ...)`)
- Admin API viewsets: backend/clinic_management/views.py (`AdminUserViewSet`, `AdminDoctorViewSet`, etc.)

## 5) Additional Security Controls (Implemented)

### Input Validation & Normalization

- Email is normalized to lowercase (reduces duplicate-account edge cases).
- Phone numbers are validated with a strict regex.
- Numeric fields (e.g., years of experience) are validated as integers and constrained to non-negative values.

Implementation pointers:
- Validation mixins and serializers: backend/authentication/serializers.py
- Model-level regex validation for phone: backend/authentication/models.py

### CORS / CSRF Trusted Origins

- CORS is restricted to local frontend origins (dev setup).
- CSRF trusted origins are explicitly configured.

Implementation pointers:
- CORS + CSRF settings: backend/backend/settings.py
- Environment-driven CSRF origins: backend/.env



