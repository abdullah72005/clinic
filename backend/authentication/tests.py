from django.test import TestCase
from unittest.mock import patch

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

    def test_register_doctor_with_years_of_experience(self):
        payload = {
            "first_name": "Nora",
            "last_name": "Saad",
            "email": "nora@example.com",
            "password": "StrongPass123",
            "specialization": "Neurology",
            "location": "Alexandria",
            "yearsOfExperience": 12,
        }

        response = self.client.post("/api/auth/register-doctor/", data=payload)

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["status"], "success")
        doctor = Doctor.objects.get(email="nora@example.com")
        self.assertEqual(doctor.yearsOfExperience, 12)

    def test_register_doctor_negative_years_of_experience_returns_validation_error(
        self,
    ):
        payload = {
            "first_name": "Nora",
            "last_name": "Saad",
            "email": "nora-invalid@example.com",
            "password": "StrongPass123",
            "specialization": "Neurology",
            "location": "Alexandria",
            "yearsOfExperience": -1,
        }

        response = self.client.post("/api/auth/register-doctor/", data=payload)

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["status"], "error")
        self.assertIn("yearsOfExperience", response.json()["errors"])

    def test_register_patient_without_trailing_slash_success(self):
        payload = {
            "first_name": "NoSlash",
            "last_name": "Patient",
            "email": "noslash-patient@example.com",
            "password": "StrongPass123",
        }

        response = self.client.post("/api/auth/register-patient", data=payload)

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["status"], "success")

    def test_register_doctor_without_trailing_slash_success(self):
        payload = {
            "first_name": "NoSlash",
            "last_name": "Doctor",
            "email": "noslash-doctor@example.com",
            "password": "StrongPass123",
            "specialization": "Dermatology",
            "location": "Giza",
        }

        response = self.client.post("/api/auth/register-doctor", data=payload)

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["status"], "success")


class AuthTokenFlowTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="authuser@example.com",
            email="authuser@example.com",
            password="StrongPass123",
            first_name="Auth",
            last_name="User",
            fullName="Auth User",
        )

    def test_login_success_returns_tokens_and_cookie(self):
        response = self.client.post(
            "/api/auth/login/",
            data={"email": "authuser@example.com", "password": "StrongPass123"},
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["status"], "success")
        self.assertEqual(body["message"], "Login successful.")
        self.assertIn("access_token", body["data"])
        self.assertIn("refresh_token", body["data"])
        self.assertIn("access_token_expires_in", body["data"])
        self.assertIn("refresh_token", response.cookies)
        self.assertTrue(response.cookies["refresh_token"]["httponly"])
        self.assertEqual(response.cookies["refresh_token"]["path"], "/api/auth/")
        self.assertIn("auth_csrf", response.cookies)
        self.assertFalse(response.cookies["auth_csrf"]["httponly"])

    def _login_and_get_csrf_header(self):
        self.client.post(
            "/api/auth/login/",
            data={"email": "authuser@example.com", "password": "StrongPass123"},
        )
        return self.client.cookies["auth_csrf"].value

    def test_login_without_trailing_slash_success(self):
        response = self.client.post(
            "/api/auth/login",
            data={"email": "authuser@example.com", "password": "StrongPass123"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "success")

    def test_login_email_is_normalized(self):
        response = self.client.post(
            "/api/auth/login/",
            data={"email": "  AUTHUSER@EXAMPLE.COM ", "password": "StrongPass123"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["data"]["email"], "authuser@example.com")

    def test_login_missing_password_returns_validation_error(self):
        response = self.client.post(
            "/api/auth/login/",
            data={"email": "authuser@example.com"},
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["status"], "error")
        self.assertIn("password", response.json()["errors"])

    def test_login_inactive_user_returns_generic_unauthorized(self):
        self.user.is_active = False
        self.user.save(update_fields=["is_active"])

        response = self.client.post(
            "/api/auth/login/",
            data={"email": "authuser@example.com", "password": "StrongPass123"},
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(
            response.json()["errors"],
            {"credentials": ["auth.login.invalidCredentials"]},
        )

    def test_login_invalid_credentials_returns_unauthorized_with_generic_error(self):
        wrong_password_response = self.client.post(
            "/api/auth/login/",
            data={"email": "authuser@example.com", "password": "WrongPassword123"},
        )
        wrong_email_response = self.client.post(
            "/api/auth/login/",
            data={"email": "missing@example.com", "password": "WrongPassword123"},
        )

        self.assertEqual(wrong_password_response.status_code, 401)
        self.assertEqual(wrong_email_response.status_code, 401)
        self.assertEqual(
            wrong_password_response.json()["message"],
            wrong_email_response.json()["message"],
        )
        self.assertEqual(
            wrong_password_response.json()["errors"],
            {"credentials": ["auth.login.invalidCredentials"]},
        )

    def test_refresh_token_success_rotates_token_and_rejects_reuse(self):
        login_response = self.client.post(
            "/api/auth/login/",
            data={"email": "authuser@example.com", "password": "StrongPass123"},
        )
        refresh_token = login_response.json()["data"]["refresh_token"]

        refresh_response = self.client.post(
            "/api/auth/refresh-token/",
            data={"refresh_token": refresh_token},
        )

        self.assertEqual(refresh_response.status_code, 200)
        refreshed_data = refresh_response.json()["data"]
        self.assertIn("access_token", refreshed_data)
        self.assertIn("refresh_token", refreshed_data)
        self.assertNotEqual(refreshed_data["refresh_token"], refresh_token)

        reused_token_response = self.client.post(
            "/api/auth/refresh-token/",
            data={"refresh_token": refresh_token},
        )
        self.assertEqual(reused_token_response.status_code, 401)
        self.assertEqual(
            reused_token_response.json()["errors"],
            {"refresh_token": ["auth.refreshToken.invalid"]},
        )

    def test_refresh_token_allows_cookie_fallback(self):
        csrf_header_value = self._login_and_get_csrf_header()

        refresh_response = self.client.post(
            "/api/auth/refresh-token/",
            data={},
            HTTP_X_AUTH_CSRF=csrf_header_value,
        )
        self.assertEqual(refresh_response.status_code, 200)
        self.assertEqual(refresh_response.json()["status"], "success")
        self.assertIn("refresh_token", refresh_response.cookies)

    def test_refresh_token_cookie_fallback_missing_csrf_header_returns_forbidden(self):
        self._login_and_get_csrf_header()

        response = self.client.post("/api/auth/refresh-token/", data={})

        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()["status"], "error")
        self.assertEqual(response.json()["errors"], {"csrf": ["auth.csrf.invalid"]})

    def test_refresh_token_cookie_fallback_invalid_csrf_header_returns_forbidden(self):
        self._login_and_get_csrf_header()

        response = self.client.post(
            "/api/auth/refresh-token/",
            data={},
            HTTP_X_AUTH_CSRF="invalid-header-token",
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()["status"], "error")
        self.assertEqual(response.json()["errors"], {"csrf": ["auth.csrf.invalid"]})

    def test_refresh_token_without_trailing_slash_success(self):
        login_response = self.client.post(
            "/api/auth/login/",
            data={"email": "authuser@example.com", "password": "StrongPass123"},
        )
        refresh_token = login_response.json()["data"]["refresh_token"]

        response = self.client.post(
            "/api/auth/refresh-token",
            data={"refresh_token": refresh_token},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "success")

    def test_refresh_token_missing_token_without_cookie_returns_validation_error(self):
        self.client.cookies.clear()

        response = self.client.post("/api/auth/refresh-token/", data={})

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["status"], "error")
        self.assertEqual(
            response.json()["errors"],
            {"refresh_token": ["auth.refreshToken.required"]},
        )

    def test_refresh_token_for_inactive_user_returns_unauthorized(self):
        login_response = self.client.post(
            "/api/auth/login/",
            data={"email": "authuser@example.com", "password": "StrongPass123"},
        )
        refresh_token = login_response.json()["data"]["refresh_token"]

        self.user.is_active = False
        self.user.save(update_fields=["is_active"])

        refresh_response = self.client.post(
            "/api/auth/refresh-token/",
            data={"refresh_token": refresh_token},
        )

        self.assertEqual(refresh_response.status_code, 401)
        self.assertEqual(
            refresh_response.json()["errors"],
            {"refresh_token": ["auth.refreshToken.invalid"]},
        )

    def test_refresh_token_invalid_returns_unauthorized(self):
        response = self.client.post(
            "/api/auth/refresh-token/",
            data={"refresh_token": "invalid.token.value"},
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["status"], "error")
        self.assertEqual(
            response.json()["errors"],
            {"refresh_token": ["auth.refreshToken.invalid"]},
        )

    def test_logout_success_blacklists_token(self):
        login_response = self.client.post(
            "/api/auth/login/",
            data={"email": "authuser@example.com", "password": "StrongPass123"},
        )
        refresh_token = login_response.json()["data"]["refresh_token"]

        logout_response = self.client.post(
            "/api/auth/logout/",
            data={"refresh_token": refresh_token},
        )

        self.assertEqual(logout_response.status_code, 200)
        self.assertEqual(logout_response.json()["status"], "success")
        self.assertTrue(logout_response.json()["data"]["logged_out"])

        refresh_after_logout_response = self.client.post(
            "/api/auth/refresh-token/",
            data={"refresh_token": refresh_token},
        )
        self.assertEqual(refresh_after_logout_response.status_code, 401)

    def test_logout_allows_cookie_fallback(self):
        csrf_header_value = self._login_and_get_csrf_header()

        response = self.client.post(
            "/api/auth/logout/",
            data={},
            HTTP_X_AUTH_CSRF=csrf_header_value,
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "success")
        self.assertIn("refresh_token", response.cookies)

    def test_logout_cookie_fallback_missing_csrf_header_returns_forbidden(self):
        self._login_and_get_csrf_header()

        response = self.client.post("/api/auth/logout/", data={})

        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()["status"], "error")
        self.assertEqual(response.json()["errors"], {"csrf": ["auth.csrf.invalid"]})

    def test_logout_cookie_fallback_invalid_csrf_header_returns_forbidden(self):
        self._login_and_get_csrf_header()

        response = self.client.post(
            "/api/auth/logout/",
            data={},
            HTTP_X_AUTH_CSRF="invalid-header-token",
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()["status"], "error")
        self.assertEqual(response.json()["errors"], {"csrf": ["auth.csrf.invalid"]})

    def test_logout_without_trailing_slash_success(self):
        login_response = self.client.post(
            "/api/auth/login/",
            data={"email": "authuser@example.com", "password": "StrongPass123"},
        )
        refresh_token = login_response.json()["data"]["refresh_token"]

        response = self.client.post(
            "/api/auth/logout", data={"refresh_token": refresh_token}
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "success")

    def test_logout_invalid_refresh_token_returns_unauthorized(self):
        response = self.client.post(
            "/api/auth/logout/",
            data={"refresh_token": "invalid.token.value"},
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(
            response.json()["errors"],
            {"refresh_token": ["auth.refreshToken.invalid"]},
        )

    def test_logout_missing_token_returns_validation_error(self):
        self.client.cookies.clear()

        response = self.client.post("/api/auth/logout/", data={})

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["status"], "error")
        self.assertEqual(
            response.json()["errors"],
            {"refresh_token": ["auth.refreshToken.required"]},
        )


class AuthValidationDesignPatternTests(TestCase):
    def _patient_payload(self, email, password, **overrides):
        payload = {
            "first_name": "Test",
            "last_name": "Patient",
            "email": email,
            "password": password,
        }
        payload.update(overrides)
        return payload

    def _doctor_payload(self, email, years_of_experience, **overrides):
        payload = {
            "first_name": "Test",
            "last_name": "Doctor",
            "email": email,
            "password": "StrongPass123",
            "specialization": "Cardiology",
            "location": "Cairo",
            "yearsOfExperience": years_of_experience,
        }
        payload.update(overrides)
        return payload

    def test_bva_password_length_accepts_minimum_and_rejects_below_minimum(self):
        min_boundary_response = self.client.post(
            "/api/auth/register-patient/",
            data=self._patient_payload("bva-min@example.com", "Qx7mN2pR"),
        )
        below_min_response = self.client.post(
            "/api/auth/register-patient/",
            data=self._patient_payload("bva-below@example.com", "Aa12345"),
        )

        self.assertEqual(min_boundary_response.status_code, 201)
        self.assertEqual(below_min_response.status_code, 400)
        self.assertIn("password", below_min_response.json()["errors"])
        self.assertIn(
            "auth.password.minLength", below_min_response.json()["errors"]["password"]
        )

    def test_bva_password_length_accepts_128_and_rejects_129(self):
        max_valid_password = "Aa1" + ("b" * 125)
        above_max_password = max_valid_password + "c"

        at_max_response = self.client.post(
            "/api/auth/register-patient/",
            data=self._patient_payload("bva-max@example.com", max_valid_password),
        )
        above_max_response = self.client.post(
            "/api/auth/register-patient/",
            data=self._patient_payload("bva-above@example.com", above_max_password),
        )

        self.assertEqual(at_max_response.status_code, 201)
        self.assertEqual(above_max_response.status_code, 400)
        self.assertIn("password", above_max_response.json()["errors"])
        self.assertIn(
            "auth.password.maxLength", above_max_response.json()["errors"]["password"]
        )

    def test_ep_phone_number_accepts_valid_partition_and_rejects_invalid_partition(self):
        valid_partition_response = self.client.post(
            "/api/auth/register-patient/",
            data=self._patient_payload(
                "phone-valid@example.com",
                "StrongPass123",
                phoneNo="01012345678",
            ),
        )
        invalid_partition_response = self.client.post(
            "/api/auth/register-patient/",
            data=self._patient_payload(
                "phone-invalid@example.com",
                "StrongPass123",
                phoneNo="01912345678",
            ),
        )

        self.assertEqual(valid_partition_response.status_code, 201)
        self.assertEqual(invalid_partition_response.status_code, 400)
        self.assertIn("phoneNo", invalid_partition_response.json()["errors"])

    def test_bva_years_of_experience_accepts_zero_and_rejects_negative(self):
        zero_boundary_response = self.client.post(
            "/api/auth/register-doctor/",
            data=self._doctor_payload("years-zero@example.com", 0),
        )
        negative_boundary_response = self.client.post(
            "/api/auth/register-doctor/",
            data=self._doctor_payload("years-negative@example.com", -1),
        )

        self.assertEqual(zero_boundary_response.status_code, 201)
        self.assertEqual(negative_boundary_response.status_code, 400)
        self.assertIn("yearsOfExperience", negative_boundary_response.json()["errors"])

    def test_ep_blank_refresh_token_is_rejected_for_refresh_and_logout(self):
        refresh_response = self.client.post(
            "/api/auth/refresh-token/",
            data={"refresh_token": ""},
        )
        logout_response = self.client.post(
            "/api/auth/logout/",
            data={"refresh_token": ""},
        )

        self.assertEqual(refresh_response.status_code, 400)
        self.assertEqual(logout_response.status_code, 400)
        self.assertIn("refresh_token", refresh_response.json()["errors"])
        self.assertIn("refresh_token", logout_response.json()["errors"])

    def test_decision_table_unexpected_error_maps_to_500(self):
        mocked_response = {
            "status": "error",
            "message": "An unexpected error occurred",
            "errors": {"unexpected": ["auth.unexpected"]},
        }

        with patch(
            "authentication.views.AuthService.register_patient",
            return_value=mocked_response,
        ):
            response = self.client.post(
                "/api/auth/register-patient/",
                data=self._patient_payload("unexpected@example.com", "StrongPass123"),
            )

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.json()["message"], "An unexpected error occurred")
