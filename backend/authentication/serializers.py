"""
Django REST Framework Serializers for Auth endpoints
Provides comprehensive validation and serialization for all authentication operations
"""

import re

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

class EmailValidationMixin:
    """Ensures email is normalized to lowercase."""

    def validate_email(self, value):
        return value.strip().lower()

class PasswordValidationMixin:
    """Validates password strength using Django validators and custom length requirements."""

    def validate_password(self, value):
        errors = []

        # Check length requirements
        if len(value) < 8:
            errors.append("auth.password.minLength")
        if len(value) > 128:
            errors.append("auth.password.maxLength")

        # Check for complexity requirements
        if not re.search(r"[A-Z]", value):
            errors.append("auth.password.uppercase")
        if not re.search(r"[a-z]", value):
            errors.append("auth.password.lowercase")
        if not re.search(r"[0-9]", value):
            errors.append("auth.password.number")
        if re.search(r"\s", value):
            errors.append("auth.password.noSpaces")

        # Apply Django's password validators
        try:
            validate_password(value)
        except DjangoValidationError as e:
            if any("entirely numeric" in msg for msg in e.messages):
                errors.append("auth.password.noDigitOnly")
            else:
                errors.append("auth.password.complexity")

        if errors:
            raise serializers.ValidationError(errors)

        return value

class RegisterPatientSerializer(EmailValidationMixin, PasswordValidationMixin, serializers.Serializer):
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    phoneNo = serializers.CharField(max_length=11, required=False, allow_blank=True)
    medical_notes = serializers.CharField(max_length=255, required=False, allow_blank=True)


class RegisterDoctorSerializer(EmailValidationMixin, PasswordValidationMixin, serializers.Serializer):
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    phoneNo = serializers.CharField(max_length=11, required=False, allow_blank=True)
    specialization = serializers.CharField(max_length=100)
    bio = serializers.CharField(max_length=255, required=False, allow_blank=True)
    location = serializers.CharField(max_length=255)


class LoginSerializer(EmailValidationMixin, serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class RefreshTokenSerializer(serializers.Serializer):
    refresh_token = serializers.CharField(required=False, allow_blank=False)


class LogoutSerializer(serializers.Serializer):
    refresh_token = serializers.CharField(required=False, allow_blank=False)
