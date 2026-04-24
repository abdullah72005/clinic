# Clinic API Contract

Frontend integration contract for clinic features under `api/clinic`.

Last updated: 2026-04-24

## Base URL

- Base prefix: `/api/clinic/`
- Canonical endpoints use trailing slash (`/`).

## Authentication

- Protected endpoints require JWT access token from the auth module.
- Auth API details (register/login/refresh/logout): `backend/authentication/AUTH_API_DOC.md`
- Header format:

```http
Authorization: Bearer <access_token>
```

- Public endpoints are explicitly marked below.

## Response Format

Clinic endpoints use standard DRF responses (not the auth envelope).

- Success: resource JSON or paginated JSON.
- Validation errors (`400`):

```json
{
  "fieldName": ["error message"]
}
```

- Permission errors (`403`):

```json
{
  "detail": "Permission message"
}
```

- Unauthenticated (`401`):

```json
{
  "detail": "Authentication credentials were not provided."
}
```

## Pagination

Paginated endpoints return:

```json
{
  "count": 0,
  "next": null,
  "previous": null,
  "results": []
}
```

- Default `page_size`: `10`
- Query params:
  - `page`
  - `page_size` (max `100`)

## Time Handling

- Server stores times in UTC.
- `TimeSlot.startTime` and `TimeSlot.endTime` are stored UTC `HH:MM:SS` values.
- `TimeSlot.startDateTime` and `TimeSlot.endDateTime` are returned as timezone-aware datetimes and support conversion using query param:
  - `timezone=<IANA tz name>` (example: `Africa/Cairo`)
  - invalid timezone falls back to `UTC`

## Role Rules (Current Implementation)

- `Patient` group: patient flows.
- `Doctor` group: doctor flows.
- Admin access: Django superuser OR `MasterUser` group.

## Endpoint Index

| Endpoint | Method | Auth |
| --- | --- | --- |
| `/api/clinic/doctors/` | GET | Public |
| `/api/clinic/doctors/{doctorId}/` | GET | Public |
| `/api/clinic/doctors/{doctorId}/reviews/` | GET | Public |
| `/api/clinic/doctors/{doctorId}/available-time-slots/` | GET | Public |
| `/api/clinic/doctor-schedules/` | GET, POST | Authenticated (doctor scoped) |
| `/api/clinic/doctor-schedules/recurring/` | POST | Doctor |
| `/api/clinic/appointments/` | GET | Authenticated (scoped) |
| `/api/clinic/appointments/{id}/` | GET | Authenticated (scoped) |
| `/api/clinic/appointments/book/` | POST | Patient |
| `/api/clinic/appointments/{id}/cancel/` | POST | Patient owner or Admin |
| `/api/clinic/appointments/{id}/complete/` | POST | Doctor owner |
| `/api/clinic/appointments/{id}/create-next/` | POST | Doctor owner |
| `/api/clinic/appointments/today/` | GET | Doctor |
| `/api/clinic/appointments/upcoming-week/` | GET | Doctor |
| `/api/clinic/reviews/` | GET, POST | GET public, POST patient |
| `/api/clinic/reviews/{id}/` | GET | Public |
| `/api/clinic/diagnoses/` | GET, POST | Scoped / Doctor create |
| `/api/clinic/diagnoses/{id}/` | GET, PUT, PATCH | Scoped |
| `/api/clinic/prescriptions/` | GET, POST | Scoped / Doctor create |
| `/api/clinic/prescriptions/{id}/` | GET, PUT, PATCH | Scoped |
| `/api/clinic/medical-history/me/` | GET | Patient |
| `/api/clinic/patients/{patientId}/medical-history/` | GET | Doctor (booked patient) or Admin |
| `/api/clinic/admin/users/` | GET | Admin |
| `/api/clinic/admin/users/{id}/` | GET, PATCH, DELETE | Admin |
| `/api/clinic/admin/doctors/` | GET | Admin |
| `/api/clinic/admin/doctors/{id}/` | GET, PATCH, DELETE | Admin |
| `/api/clinic/admin/appointments/` | GET | Admin |
| `/api/clinic/admin/appointments/{id}/` | GET, PATCH, DELETE | Admin |
| `/api/clinic/admin/reviews/` | GET | Admin |
| `/api/clinic/admin/reviews/{id}/` | GET, DELETE | Admin |

---

## 1) Doctors

### GET `/api/clinic/doctors/`

Public doctor search/list (paginated).

Query params:

- `location` (partial, case-insensitive)
- `specialization` (partial, case-insensitive)
- `name` (partial, case-insensitive across first name, last name, full name)
- `yearsOfExperience` (exact integer match)
- `page`, `page_size`

Validation:

- `yearsOfExperience` non-integer -> `400`

Doctor object:

```json
{
  "userId": "uuid",
  "email": "doctor@example.com",
  "first_Name": "Mona",
  "last_Name": "Khaled",
  "phoneNo": "01012345678",
  "createdAt": "2026-04-24T12:00:00Z",
  "specialization": "Cardiology",
  "bio": "Experienced doctor",
  "location": "Cairo",
  "yearsOfExperience": 10,
  "averageRating": 4.5,
  "role": "doctor"
}
```

### GET `/api/clinic/doctors/{doctorId}/`

Public doctor profile.

- Same fields as list item.

### GET `/api/clinic/doctors/{doctorId}/reviews/`

Public doctor reviews (paginated).

- Ordered by newest first (`createdAt` descending).

### GET `/api/clinic/doctors/{doctorId}/available-time-slots/`

Public available slots for a doctor (paginated).

- Returns only `status = available`.
- Excludes past slots.
- Query param `timezone` affects `startDateTime` and `endDateTime`.

Time slot object:

```json
{
  "id": "uuid",
  "scheduleId": "uuid",
  "doctorId": "uuid",
  "date": "2026-04-30",
  "startTime": "09:00:00",
  "endTime": "09:30:00",
  "startDateTime": "2026-04-30T12:00:00+03:00",
  "endDateTime": "2026-04-30T12:30:00+03:00",
  "status": "available"
}
```

---

## 2) Doctor Schedules

### GET `/api/clinic/doctor-schedules/`

Doctor-only list of own schedules (paginated).

- Non-doctor authenticated users receive an empty list.

### POST `/api/clinic/doctor-schedules/`

Doctor-only create a single schedule and auto-generate 30-minute slots.

Request:

```json
{
  "date": "2026-04-30",
  "startTime": "09:00:00",
  "endTime": "12:00:00"
}
```

Validation:

- `startTime` must be before `endTime`
- overlapping schedule on same date is rejected

Response `201` includes generated `timeSlots` and fixed `slotDuration = 30`.

### POST `/api/clinic/doctor-schedules/recurring/`

Doctor-only recurring schedule creation.

Request:

```json
{
  "startDate": "2026-05-01",
  "endDate": "2026-05-31",
  "workingDays": [0, 2, 4],
  "startTime": "09:00:00",
  "endTime": "12:00:00"
}
```

Notes:

- `workingDays` uses Python weekday numbering: `0=Monday ... 6=Sunday`
- `workingDays` values must be unique
- `startDate <= endDate`

---

## 3) Appointments

Appointment status values:

- `booked`
- `cancelled`
- `completed`

### GET `/api/clinic/appointments/`

Paginated list, role-scoped:

- Patient: own appointments only
- Doctor: own appointments only
- Admin: all appointments
- Any other authenticated user type: empty list

### GET `/api/clinic/appointments/{id}/`

Role-scoped retrieve.

Appointment object:

```json
{
  "id": "uuid",
  "doctorId": "uuid",
  "patientId": "uuid",
  "timeSlotId": "uuid",
  "timeSlot": {
    "id": "uuid",
    "scheduleId": "uuid",
    "doctorId": "uuid",
    "date": "2026-04-30",
    "startTime": "09:00:00",
    "endTime": "09:30:00",
    "startDateTime": "2026-04-30T09:00:00+00:00",
    "endDateTime": "2026-04-30T09:30:00+00:00",
    "status": "reserved"
  },
  "status": "booked",
  "notes": "Initial checkup",
  "createdAt": "2026-04-24T12:00:00Z"
}
```

### POST `/api/clinic/appointments/book/`

Patient-only booking.

Request:

```json
{
  "timeSlotId": "uuid",
  "notes": "optional"
}
```

Rules:

- Atomic transactional booking
- Fails if slot does not exist, already reserved, or in the past
- On success:
  - `TimeSlot.status -> reserved`
  - `Appointment.status -> booked`

### POST `/api/clinic/appointments/{id}/cancel/`

Allowed for:

- patient owner
- admin

Rules:

- only `booked` appointments can be cancelled
- on success:
  - `Appointment.status -> cancelled`
  - `TimeSlot.status -> available`

### POST `/api/clinic/appointments/{id}/complete/`

Doctor owner only.

Rules:

- only `booked` appointments can be completed
- on success: `Appointment.status -> completed`

### POST `/api/clinic/appointments/{id}/create-next/`

Doctor owner only, follow-up booking for same patient.

Request:

```json
{
  "timeSlotId": "uuid",
  "notes": "optional"
}
```

Rules:

- source appointment must belong to doctor
- source appointment must already be `completed`
- target `timeSlotId` must belong to the same doctor
- follow-up booking uses the same booking validation rules as normal booking

### GET `/api/clinic/appointments/today/`

Doctor-only, paginated, today's appointments.

### GET `/api/clinic/appointments/upcoming-week/`

Doctor-only, paginated, date window `[today .. today+7 days]`.

---

## 4) Reviews

### GET `/api/clinic/reviews/`

Public paginated list of reviews.

Query params:

- `doctorId` (optional filter)

Validation:

- invalid `doctorId` UUID -> `400`

### GET `/api/clinic/reviews/{id}/`

Public review retrieve.

### POST `/api/clinic/reviews/`

Patient-only create review.

Request:

```json
{
  "appointmentId": "uuid",
  "rating": 5,
  "comment": "Excellent"
}
```

Rules:

- appointment must belong to patient
- appointment must be `completed`
- one review per appointment
- `rating` must be integer `1..5`

Response `201`:

```json
{
  "review": {
    "id": "uuid",
    "doctorId": "uuid",
    "patientId": "uuid",
    "appointmentId": "uuid",
    "rating": 5,
    "comment": "Excellent",
    "createdAt": "2026-04-24T12:00:00Z"
  },
  "doctorAverageRating": 4.67
}
```

---

## 5) Diagnoses

### GET `/api/clinic/diagnoses/`

Paginated and role-scoped:

- Patient: own diagnoses
- Doctor: own diagnoses
- Admin: all diagnoses
- Any other authenticated user type: empty list

### GET `/api/clinic/diagnoses/{id}/`

Role-scoped retrieve.

### POST `/api/clinic/diagnoses/`

Doctor-only create diagnosis.

Request:

```json
{
  "appointmentId": "uuid",
  "diagnosis": "Hypertension"
}
```

Rules:

- appointment must belong to doctor
- appointment must be `completed`

Current create behavior:

- uses upsert by `(appointmentId, doctorId)`
- creating again for same appointment+doctor updates existing diagnosis

### PUT/PATCH `/api/clinic/diagnoses/{id}/`

Update diagnosis text.

Request:

```json
{
  "diagnosis": "Updated diagnosis"
}
```

Rules:

- doctor can update only diagnoses created by that doctor
- admin can update any diagnosis

Access behavior:

- if a doctor requests a diagnosis they do not own by ID, response is `404`

---

## 6) Prescriptions

### GET `/api/clinic/prescriptions/`

Paginated and role-scoped:

- Patient: own prescriptions
- Doctor: own prescriptions
- Admin: all prescriptions
- Any other authenticated user type: empty list

### GET `/api/clinic/prescriptions/{id}/`

Role-scoped retrieve.

### POST `/api/clinic/prescriptions/`

Doctor-only create prescription.

Request:

```json
{
  "appointmentId": "uuid",
  "prescription": "Drug A",
  "dose": "5mg",
  "duration": "14 days",
  "isPermanent": false
}
```

Rules:

- appointment must belong to doctor
- appointment must be `completed`

Current create behavior:

- uses upsert by `(appointmentId, doctorId)`
- creating again for same appointment+doctor updates existing prescription

### PUT/PATCH `/api/clinic/prescriptions/{id}/`

Doctor owner or admin can update.

Allowed fields:

- `prescription`
- `dose`
- `duration`
- `isPermanent`

---

## 7) Medical History

### GET `/api/clinic/medical-history/me/`

Patient-only endpoint for own history.

### GET `/api/clinic/patients/{patientId}/medical-history/`

Allowed for:

- admin
- doctor who has at least one appointment with that patient

Response shape:

```json
{
  "medicalRecordId": "uuid",
  "patientId": "uuid",
  "appointments": [],
  "diagnoses": [],
  "prescriptions": []
}
```

---

## 8) Admin Endpoints

Admin means Django superuser or `MasterUser` group.

### Users

- `GET /api/clinic/admin/users/` (paginated)
- `GET /api/clinic/admin/users/{id}/`
- `PATCH /api/clinic/admin/users/{id}/`
- `DELETE /api/clinic/admin/users/{id}/`

Allowed PATCH fields:

- `first_Name` or `first_name`
- `last_Name` or `last_name`
- `phoneNo`
- `is_active`

### Doctors

- `GET /api/clinic/admin/doctors/` (paginated)
- `GET /api/clinic/admin/doctors/{id}/`
- `PATCH /api/clinic/admin/doctors/{id}/`
- `DELETE /api/clinic/admin/doctors/{id}/`

Allowed PATCH fields:

- `specialization`
- `bio`
- `location`
- `yearsOfExperience` (integer, `>= 0`)
- `is_active`

### Appointments

- `GET /api/clinic/admin/appointments/` (paginated)
- `GET /api/clinic/admin/appointments/{id}/`
- `PATCH /api/clinic/admin/appointments/{id}/`
- `DELETE /api/clinic/admin/appointments/{id}/`

PATCH body supports:

- `status`
- `notes`

Status transition rules in PATCH:

- only appointments currently in `booked` status can change status
- allowed new statuses: `cancelled`, `completed`
- setting status to `cancelled` reopens slot (`TimeSlot.status = available`)

### Reviews

- `GET /api/clinic/admin/reviews/` (paginated)
- `GET /api/clinic/admin/reviews/{id}/`
- `DELETE /api/clinic/admin/reviews/{id}/`

---

## Typical Status Codes

- `200` successful GET/PATCH/POST action (non-create)
- `201` successful create
- `204` successful delete
- `400` validation/business-rule error
- `401` unauthenticated
- `403` role/access denied
- `404` resource not found

---

## Verification Notes

This document was validated against the current backend implementation by:

- route/method introspection of DRF router registrations in `clinic_management.urls`
- code-level validation of serializers, viewsets, and service rules
- full backend test run (`python manage.py test`) passing after final changes
