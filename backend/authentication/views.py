import secrets

from django.conf import settings
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from authentication.services.authService import AuthService
from rest_framework.decorators import api_view, permission_classes


def _resolve_response_status(service_response, success_status):
    if service_response.get("status") == "success":
        return success_status

    errors = service_response.get("errors", {})
    if errors.get("email") == ["auth.email.exists"]:
        return status.HTTP_409_CONFLICT

    if errors.get("credentials") == ["auth.login.invalidCredentials"]:
        return status.HTTP_401_UNAUTHORIZED

    if errors.get("refresh_token") == ["auth.refreshToken.invalid"]:
        return status.HTTP_401_UNAUTHORIZED

    if errors.get("csrf") == ["auth.csrf.invalid"]:
        return status.HTTP_403_FORBIDDEN

    if service_response.get("message") == "An unexpected error occurred":
        return status.HTTP_500_INTERNAL_SERVER_ERROR

    return status.HTTP_400_BAD_REQUEST


def _set_refresh_cookie(response, refresh_token):
    refresh_cookie_name = getattr(settings, "AUTH_REFRESH_COOKIE_NAME", "refresh_token")
    refresh_lifetime_seconds = int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds())
    refresh_cookie_secure = getattr(settings, "AUTH_REFRESH_COOKIE_SECURE", False) or not settings.DEBUG
    refresh_cookie_samesite = getattr(settings, "AUTH_REFRESH_COOKIE_SAMESITE", "Lax")

    response.set_cookie(
        key=refresh_cookie_name,
        value=refresh_token,
        max_age=refresh_lifetime_seconds,
        httponly=True,
        secure=refresh_cookie_secure,
        samesite=refresh_cookie_samesite,
        path="/api/auth/",
    )


def _set_csrf_cookie(response):
    csrf_cookie_name = getattr(settings, "AUTH_CSRF_COOKIE_NAME", "auth_csrf")
    refresh_lifetime_seconds = int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds())
    csrf_cookie_secure = getattr(settings, "AUTH_CSRF_COOKIE_SECURE", False) or not settings.DEBUG
    csrf_cookie_samesite = getattr(settings, "AUTH_CSRF_COOKIE_SAMESITE", "Lax")
    csrf_token = secrets.token_urlsafe(32)

    response.set_cookie(
        key=csrf_cookie_name,
        value=csrf_token,
        max_age=refresh_lifetime_seconds,
        httponly=False,
        secure=csrf_cookie_secure,
        samesite=csrf_cookie_samesite,
        path="/api/auth/",
    )


def _clear_refresh_cookie(response):
    refresh_cookie_name = getattr(settings, "AUTH_REFRESH_COOKIE_NAME", "refresh_token")
    refresh_cookie_samesite = getattr(settings, "AUTH_REFRESH_COOKIE_SAMESITE", "Lax")

    response.delete_cookie(
        key=refresh_cookie_name,
        path="/api/auth/",
        samesite=refresh_cookie_samesite,
    )


def _clear_csrf_cookie(response):
    csrf_cookie_name = getattr(settings, "AUTH_CSRF_COOKIE_NAME", "auth_csrf")
    csrf_cookie_samesite = getattr(settings, "AUTH_CSRF_COOKIE_SAMESITE", "Lax")

    response.delete_cookie(
        key=csrf_cookie_name,
        path="/api/auth/",
        samesite=csrf_cookie_samesite,
    )


def _csrf_failed_response():
    return {
        "status": "error",
        "message": "CSRF validation failed",
        "errors": {"csrf": ["auth.csrf.invalid"]},
    }


def _request_uses_cookie_refresh_token(request):
    request_refresh_token = request.data.get("refresh_token") if hasattr(request.data, "get") else None
    refresh_cookie_name = getattr(settings, "AUTH_REFRESH_COOKIE_NAME", "refresh_token")
    refresh_cookie_value = request.COOKIES.get(refresh_cookie_name)
    return not request_refresh_token and bool(refresh_cookie_value)


def _validate_cookie_csrf(request):
    csrf_cookie_name = getattr(settings, "AUTH_CSRF_COOKIE_NAME", "auth_csrf")
    csrf_header_name = getattr(settings, "AUTH_CSRF_HEADER_NAME", "X-Auth-CSRF")

    csrf_cookie_value = request.COOKIES.get(csrf_cookie_name)
    csrf_header_value = request.headers.get(csrf_header_name)

    if not csrf_cookie_value or not csrf_header_value:
        return False

    return secrets.compare_digest(csrf_cookie_value, csrf_header_value)

@api_view(['POST'])
@permission_classes([AllowAny])
def register_patient(request):
    service_response = AuthService.register_patient(request.data, request=request)
    response_status = _resolve_response_status(service_response, status.HTTP_201_CREATED)
    return Response(service_response, status=response_status)

@api_view(['POST'])
@permission_classes([AllowAny])
def register_doctor(request):
    service_response = AuthService.register_doctor(request.data, request=request)
    response_status = _resolve_response_status(service_response, status.HTTP_201_CREATED)
    return Response(service_response, status=response_status)


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    service_response = AuthService.login(request.data, request=request)
    response_status = _resolve_response_status(service_response, status.HTTP_200_OK)
    response = Response(service_response, status=response_status)

    refresh_token = service_response.get("data", {}).get("refresh_token")
    if service_response.get("status") == "success" and refresh_token:
        _set_refresh_cookie(response, refresh_token)
        _set_csrf_cookie(response)

    return response


@api_view(['POST'])
@permission_classes([AllowAny])
def refresh_token(request):
    if _request_uses_cookie_refresh_token(request) and not _validate_cookie_csrf(request):
        service_response = _csrf_failed_response()
        return Response(service_response, status=_resolve_response_status(service_response, status.HTTP_200_OK))

    service_response = AuthService.refresh_token(request.data, request=request)
    response_status = _resolve_response_status(service_response, status.HTTP_200_OK)
    response = Response(service_response, status=response_status)

    refresh_token_value = service_response.get("data", {}).get("refresh_token")
    if service_response.get("status") == "success" and refresh_token_value:
        _set_refresh_cookie(response, refresh_token_value)
        _set_csrf_cookie(response)

    return response


@api_view(['POST'])
@permission_classes([AllowAny])
def logout(request):
    if _request_uses_cookie_refresh_token(request) and not _validate_cookie_csrf(request):
        service_response = _csrf_failed_response()
        response = Response(service_response, status=_resolve_response_status(service_response, status.HTTP_200_OK))
        _clear_refresh_cookie(response)
        _clear_csrf_cookie(response)
        return response

    service_response = AuthService.logout(request.data, request=request)
    response_status = _resolve_response_status(service_response, status.HTTP_200_OK)
    response = Response(service_response, status=response_status)
    _clear_refresh_cookie(response)
    _clear_csrf_cookie(response)
    return response
