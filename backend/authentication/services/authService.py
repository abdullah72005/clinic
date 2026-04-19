from typing import Dict, Any

from django.contrib.auth.models import Group
from django.db import transaction
from rest_framework import serializers

from authentication.models import Doctor, Patient, User
from authentication.serializers import RegisterDoctorSerializer, RegisterPatientSerializer


class AuthService:

    @classmethod
    def register_patient(cls, request_data: Dict[str, Any], request=None) -> Dict[str, Any]:
        try:
            with transaction.atomic():
                serializer = RegisterPatientSerializer(data=request_data)
                if not serializer.is_valid():
                    raise serializers.ValidationError(serializer.errors)

                validated_data = serializer.validated_data

                if User.objects.filter(email=validated_data['email']).exists():
                    return {
                        "status": "error",
                        "message": "Email already registered",
                        "errors": {"email": ["auth.email.exists"]},
                    }

                full_name = f"{validated_data['first_name']} {validated_data['last_name']}".strip()
                user = Patient.objects.create_user(
                    username=validated_data['email'],
                    email=validated_data['email'],
                    password=validated_data['password'],
                    first_name=validated_data['first_name'],
                    last_name=validated_data['last_name'],
                    fullName=full_name,
                    phoneNo=validated_data.get('phoneNo') or None,
                    medical_notes=validated_data.get('medical_notes', ''),
                )

                patient_group, _ = Group.objects.get_or_create(name="Patient")
                user.groups.add(patient_group)

                return {
                    "status": "success",
                    "message": "Patient registered successfully",
                    "data": {
                        "userId": str(user.userId),
                        "email": user.email,
                        "fullName": user.fullName,
                        "createdAt": user.createdAt.isoformat(),
                    }
                }
        except serializers.ValidationError as e:
            return {
                "status": "error",
                "message": "Validation failed",
                "errors": e.detail,
            }
        except Exception as e:
            return {
                "status": "error",
                "message": "An unexpected error occurred",
                "errors": {"unexpected": [str(e)]},
            }


    @classmethod
    def register_doctor(cls, request_data: Dict[str, Any], request=None) -> Dict[str, Any]:

        try:
            with transaction.atomic():
                serializer = RegisterDoctorSerializer(data=request_data)
                if not serializer.is_valid():
                    raise serializers.ValidationError(serializer.errors)

                validated_data = serializer.validated_data

                if User.objects.filter(email=validated_data['email']).exists():
                    return {
                        "status": "error",
                        "message": "Email already registered",
                        "errors": {"email": ["auth.email.exists"]},
                    }

                full_name = f"{validated_data['first_name']} {validated_data['last_name']}".strip()
                user = Doctor.objects.create_user(
                    username=validated_data['email'],
                    email=validated_data['email'],
                    password=validated_data['password'],
                    first_name=validated_data['first_name'],
                    last_name=validated_data['last_name'],
                    fullName=full_name,
                    phoneNo=validated_data.get('phoneNo') or None,
                    specialization=validated_data['specialization'],
                    bio=validated_data.get('bio', ''),
                    location=validated_data['location'],
                )

                doctor_group, _ = Group.objects.get_or_create(name="Doctor")
                user.groups.add(doctor_group)

                return {
                    "status": "success",
                    "message": "Doctor registered successfully",
                    "data": {
                        "userId": str(user.userId),
                        "email": user.email,
                        "fullName": user.fullName,
                        "createdAt": user.createdAt.isoformat(),
                        "specialization": user.specialization,
                        "bio": user.bio,
                        "location": user.location,
                    }
                }
        except serializers.ValidationError as e:
            return {
                "status": "error",
                "message": "Validation failed",
                "errors": e.detail,
            }
        except Exception as e:
            return {
                "status": "error",
                "message": "An unexpected error occurred",
                "errors": {"unexpected": [str(e)]},
            }