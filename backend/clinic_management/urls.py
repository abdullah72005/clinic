from django.urls import include, path
from rest_framework.routers import DefaultRouter

from clinic_management.views import (
    AdminAppointmentViewSet,
    AdminDoctorViewSet,
    AdminReviewViewSet,
    AdminUserViewSet,
    AppointmentViewSet,
    DoctorScheduleViewSet,
    DoctorViewSet,
    MyMedicalHistoryView,
    PatientDiagnosisViewSet,
    PatientMedicalHistoryView,
    PatientPrescriptionViewSet,
    ReviewViewSet,
)

router = DefaultRouter()
router.register(r"doctors", DoctorViewSet, basename="doctor")
router.register(r"doctor-schedules", DoctorScheduleViewSet, basename="doctor-schedule")
router.register(r"appointments", AppointmentViewSet, basename="appointment")
router.register(r"reviews", ReviewViewSet, basename="review")
router.register(r"diagnoses", PatientDiagnosisViewSet, basename="diagnosis")
router.register(r"prescriptions", PatientPrescriptionViewSet, basename="prescription")
router.register(r"admin/users", AdminUserViewSet, basename="admin-user")
router.register(r"admin/doctors", AdminDoctorViewSet, basename="admin-doctor")
router.register(
    r"admin/appointments", AdminAppointmentViewSet, basename="admin-appointment"
)
router.register(r"admin/reviews", AdminReviewViewSet, basename="admin-review")

urlpatterns = [
    path("", include(router.urls)),
    path(
        "medical-history/me/", MyMedicalHistoryView.as_view(), name="my-medical-history"
    ),
    path(
        "patients/<uuid:patient_id>/medical-history/",
        PatientMedicalHistoryView.as_view(),
        name="patient-medical-history",
    ),
]
