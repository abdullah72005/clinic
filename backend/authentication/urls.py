from django.urls import path

from authentication import views

urlpatterns = [
    path("register-patient", views.register_patient),
    path("register-patient/", views.register_patient, name="register-patient"),
    path("register-doctor", views.register_doctor),
    path("register-doctor/", views.register_doctor, name="register-doctor"),
    path("login", views.login),
    path("login/", views.login, name="login"),
    path("refresh-token", views.refresh_token),
    path("refresh-token/", views.refresh_token, name="refresh-token"),
    path("logout", views.logout),
    path("logout/", views.logout, name="logout"),
]
