import os
import subprocess
import sys
from pathlib import Path

from django.test import SimpleTestCase


class ConfigurationRegressionTests(SimpleTestCase):
    base_dir = Path(__file__).resolve().parent.parent

    def run_system_check(self, **overrides):
        environment = os.environ.copy()
        environment.update(
            {
                "DJANGO_ENVIRONMENT": "production",
                "DJANGO_SECRET_KEY": "production-smoke-only-not-a-secret-9Jz7pQ4vN8xR2mK6wC3sH5dL",
                "DJANGO_DEBUG": "false",
                "DJANGO_ALLOWED_HOSTS": "frekuence.club",
                "DJANGO_CSRF_TRUSTED_ORIGINS": "https://frekuence.club",
                "DJANGO_SECURE_SSL_REDIRECT": "true",
                "DJANGO_SECURE_COOKIES": "true",
                "POSTGRES_PASSWORD": "production-smoke-database-password-9Jz7pQ4vN8xR2mK6",
            }
        )
        environment.update(overrides)
        return subprocess.run(
            [sys.executable, "manage.py", "check"],
            cwd=self.base_dir,
            env=environment,
            check=False,
            capture_output=True,
            text=True,
        )

    def test_unknown_environment_is_rejected(self):
        result = self.run_system_check(DJANGO_ENVIRONMENT="prodution")

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("DJANGO_ENVIRONMENT must be one of", result.stderr)

    def test_production_rejects_empty_and_documented_default_database_passwords(self):
        unsafe_passwords = (
            "",
            "development-only-not-a-secret",
            "replace-with-a-random-database-password",
        )

        for password in unsafe_passwords:
            with self.subTest(password=password):
                result = self.run_system_check(POSTGRES_PASSWORD=password)
                self.assertNotEqual(result.returncode, 0)
                self.assertIn(
                    "Production requires a non-empty, non-default POSTGRES_PASSWORD",
                    result.stderr,
                )
