from datetime import datetime, timedelta, timezone as dt_timezone

from django.db import transaction
from django.db.models import Avg
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from authentication.models import Doctor, Patient
from clinic_management.models import (
    Appointment,
    AppointmentStatus,
    DoctorSchedule,
    Notification,
    PatientDiagnosis,
    PatientPrescription,
    Review,
    TimeSlot,
    TimeSlotStatus,
)


def get_doctor_for_user(user):
    try:
        return Doctor.objects.get(pk=user.pk)
    except Doctor.DoesNotExist:
        return None


def get_patient_for_user(user):
    try:
        return Patient.objects.get(pk=user.pk)
    except Patient.DoesNotExist:
        return None


def _create_notification(user, message, notification_type):
    Notification.objects.create(
        userId=user,
        message=message,
        type=notification_type,
    )


class AppointmentService:
    @staticmethod
    def book_appointment(*, patient, time_slot_id, notes=""):
        with transaction.atomic():
            try:
                slot = (
                    TimeSlot.objects.select_for_update()
                    .select_related("scheduleId", "scheduleId__doctorId")
                    .get(pk=time_slot_id)
                )
            except TimeSlot.DoesNotExist as exc:
                raise ValidationError(
                    {"timeSlotId": ["Time slot does not exist"]}
                ) from exc

            if slot.status != TimeSlotStatus.AVAILABLE:
                raise ValidationError({"timeSlotId": ["Time slot is already reserved"]})

            if slot.start_datetime_utc() <= timezone.now():
                raise ValidationError({"timeSlotId": ["Cannot book a past time slot"]})

            appointment = Appointment.objects.create(
                doctorId=slot.scheduleId.doctorId,
                patientId=patient,
                timeSlotId=slot,
                status=AppointmentStatus.BOOKED,
                notes=notes,
            )

            slot.status = TimeSlotStatus.RESERVED
            slot.save(update_fields=["status"])

            _create_notification(
                patient,
                "Your appointment has been booked.",
                "appointment_booked",
            )
            _create_notification(
                slot.scheduleId.doctorId,
                "A new appointment has been booked.",
                "appointment_booked",
            )

            return appointment

    @staticmethod
    def cancel_appointment(*, appointment, actor_user):
        with transaction.atomic():
            appointment = (
                Appointment.objects.select_for_update()
                .select_related(
                    "timeSlotId",
                    "patientId",
                    "doctorId",
                )
                .get(pk=appointment.pk)
            )

            if appointment.status != AppointmentStatus.BOOKED:
                raise ValidationError(
                    {"status": ["Only booked appointments can be cancelled"]}
                )

            if (
                appointment.patientId_id != actor_user.pk
                and not actor_user.is_superuser
            ):
                is_master = actor_user.groups.filter(name="MasterUser").exists()
                if not is_master:
                    raise PermissionDenied("You can only cancel your own appointments")

            appointment.status = AppointmentStatus.CANCELLED
            appointment.save(update_fields=["status"])

            slot = appointment.timeSlotId
            slot.status = TimeSlotStatus.AVAILABLE
            slot.save(update_fields=["status"])

            _create_notification(
                appointment.patientId,
                "Your appointment has been cancelled.",
                "appointment_cancelled",
            )
            _create_notification(
                appointment.doctorId,
                "An appointment has been cancelled.",
                "appointment_cancelled",
            )

            return appointment

    @staticmethod
    def complete_appointment(*, appointment, doctor):
        with transaction.atomic():
            appointment = (
                Appointment.objects.select_for_update()
                .select_related(
                    "doctorId",
                    "patientId",
                )
                .get(pk=appointment.pk)
            )

            if appointment.status != AppointmentStatus.BOOKED:
                raise ValidationError(
                    {"status": ["Only booked appointments can be completed"]}
                )

            if appointment.doctorId_id != doctor.pk:
                raise PermissionDenied("You can only complete your own appointments")

            appointment.status = AppointmentStatus.COMPLETED
            appointment.save(update_fields=["status"])

            _create_notification(
                appointment.patientId,
                "Your appointment has been marked as completed.",
                "appointment_completed",
            )

            return appointment

    @staticmethod
    def create_next_appointment(*, source_appointment, doctor, time_slot_id, notes=""):
        if source_appointment.doctorId_id != doctor.pk:
            raise PermissionDenied(
                "You can only create follow-up appointments for your patients"
            )

        if source_appointment.status != AppointmentStatus.COMPLETED:
            raise ValidationError(
                {
                    "appointmentId": [
                        "Follow-up appointments can only be created after completion"
                    ]
                }
            )

        target_slot_doctor_id = (
            TimeSlot.objects.filter(pk=time_slot_id)
            .values_list("scheduleId__doctorId_id", flat=True)
            .first()
        )
        if target_slot_doctor_id is None:
            raise ValidationError({"timeSlotId": ["Time slot does not exist"]})
        if target_slot_doctor_id != doctor.pk:
            raise ValidationError(
                {"timeSlotId": ["Follow-up time slot must belong to the same doctor"]}
            )

        return AppointmentService.book_appointment(
            patient=source_appointment.patientId,
            time_slot_id=time_slot_id,
            notes=notes,
        )


class ScheduleService:
    @staticmethod
    def _generate_slot_boundaries(schedule):
        slot_delta = timedelta(minutes=30)
        current = datetime.combine(
            schedule.date, schedule.startTime, tzinfo=dt_timezone.utc
        )
        end_boundary = datetime.combine(
            schedule.date, schedule.endTime, tzinfo=dt_timezone.utc
        )

        slot_windows = []
        while current + slot_delta <= end_boundary:
            slot_windows.append((current.time(), (current + slot_delta).time()))
            current = current + slot_delta

        return slot_windows

    @classmethod
    def create_schedule_with_slots(cls, *, doctor, date, start_time, end_time):
        if start_time >= end_time:
            raise ValidationError({"startTime": ["startTime must be before endTime"]})

        has_overlap = DoctorSchedule.objects.filter(
            doctorId=doctor,
            date=date,
            startTime__lt=end_time,
            endTime__gt=start_time,
        ).exists()
        if has_overlap:
            raise ValidationError(
                {"date": ["Schedule overlaps with an existing schedule"]}
            )

        with transaction.atomic():
            schedule = DoctorSchedule.objects.create(
                doctorId=doctor,
                date=date,
                startTime=start_time,
                endTime=end_time,
            )

            slot_windows = cls._generate_slot_boundaries(schedule)
            slots = [
                TimeSlot(
                    scheduleId=schedule,
                    startTime=start_time_value,
                    endTime=end_time_value,
                    status=TimeSlotStatus.AVAILABLE,
                )
                for start_time_value, end_time_value in slot_windows
            ]

            TimeSlot.objects.bulk_create(slots)

            return schedule

    @classmethod
    def create_recurring_schedules_with_slots(
        cls,
        *,
        doctor,
        start_date,
        end_date,
        working_days,
        start_time,
        end_time,
    ):
        if start_date > end_date:
            raise ValidationError(
                {"startDate": ["startDate must be before or equal to endDate"]}
            )

        created_schedules = []
        current = start_date
        while current <= end_date:
            if current.weekday() in working_days:
                created_schedules.append(
                    cls.create_schedule_with_slots(
                        doctor=doctor,
                        date=current,
                        start_time=start_time,
                        end_time=end_time,
                    )
                )
            current = current + timedelta(days=1)

        return created_schedules


class MedicalService:
    @staticmethod
    def create_diagnosis(*, doctor, appointment, diagnosis_text):
        if appointment.doctorId_id != doctor.pk:
            raise PermissionDenied(
                "You can only create diagnoses for your own appointments"
            )

        if appointment.status != AppointmentStatus.COMPLETED:
            raise ValidationError(
                {"appointmentId": ["Diagnosis can only be added after completion"]}
            )

        diagnosis, _ = PatientDiagnosis.objects.update_or_create(
            appointmentId=appointment,
            doctorId=doctor,
            defaults={
                "patientId": appointment.patientId,
                "diagnosis": diagnosis_text,
            },
        )

        return diagnosis

    @staticmethod
    def update_diagnosis(*, doctor, diagnosis_obj, diagnosis_text):
        if diagnosis_obj.doctorId_id != doctor.pk:
            raise PermissionDenied("You cannot edit diagnoses created by other doctors")

        diagnosis_obj.diagnosis = diagnosis_text
        diagnosis_obj.save(update_fields=["diagnosis"])
        return diagnosis_obj

    @staticmethod
    def create_prescription(
        *, doctor, appointment, prescription, dose, duration, is_permanent
    ):
        if appointment.doctorId_id != doctor.pk:
            raise PermissionDenied(
                "You can only create prescriptions for your own appointments"
            )

        if appointment.status != AppointmentStatus.COMPLETED:
            raise ValidationError(
                {"appointmentId": ["Prescription can only be added after completion"]}
            )

        prescription_obj, _ = PatientPrescription.objects.update_or_create(
            appointmentId=appointment,
            doctorId=doctor,
            defaults={
                "patientId": appointment.patientId,
                "prescription": prescription,
                "dose": dose,
                "duration": duration,
                "isPermanent": is_permanent,
            },
        )

        return prescription_obj

    @staticmethod
    def doctor_can_access_patient(*, doctor, patient_id):
        return Appointment.objects.filter(
            doctorId=doctor,
            patientId_id=patient_id,
        ).exists()


class ReviewService:
    @staticmethod
    def create_review(*, patient, appointment, rating, comment):
        if appointment.patientId_id != patient.pk:
            raise PermissionDenied("You can only review your own appointments")

        if appointment.status != AppointmentStatus.COMPLETED:
            raise ValidationError(
                {"appointmentId": ["Reviews require a completed appointment"]}
            )

        if Review.objects.filter(appointmentId=appointment).exists():
            raise ValidationError(
                {"appointmentId": ["Only one review is allowed per appointment"]}
            )

        review = Review.objects.create(
            doctorId=appointment.doctorId,
            patientId=patient,
            appointmentId=appointment,
            rating=rating,
            comment=comment,
        )

        _create_notification(
            appointment.doctorId,
            "A new review has been submitted.",
            "review_created",
        )

        average_rating = Review.objects.filter(doctorId=appointment.doctorId).aggregate(
            avg=Avg("rating")
        )["avg"]

        return review, average_rating
