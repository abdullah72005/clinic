from typing import Dict, Any

from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.models import Group
from django.db import transaction
from rest_framework import serializers
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from authentication.models import Doctor, Patient, User
from authentication.serializers import (
    LoginSerializer,
    LogoutSerializer,
    RefreshTokenSerializer,
    RegisterDoctorSerializer,
    RegisterPatientSerializer,
)

UserModel = get_user_model()


class AuthService:
    @staticmethod
    def _validation_error_response(detail):
        return {
            "status": "error",
            "message": "Validation failed",
            "errors": detail,
        }

    @staticmethod
    def _unexpected_error_response():
        return {
            "status": "error",
            "message": "An unexpected error occurred",
            "errors": {"unexpected": ["auth.unexpected"]},
        }

    @staticmethod
    def _invalid_credentials_response():
        return {
            "status": "error",
            "message": "Invalid email or password",
            "errors": {"credentials": ["auth.login.invalidCredentials"]},
        }

    @staticmethod
    def _invalid_refresh_token_response():
        return {
            "status": "error",
            "message": "Invalid or expired refresh token.",
            "errors": {"refresh_token": ["auth.refreshToken.invalid"]},
        }

    @staticmethod
    def _refresh_token_required_response():
        return {
            "status": "error",
            "message": "Validation failed",
            "errors": {"refresh_token": ["auth.refreshToken.required"]},
        }

    @staticmethod
    def _access_token_expires_in_seconds():
        return int(settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].total_seconds())

    @staticmethod
    def _extract_refresh_token(request_data: Dict[str, Any], request=None):
        refresh_token = request_data.get("refresh_token")
        if refresh_token:
            return refresh_token

        cookie_name = getattr(settings, "AUTH_REFRESH_COOKIE_NAME", "refresh_token")
        if request is not None:
            return request.COOKIES.get(cookie_name)

        return None

    @classmethod
    def register_patient(
        cls, request_data: Dict[str, Any], request=None
    ) -> Dict[str, Any]:
        try:
            with transaction.atomic():
                serializer = RegisterPatientSerializer(data=request_data)
                if not serializer.is_valid():
                    raise serializers.ValidationError(serializer.errors)

                validated_data = serializer.validated_data

                if User.objects.filter(email=validated_data["email"]).exists():
                    return {
                        "status": "error",
                        "message": "Email already registered",
                        "errors": {"email": ["auth.email.exists"]},
                    }

                full_name = f"{validated_data['first_name']} {validated_data['last_name']}".strip()
                user = Patient.objects.create_user(
                    username=validated_data["email"],
                    email=validated_data["email"],
                    password=validated_data["password"],
                    first_name=validated_data["first_name"],
                    last_name=validated_data["last_name"],
                    fullName=full_name,
                    phoneNo=validated_data.get("phoneNo") or None,
                    medical_notes=validated_data.get("medical_notes", ""),
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
                    },
                }
        except serializers.ValidationError as e:
            return cls._validation_error_response(e.detail)
        except Exception:
            return cls._unexpected_error_response()

    @classmethod
    def register_doctor(
        cls, request_data: Dict[str, Any], request=None
    ) -> Dict[str, Any]:

        try:
            with transaction.atomic():
                serializer = RegisterDoctorSerializer(data=request_data)
                if not serializer.is_valid():
                    raise serializers.ValidationError(serializer.errors)

                validated_data = serializer.validated_data

                if User.objects.filter(email=validated_data["email"]).exists():
                    return {
                        "status": "error",
                        "message": "Email already registered",
                        "errors": {"email": ["auth.email.exists"]},
                    }

                full_name = f"{validated_data['first_name']} {validated_data['last_name']}".strip()
                user = Doctor.objects.create_user(
                    username=validated_data["email"],
                    email=validated_data["email"],
                    password=validated_data["password"],
                    first_name=validated_data["first_name"],
                    last_name=validated_data["last_name"],
                    fullName=full_name,
                    phoneNo=validated_data.get("phoneNo") or None,
                    specialization=validated_data["specialization"],
                    bio=validated_data.get("bio", ""),
                    location=validated_data["location"],
                    yearsOfExperience=validated_data.get("yearsOfExperience", 0),
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
                        "yearsOfExperience": user.yearsOfExperience,
                    },
                }
        except serializers.ValidationError as e:
            return cls._validation_error_response(e.detail)
        except Exception:
            return cls._unexpected_error_response()

    @classmethod
    def login(cls, request_data: Dict[str, Any], request=None) -> Dict[str, Any]:
        try:
            serializer = LoginSerializer(data=request_data)
            if not serializer.is_valid():
                raise serializers.ValidationError(serializer.errors)

            validated_data = serializer.validated_data

            user = authenticate(
                request=request,
                username=validated_data["email"],
                password=validated_data["password"],
            )

            if user is None or not user.is_active:
                return cls._invalid_credentials_response()

            refresh_token = RefreshToken.for_user(user)
            access_token = refresh_token.access_token

            return {
                "status": "success",
                "message": "Login successful.",
                "data": {
                    "userId": str(user.userId),
                    "email": user.email,
                    "fullName": user.fullName,
                    "access_token": str(access_token),
                    "refresh_token": str(refresh_token),
                    "access_token_expires_in": cls._access_token_expires_in_seconds(),
                },
            }
        except serializers.ValidationError as e:
            return cls._validation_error_response(e.detail)
        except Exception:
            return cls._unexpected_error_response()

    @classmethod
    def refresh_token(
        cls, request_data: Dict[str, Any], request=None
    ) -> Dict[str, Any]:
        try:
            serializer = RefreshTokenSerializer(data=request_data)
            if not serializer.is_valid():
                raise serializers.ValidationError(serializer.errors)

            refresh_token = cls._extract_refresh_token(
                serializer.validated_data, request=request
            )
            if not refresh_token:
                return cls._refresh_token_required_response()

            try:
                old_refresh_token = RefreshToken(refresh_token)
                old_refresh_token.check_blacklist()
                user_id = old_refresh_token.get("user_id")
                user = UserModel.objects.filter(pk=user_id, is_active=True).first()
                if not user:
                    return cls._invalid_refresh_token_response()

                new_refresh_token = RefreshToken.for_user(user)
                old_refresh_token.blacklist()
            except TokenError:
                return cls._invalid_refresh_token_response()

            return {
                "status": "success",
                "message": "Access token refreshed successfully.",
                "data": {
                    "access_token": str(new_refresh_token.access_token),
                    "refresh_token": str(new_refresh_token),
                    "access_token_expires_in": cls._access_token_expires_in_seconds(),
                },
            }
        except serializers.ValidationError as e:
            return cls._validation_error_response(e.detail)
        except Exception:
            return cls._unexpected_error_response()

    @classmethod
    def logout(cls, request_data: Dict[str, Any], request=None) -> Dict[str, Any]:
        try:
            serializer = LogoutSerializer(data=request_data)
            if not serializer.is_valid():
                raise serializers.ValidationError(serializer.errors)

            refresh_token = cls._extract_refresh_token(
                serializer.validated_data, request=request
            )
            if not refresh_token:
                return cls._refresh_token_required_response()

            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except TokenError:
                return cls._invalid_refresh_token_response()

            return {
                "status": "success",
                "message": "Logged out successfully.",
                "data": {
                    "logged_out": True,
                },
            }
        except serializers.ValidationError as e:
            return cls._validation_error_response(e.detail)
        except Exception:
            return cls._unexpected_error_response()
