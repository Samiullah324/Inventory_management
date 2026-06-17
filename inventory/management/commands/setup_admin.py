from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

User = get_user_model()

DEFAULT_DEV_PASSWORD = 'admin123'


class Command(BaseCommand):
    help = 'Create or update the single admin user for the inventory system.'

    def add_arguments(self, parser):
        parser.add_argument('--username', default='admin', help='Admin username')
        parser.add_argument('--email', default='admin@example.com', help='Admin email')
        parser.add_argument('--password', default=DEFAULT_DEV_PASSWORD, help='Admin password')

    def handle(self, *args, **options):
        username = options['username']
        email = options['email']
        password = options['password']

        if not settings.DEBUG and password == DEFAULT_DEV_PASSWORD:
            raise CommandError(
                'Refusing default password when DEBUG=False. '
                'Pass --password with a strong value for production.'
            )

        user, created = User.objects.get_or_create(
            username=username,
            defaults={'email': email, 'is_staff': True, 'is_superuser': True},
        )
        user.email = email
        user.is_staff = True
        user.is_superuser = True
        user.set_password(password)
        user.save()

        action = 'Created' if created else 'Updated'
        self.stdout.write(self.style.SUCCESS(f'{action} admin user "{username}".'))
