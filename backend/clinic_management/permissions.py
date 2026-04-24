from rest_framework.permissions import BasePermission


def _in_group(user, group_name):
    return user.is_authenticated and user.groups.filter(name=group_name).exists()


def is_admin_user(user):
    return user.is_authenticated and (
        user.is_superuser or _in_group(user, "MasterUser")
    )


def is_doctor_user(user):
    return _in_group(user, "Doctor")


def is_patient_user(user):
    return _in_group(user, "Patient")


class IsAdminUser(BasePermission):
    def has_permission(self, request, view):
        return is_admin_user(request.user)


class IsDoctorUser(BasePermission):
    def has_permission(self, request, view):
        return is_doctor_user(request.user)


class IsPatientUser(BasePermission):
    def has_permission(self, request, view):
        return is_patient_user(request.user)
