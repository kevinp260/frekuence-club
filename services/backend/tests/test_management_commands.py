import io
import os
import tempfile
from pathlib import Path

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase, override_settings
from django_otp.plugins.otp_totp.models import TOTPDevice

from events.models import Event


class ManagementCommandTests(TestCase):
    def test_totp_provisioning_requires_active_staff_and_writes_private_qr_without_secret_output(
        self,
    ):
        user = get_user_model().objects.create_user(username="staff", is_staff=True, is_active=True)
        with tempfile.TemporaryDirectory() as directory:
            output_path = Path(directory) / "totp.png"
            stdout = io.StringIO()
            call_command("provision_totp", user.username, output=output_path, stdout=stdout)
            device = TOTPDevice.objects.get(user=user)

            self.assertTrue(device.confirmed)
            self.assertTrue(output_path.read_bytes().startswith(b"\x89PNG"))
            self.assertEqual(os.stat(output_path).st_mode & 0o777, 0o600)
            self.assertNotIn(device.key, stdout.getvalue())
            self.assertNotIn("otpauth://", stdout.getvalue())

    def test_totp_provisioning_refuses_duplicate_confirmed_device(self):
        user = get_user_model().objects.create_user(username="staff", is_staff=True, is_active=True)
        TOTPDevice.objects.create(user=user, confirmed=True)
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaisesMessage(CommandError, "already exists"):
                call_command("provision_totp", user.username, output=Path(directory) / "totp.png")

    @override_settings(MEDIA_ROOT="/vol/media", STATIC_ROOT="/vol/static")
    def test_totp_provisioning_refuses_public_output_path(self):
        user = get_user_model().objects.create_user(username="staff", is_staff=True, is_active=True)
        with self.assertRaisesMessage(CommandError, "cannot be written beneath public"):
            call_command("provision_totp", user.username, output="/vol/media/totp.png")

    def test_development_fixture_command_is_disabled_by_default(self):
        with self.assertRaisesMessage(CommandError, "DJANGO_ALLOW_DEV_FIXTURES"):
            call_command("seed_dev_data")
        self.assertFalse(Event.objects.exists())
