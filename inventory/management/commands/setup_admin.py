from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from decouple import config

User = get_user_model()


class Command(BaseCommand):
    help = 'Create or update the single admin user for the inventory system.'

    def add_arguments(self, parser):
        parser.add_argument('--username', default='admin', help='Admin username')
        parser.add_argument('--email', default='admin@example.com', help='Admin email')
        parser.add_argument(
            '--password',
            default=None,
            help='Admin password (falls back to DJANGO_ADMIN_PASSWORD)',
        )

    def handle(self, *args, **options):
        username = options['username']
        email = options['email']
        password = options['password'] or config('DJANGO_ADMIN_PASSWORD', default=None)

        if not password:
            if settings.DEBUG:
                password = 'admin123'
                self.stdout.write(
                    self.style.WARNING(
                        'DJANGO_ADMIN_PASSWORD not set; using default dev password.'
                    )
                )
            else:
                raise CommandError(
                    'Admin password is required. Set DJANGO_ADMIN_PASSWORD or pass --password.'
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
