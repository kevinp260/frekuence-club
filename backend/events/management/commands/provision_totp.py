import os
from pathlib import Path

import qrcode
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django_otp.plugins.otp_totp.models import TOTPDevice


class Command(BaseCommand):
    help = "Provision a confirmed staff TOTP device and write its QR code to a new mode-0600 file."

    def add_arguments(self, parser):
        parser.add_argument("username")
        parser.add_argument(
            "--output", required=True, help="New private PNG path outside public media"
        )

    def handle(self, *args, **options):
        user = get_user_model().objects.filter(username=options["username"]).first()
        if not user or not user.is_active or not user.is_staff:
            raise CommandError("The account must be an existing active staff user.")
        if TOTPDevice.objects.filter(user=user, confirmed=True).exists():
            raise CommandError("A confirmed TOTP device already exists for this account.")

        output = Path(options["output"]).resolve()
        for public_root in (settings.MEDIA_ROOT, settings.STATIC_ROOT):
            if output.is_relative_to(Path(public_root).resolve()):
                raise CommandError(
                    "The TOTP QR cannot be written beneath public media or static roots."
                )
        output.parent.mkdir(parents=True, exist_ok=True)
        device = TOTPDevice.objects.create(user=user, name="Authenticator", confirmed=True)
        try:
            descriptor = os.open(output, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
            with os.fdopen(descriptor, "wb") as output_file:
                qrcode.make(device.config_url).save(output_file, format="PNG")
        except Exception:
            device.delete()
            raise

        self.stdout.write(
            self.style.SUCCESS(f"TOTP device created; private QR written to {output}")
        )
        self.stdout.write(
            "Transfer it securely, enroll immediately, verify access, then delete the file."
        )
