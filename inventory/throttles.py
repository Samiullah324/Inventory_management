from rest_framework.throttling import UserRateThrottle


class DashboardRateThrottle(UserRateThrottle):
    scope = 'dashboard'
