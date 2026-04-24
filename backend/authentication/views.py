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


def _clear_refresh_cookie(response):
    refresh_cookie_name = getattr(settings, "AUTH_REFRESH_COOKIE_NAME", "refresh_token")
    refresh_cookie_samesite = getattr(settings, "AUTH_REFRESH_COOKIE_SAMESITE", "Lax")

    response.delete_cookie(
        key=refresh_cookie_name,
        path="/api/auth/",
        samesite=refresh_cookie_samesite,
    )

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

    return response


@api_view(['POST'])
@permission_classes([AllowAny])
def refresh_token(request):
    service_response = AuthService.refresh_token(request.data, request=request)
    response_status = _resolve_response_status(service_response, status.HTTP_200_OK)
    response = Response(service_response, status=response_status)

    refresh_token_value = service_response.get("data", {}).get("refresh_token")
    if service_response.get("status") == "success" and refresh_token_value:
        _set_refresh_cookie(response, refresh_token_value)

    return response


@api_view(['POST'])
@permission_classes([AllowAny])
def logout(request):
    service_response = AuthService.logout(request.data, request=request)
    response_status = _resolve_response_status(service_response, status.HTTP_200_OK)
    response = Response(service_response, status=response_status)
    _clear_refresh_cookie(response)
    return response
