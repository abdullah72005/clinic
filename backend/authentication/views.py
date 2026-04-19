from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from authentication.services.authService import AuthService
from rest_framework.decorators import api_view, permission_classes

@api_view(['POST'])
@permission_classes([AllowAny])
def register_patient(request):
    service_response = AuthService.register_patient(request.data, request=request)
    response_status = status.HTTP_201_CREATED if service_response.get("status") == "success" else status.HTTP_400_BAD_REQUEST

    if service_response.get("errors", {}).get("email") == ["auth.email.exists"]:
        response_status = status.HTTP_409_CONFLICT
    if service_response.get("message") == "An unexpected error occurred":
        response_status = status.HTTP_500_INTERNAL_SERVER_ERROR

    return Response(service_response, status=response_status)

@api_view(['POST'])
@permission_classes([AllowAny])
def register_doctor(request):
    service_response = AuthService.register_doctor(request.data, request=request)
    response_status = status.HTTP_201_CREATED if service_response.get("status") == "success" else status.HTTP_400_BAD_REQUEST

    if service_response.get("errors", {}).get("email") == ["auth.email.exists"]:
        response_status = status.HTTP_409_CONFLICT
    if service_response.get("message") == "An unexpected error occurred":
        response_status = status.HTTP_500_INTERNAL_SERVER_ERROR

    return Response(service_response, status=response_status)
