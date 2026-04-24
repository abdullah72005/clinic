from datetime import timedelta

from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import (
    AllowAny,
    IsAuthenticated,
    IsAuthenticatedOrReadOnly,
)
from rest_framework.response import Response
from rest_framework.views import APIView

from authentication.models import Doctor, Patient, User
from clinic_management.models import (
    Appointment,
    AppointmentStatus,
    DoctorSchedule,
    MedicalRecord,
    PatientDiagnosis,
    PatientPrescription,
    Review,
    TimeSlot,
    TimeSlotStatus,
)
from clinic_management.pagination import DefaultPagination
from clinic_management.permissions import is_admin_user
from clinic_management.serializers import (
    AppointmentBookingSerializer,
    AppointmentSerializer,
    DoctorAdminSerializer,
    DoctorDetailSerializer,
    DoctorListSerializer,
    DoctorRecurringScheduleCreateSerializer,
    DoctorScheduleCreateSerializer,
    DoctorScheduleSerializer,
    FollowUpAppointmentCreateSerializer,
    MedicalHistorySerializer,
    PatientDiagnosisCreateSerializer,
    PatientDiagnosisSerializer,
    PatientDiagnosisUpdateSerializer,
    PatientPrescriptionCreateSerializer,
    PatientPrescriptionSerializer,
    PatientPrescriptionUpdateSerializer,
    ReviewCreateSerializer,
    ReviewSerializer,
    TimeSlotSerializer,
    UserAdminSerializer,
)
from clinic_management.services.appointments import (
    AppointmentService,
    MedicalService,
    ReviewService,
    ScheduleService,
    get_doctor_for_user,
    get_patient_for_user,
)


class DoctorViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Doctor.objects.all().order_by("createdAt")
    serializer_class = DoctorListSerializer
    pagination_class = DefaultPagination
    permission_classes = [AllowAny]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return DoctorDetailSerializer
        return super().get_serializer_class()

    def get_queryset(self):
        queryset = super().get_queryset()

        location = self.request.query_params.get("location")
        specialization = self.request.query_params.get("specialization")
        name = self.request.query_params.get("name")
        years = self.request.query_params.get("yearsOfExperience")

        if location:
            queryset = queryset.filter(location__icontains=location)
        if specialization:
            queryset = queryset.filter(specialization__icontains=specialization)
        if name:
            queryset = queryset.filter(
                Q(first_name__icontains=name)
                | Q(last_name__icontains=name)
                | Q(fullName__icontains=name)
            )
        if years:
            try:
                years_value = int(years)
            except ValueError as exc:
                raise ValidationError(
                    {"yearsOfExperience": ["yearsOfExperience must be an integer"]}
                ) from exc
            queryset = queryset.filter(yearsOfExperience=years_value)

        return queryset

    @action(
        detail=True, methods=["get"], permission_classes=[AllowAny], url_path="reviews"
    )
    def reviews(self, request, pk=None):
        doctor = self.get_object()
        queryset = Review.objects.filter(doctorId=doctor).order_by("-createdAt")

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = ReviewSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = ReviewSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(
        detail=True,
        methods=["get"],
        permission_classes=[AllowAny],
        url_path="available-time-slots",
    )
    def available_time_slots(self, request, pk=None):
        doctor = self.get_object()
        now = timezone.now()
        today = now.date()
        current_time = now.time()

        queryset = (
            TimeSlot.objects.filter(
                scheduleId__doctorId=doctor,
                status=TimeSlotStatus.AVAILABLE,
            )
            .filter(
                Q(scheduleId__date__gt=today)
                | Q(scheduleId__date=today, startTime__gt=current_time)
            )
            .select_related("scheduleId", "scheduleId__doctorId")
            .order_by("scheduleId__date", "startTime")
        )

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = TimeSlotSerializer(
                page, many=True, context={"request": request}
            )
            return self.get_paginated_response(serializer.data)

        serializer = TimeSlotSerializer(
            queryset, many=True, context={"request": request}
        )
        return Response(serializer.data)


class DoctorScheduleViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    serializer_class = DoctorScheduleSerializer
    pagination_class = DefaultPagination
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        doctor = get_doctor_for_user(self.request.user)
        if doctor is None:
            return DoctorSchedule.objects.none()

        return (
            DoctorSchedule.objects.filter(doctorId=doctor)
            .prefetch_related("timeSlots")
            .order_by("date", "startTime")
        )

    def create(self, request, *args, **kwargs):
        doctor = get_doctor_for_user(request.user)
        if doctor is None:
            raise PermissionDenied("Only doctors can create schedules")

        serializer = DoctorScheduleCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        schedule = ScheduleService.create_schedule_with_slots(
            doctor=doctor,
            date=serializer.validated_data["date"],
            start_time=serializer.validated_data["startTime"],
            end_time=serializer.validated_data["endTime"],
        )

        output = DoctorScheduleSerializer(schedule, context={"request": request})
        return Response(output.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["post"], url_path="recurring")
    def recurring(self, request):
        doctor = get_doctor_for_user(request.user)
        if doctor is None:
            raise PermissionDenied("Only doctors can create schedules")

        serializer = DoctorRecurringScheduleCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        schedules = ScheduleService.create_recurring_schedules_with_slots(
            doctor=doctor,
            start_date=serializer.validated_data["startDate"],
            end_date=serializer.validated_data["endDate"],
            working_days=serializer.validated_data["workingDays"],
            start_time=serializer.validated_data["startTime"],
            end_time=serializer.validated_data["endTime"],
        )

        output = DoctorScheduleSerializer(
            schedules, many=True, context={"request": request}
        )
        return Response(output.data, status=status.HTTP_201_CREATED)


class AppointmentViewSet(
    mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet
):
    serializer_class = AppointmentSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = DefaultPagination

    def get_queryset(self):
        queryset = Appointment.objects.select_related(
            "doctorId",
            "patientId",
            "timeSlotId",
            "timeSlotId__scheduleId",
            "timeSlotId__scheduleId__doctorId",
        ).order_by("-createdAt")

        if is_admin_user(self.request.user):
            return queryset

        patient = get_patient_for_user(self.request.user)
        if patient is not None:
            return queryset.filter(patientId=patient)

        doctor = get_doctor_for_user(self.request.user)
        if doctor is not None:
            if self.action in {"update", "partial_update"}:
                return queryset
            return queryset.filter(doctorId=doctor)

        return Appointment.objects.none()

    @action(detail=False, methods=["post"], url_path="book")
    def book(self, request):
        patient = get_patient_for_user(request.user)
        if patient is None:
            raise PermissionDenied("Only patients can book appointments")

        serializer = AppointmentBookingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        appointment = AppointmentService.book_appointment(
            patient=patient,
            time_slot_id=serializer.validated_data["timeSlotId"],
            notes=serializer.validated_data.get("notes") or "",
        )

        output = AppointmentSerializer(appointment, context={"request": request})
        return Response(output.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel(self, request, pk=None):
        appointment = self.get_object()
        appointment = AppointmentService.cancel_appointment(
            appointment=appointment, actor_user=request.user
        )
        output = AppointmentSerializer(appointment, context={"request": request})
        return Response(output.data)

    @action(detail=True, methods=["post"], url_path="complete")
    def complete(self, request, pk=None):
        doctor = get_doctor_for_user(request.user)
        if doctor is None:
            raise PermissionDenied("Only doctors can complete appointments")

        appointment = self.get_object()
        appointment = AppointmentService.complete_appointment(
            appointment=appointment, doctor=doctor
        )
        output = AppointmentSerializer(appointment, context={"request": request})
        return Response(output.data)

    @action(detail=True, methods=["post"], url_path="create-next")
    def create_next(self, request, pk=None):
        doctor = get_doctor_for_user(request.user)
        if doctor is None:
            raise PermissionDenied("Only doctors can create follow-up appointments")

        serializer = FollowUpAppointmentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        source_appointment = self.get_object()
        new_appointment = AppointmentService.create_next_appointment(
            source_appointment=source_appointment,
            doctor=doctor,
            time_slot_id=serializer.validated_data["timeSlotId"],
            notes=serializer.validated_data.get("notes") or "",
        )
        output = AppointmentSerializer(new_appointment, context={"request": request})
        return Response(output.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"], url_path="today")
    def today(self, request):
        doctor = get_doctor_for_user(request.user)
        if doctor is None:
            raise PermissionDenied("Only doctors can view doctor appointments")

        today = timezone.now().date()
        queryset = (
            self.get_queryset()
            .filter(
                doctorId=doctor,
                timeSlotId__scheduleId__date=today,
            )
            .order_by("timeSlotId__startTime")
        )

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = AppointmentSerializer(
                page, many=True, context={"request": request}
            )
            return self.get_paginated_response(serializer.data)

        serializer = AppointmentSerializer(
            queryset, many=True, context={"request": request}
        )
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="upcoming-week")
    def upcoming_week(self, request):
        doctor = get_doctor_for_user(request.user)
        if doctor is None:
            raise PermissionDenied("Only doctors can view doctor appointments")

        start_date = timezone.now().date()
        end_date = start_date + timedelta(days=7)
        queryset = (
            self.get_queryset()
            .filter(
                doctorId=doctor,
                timeSlotId__scheduleId__date__gte=start_date,
                timeSlotId__scheduleId__date__lte=end_date,
            )
            .order_by("timeSlotId__scheduleId__date", "timeSlotId__startTime")
        )

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = AppointmentSerializer(
                page, many=True, context={"request": request}
            )
            return self.get_paginated_response(serializer.data)

        serializer = AppointmentSerializer(
            queryset, many=True, context={"request": request}
        )
        return Response(serializer.data)


class ReviewViewSet(
    mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet
):
    serializer_class = ReviewSerializer
    pagination_class = DefaultPagination
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        queryset = Review.objects.select_related(
            "doctorId", "patientId", "appointmentId"
        ).order_by("-createdAt")

        doctor_id = self.request.query_params.get("doctorId")
        if doctor_id:
            queryset = queryset.filter(doctorId_id=doctor_id)

        return queryset

    def create(self, request, *args, **kwargs):
        patient = get_patient_for_user(request.user)
        if patient is None:
            raise PermissionDenied("Only patients can create reviews")

        serializer = ReviewCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        appointment = get_object_or_404(
            Appointment, pk=serializer.validated_data["appointmentId"]
        )
        review, average_rating = ReviewService.create_review(
            patient=patient,
            appointment=appointment,
            rating=serializer.validated_data["rating"],
            comment=serializer.validated_data["comment"],
        )

        output = ReviewSerializer(review, context={"request": request})
        return Response(
            {
                "review": output.data,
                "doctorAverageRating": float(round(average_rating, 2))
                if average_rating is not None
                else None,
            },
            status=status.HTTP_201_CREATED,
        )


class PatientDiagnosisViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = PatientDiagnosisSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = DefaultPagination

    def get_queryset(self):
        queryset = PatientDiagnosis.objects.select_related(
            "doctorId",
            "patientId",
            "appointmentId",
        ).order_by("-dateDiagnosed")

        if is_admin_user(self.request.user):
            return queryset

        doctor = get_doctor_for_user(self.request.user)
        if doctor is not None:
            if self.action in {"update", "partial_update"}:
                return queryset
            return queryset.filter(doctorId=doctor)

        patient = get_patient_for_user(self.request.user)
        if patient is not None:
            return queryset.filter(patientId=patient)

        return PatientDiagnosis.objects.none()

    def create(self, request, *args, **kwargs):
        doctor = get_doctor_for_user(request.user)
        if doctor is None:
            raise PermissionDenied("Only doctors can create diagnoses")

        serializer = PatientDiagnosisCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        appointment = get_object_or_404(
            Appointment, pk=serializer.validated_data["appointmentId"]
        )
        diagnosis = MedicalService.create_diagnosis(
            doctor=doctor,
            appointment=appointment,
            diagnosis_text=serializer.validated_data["diagnosis"],
        )

        output = PatientDiagnosisSerializer(diagnosis, context={"request": request})
        return Response(output.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        diagnosis_obj = self.get_object()
        doctor = get_doctor_for_user(request.user)

        serializer = PatientDiagnosisUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if not is_admin_user(request.user):
            if doctor is None:
                raise PermissionDenied("Only doctors can edit diagnoses")
            diagnosis_obj = MedicalService.update_diagnosis(
                doctor=doctor,
                diagnosis_obj=diagnosis_obj,
                diagnosis_text=serializer.validated_data["diagnosis"],
            )
        else:
            diagnosis_obj.diagnosis = serializer.validated_data["diagnosis"]
            diagnosis_obj.save(update_fields=["diagnosis"])

        output = PatientDiagnosisSerializer(diagnosis_obj, context={"request": request})
        return Response(output.data)


class PatientPrescriptionViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = PatientPrescriptionSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = DefaultPagination

    def get_queryset(self):
        queryset = PatientPrescription.objects.select_related(
            "doctorId",
            "patientId",
            "appointmentId",
        ).order_by("-datePrescribed")

        if is_admin_user(self.request.user):
            return queryset

        doctor = get_doctor_for_user(self.request.user)
        if doctor is not None:
            return queryset.filter(doctorId=doctor)

        patient = get_patient_for_user(self.request.user)
        if patient is not None:
            return queryset.filter(patientId=patient)

        return PatientPrescription.objects.none()

    def create(self, request, *args, **kwargs):
        doctor = get_doctor_for_user(request.user)
        if doctor is None:
            raise PermissionDenied("Only doctors can create prescriptions")

        serializer = PatientPrescriptionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        appointment = get_object_or_404(
            Appointment, pk=serializer.validated_data["appointmentId"]
        )
        prescription = MedicalService.create_prescription(
            doctor=doctor,
            appointment=appointment,
            prescription=serializer.validated_data["prescription"],
            dose=serializer.validated_data["dose"],
            duration=serializer.validated_data["duration"],
            is_permanent=serializer.validated_data["isPermanent"],
        )

        output = PatientPrescriptionSerializer(
            prescription, context={"request": request}
        )
        return Response(output.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        prescription_obj = self.get_object()
        doctor = get_doctor_for_user(request.user)

        serializer = PatientPrescriptionUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if not is_admin_user(request.user):
            if doctor is None:
                raise PermissionDenied("Only doctors can edit prescriptions")
            if prescription_obj.doctorId_id != doctor.pk:
                raise PermissionDenied(
                    "You cannot edit prescriptions created by other doctors"
                )

        for field_name in ["prescription", "dose", "duration", "isPermanent"]:
            if field_name in serializer.validated_data:
                setattr(
                    prescription_obj, field_name, serializer.validated_data[field_name]
                )
        prescription_obj.save()

        output = PatientPrescriptionSerializer(
            prescription_obj, context={"request": request}
        )
        return Response(output.data)


class MyMedicalHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        patient = get_patient_for_user(request.user)
        if patient is None:
            raise PermissionDenied("Only patients can view personal medical history")

        medical_record, _ = MedicalRecord.objects.get_or_create(patientId=patient)
        appointments = (
            Appointment.objects.filter(patientId=patient)
            .select_related(
                "doctorId", "patientId", "timeSlotId", "timeSlotId__scheduleId"
            )
            .order_by("-createdAt")
        )
        diagnoses = PatientDiagnosis.objects.filter(patientId=patient).order_by(
            "-dateDiagnosed"
        )
        prescriptions = PatientPrescription.objects.filter(patientId=patient).order_by(
            "-datePrescribed"
        )

        payload = {
            "medicalRecordId": medical_record.id,
            "patientId": patient.userId,
            "appointments": appointments,
            "diagnoses": diagnoses,
            "prescriptions": prescriptions,
        }
        serializer = MedicalHistorySerializer(payload, context={"request": request})
        return Response(serializer.data)


class PatientMedicalHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, patient_id):
        patient = get_object_or_404(Patient, pk=patient_id)

        if not is_admin_user(request.user):
            doctor = get_doctor_for_user(request.user)
            if doctor is None:
                raise PermissionDenied("Only doctors can view patient medical history")
            if not MedicalService.doctor_can_access_patient(
                doctor=doctor, patient_id=patient.userId
            ):
                raise PermissionDenied(
                    "You can only access patients who booked with you"
                )

        medical_record, _ = MedicalRecord.objects.get_or_create(patientId=patient)
        appointments = (
            Appointment.objects.filter(patientId=patient)
            .select_related(
                "doctorId", "patientId", "timeSlotId", "timeSlotId__scheduleId"
            )
            .order_by("-createdAt")
        )
        diagnoses = PatientDiagnosis.objects.filter(patientId=patient).order_by(
            "-dateDiagnosed"
        )
        prescriptions = PatientPrescription.objects.filter(patientId=patient).order_by(
            "-datePrescribed"
        )

        payload = {
            "medicalRecordId": medical_record.id,
            "patientId": patient.userId,
            "appointments": appointments,
            "diagnoses": diagnoses,
            "prescriptions": prescriptions,
        }
        serializer = MedicalHistorySerializer(payload, context={"request": request})
        return Response(serializer.data)


class AdminUserViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = UserAdminSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = DefaultPagination

    def get_queryset(self):
        if not is_admin_user(self.request.user):
            raise PermissionDenied("Admin access required")
        return User.objects.all().order_by("createdAt")

    def partial_update(self, request, *args, **kwargs):
        user = self.get_object()
        field_map = {
            "first_Name": "first_name",
            "last_Name": "last_name",
            "first_name": "first_name",
            "last_name": "last_name",
            "phoneNo": "phoneNo",
            "is_active": "is_active",
        }

        update_fields = []
        for key, value in request.data.items():
            if key not in field_map:
                raise ValidationError({key: ["Field cannot be updated"]})
            target_field = field_map[key]
            setattr(user, target_field, value)
            update_fields.append(target_field)

        if update_fields:
            user.save(update_fields=list(set(update_fields)))

        serializer = self.get_serializer(user)
        return Response(serializer.data)


class AdminDoctorViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = DoctorAdminSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = DefaultPagination

    def get_queryset(self):
        if not is_admin_user(self.request.user):
            raise PermissionDenied("Admin access required")
        return Doctor.objects.all().order_by("createdAt")

    def partial_update(self, request, *args, **kwargs):
        doctor = self.get_object()
        allowed_fields = {
            "specialization",
            "bio",
            "location",
            "yearsOfExperience",
            "is_active",
        }

        update_fields = []
        for key, value in request.data.items():
            if key not in allowed_fields:
                raise ValidationError({key: ["Field cannot be updated"]})
            if key == "yearsOfExperience":
                try:
                    value = int(value)
                except (TypeError, ValueError) as exc:
                    raise ValidationError(
                        {"yearsOfExperience": ["Must be an integer"]}
                    ) from exc
                if value < 0:
                    raise ValidationError(
                        {"yearsOfExperience": ["Must be greater than or equal to 0"]}
                    )
            setattr(doctor, key, value)
            update_fields.append(key)

        if update_fields:
            doctor.save(update_fields=list(set(update_fields)))

        serializer = self.get_serializer(doctor)
        return Response(serializer.data)


class AdminAppointmentViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = AppointmentSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = DefaultPagination

    def get_queryset(self):
        if not is_admin_user(self.request.user):
            raise PermissionDenied("Admin access required")
        return Appointment.objects.select_related(
            "doctorId",
            "patientId",
            "timeSlotId",
            "timeSlotId__scheduleId",
            "timeSlotId__scheduleId__doctorId",
        ).order_by("-createdAt")

    def partial_update(self, request, *args, **kwargs):
        appointment = self.get_object()
        new_status = request.data.get("status")
        notes = request.data.get("notes")

        if new_status is None and notes is None:
            raise ValidationError({"detail": ["Provide at least one updatable field"]})

        with transaction.atomic():
            appointment = (
                Appointment.objects.select_for_update()
                .select_related("timeSlotId")
                .get(pk=appointment.pk)
            )

            update_fields = []
            if new_status is not None and new_status != appointment.status:
                if appointment.status != AppointmentStatus.BOOKED:
                    raise ValidationError(
                        {"status": ["Only booked appointments can change status"]}
                    )
                if new_status not in {
                    AppointmentStatus.CANCELLED,
                    AppointmentStatus.COMPLETED,
                }:
                    raise ValidationError({"status": ["Invalid status transition"]})

                appointment.status = new_status
                update_fields.append("status")

                if new_status == AppointmentStatus.CANCELLED:
                    slot = appointment.timeSlotId
                    slot.status = TimeSlotStatus.AVAILABLE
                    slot.save(update_fields=["status"])

            if notes is not None:
                appointment.notes = notes
                update_fields.append("notes")

            if update_fields:
                appointment.save(update_fields=list(set(update_fields)))

        serializer = self.get_serializer(appointment)
        return Response(serializer.data)


class AdminReviewViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = ReviewSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = DefaultPagination

    def get_queryset(self):
        if not is_admin_user(self.request.user):
            raise PermissionDenied("Admin access required")
        return Review.objects.select_related(
            "doctorId", "patientId", "appointmentId"
        ).order_by("-createdAt")
