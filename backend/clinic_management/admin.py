from django.contrib import admin

from clinic_management.models import (
    Appointment,
    DoctorSchedule,
    MedicalRecord,
    Notification,
    PatientDiagnosis,
    PatientPrescription,
    Review,
    TimeSlot,
)

admin.site.register(DoctorSchedule)
admin.site.register(TimeSlot)
admin.site.register(Appointment)
admin.site.register(MedicalRecord)
admin.site.register(PatientDiagnosis)
admin.site.register(PatientPrescription)
admin.site.register(Review)
admin.site.register(Notification)
