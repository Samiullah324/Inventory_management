from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler


def inventory_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is not None:
        if isinstance(response.data, dict):
            if 'detail' in response.data and len(response.data) == 1:
                response.data = {
                    'error': str(response.data['detail']),
                    'details': {},
                }
            elif 'detail' in response.data:
                details = {
                    key: value
                    for key, value in response.data.items()
                    if key != 'detail'
                }
                response.data = {
                    'error': str(response.data['detail']),
                    'details': details,
                }
            else:
                response.data = {
                    'error': 'Validation failed',
                    'details': response.data,
                }
        elif isinstance(response.data, list):
            response.data = {
                'error': '; '.join(str(item) for item in response.data),
                'details': {},
            }
        return response

    return Response(
        {'error': 'An unexpected server error occurred.', 'details': {}},
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
