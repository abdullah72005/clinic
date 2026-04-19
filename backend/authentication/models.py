from django.db import models
import uuid
from django.contrib.auth.models import AbstractUser
from django.core.validators import RegexValidator

# Create your models here.

class User(AbstractUser):
    userId = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    fullName = models.CharField(max_length=255)
    createdAt = models.DateTimeField(auto_now_add=True)
    phoneNo = models.CharField(
        max_length=11,
        unique=True,
        blank=True,
        null=True,
        validators=[
            RegexValidator(
                regex=r"^01[0125][0-9]{8}$",
                message="Phone number must be a valid Egyptian number starting with 010, 011, 012, or 015",
            )
        ],
    )
    pfp = models.ImageField(upload_to="profile_pics/", blank=True, null=True)

class Doctor(User):
    specialization = models.CharField(max_length=100)
    bio = models.TextField(blank=True, null=True, max_length=255)
    location = models.CharField(max_length=255)

class Patient(User):
    medical_notes = models.TextField(blank=True, null=True, max_length=255)

class MasterUser(User):
    pass