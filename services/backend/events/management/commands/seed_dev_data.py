import io
import os
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from django_otp.plugins.otp_totp.models import TOTPDevice
from PIL import Image, ImageDraw

from events.models import Event


class Command(BaseCommand):
    help = "Create unmistakably non-production, draft-only staff preview data."

    def handle(self, *args, **options):
        if os.getenv("DJANGO_ALLOW_DEV_FIXTURES") != "true":
            raise CommandError("Development fixtures require DJANGO_ALLOW_DEV_FIXTURES=true.")
        username = os.getenv("FREKUENCE_DEV_ADMIN_USERNAME")
        password = os.getenv("FREKUENCE_DEV_ADMIN_PASSWORD")
        totp_key = os.getenv("FREKUENCE_DEV_TOTP_KEY")
        if not username or not password or not totp_key:
            raise CommandError(
                "Set FREKUENCE_DEV_ADMIN_USERNAME, FREKUENCE_DEV_ADMIN_PASSWORD, and "
                "FREKUENCE_DEV_TOTP_KEY at runtime."
            )
        if len(totp_key) != 40:
            raise CommandError("FREKUENCE_DEV_TOTP_KEY must be exactly 40 hexadecimal characters.")

        user, _ = get_user_model().objects.get_or_create(username=username)
        user.is_active = True
        user.is_staff = True
        user.is_superuser = True
        user.set_password(password)
        user.save()
        TOTPDevice.objects.update_or_create(
            user=user,
            name="Development authenticator",
            defaults={"confirmed": True, "key": totp_key.lower()},
        )

        event = Event.objects.filter(slug="development-fixture-not-a-real-event").first()
        if event is None:
            image = Image.new("RGB", (900, 1200), "#111111")
            draw = ImageDraw.Draw(image)
            draw.rectangle((45, 45, 855, 1155), outline="#ff3737", width=12)
            draw.multiline_text(
                (90, 480),
                "DEVELOPMENT FIXTURE\nNOT A REAL EVENT\nDO NOT PUBLISH",
                fill="#ffffff",
                spacing=24,
            )
            payload = io.BytesIO()
            image.save(payload, format="PNG")
            image.close()
            start = timezone.now() + timedelta(days=7)
            event = Event(
                slug="development-fixture-not-a-real-event",
                title_sq="DEVELOPMENT FIXTURE — JO EVENT REAL",
                title_en="DEVELOPMENT FIXTURE — NOT A REAL EVENT",
                summary_sq="Vetëm për kontrollin e ndërfaqes së stafit.",
                summary_en="For staff-interface review only.",
                description_sq="Të dhëna sintetike. Mos e publikoni.",
                description_en="Synthetic data. Do not publish.",
                starts_at=start,
                ends_at=start + timedelta(hours=6),
                lineup=["DEVELOPMENT FIXTURE ACT"],
                publication_status=Event.PublicationStatus.DRAFT,
                poster=SimpleUploadedFile(
                    "development-fixture.png", payload.getvalue(), content_type="image/png"
                ),
            )
            event.save()
        elif event.publication_status != Event.PublicationStatus.DRAFT:
            raise CommandError("The development fixture must never be published.")

        self.stdout.write(self.style.SUCCESS("Draft-only development fixture is ready."))
