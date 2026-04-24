from datetime import datetime, timezone as dt_timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from django.db.models import Avg
from rest_framework import serializers

from authentication.models import Doctor, User
from clinic_management.models import (
    Appointment,
    DoctorSchedule,
    PatientDiagnosis,
    PatientPrescription,
    Review,
    TimeSlot,
)


def resolve_output_timezone(request):
    if request is None:
        return ZoneInfo("UTC")

    timezone_name = request.query_params.get("timezone", "UTC")
    try:
        return ZoneInfo(timezone_name)
    except ZoneInfoNotFoundError:
        return ZoneInfo("UTC")


def serialize_slot_datetime(slot, value, request):
    tz = resolve_output_timezone(request)
    utc_value = datetime.combine(slot.scheduleId.date, value, tzinfo=dt_timezone.utc)
    return utc_value.astimezone(tz).isoformat()


def resolve_user_role(user):
    if user.is_superuser or user.groups.filter(name="MasterUser").exists():
        return "admin"
    if user.groups.filter(name="Doctor").exists():
        return "doctor"
    if user.groups.filter(name="Patient").exists():
        return "patient"
    return None


class TimeSlotSerializer(serializers.ModelSerializer):
    scheduleId = serializers.UUIDField(source="scheduleId_id", read_only=True)
    doctorId = serializers.UUIDField(source="scheduleId.doctorId_id", read_only=True)
    date = serializers.DateField(source="scheduleId.date", read_only=True)
    startDateTime = serializers.SerializerMethodField()
    endDateTime = serializers.SerializerMethodField()

    class Meta:
        model = TimeSlot
        fields = [
            "id",
            "scheduleId",
            "doctorId",
            "date",
            "startTime",
            "endTime",
            "startDateTime",
            "endDateTime",
            "status",
        ]

    def get_startDateTime(self, obj):
        return serialize_slot_datetime(obj, obj.startTime, self.context.get("request"))

    def get_endDateTime(self, obj):
        return serialize_slot_datetime(obj, obj.endTime, self.context.get("request"))


class DoctorListSerializer(serializers.ModelSerializer):
    first_Name = serializers.CharField(source="first_name", read_only=True)
    last_Name = serializers.CharField(source="last_name", read_only=True)
    averageRating = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()

    class Meta:
        model = Doctor
        fields = [
            "userId",
            "email",
            "first_Name",
            "last_Name",
            "phoneNo",
            "createdAt",
            "specialization",
            "bio",
            "location",
            "yearsOfExperience",
            "averageRating",
            "role",
        ]

    def get_averageRating(self, obj):
        avg = obj.reviews.aggregate(avg=Avg("rating"))["avg"]
        if avg is None:
            return None
        return float(round(avg, 2))

    def get_role(self, obj):
        return resolve_user_role(obj)


class DoctorDetailSerializer(DoctorListSerializer):
    pass


class DoctorScheduleSerializer(serializers.ModelSerializer):
    doctorId = serializers.UUIDField(source="doctorId_id", read_only=True)
    timeSlots = TimeSlotSerializer(many=True, read_only=True)

    class Meta:
        model = DoctorSchedule
        fields = [
            "id",
            "doctorId",
            "date",
            "startTime",
            "endTime",
            "slotDuration",
            "timeSlots",
        ]


class DoctorScheduleCreateSerializer(serializers.Serializer):
    date = serializers.DateField()
    startTime = serializers.TimeField()
    endTime = serializers.TimeField()


class DoctorRecurringScheduleCreateSerializer(serializers.Serializer):
    startDate = serializers.DateField()
    endDate = serializers.DateField()
    workingDays = serializers.ListField(
        child=serializers.IntegerField(min_value=0, max_value=6),
        allow_empty=False,
    )
    startTime = serializers.TimeField()
    endTime = serializers.TimeField()

    def validate_workingDays(self, value):
        if len(set(value)) != len(value):
            raise serializers.ValidationError("workingDays must contain unique values")
        return value


class AppointmentSerializer(serializers.ModelSerializer):
    doctorId = serializers.UUIDField(source="doctorId_id", read_only=True)
    patientId = serializers.UUIDField(source="patientId_id", read_only=True)
    timeSlotId = serializers.UUIDField(source="timeSlotId_id", read_only=True)
    timeSlot = TimeSlotSerializer(source="timeSlotId", read_only=True)

    class Meta:
        model = Appointment
        fields = [
            "id",
            "doctorId",
            "patientId",
            "timeSlotId",
            "timeSlot",
            "status",
            "notes",
            "createdAt",
        ]


class AppointmentBookingSerializer(serializers.Serializer):
    timeSlotId = serializers.UUIDField()
    notes = serializers.CharField(required=False, allow_blank=True, allow_null=True)


class FollowUpAppointmentCreateSerializer(serializers.Serializer):
    timeSlotId = serializers.UUIDField()
    notes = serializers.CharField(required=False, allow_blank=True, allow_null=True)


class ReviewSerializer(serializers.ModelSerializer):
    doctorId = serializers.UUIDField(source="doctorId_id", read_only=True)
    patientId = serializers.UUIDField(source="patientId_id", read_only=True)
    appointmentId = serializers.UUIDField(source="appointmentId_id", read_only=True)

    class Meta:
        model = Review
        fields = [
            "id",
            "doctorId",
            "patientId",
            "appointmentId",
            "rating",
            "comment",
            "createdAt",
        ]


class ReviewCreateSerializer(serializers.Serializer):
    appointmentId = serializers.UUIDField()
    rating = serializers.IntegerField(min_value=1, max_value=5)
    comment = serializers.CharField()


class PatientDiagnosisSerializer(serializers.ModelSerializer):
    patientId = serializers.UUIDField(source="patientId_id", read_only=True)
    doctorId = serializers.UUIDField(source="doctorId_id", read_only=True)
    appointmentId = serializers.UUIDField(source="appointmentId_id", read_only=True)

    class Meta:
        model = PatientDiagnosis
        fields = [
            "id",
            "patientId",
            "doctorId",
            "appointmentId",
            "diagnosis",
            "dateDiagnosed",
        ]


class PatientDiagnosisCreateSerializer(serializers.Serializer):
    appointmentId = serializers.UUIDField()
    diagnosis = serializers.CharField()


class PatientDiagnosisUpdateSerializer(serializers.Serializer):
    diagnosis = serializers.CharField()


class PatientPrescriptionSerializer(serializers.ModelSerializer):
    patientId = serializers.UUIDField(source="patientId_id", read_only=True)
    doctorId = serializers.UUIDField(source="doctorId_id", read_only=True)
    appointmentId = serializers.UUIDField(source="appointmentId_id", read_only=True)

    class Meta:
        model = PatientPrescription
        fields = [
            "id",
            "patientId",
            "doctorId",
            "appointmentId",
            "prescription",
            "dose",
            "duration",
            "isPermanent",
            "datePrescribed",
        ]


class PatientPrescriptionCreateSerializer(serializers.Serializer):
    appointmentId = serializers.UUIDField()
    prescription = serializers.CharField()
    dose = serializers.CharField()
    duration = serializers.CharField()
    isPermanent = serializers.BooleanField()


class PatientPrescriptionUpdateSerializer(serializers.Serializer):
    prescription = serializers.CharField(required=False)
    dose = serializers.CharField(required=False)
    duration = serializers.CharField(required=False)
    isPermanent = serializers.BooleanField(required=False)


class MedicalHistorySerializer(serializers.Serializer):
    medicalRecordId = serializers.UUIDField()
    patientId = serializers.UUIDField()
    appointments = AppointmentSerializer(many=True)
    diagnoses = PatientDiagnosisSerializer(many=True)
    prescriptions = PatientPrescriptionSerializer(many=True)


class UserAdminSerializer(serializers.ModelSerializer):
    first_Name = serializers.CharField(source="first_name", read_only=True)
    last_Name = serializers.CharField(source="last_name", read_only=True)
    role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "userId",
            "email",
            "first_Name",
            "last_Name",
            "phoneNo",
            "createdAt",
            "is_active",
            "role",
        ]

    def get_role(self, obj):
        return resolve_user_role(obj)


class DoctorAdminSerializer(DoctorListSerializer):
    is_active = serializers.BooleanField(read_only=True)

    class Meta(DoctorListSerializer.Meta):
        fields = DoctorListSerializer.Meta.fields + ["is_active"]
