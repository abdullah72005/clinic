from datetime import time, timedelta

from django.contrib.auth.models import Group
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from authentication.models import Doctor, Patient, User
from clinic_management.models import (
    Appointment,
    AppointmentStatus,
    DoctorSchedule,
    PatientDiagnosis,
    PatientPrescription,
    Review,
    TimeSlot,
    TimeSlotStatus,
)


class ClinicSystemAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.patient_group, _ = Group.objects.get_or_create(name="Patient")
        self.doctor_group, _ = Group.objects.get_or_create(name="Doctor")
        self.master_group, _ = Group.objects.get_or_create(name="MasterUser")

        self.password = "StrongPass123"
        self.doctor = self._create_doctor(
            "doctor1@example.com", "Nora", "Salem", years=10
        )
        self.other_doctor = self._create_doctor(
            "doctor2@example.com", "Kareem", "Adel", years=7
        )
        self.patient = self._create_patient("patient1@example.com", "Ali", "Hassan")
        self.other_patient = self._create_patient("patient2@example.com", "Sara", "Amr")
        self.admin = self._create_admin("admin@example.com", "Admin", "User")

    def _create_doctor(self, email, first_name, last_name, years):
        doctor = Doctor.objects.create_user(
            username=email,
            email=email,
            password=self.password,
            first_name=first_name,
            last_name=last_name,
            fullName=f"{first_name} {last_name}",
            specialization="Cardiology",
            bio="Senior consultant",
            location="Cairo",
            yearsOfExperience=years,
        )
        doctor.groups.add(self.doctor_group)
        return doctor

    def _create_patient(self, email, first_name, last_name):
        patient = Patient.objects.create_user(
            username=email,
            email=email,
            password=self.password,
            first_name=first_name,
            last_name=last_name,
            fullName=f"{first_name} {last_name}",
            medical_notes="",
        )
        patient.groups.add(self.patient_group)
        return patient

    def _create_admin(self, email, first_name, last_name):
        admin = User.objects.create_user(
            username=email,
            email=email,
            password=self.password,
            first_name=first_name,
            last_name=last_name,
            fullName=f"{first_name} {last_name}",
        )
        admin.groups.add(self.master_group)
        return admin

    def _create_slot(
        self, doctor, slot_date, slot_start, slot_end, status=TimeSlotStatus.AVAILABLE
    ):
        schedule = DoctorSchedule.objects.create(
            doctorId=doctor,
            date=slot_date,
            startTime=slot_start,
            endTime=slot_end,
        )
        slot = TimeSlot.objects.create(
            scheduleId=schedule,
            startTime=slot_start,
            endTime=slot_end,
            status=status,
        )
        return schedule, slot

    def _book_slot(self, patient, slot, notes=""):
        self.client.force_authenticate(user=patient)
        response = self.client.post(
            "/api/clinic/appointments/book/",
            {"timeSlotId": str(slot.id), "notes": notes},
            format="json",
        )
        self.client.force_authenticate(user=None)
        return response

    def _complete_appointment(self, doctor, appointment_id):
        self.client.force_authenticate(user=doctor)
        response = self.client.post(
            f"/api/clinic/appointments/{appointment_id}/complete/", {}, format="json"
        )
        self.client.force_authenticate(user=None)
        return response

    def test_doctor_search_is_case_insensitive_partial_and_paginated(self):
        self.client.force_authenticate(user=self.patient)
        response = self.client.get(
            "/api/clinic/doctors/?name=noR&location=cai&specialization=card&yearsOfExperience=10&page_size=1"
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("count", data)
        self.assertEqual(data["count"], 1)
        self.assertEqual(len(data["results"]), 1)
        self.assertEqual(data["results"][0]["userId"], str(self.doctor.userId))

    def test_doctor_schedule_creation_auto_generates_30_minute_slots(self):
        target_date = timezone.now().date() + timedelta(days=3)

        self.client.force_authenticate(user=self.doctor)
        response = self.client.post(
            "/api/clinic/doctor-schedules/",
            {
                "date": target_date.isoformat(),
                "startTime": "09:00:00",
                "endTime": "11:00:00",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        body = response.json()
        self.assertEqual(body["slotDuration"], 30)
        self.assertEqual(len(body["timeSlots"]), 4)
        self.assertTrue(
            TimeSlot.objects.filter(
                scheduleId_id=body["id"], status=TimeSlotStatus.AVAILABLE
            ).count()
            == 4
        )

    def test_patient_booking_reserves_slot_and_blocks_double_booking(self):
        slot_date = timezone.now().date() + timedelta(days=2)
        _, slot = self._create_slot(self.doctor, slot_date, time(10, 0), time(10, 30))

        first_response = self._book_slot(self.patient, slot, notes="Initial checkup")
        self.assertEqual(first_response.status_code, 201)
        appointment_id = first_response.json()["id"]
        appointment = Appointment.objects.get(pk=appointment_id)
        slot.refresh_from_db()
        self.assertEqual(appointment.status, AppointmentStatus.BOOKED)
        self.assertEqual(slot.status, TimeSlotStatus.RESERVED)

        second_response = self._book_slot(self.other_patient, slot)
        self.assertEqual(second_response.status_code, 400)
        self.assertEqual(
            second_response.json()["timeSlotId"],
            ["Time slot is already reserved"],
        )

    def test_cannot_book_past_time_slot(self):
        yesterday = timezone.now().date() - timedelta(days=1)
        _, past_slot = self._create_slot(
            self.doctor, yesterday, time(9, 0), time(9, 30)
        )

        response = self._book_slot(self.patient, past_slot)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json()["timeSlotId"], ["Cannot book a past time slot"]
        )

    def test_patient_cancel_changes_appointment_and_slot_status(self):
        slot_date = timezone.now().date() + timedelta(days=2)
        _, slot = self._create_slot(self.doctor, slot_date, time(14, 0), time(14, 30))

        booking = self._book_slot(self.patient, slot)
        appointment_id = booking.json()["id"]

        self.client.force_authenticate(user=self.patient)
        cancel_response = self.client.post(
            f"/api/clinic/appointments/{appointment_id}/cancel/", {}, format="json"
        )
        self.assertEqual(cancel_response.status_code, 200)

        appointment = Appointment.objects.get(pk=appointment_id)
        slot.refresh_from_db()
        self.assertEqual(appointment.status, AppointmentStatus.CANCELLED)
        self.assertEqual(slot.status, TimeSlotStatus.AVAILABLE)

    def test_doctor_complete_status_flow(self):
        slot_date = timezone.now().date() + timedelta(days=2)
        _, slot = self._create_slot(self.doctor, slot_date, time(15, 0), time(15, 30))
        booking = self._book_slot(self.patient, slot)
        appointment_id = booking.json()["id"]

        complete_response = self._complete_appointment(self.doctor, appointment_id)
        self.assertEqual(complete_response.status_code, 200)

        appointment = Appointment.objects.get(pk=appointment_id)
        self.assertEqual(appointment.status, AppointmentStatus.COMPLETED)

    def test_doctor_creates_follow_up_only_after_completion(self):
        slot_date = timezone.now().date() + timedelta(days=2)
        _, first_slot = self._create_slot(
            self.doctor, slot_date, time(8, 0), time(8, 30)
        )
        _, second_slot = self._create_slot(
            self.doctor, slot_date, time(8, 30), time(9, 0)
        )
        booking = self._book_slot(self.patient, first_slot)
        appointment_id = booking.json()["id"]

        self.client.force_authenticate(user=self.doctor)
        early_follow_up = self.client.post(
            f"/api/clinic/appointments/{appointment_id}/create-next/",
            {"timeSlotId": str(second_slot.id), "notes": "Follow-up"},
            format="json",
        )
        self.assertEqual(early_follow_up.status_code, 400)

        self._complete_appointment(self.doctor, appointment_id)
        self.client.force_authenticate(user=self.doctor)
        follow_up = self.client.post(
            f"/api/clinic/appointments/{appointment_id}/create-next/",
            {"timeSlotId": str(second_slot.id), "notes": "Follow-up"},
            format="json",
        )

        self.assertEqual(follow_up.status_code, 201)
        new_appointment = Appointment.objects.get(pk=follow_up.json()["id"])
        self.assertEqual(new_appointment.patientId_id, self.patient.userId)
        self.assertEqual(new_appointment.status, AppointmentStatus.BOOKED)

    def test_review_requires_completed_appointment_and_is_limited_to_one(self):
        slot_date = timezone.now().date() + timedelta(days=2)
        _, slot = self._create_slot(self.doctor, slot_date, time(16, 0), time(16, 30))
        booking = self._book_slot(self.patient, slot)
        appointment_id = booking.json()["id"]

        self.client.force_authenticate(user=self.patient)
        early_review = self.client.post(
            "/api/clinic/reviews/",
            {
                "appointmentId": appointment_id,
                "rating": 5,
                "comment": "Excellent",
            },
            format="json",
        )
        self.assertEqual(early_review.status_code, 400)

        self._complete_appointment(self.doctor, appointment_id)
        self.client.force_authenticate(user=self.patient)

        first_review = self.client.post(
            "/api/clinic/reviews/",
            {
                "appointmentId": appointment_id,
                "rating": 5,
                "comment": "Excellent",
            },
            format="json",
        )
        self.assertEqual(first_review.status_code, 201)
        self.assertEqual(
            Review.objects.filter(appointmentId_id=appointment_id).count(), 1
        )

        second_review = self.client.post(
            "/api/clinic/reviews/",
            {
                "appointmentId": appointment_id,
                "rating": 4,
                "comment": "Still good",
            },
            format="json",
        )
        self.assertEqual(second_review.status_code, 400)

    def test_doctor_creates_diagnosis_and_prescription_only_after_completion(self):
        slot_date = timezone.now().date() + timedelta(days=2)
        _, slot = self._create_slot(self.doctor, slot_date, time(17, 0), time(17, 30))
        booking = self._book_slot(self.patient, slot)
        appointment_id = booking.json()["id"]

        self.client.force_authenticate(user=self.doctor)
        diagnosis_before_completion = self.client.post(
            "/api/clinic/diagnoses/",
            {
                "appointmentId": appointment_id,
                "diagnosis": "Hypertension",
            },
            format="json",
        )
        self.assertEqual(diagnosis_before_completion.status_code, 400)

        prescription_before_completion = self.client.post(
            "/api/clinic/prescriptions/",
            {
                "appointmentId": appointment_id,
                "prescription": "Drug A",
                "dose": "5mg",
                "duration": "14 days",
                "isPermanent": False,
            },
            format="json",
        )
        self.assertEqual(prescription_before_completion.status_code, 400)

        self._complete_appointment(self.doctor, appointment_id)
        self.client.force_authenticate(user=self.doctor)

        diagnosis_after_completion = self.client.post(
            "/api/clinic/diagnoses/",
            {
                "appointmentId": appointment_id,
                "diagnosis": "Hypertension",
            },
            format="json",
        )
        self.assertEqual(diagnosis_after_completion.status_code, 201)
        self.assertEqual(
            PatientDiagnosis.objects.filter(appointmentId_id=appointment_id).count(), 1
        )

        prescription_after_completion = self.client.post(
            "/api/clinic/prescriptions/",
            {
                "appointmentId": appointment_id,
                "prescription": "Drug A",
                "dose": "5mg",
                "duration": "14 days",
                "isPermanent": False,
            },
            format="json",
        )
        self.assertEqual(prescription_after_completion.status_code, 201)
        self.assertEqual(
            PatientPrescription.objects.filter(appointmentId_id=appointment_id).count(),
            1,
        )

    def test_doctor_cannot_edit_diagnosis_from_other_doctor(self):
        slot_date = timezone.now().date() + timedelta(days=2)
        _, slot = self._create_slot(self.doctor, slot_date, time(18, 0), time(18, 30))
        booking = self._book_slot(self.patient, slot)
        appointment_id = booking.json()["id"]
        self._complete_appointment(self.doctor, appointment_id)

        self.client.force_authenticate(user=self.doctor)
        create_diagnosis = self.client.post(
            "/api/clinic/diagnoses/",
            {
                "appointmentId": appointment_id,
                "diagnosis": "Initial diagnosis",
            },
            format="json",
        )
        diagnosis_id = create_diagnosis.json()["id"]

        self.client.force_authenticate(user=self.other_doctor)
        edit_response = self.client.put(
            f"/api/clinic/diagnoses/{diagnosis_id}/",
            {"diagnosis": "Edited by wrong doctor"},
            format="json",
        )
        self.assertEqual(edit_response.status_code, 403)

    def test_doctor_access_only_patients_who_booked_with_him(self):
        slot_date = timezone.now().date() + timedelta(days=2)
        _, slot = self._create_slot(self.doctor, slot_date, time(11, 0), time(11, 30))
        self._book_slot(self.patient, slot)

        self.client.force_authenticate(user=self.doctor)
        allowed_response = self.client.get(
            f"/api/clinic/patients/{self.patient.userId}/medical-history/"
        )
        denied_response = self.client.get(
            f"/api/clinic/patients/{self.other_patient.userId}/medical-history/"
        )

        self.assertEqual(allowed_response.status_code, 200)
        self.assertEqual(denied_response.status_code, 403)

    def test_patient_medical_history_scope(self):
        slot_date = timezone.now().date() + timedelta(days=2)
        _, slot = self._create_slot(self.doctor, slot_date, time(12, 0), time(12, 30))
        self._book_slot(self.patient, slot)

        self.client.force_authenticate(user=self.patient)
        my_history = self.client.get("/api/clinic/medical-history/me/")
        self.assertEqual(my_history.status_code, 200)
        self.assertEqual(my_history.json()["patientId"], str(self.patient.userId))

        self.client.force_authenticate(user=self.other_patient)
        forbidden = self.client.get(
            f"/api/clinic/patients/{self.patient.userId}/medical-history/"
        )
        self.assertEqual(forbidden.status_code, 403)

    def test_appointments_endpoint_is_paginated(self):
        start_date = timezone.now().date() + timedelta(days=3)
        for index in range(12):
            current_date = start_date + timedelta(days=index)
            slot_start = time(9, 0)
            slot_end = time(9, 30)
            _, slot = self._create_slot(self.doctor, current_date, slot_start, slot_end)
            appointment = Appointment.objects.create(
                doctorId=self.doctor,
                patientId=self.patient,
                timeSlotId=slot,
                status=AppointmentStatus.BOOKED,
                notes=f"Note {index}",
            )
            slot.status = TimeSlotStatus.RESERVED
            slot.save(update_fields=["status"])
            appointment.save()

        self.client.force_authenticate(user=self.patient)
        response = self.client.get("/api/clinic/appointments/?page_size=5")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["count"], 12)
        self.assertEqual(len(data["results"]), 5)

    def test_admin_monitoring_endpoints(self):
        self.client.force_authenticate(user=self.admin)
        users_response = self.client.get("/api/clinic/admin/users/")
        doctors_response = self.client.get("/api/clinic/admin/doctors/")
        appointments_response = self.client.get("/api/clinic/admin/appointments/")
        reviews_response = self.client.get("/api/clinic/admin/reviews/")

        self.assertEqual(users_response.status_code, 200)
        self.assertEqual(doctors_response.status_code, 200)
        self.assertEqual(appointments_response.status_code, 200)
        self.assertEqual(reviews_response.status_code, 200)

        self.client.force_authenticate(user=self.patient)
        forbidden = self.client.get("/api/clinic/admin/users/")
        self.assertEqual(forbidden.status_code, 403)

    def test_admin_can_manage_users_and_appointments(self):
        slot_date = timezone.now().date() + timedelta(days=2)
        _, slot = self._create_slot(self.doctor, slot_date, time(13, 0), time(13, 30))
        booking = self._book_slot(self.patient, slot)
        appointment_id = booking.json()["id"]

        self.client.force_authenticate(user=self.admin)
        deactivate_response = self.client.patch(
            f"/api/clinic/admin/users/{self.patient.userId}/",
            {"is_active": False},
            format="json",
        )
        self.assertEqual(deactivate_response.status_code, 200)
        self.patient.refresh_from_db()
        self.assertFalse(self.patient.is_active)

        cancel_response = self.client.patch(
            f"/api/clinic/admin/appointments/{appointment_id}/",
            {"status": "cancelled"},
            format="json",
        )
        self.assertEqual(cancel_response.status_code, 200)

        appointment = Appointment.objects.get(pk=appointment_id)
        slot.refresh_from_db()
        self.assertEqual(appointment.status, AppointmentStatus.CANCELLED)
        self.assertEqual(slot.status, TimeSlotStatus.AVAILABLE)

        self.client.force_authenticate(user=self.other_patient)
        forbidden_update = self.client.patch(
            f"/api/clinic/admin/users/{self.patient.userId}/",
            {"is_active": True},
            format="json",
        )
        self.assertEqual(forbidden_update.status_code, 403)
