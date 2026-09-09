from zoneinfo import ZoneInfo

from django.conf import settings
from django.utils import timezone
from rest_framework import serializers

SUPPORTED_LOCALES = ("sq", "en")
SUPPORTED_EVENT_WINDOWS = ("upcoming", "recent")
DEFAULT_EVENT_LIMIT = 6
MAX_EVENT_LIMIT = 20


class EventListQuerySerializer(serializers.Serializer):
    locale = serializers.ChoiceField(choices=SUPPORTED_LOCALES, default="sq")
    when = serializers.ChoiceField(choices=SUPPORTED_EVENT_WINDOWS, default="upcoming")
    limit = serializers.IntegerField(
        default=DEFAULT_EVENT_LIMIT,
        min_value=1,
        max_value=MAX_EVENT_LIMIT,
    )
    offset = serializers.IntegerField(default=0, min_value=0)


class EventDetailQuerySerializer(serializers.Serializer):
    locale = serializers.ChoiceField(choices=SUPPORTED_LOCALES, default="sq")


def _localized_datetime(value):
    if value is None:
        return None
    venue_timezone = ZoneInfo(settings.TIME_ZONE)
    return timezone.localtime(value, venue_timezone).isoformat()


def _timing_state(event, at):
    if event.ends_at <= at:
        return "past"
    if event.starts_at <= at:
        return "current"
    return "upcoming"


def _public_derivative(event, field_name):
    file_field = getattr(event, field_name)
    if not file_field or not file_field.name.startswith("events/derivatives/"):
        return None

    poster_metadata = event.poster_metadata
    if not isinstance(poster_metadata, dict):
        return None
    derivatives = poster_metadata.get("derivatives")
    if not isinstance(derivatives, dict):
        return None
    metadata = derivatives.get(field_name)
    if not isinstance(metadata, dict):
        return None
    width = metadata.get("width")
    height = metadata.get("height")
    image_format = metadata.get("format")
    if (
        not isinstance(width, int)
        or isinstance(width, bool)
        or width <= 0
        or not isinstance(height, int)
        or isinstance(height, bool)
        or height <= 0
        or image_format != "WEBP"
    ):
        return None

    return {
        "url": file_field.url,
        "width": width,
        "height": height,
        "format": "webp",
    }


def _public_poster(event, locale):
    sources = [
        derivative
        for field_name in ("poster_480", "poster_960", "poster_1440")
        if (derivative := _public_derivative(event, field_name)) is not None
    ]
    return {
        "alt": getattr(event, f"poster_alt_{locale}"),
        "sources": sources,
        "social": _public_derivative(event, "poster_social"),
    }


class PublicEventListSerializer(serializers.BaseSerializer):
    def to_representation(self, event):
        locale = self.context["locale"]
        alternate_locale = "en" if locale == "sq" else "sq"
        public_path = f"/events/{event.slug}/" if locale == "sq" else f"/en/events/{event.slug}/"
        alternate_path = (
            f"/events/{event.slug}/" if alternate_locale == "sq" else f"/en/events/{event.slug}/"
        )
        return {
            "locale": locale,
            "slug": event.slug,
            "url": public_path,
            "alternateUrl": alternate_path,
            "title": getattr(event, f"title_{locale}"),
            "summary": getattr(event, f"summary_{locale}"),
            "startsAt": _localized_datetime(event.starts_at),
            "endsAt": _localized_datetime(event.ends_at),
            "doorsAt": _localized_datetime(event.doors_at),
            "timezone": settings.TIME_ZONE,
            "lineup": list(event.lineup),
            "status": event.event_status,
            "timing": _timing_state(event, self.context["at"]),
            "featured": event.is_featured,
            "entryNote": getattr(event, f"entry_note_{locale}") or None,
            "poster": _public_poster(event, locale),
        }


class PublicEventDetailSerializer(PublicEventListSerializer):
    def to_representation(self, event):
        representation = super().to_representation(event)
        representation["description"] = getattr(event, f"description_{self.context['locale']}")
        return representation
