import uuid
from datetime import datetime, timezone as dt_timezone

from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import F, Q

from authentication.models import Doctor, Patient, User


class TimeSlotStatus(models.TextChoices):
    AVAILABLE = "available", "Available"
    RESERVED = "reserved", "Reserved"


class AppointmentStatus(models.TextChoices):
    BOOKED = "booked", "Booked"
    CANCELLED = "cancelled", "Cancelled"
    COMPLETED = "completed", "Completed"


class DoctorSchedule(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    doctorId = models.ForeignKey(
        Doctor,
        on_delete=models.CASCADE,
        related_name="doctorSchedules",
    )
    date = models.DateField()
    startTime = models.TimeField()
    endTime = models.TimeField()
    slotDuration = models.PositiveSmallIntegerField(default=30, editable=False)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["doctorId", "date", "startTime", "endTime"],
                name="unique_doctor_schedule_window",
            ),
            models.CheckConstraint(
                check=Q(startTime__lt=F("endTime")),
                name="doctor_schedule_start_before_end",
            ),
            models.CheckConstraint(
                check=Q(slotDuration=30),
                name="doctor_schedule_slot_duration_30",
            ),
        ]
        indexes = [
            models.Index(fields=["doctorId", "date"]),
        ]

    def clean(self):
        if self.startTime >= self.endTime:
            raise ValidationError({"startTime": "startTime must be before endTime"})
        if self.slotDuration != 30:
            raise ValidationError(
                {"slotDuration": "slotDuration must always be 30 minutes"}
            )

    def save(self, *args, **kwargs):
        self.slotDuration = 30
        self.full_clean()
        return super().save(*args, **kwargs)


class TimeSlot(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    scheduleId = models.ForeignKey(
        DoctorSchedule,
        on_delete=models.CASCADE,
        related_name="timeSlots",
    )
    startTime = models.TimeField()
    endTime = models.TimeField()
    status = models.CharField(
        max_length=16,
        choices=TimeSlotStatus.choices,
        default=TimeSlotStatus.AVAILABLE,
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["scheduleId", "startTime", "endTime"],
                name="unique_schedule_timeslot_window",
            ),
            models.CheckConstraint(
                check=Q(startTime__lt=F("endTime")),
                name="timeslot_start_before_end",
            ),
        ]
        indexes = [
            models.Index(fields=["scheduleId", "status"]),
        ]

    def clean(self):
        if self.startTime >= self.endTime:
            raise ValidationError({"startTime": "startTime must be before endTime"})

    def start_datetime_utc(self):
        return datetime.combine(
            self.scheduleId.date, self.startTime, tzinfo=dt_timezone.utc
        )

    def end_datetime_utc(self):
        return datetime.combine(
            self.scheduleId.date, self.endTime, tzinfo=dt_timezone.utc
        )


class Appointment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    doctorId = models.ForeignKey(
        Doctor,
        on_delete=models.CASCADE,
        related_name="appointments",
    )
    patientId = models.ForeignKey(
        Patient,
        on_delete=models.CASCADE,
        related_name="appointments",
    )
    timeSlotId = models.ForeignKey(
        TimeSlot,
        on_delete=models.PROTECT,
        related_name="appointments",
    )
    status = models.CharField(
        max_length=16,
        choices=AppointmentStatus.choices,
        default=AppointmentStatus.BOOKED,
    )
    notes = models.TextField(blank=True, null=True)
    createdAt = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["timeSlotId"],
                condition=Q(status=AppointmentStatus.BOOKED),
                name="unique_booked_appointment_per_slot",
            ),
        ]
        indexes = [
            models.Index(fields=["doctorId", "status"]),
            models.Index(fields=["patientId", "status"]),
            models.Index(fields=["createdAt"]),
        ]

    def clean(self):
        if self.timeSlotId_id and self.doctorId_id:
            schedule_doctor_id = self.timeSlotId.scheduleId.doctorId_id
            if schedule_doctor_id != self.doctorId_id:
                raise ValidationError(
                    {"doctorId": "doctorId must match time slot doctor"}
                )


class MedicalRecord(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patientId = models.OneToOneField(
        Patient,
        on_delete=models.CASCADE,
        related_name="medicalRecord",
    )


class PatientDiagnosis(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patientId = models.ForeignKey(
        Patient,
        on_delete=models.CASCADE,
        related_name="patientDiagnoses",
    )
    doctorId = models.ForeignKey(
        Doctor,
        on_delete=models.CASCADE,
        related_name="patientDiagnoses",
    )
    appointmentId = models.ForeignKey(
        Appointment,
        on_delete=models.CASCADE,
        related_name="patientDiagnoses",
    )
    diagnosis = models.TextField()
    dateDiagnosed = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["appointmentId", "doctorId"],
                name="unique_diagnosis_per_appointment_doctor",
            ),
        ]
        indexes = [
            models.Index(fields=["patientId", "dateDiagnosed"]),
        ]

    def clean(self):
        appointment = self.appointmentId
        if appointment.doctorId_id != self.doctorId_id:
            raise ValidationError(
                {"doctorId": "doctorId must match appointment doctor"}
            )
        if appointment.patientId_id != self.patientId_id:
            raise ValidationError(
                {"patientId": "patientId must match appointment patient"}
            )


class PatientPrescription(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patientId = models.ForeignKey(
        Patient,
        on_delete=models.CASCADE,
        related_name="patientPrescriptions",
    )
    doctorId = models.ForeignKey(
        Doctor,
        on_delete=models.CASCADE,
        related_name="patientPrescriptions",
    )
    appointmentId = models.ForeignKey(
        Appointment,
        on_delete=models.CASCADE,
        related_name="patientPrescriptions",
    )
    prescription = models.TextField()
    dose = models.CharField(max_length=255)
    duration = models.CharField(max_length=255)
    isPermanent = models.BooleanField(default=False)
    datePrescribed = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["appointmentId", "doctorId"],
                name="unique_prescription_per_appointment_doctor",
            ),
        ]
        indexes = [
            models.Index(fields=["patientId", "datePrescribed"]),
        ]

    def clean(self):
        appointment = self.appointmentId
        if appointment.doctorId_id != self.doctorId_id:
            raise ValidationError(
                {"doctorId": "doctorId must match appointment doctor"}
            )
        if appointment.patientId_id != self.patientId_id:
            raise ValidationError(
                {"patientId": "patientId must match appointment patient"}
            )


class Review(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    doctorId = models.ForeignKey(
        Doctor,
        on_delete=models.CASCADE,
        related_name="reviews",
    )
    patientId = models.ForeignKey(
        Patient,
        on_delete=models.CASCADE,
        related_name="reviews",
    )
    appointmentId = models.OneToOneField(
        Appointment,
        on_delete=models.CASCADE,
        related_name="review",
    )
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    comment = models.TextField()
    createdAt = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["doctorId", "createdAt"]),
            models.Index(fields=["patientId", "createdAt"]),
        ]

    def clean(self):
        appointment = self.appointmentId
        if appointment.doctorId_id != self.doctorId_id:
            raise ValidationError(
                {"doctorId": "doctorId must match appointment doctor"}
            )
        if appointment.patientId_id != self.patientId_id:
            raise ValidationError(
                {"patientId": "patientId must match appointment patient"}
            )


class Notification(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    userId = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    message = models.TextField()
    type = models.CharField(max_length=100)
    sentAt = models.DateTimeField(auto_now_add=True)
