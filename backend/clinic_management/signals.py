from django.db.models.signals import post_save
from django.dispatch import receiver

from authentication.models import Patient
from clinic_management.models import MedicalRecord


@receiver(post_save, sender=Patient)
def ensure_medical_record(sender, instance, created, **kwargs):
    if created:
        MedicalRecord.objects.get_or_create(patientId=instance)
