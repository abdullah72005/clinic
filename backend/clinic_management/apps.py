from django.apps import AppConfig


class ClinicManagementConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "clinic_management"

    def ready(self):
        from clinic_management import signals  # noqa: F401
