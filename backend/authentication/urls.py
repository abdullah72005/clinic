from django.urls import path

from authentication import views

urlpatterns = [
    path("register-patient", views.register_patient),
    path("register-patient/", views.register_patient, name="register-patient"),
    path("register-doctor", views.register_doctor),
    path("register-doctor/", views.register_doctor, name="register-doctor"),
]
