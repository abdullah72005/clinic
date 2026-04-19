from django.test import TestCase

from authentication.models import Doctor, Patient, User


class RegistrationAPITests(TestCase):
    def test_register_patient_success(self):
        payload = {
            "first_name": "Ali",
            "last_name": "Hassan",
            "email": "ali@example.com",
            "password": "StrongPass123",
            "medical_notes": "Diabetic",
        }

        response = self.client.post("/api/auth/register-patient/", data=payload)

        self.assertEqual(response.status_code, 201)
        body = response.json()
        self.assertEqual(body["status"], "success")
        self.assertEqual(body["message"], "Patient registered successfully")
        self.assertTrue(Patient.objects.filter(email="ali@example.com").exists())

        patient = Patient.objects.get(email="ali@example.com")
        self.assertEqual(patient.fullName, "Ali Hassan")
        self.assertTrue(patient.groups.filter(name="Patient").exists())

    def test_register_patient_duplicate_email_returns_conflict(self):
        Patient.objects.create_user(
            username="ali@example.com",
            email="ali@example.com",
            password="StrongPass123",
            first_name="Ali",
            last_name="Hassan",
            fullName="Ali Hassan",
        )

        payload = {
            "first_name": "Ali",
            "last_name": "Hassan",
            "email": "ali@example.com",
            "password": "StrongPass123",
        }

        response = self.client.post("/api/auth/register-patient/", data=payload)

        self.assertEqual(response.status_code, 409)
        body = response.json()
        self.assertEqual(body["status"], "error")
        self.assertEqual(body["errors"], {"email": ["auth.email.exists"]})
        self.assertEqual(User.objects.filter(email="ali@example.com").count(), 1)

    def test_register_patient_weak_password_returns_validation_error(self):
        payload = {
            "first_name": "Ali",
            "last_name": "Hassan",
            "email": "ali2@example.com",
            "password": "weak",
        }

        response = self.client.post("/api/auth/register-patient/", data=payload)

        self.assertEqual(response.status_code, 400)
        body = response.json()
        self.assertEqual(body["status"], "error")
        self.assertIn("password", body["errors"])
        self.assertIn("auth.password.minLength", body["errors"]["password"])

    def test_register_doctor_success(self):
        payload = {
            "first_name": "Mona",
            "last_name": "Khaled",
            "email": "mona@example.com",
            "password": "StrongPass123",
            "specialization": "Cardiology",
            "location": "Cairo",
            "bio": "Experienced doctor",
        }

        response = self.client.post("/api/auth/register-doctor/", data=payload)

        self.assertEqual(response.status_code, 201)
        body = response.json()
        self.assertEqual(body["status"], "success")
        self.assertEqual(body["message"], "Doctor registered successfully")
        self.assertTrue(Doctor.objects.filter(email="mona@example.com").exists())

        doctor = Doctor.objects.get(email="mona@example.com")
        self.assertEqual(doctor.specialization, "Cardiology")
        self.assertEqual(doctor.location, "Cairo")
        self.assertTrue(doctor.groups.filter(name="Doctor").exists())
