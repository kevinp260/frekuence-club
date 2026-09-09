import logging
import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.files.base import ContentFile
from django.core.validators import MaxLengthValidator, RegexValidator
from django.db import models, transaction
from django.db.models import Q
from django.utils import timezone

from .images import process_poster
from .validators import validate_lineup, validate_plain_text, validate_poster_extension

audit_log = logging.getLogger("events.audit")


def _random_media_name(directory, suffix):
    return f"events/{directory}/{uuid.uuid4().hex}{suffix}"


class EventQuerySet(models.QuerySet):
    def published(self):
        return self.filter(publication_status=Event.PublicationStatus.PUBLISHED)

    def current_or_future(self, at=None):
        at = at or timezone.now()
        return self.filter(
            ends_at__gt=at,
            event_status__in=[Event.EventStatus.SCHEDULED, Event.EventStatus.POSTPONED],
        )


class Event(models.Model):
    class PublicationStatus(models.TextChoices):
        DRAFT = "draft", "Draft"
        PUBLISHED = "published", "Published"

    class EventStatus(models.TextChoices):
        SCHEDULED = "scheduled", "Scheduled"
        POSTPONED = "postponed", "Postponed"
        CANCELLED = "cancelled", "Cancelled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    slug = models.SlugField(
        max_length=160,
        unique=True,
        validators=[
            RegexValidator(
                regex=r"^[a-z0-9]+(?:-[a-z0-9]+)*$",
                message="Use a lowercase slug containing letters, numbers, and single hyphens.",
            )
        ],
    )
    title_sq = models.CharField(max_length=160, blank=True, validators=[validate_plain_text])
    title_en = models.CharField(max_length=160, blank=True, validators=[validate_plain_text])
    summary_sq = models.CharField(max_length=240, blank=True, validators=[validate_plain_text])
    summary_en = models.CharField(max_length=240, blank=True, validators=[validate_plain_text])
    description_sq = models.TextField(
        blank=True, validators=[MaxLengthValidator(10_000), validate_plain_text]
    )
    description_en = models.TextField(
        blank=True, validators=[MaxLengthValidator(10_000), validate_plain_text]
    )
    starts_at = models.DateTimeField(null=True, blank=True)
    ends_at = models.DateTimeField(null=True, blank=True)
    doors_at = models.DateTimeField(null=True, blank=True)
    lineup = models.JSONField(default=list, blank=True, validators=[validate_lineup])
    poster = models.FileField(blank=True, validators=[validate_poster_extension])
    poster_480 = models.FileField(blank=True, editable=False)
    poster_960 = models.FileField(blank=True, editable=False)
    poster_1440 = models.FileField(blank=True, editable=False)
    poster_social = models.FileField(blank=True, editable=False)
    poster_metadata = models.JSONField(default=dict, blank=True, editable=False)
    poster_alt_sq = models.CharField(max_length=240, blank=True, validators=[validate_plain_text])
    poster_alt_en = models.CharField(max_length=240, blank=True, validators=[validate_plain_text])
    publication_status = models.CharField(
        max_length=12, choices=PublicationStatus.choices, default=PublicationStatus.DRAFT
    )
    event_status = models.CharField(
        max_length=12, choices=EventStatus.choices, default=EventStatus.SCHEDULED
    )
    is_featured = models.BooleanField(default=False)
    entry_note_sq = models.CharField(max_length=240, blank=True, validators=[validate_plain_text])
    entry_note_en = models.CharField(max_length=240, blank=True, validators=[validate_plain_text])
    published_at = models.DateTimeField(null=True, blank=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True, editable=False)
    updated_at = models.DateTimeField(auto_now=True, editable=False)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        editable=False,
        on_delete=models.SET_NULL,
        related_name="events_created",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        editable=False,
        on_delete=models.SET_NULL,
        related_name="events_updated",
    )

    objects = EventQuerySet.as_manager()

    class Meta:
        ordering = ["starts_at", "title_sq"]  # noqa: RUF012
        constraints = [  # noqa: RUF012
            models.CheckConstraint(
                condition=Q(starts_at__isnull=True)
                | Q(ends_at__isnull=True)
                | Q(ends_at__gt=models.F("starts_at")),
                name="event_ends_after_start",
            ),
            models.CheckConstraint(
                condition=Q(doors_at__isnull=True)
                | Q(starts_at__isnull=True)
                | Q(doors_at__lte=models.F("starts_at")),
                name="event_doors_not_after_start",
            ),
            models.CheckConstraint(
                condition=Q(is_featured=False)
                | Q(
                    publication_status="published",
                    event_status__in=["scheduled", "postponed"],
                ),
                name="event_featured_state_valid",
            ),
            models.CheckConstraint(
                condition=Q(publication_status="draft")
                | (
                    ~Q(title_sq="")
                    & ~Q(title_en="")
                    & ~Q(summary_sq="")
                    & ~Q(summary_en="")
                    & ~Q(description_sq="")
                    & ~Q(description_en="")
                    & Q(starts_at__isnull=False)
                    & Q(ends_at__isnull=False)
                    & ~Q(poster="")
                    & ~Q(poster_metadata={})
                    & Q(published_at__isnull=False)
                ),
                name="event_published_content_complete",
            ),
            models.UniqueConstraint(
                fields=("is_featured",),
                condition=Q(
                    is_featured=True,
                    publication_status="published",
                    event_status__in=["scheduled", "postponed"],
                ),
                name="one_published_featured_event",
            ),
        ]

    def __str__(self):
        return self.title_sq or self.title_en or self.slug or str(self.id)

    @property
    def is_past(self):
        return bool(self.ends_at and self.ends_at <= timezone.now())

    def clean(self):
        super().clean()
        errors = {}
        if self.starts_at and timezone.is_naive(self.starts_at):
            errors["starts_at"] = "Start time must include timezone information."
        if self.ends_at and timezone.is_naive(self.ends_at):
            errors["ends_at"] = "End time must include timezone information."
        if self.doors_at and timezone.is_naive(self.doors_at):
            errors["doors_at"] = "Doors time must include timezone information."
        if self.starts_at and self.ends_at and self.ends_at <= self.starts_at:
            errors["ends_at"] = "End time must be later than start time."
        if self.doors_at and self.starts_at and self.doors_at > self.starts_at:
            errors["doors_at"] = "Doors time cannot be later than start time."

        if self.publication_status == self.PublicationStatus.PUBLISHED:
            required_fields = (
                "title_sq",
                "title_en",
                "summary_sq",
                "summary_en",
                "description_sq",
                "description_en",
                "starts_at",
                "ends_at",
            )
            for field_name in required_fields:
                if not getattr(self, field_name):
                    errors[field_name] = "This field is required before publication."
            has_new_poster = bool(self.poster and not getattr(self.poster, "_committed", True))
            if not self.poster:
                errors["poster"] = "A validated poster is required before publication."
            elif not self.poster_metadata and not has_new_poster:
                errors["poster"] = "Process the poster successfully before publication."

        if self.is_featured:
            if self.publication_status != self.PublicationStatus.PUBLISHED:
                errors["is_featured"] = "Only a published event can be featured."
            elif self.event_status not in {
                self.EventStatus.SCHEDULED,
                self.EventStatus.POSTPONED,
            }:
                errors["is_featured"] = "Cancelled events cannot be featured."
            elif not self.ends_at or self.ends_at <= timezone.now():
                errors["is_featured"] = "Only a current or upcoming event can be featured."

        if errors:
            raise ValidationError(errors)

    def _store_processed_poster(self):
        processed = process_poster(self.poster.file)
        storage = self.poster.storage
        saved_names = []
        try:
            original_name = storage.save(
                _random_media_name("originals", processed.original.suffix),
                ContentFile(processed.original.data),
            )
            saved_names.append(original_name)
            derivative_metadata = {}
            for field_name, derivative in processed.derivatives.items():
                stored_name = storage.save(
                    _random_media_name("derivatives", ".webp"), ContentFile(derivative.data)
                )
                saved_names.append(stored_name)
                field = getattr(self, field_name)
                field.name = stored_name
                field._committed = True
                derivative_metadata[field_name] = {
                    "path": stored_name,
                    "width": derivative.width,
                    "height": derivative.height,
                    "format": "WEBP",
                }
            self.poster.name = original_name
            self.poster._committed = True
            self.poster._file = None
            self.poster_metadata = {
                "version": 1,
                "original": {
                    "width": processed.original.width,
                    "height": processed.original.height,
                    "format": processed.original.format,
                },
                "derivatives": derivative_metadata,
            }
        except Exception:
            for name in saved_names:
                storage.delete(name)
            raise
        return saved_names

    def media_names(self):
        return [
            field.name
            for field in (
                self.poster,
                self.poster_480,
                self.poster_960,
                self.poster_1440,
                self.poster_social,
            )
            if field and field.name
        ]

    def save(self, *args, **kwargs):  # noqa: DJ012
        previous_media = []
        if self.pk:
            previous = type(self).objects.filter(pk=self.pk).first()
            if previous:
                previous_media = previous.media_names()

        new_media = []
        if self.poster and not getattr(self.poster, "_committed", True):
            new_media = self._store_processed_poster()
        if self.publication_status == self.PublicationStatus.PUBLISHED and not self.published_at:
            self.published_at = timezone.now()

        try:
            self.full_clean()
            super().save(*args, **kwargs)
        except Exception:
            for name in new_media:
                self.poster.storage.delete(name)
            raise

        superseded_media = set(previous_media) - set(self.media_names())
        if superseded_media:
            storage = self.poster.storage
            transaction.on_commit(lambda: [storage.delete(name) for name in superseded_media])
