import os
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent


def env_bool(name, default=False):
    value = os.getenv(name)
    if value is None:
        return default
    if value.lower() in {"1", "true", "yes", "on"}:
        return True
    if value.lower() in {"0", "false", "no", "off"}:
        return False
    raise ImproperlyConfigured(f"{name} must be a boolean value")


def env_list(name, default=""):
    return [item.strip() for item in os.getenv(name, default).split(",") if item.strip()]


ENVIRONMENT = os.getenv("DJANGO_ENVIRONMENT", "production")
VALID_ENVIRONMENTS = frozenset({"development", "test", "production"})
if ENVIRONMENT not in VALID_ENVIRONMENTS:
    choices = ", ".join(sorted(VALID_ENVIRONMENTS))
    raise ImproperlyConfigured(f"DJANGO_ENVIRONMENT must be one of: {choices}")

DEBUG = env_bool("DJANGO_DEBUG", False)
SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "")

if len(SECRET_KEY) < 32:
    raise ImproperlyConfigured("DJANGO_SECRET_KEY must contain at least 32 characters")
if ENVIRONMENT == "production" and SECRET_KEY == "development-only-not-a-secret-key":
    raise ImproperlyConfigured("The development-only Django secret cannot be used in production")

ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS")
CSRF_TRUSTED_ORIGINS = env_list("DJANGO_CSRF_TRUSTED_ORIGINS")
if not ALLOWED_HOSTS:
    raise ImproperlyConfigured("DJANGO_ALLOWED_HOSTS must contain at least one exact host")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "axes",
    "django_otp",
    "django_otp.plugins.otp_totp",
    "rest_framework",
    "events.apps.EventsConfig",
    "staff_access.apps.StaffAccessConfig",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django_otp.middleware.OTPMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "axes.middleware.AxesMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    }
]

POSTGRES_DB = os.getenv("POSTGRES_DB", "frekuence")
POSTGRES_USER = os.getenv("POSTGRES_USER", "frekuence")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "")
UNSAFE_PRODUCTION_POSTGRES_PASSWORDS = frozenset(
    {
        "",
        "development-only-not-a-secret",
        "replace-with-a-random-database-password",
    }
)
if ENVIRONMENT == "production" and POSTGRES_PASSWORD in UNSAFE_PRODUCTION_POSTGRES_PASSWORDS:
    raise ImproperlyConfigured("Production requires a non-empty, non-default POSTGRES_PASSWORD")

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": POSTGRES_DB,
        "USER": POSTGRES_USER,
        "PASSWORD": POSTGRES_PASSWORD,
        "HOST": os.getenv("POSTGRES_HOST", "db"),
        "PORT": os.getenv("POSTGRES_PORT", "5432"),
        "CONN_MAX_AGE": 60,
        "CONN_HEALTH_CHECKS": True,
    }
}

AUTHENTICATION_BACKENDS = [
    "axes.backends.AxesStandaloneBackend",
    "django.contrib.auth.backends.ModelBackend",
]
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 14},
    },
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.Argon2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher",
]

LANGUAGE_CODE = "en-gb"
TIME_ZONE = "Europe/Tirane"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = Path(os.getenv("DJANGO_STATIC_ROOT", "/vol/static"))
MEDIA_URL = "/media/"
MEDIA_ROOT = Path(os.getenv("DJANGO_MEDIA_ROOT", "/vol/media"))

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
APPEND_SLASH = True
LOGIN_URL = "/staff/login/"

SESSION_COOKIE_SECURE = env_bool("DJANGO_SECURE_COOKIES", True)
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SECURE = env_bool("DJANGO_SECURE_COOKIES", True)
CSRF_COOKIE_HTTPONLY = True
CSRF_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_AGE = 3600
SECURE_SSL_REDIRECT = env_bool("DJANGO_SECURE_SSL_REDIRECT", True)
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_HSTS_SECONDS = 31_536_000
SECURE_HSTS_INCLUDE_SUBDOMAINS = False
SECURE_HSTS_PRELOAD = False
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"
X_FRAME_OPTIONS = "DENY"

# Host Nginx owns the final public HSTS policy. Subdomain inclusion and preload remain deliberately
# disabled until checkpoint 7 verifies every applicable hostname over HTTPS.
SILENCED_SYSTEM_CHECKS = ["security.W005", "security.W021"]

if ENVIRONMENT == "production" and (
    DEBUG or not SESSION_COOKIE_SECURE or not CSRF_COOKIE_SECURE or not SECURE_SSL_REDIRECT
):
    raise ImproperlyConfigured(
        "Production requires DEBUG=False, secure cookies, and HTTPS redirect"
    )

DATA_UPLOAD_MAX_MEMORY_SIZE = 26 * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = 2 * 1024 * 1024
DATA_UPLOAD_MAX_NUMBER_FIELDS = 100
EVENT_POSTER_MAX_BYTES = 25 * 1024 * 1024
EVENT_POSTER_MAX_PIXELS = 40_000_000

AXES_ENABLED = True
AXES_FAILURE_LIMIT = 5
AXES_COOLOFF_TIME = 1
AXES_LOCK_OUT_AT_FAILURE = True
AXES_RESET_ON_SUCCESS = True
AXES_HTTP_RESPONSE_CODE = 429
AXES_LOCKOUT_PARAMETERS = [["username", "ip_address"]]
AXES_SENSITIVE_PARAMETERS = ["password", "otp_token"]
AXES_CLIENT_IP_CALLABLE = "config.client_ip.get_axes_client_ip_address"
OTP_TOTP_ISSUER = "Frekuence Club"

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "structured": {
            "format": "time={asctime} level={levelname} logger={name} message={message}",
            "style": "{",
        }
    },
    "handlers": {"console": {"class": "logging.StreamHandler", "formatter": "structured"}},
    "loggers": {
        "events.audit": {"handlers": ["console"], "level": "INFO", "propagate": False},
        "staff_access.audit": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
        "axes.watch_login": {"handlers": ["console"], "level": "WARNING", "propagate": False},
    },
}
